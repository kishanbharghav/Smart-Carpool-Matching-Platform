import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dateFilter, setDateFilter] = useState('today');
  const [myRidesOnly, setMyRidesOnly] = useState(false);

  const loadRides = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    const params = {};
    if (dateFilter === 'today') {
      params.date = new Date().toISOString().slice(0, 10);
    }
    if (myRidesOnly) params.my = 'true';
    api.get('/rides', { params })
      .then(({ data }) => setRides(data))
      .catch(() => !silent && setError('Failed to load rides'))
      .finally(() => { if (!silent) setLoading(false); });
  }, [dateFilter, myRidesOnly]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  useEffect(() => {
    const handleFocus = () => loadRides(true);
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadRides(true); };
    const interval = setInterval(() => { if (document.visibilityState === 'visible') loadRides(true); }, 60000);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [loadRides]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Cancel this ride for all passengers?')) return;
    setDeletingId(rideId);
    try {
      await api.delete(`/rides/${rideId}`);
      setRides((prev) => prev.filter((r) => r.id !== rideId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel ride');
    } finally {
      setDeletingId(null);
    }
  };

  const renderRideCard = (ride) => {
    const isDriver = user && ride.driver_id === user.id;
    const isSoon = new Date(ride.departure_at) > new Date();
    return (
      <article key={ride.id} className="ride-card">
        <div className="ride-card-main">
          <div>
            <div className="ride-route">
              {ride.origin_address || `${ride.origin_lat}, ${ride.origin_lng}`} → {ride.dest_address || `${ride.dest_lat}, ${ride.dest_lng}`}
            </div>
            <div className="ride-meta">
              {new Date(ride.departure_at).toLocaleString()} · Driver: {ride.driver_name}
              {ride.driver_rating_avg != null && <span> ★ {ride.driver_rating_avg}</span>}
              {' · '}{ride.seats_left} seat{ride.seats_left !== 1 ? 's' : ''} left · Est. ₹{ride.estimated_cost}
            </div>
          </div>
          <div className="ride-actions">
            <Link to={`/rides/${ride.id}`} className="btn btn-outline">View details</Link>
            {ride.recurring_template_id && <span className="badge-pill">Recurring</span>}
            {isDriver && (
              <>
                <span className="badge-pill">You&apos;re driving{isSoon ? ' · upcoming' : ''}</span>
                <button type="button" className="btn btn-danger" onClick={() => handleDeleteRide(ride.id)} disabled={deletingId === ride.id}>
                  {deletingId === ride.id ? 'Cancelling…' : 'Cancel ride'}
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="app-shell">
      <header className="app-brand-bar">
        <div>
          <div className="app-brand-title">SRM Carpool</div>
          <div className="app-brand-subtitle">Smart campus rides · Live maps · Fair fuel split</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user && (
            <div className="app-chip">
              {user.name} · {user.role === 'driver' ? 'Driver' : 'Passenger'}
            </div>
          )}
          <button type="button" onClick={handleLogout} className="btn btn-ghost">
            Logout
          </button>
        </div>
      </header>

      <main className="app-main-card">
        <div className="rides-header-row">
          <div>
            <h2 className="page-heading">Campus rides</h2>
            <p className="page-subtitle">
              Discover carpools around SRM, or post your own ride in a few taps.
            </p>
          </div>
          <Link to="/post" className="btn btn-primary">
            + Post a ride
          </Link>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, color: '#94a3b8' }}>When:</span>
          <button
            type="button"
            className={dateFilter === 'today' ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={() => setDateFilter('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={dateFilter === 'upcoming' ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={() => setDateFilter('upcoming')}
          >
            Upcoming
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, fontSize: 14, color: '#e2e8f0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={myRidesOnly}
              onChange={(e) => setMyRidesOnly(e.target.checked)}
            />
            My rides only
          </label>
        </div>

        {error && (
          <p className="field-error" style={{ marginBottom: 10 }}>
            {error}
          </p>
        )}

        {loading ? (
          <div className="rides-list">
            {[1, 2, 3].map((i) => (
              <article key={i} className="ride-card" style={{ opacity: 0.9 }}>
                <div className="ride-card-main">
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 18, width: '90%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, width: '70%' }} />
                  </div>
                  <div className="skeleton" style={{ height: 36, width: 100, borderRadius: 999 }} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <>
            {myRidesOnly && rides.length > 0 && (() => {
              const driving = rides.filter((r) => r.driver_id === user?.id);
              const joined = rides.filter((r) => r.is_passenger && r.driver_id !== user?.id);
              return (
                <>
                  {driving.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rides I&apos;m driving</h3>
                      <div className="rides-list">
                        {driving.map((ride) => renderRideCard(ride))}
                      </div>
                    </div>
                  )}
                  {joined.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rides I&apos;ve joined</h3>
                      <div className="rides-list">
                        {joined.map((ride) => renderRideCard(ride))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            {(!myRidesOnly || rides.length === 0) && (
              <div className="rides-list">
                {rides.length === 0 ? (
                  <p style={{ fontSize: 14, color: '#9ca3af' }}>
                    {myRidesOnly ? 'No rides where you\'re driving or joined.' : 'No rides yet. Be the first to post a campus carpool!'}
                  </p>
                ) : (
                  rides.map((ride) => renderRideCard(ride))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
