import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds?.length) map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function RideMap() {
  const { id } = useParams();
  const rideId = parseInt(id, 10);
  const [ride, setRide] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const { user, token } = useAuth();
  const socket = useSocket();

  const isDriver = ride && user && ride.driver_id === user.id;

  useEffect(() => {
    api.get(`/rides/${rideId}`)
      .then(({ data }) => setRide(data))
      .catch(() => setRide(null));
  }, [rideId]);

  useEffect(() => {
    if (!ride?.id) return;
    api.get(`/rides/${rideId}/route`)
      .then(({ data }) => setRouteInfo(data))
      .catch(() => setRouteInfo(null));
  }, [ride?.id, rideId]);

  useEffect(() => {
    if (!socket || !rideId || !token) return;
    socket.emit('join_ride', { rideId, role: ride?.driver_id === user?.id ? 'driver' : 'passenger', token });
    const onLocation = (payload) => {
      if (payload.rideId === rideId) setDriverPosition({ lat: payload.lat, lng: payload.lng });
    };
    socket.on('driver_location', onLocation);
    return () => {
      socket.off('driver_location', onLocation);
    };
  }, [socket, rideId, token, ride?.driver_id, user?.id]);

  useEffect(() => {
    if (!ride) return;
    if (ride.last_lat != null && ride.last_lng != null) {
      setDriverPosition({ lat: ride.last_lat, lng: ride.last_lng });
    }
  }, [ride?.last_lat, ride?.last_lng]);

  useEffect(() => {
    if (!isDriver || !socket) return;
    const sendPosition = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setDriverPosition({ lat, lng });
      socket.emit('driver_location', { rideId, lat, lng });
      api.patch(`/rides/${rideId}/location`, { lat, lng }).catch(() => {});
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(sendPosition, () => {});
      const interval = setInterval(() => navigator.geolocation.getCurrentPosition(sendPosition, () => {}), 5000);
      return () => clearInterval(interval);
    }
  }, [isDriver, rideId, socket]);

  if (!ride) return <div style={{ padding: 24 }}>Loading…</div>;

  const center = ride.origin_lat && ride.origin_lng ? [ride.origin_lat, ride.origin_lng] : [13.0325, 80.1783];
  const polylinePositions = routeInfo?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];
  const bounds = polylinePositions.length
    ? polylinePositions
    : [[ride.origin_lat, ride.origin_lng], [ride.dest_lat, ride.dest_lng]];

  return (
    <div className="ride-map-fullscreen" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', zIndex: 0 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <Link to={`/rides/${rideId}`}>← Ride detail</Link>
          {routeInfo && (
            <span style={{ marginLeft: 12 }}>
              ₹{routeInfo.cost_per_passenger?.toFixed(0)}/person · {routeInfo.distance_km?.toFixed(1)} km
              {routeInfo.co2_saved_kg != null && routeInfo.co2_saved_kg > 0 && (
                <span style={{ marginLeft: 8, color: '#2e7d32' }}>· ~{routeInfo.co2_saved_kg.toFixed(1)} kg CO₂ saved</span>
              )}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {ride?.status === 'active' && <span style={{ fontSize: 13, color: '#1976d2' }}>Ride in progress</span>}
          {ride?.status === 'scheduled' && <span style={{ fontSize: 13, color: '#64748b' }}>Scheduled</span>}
          {ride?.status === 'completed' && <span style={{ fontSize: 13, color: '#2e7d32' }}>Completed</span>}
          {isDriver && <span style={{ fontSize: 14, color: '#2e7d32' }}>Sharing your location</span>}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} className="ride-map-container">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          <MapResizeFix />
          <FitBounds bounds={bounds} />
          <Marker position={[ride.origin_lat, ride.origin_lng]}>
            <Popup>Start</Popup>
          </Marker>
          <Marker position={[ride.dest_lat, ride.dest_lng]}>
            <Popup>End</Popup>
          </Marker>
          {polylinePositions.length > 0 && <Polyline positions={polylinePositions} color="#1976d2" weight={4} />}
          {driverPosition && (
            <Marker position={[driverPosition.lat, driverPosition.lng]}>
              <Popup>Driver</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
