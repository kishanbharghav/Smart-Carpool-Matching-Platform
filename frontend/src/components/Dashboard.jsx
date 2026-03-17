import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export default function Dashboard() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const { user } = useAuth();

  const [dateFilter, setDateFilter] = useState('today');
  const [myRidesOnly, setMyRidesOnly] = useState(false);

  const loadRides = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    
    // Using our new API params based on the Prisma update
    const params = {};
    if (dateFilter === 'today') params.date = 'today';
    if (dateFilter === 'upcoming') params.date = 'upcoming';
    if (myRidesOnly) params.my = 'true';
    
    try {
      const { data } = await api.get('/rides', { params });
      // The new API response shape is `{ status: 'success', data: { rides: [...] } }`
      setRides(data.data.rides || []);
    } catch (err) {
      if (!silent) setError('Failed to load rides from server');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dateFilter, myRidesOnly]);

  useEffect(() => { loadRides(); }, [loadRides]);

  // Polling / visibility sync
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadRides(true); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadRides]);

  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Cancel this ride for all passengers?')) return;
    setDeletingId(rideId);
    try {
       // Assuming status update is the way we cancel
      await api.patch(`/rides/${rideId}/status`, { status: 'cancelled' });
      loadRides(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel ride');
    } finally {
      setDeletingId(null);
    }
  };

  const renderRideCard = (ride) => {
    const isDriver = user && ride.driverId === user.id;
    const isSoon = new Date(ride.departureAt) > new Date();
    
    // In our new schema, passengers is an array of objects like { user: { name: '...', avatar: '...' } }
    const seatsRemaining = ride.maxSeats - (ride.passengers?.length || 0);

    return (
      <Card key={ride.id} className="animate-slide-up" style={{ transition: 'transform 0.2s', padding: '1.25rem' }}>
        <div className="flex-between" style={{ marginBottom: '1rem', alignItems: 'flex-start' }}>
            <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                   <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'var(--pk-primary-light)', color: 'var(--pk-primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                      {new Date(ride.departureAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                   <span style={{ fontSize: '0.8rem', color: 'var(--pk-text-muted)' }}>
                      {new Date(ride.departureAt).toLocaleDateString()}
                   </span>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                   <p style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--pk-accent)' }}>●</span> {ride.originAddress || `${ride.originLat.toFixed(4)}, ${ride.originLng.toFixed(4)}`}
                   </p>
                   {/* Vertical line connector */}
                   <div style={{ height: '10px', width: '2px', background: 'var(--pk-border)', marginLeft: '4px' }}></div>
                   <p style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--pk-primary)' }}>●</span> {ride.destAddress || `${ride.destLat.toFixed(4)}, ${ride.destLng.toFixed(4)}`}
                   </p>
               </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{Math.round(200 / (ride.passengers?.length + 1 || 1))} <span style={{fontSize:'0.75rem', color: 'var(--pk-text-muted)'}}>est.</span></div>
               <div style={{ fontSize: '0.8rem', color: seatsRemaining === 0 ? 'var(--pk-danger)' : 'var(--pk-success)' }}>
                  {seatsRemaining > 0 ? `${seatsRemaining} seats left` : 'Full'}
               </div>
            </div>
        </div>

        <div style={{ borderTop: '1px solid var(--pk-border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--pk-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {ride.driver?.name?.charAt(0) || '?'}
               </div>
               <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500 }}>{ride.driver?.name}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--pk-text-muted)' }}>Driver</p>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <Link to={`/rides/${ride.id}`}>
                  <Button variant="outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>View Map</Button>
               </Link>
               {isDriver && (
                  <Button variant="outline" 
                     style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderColor: 'var(--pk-danger)', color: 'var(--pk-danger)' }}
                     onClick={() => handleDeleteRide(ride.id)}
                     isLoading={deletingId === ride.id}
                  >
                     Cancel
                  </Button>
               )}
            </div>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
           <div>
              <h1 className="text-title" style={{ fontSize: '2rem' }}>Discover Rides</h1>
              <p className="text-muted">Find carpools around SRM campus dynamically.</p>
           </div>
           
           <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--pk-surface)', padding: '0.25rem', borderRadius: 'var(--radius-lg)' }}>
              <button 
                 className={`btn ${dateFilter === 'today' ? 'btn-primary' : 'btn-ghost'}`}
                 style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}
                 onClick={() => setDateFilter('today')}
              >Today</button>
              <button 
                 className={`btn ${dateFilter === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`}
                 style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}
                 onClick={() => setDateFilter('upcoming')}
              >Upcoming</button>
              <button 
                 className={`btn ${myRidesOnly ? 'btn-primary' : 'btn-ghost'}`}
                 style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}
                 onClick={() => setMyRidesOnly(!myRidesOnly)}
              >Mine</button>
           </div>
        </div>

        {error && (
            <div style={{ padding: '1rem', background: 'var(--pk-danger-bg)', color: 'var(--pk-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              {error}
            </div>
        )}

        {loading ? (
             <div className="flex-center" style={{ minHeight: '300px' }}>
                <span className="text-muted">Loading routes...</span>
             </div>
        ) : rides.length === 0 ? (
             <div className="flex-center" style={{ flexDirection: 'column', minHeight: '300px', background: 'var(--pk-surface-glass)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--pk-border)' }}>
                <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚗</span>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No rides found</h3>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>There are no scheduled carpools matching your criteria right now.</p>
                <Link to="/post"><Button>Be the first to post</Button></Link>
             </div>
        ) : (
             <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
                {rides.map(renderRideCard)}
             </div>
        )}

    </div>
  );
}
