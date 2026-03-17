import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { Card } from './ui/Card';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom Car marker for driver
const carIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><circle cx="12" cy="12" r="10" fill="%236366f1" opacity="0.3"/><circle cx="12" cy="12" r="6" fill="%236366f1" stroke="white" stroke-width="2"/></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds?.length) map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, bounds]);
  return null;
}

export default function RideMap() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  
  const { user } = useAuth();
  const socket = useSocket();

  const isDriver = ride && user && ride.driver?.id === user.id;

  useEffect(() => {
    api.get(`/rides/${id}`)
      .then(({ data }) => setRide(data.data.ride))
      .catch(() => setRide(null));
  }, [id]);

  useEffect(() => {
    if (!ride?.id) return;
    api.get(`/rides/${id}/route`)
      .then(({ data }) => setRouteInfo(data.data || data))
      .catch(() => setRouteInfo(null));
  }, [ride?.id, id]);

  // Real-time receiver
  useEffect(() => {
    if (!socket || !ride?.id) return;
    
    socket.emit('join_ride', { rideId: ride.id });
    
    const onLocation = (payload) => {
      // Smooth interpolation should technically be done here in frontend state over rAF
      // Or in the MapMarker component. We just update the pos for now.
      if (payload.rideId === ride.id) setDriverPosition({ lat: payload.lat, lng: payload.lng });
    };
    
    socket.on('driver_location', onLocation);
    return () => socket.off('driver_location', onLocation);
  }, [socket, ride?.id]);

  useEffect(() => {
    if (!ride) return;
    if (ride.lastLat && ride.lastLng) setDriverPosition({ lat: ride.lastLat, lng: ride.lastLng });
  }, [ride?.lastLat, ride?.lastLng]);

  // GPS Emitter for Driver
  useEffect(() => {
    if (!isDriver || !socket || ride.status !== 'active') return;
    
    const sendPosition = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setDriverPosition({ lat, lng });
      socket.emit('driver_location', { rideId: ride.id, lat, lng });
    };
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(sendPosition, () => {});
      const interval = setInterval(() => navigator.geolocation.getCurrentPosition(sendPosition, () => {}), 3000);
      return () => clearInterval(interval);
    }
  }, [isDriver, ride?.id, socket, ride?.status]);

  if (!ride) return <div className="flex-center" style={{padding: '2rem'}}>Loading map...</div>;

  const center = ride.originLat ? [ride.originLat, ride.originLng] : [20, 0];
  const polylinePositions = routeInfo?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];
  const bounds = polylinePositions.length ? polylinePositions : [[ride.originLat, ride.originLng], [ride.destLat, ride.destLng]];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--pk-border)' }}>
      
      {/* Map Header */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, zIndex: 10 }}>
         <div>
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Link to={`/rides/${id}`} style={{ color: 'var(--pk-text-muted)' }}>←</Link> 
               Live Tracker
            </h2>
            <p className="text-sm text-muted">
               {ride.originAddress} to {ride.destAddress}
            </p>
         </div>
         <div style={{ textAlign: 'right' }}>
             <span className="badge" style={{ background: ride.status==='active'?'var(--pk-primary-light)':'var(--pk-surface)', color: ride.status==='active'?'var(--pk-primary)':'var(--pk-text-muted)' }}>
               {ride.status === 'active' ? '● Ride in progress' : ride.status}
             </span>
             {isDriver && <p style={{ fontSize: '0.75rem', color: 'var(--pk-success)', marginTop: '0.25rem' }}>Emitting GPS Location</p>}
         </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
         <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
            
            <FitBounds bounds={bounds} />
            
            <Marker position={[ride.originLat, ride.originLng]}><Popup>Start: {ride.originAddress}</Popup></Marker>
            <Marker position={[ride.destLat, ride.destLng]}><Popup>Destination: {ride.destAddress}</Popup></Marker>
            
            {polylinePositions.length > 0 && <Polyline positions={polylinePositions} color="var(--pk-primary)" weight={5} opacity={0.7} />}
            
            {driverPosition && (
              <Marker position={[driverPosition.lat, driverPosition.lng]} icon={carIcon}>
                <Popup>Driver&apos;s Live Location</Popup>
              </Marker>
            )}
         </MapContainer>
      </div>

    </div>
  );
}
