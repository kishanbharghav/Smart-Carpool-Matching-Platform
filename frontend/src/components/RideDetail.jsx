import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RideDetail() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingTargetId, setRatingTargetId] = useState(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const isDriver = ride && user && ride.driver_id === user.id;
  const isPassenger = ride?.is_passenger === true;
  const canJoin = ride && !isDriver && !isPassenger && ride.seats_left > 0 && ride.status === 'scheduled';
  const canStartRide = isDriver && ride?.status === 'scheduled';
  const canEndRide = isDriver && ride?.status === 'active';
  const canRate = ride?.status === 'completed' && (isDriver || isPassenger);
  const ratingTargets = canRate
    ? (isPassenger ? [{ id: ride.driver_id, name: ride.driver_name }] : (ride.passengers || []).map((p) => ({ id: p.id, name: p.name })))
    : [];

  useEffect(() => {
    api.get(`/rides/${id}`)
      .then(({ data }) => setRide(data))
      .catch(() => setError('Ride not found'));
  }, [id]);

  useEffect(() => {
    if (!ride?.id) return;
    api.get(`/rides/${id}/route`)
      .then(({ data }) => setRouteInfo(data))
      .catch(() => setRouteInfo(null));
  }, [ride?.id, id]);

  const handleJoin = () => {
    setJoining(true);
    setError('');
    api.post(`/rides/${id}/join`)
      .then(({ data }) => {
        setRide(data);
        showToast('You joined this ride!');
        navigate(`/rides/${id}/map`);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to join'))
      .finally(() => setJoining(false));
  };

  const handleLeave = () => {
    setLeaving(true);
    setError('');
    api.post(`/rides/${id}/leave`)
      .then(() => {
        showToast('You left the ride');
        navigate('/');
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to leave'))
      .finally(() => setLeaving(false));
  };

  const handleDeleteRide = async () => {
    if (!window.confirm('Cancel this ride for all passengers?')) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/rides/${id}`);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel ride');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setStatusUpdating(true);
    setError('');
    try {
      const { data } = await api.patch(`/rides/${id}/status`, { status: newStatus });
      setRide(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRate = async (e) => {
    e.preventDefault();
    const targetId = ratingTargetId ?? ratingTargets[0]?.id;
    if (!targetId) return;
    setRatingSubmitting(true);
    setError('');
    try {
      await api.post(`/rides/${id}/rate`, { rated_id: targetId, score: ratingScore, comment: ratingComment.trim() || undefined });
      showToast('Thanks for your rating!');
      const { data } = await api.get(`/rides/${id}`);
      setRide(data);
      setRatingComment('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (error && !ride) {
    return (
      <div className="app-shell">
        <main className="app-main-card">
          <p style={{ marginBottom: 12 }}>{error}</p>
          <Link to="/" className="btn btn-outline">Back to dashboard</Link>
        </main>
      </div>
    );
  }
  if (!ride) {
    return (
      <div className="app-shell">
        <header className="app-brand-bar">
          <div>
            <div className="app-brand-title">Ride to campus</div>
            <div className="app-brand-subtitle">Loading…</div>
          </div>
          <Link to="/" className="btn btn-ghost">← Back to dashboard</Link>
        </header>
        <main className="app-main-card">
          <div className="card-elevated">
            <div className="skeleton" style={{ height: 24, width: 160, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '85%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 36, width: 120, marginTop: 16, borderRadius: 999 }} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-brand-bar">
        <div>
          <div className="app-brand-title">Ride to campus</div>
          <div className="app-brand-subtitle">
            See full route, seats and live cost breakdown before you join.
          </div>
        </div>
        <Link to="/" className="btn btn-ghost">
          ← Back to dashboard
        </Link>
      </header>

      <main className="app-main-card">
        {error && <p className="field-error" style={{ marginBottom: 10 }}>{error}</p>}
        <div className="card-elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>Ride details</h2>
            <span className="badge-pill" style={{ textTransform: 'capitalize' }}>
              {ride.status === 'scheduled' && 'Scheduled'}
              {ride.status === 'active' && 'In progress'}
              {ride.status === 'completed' && 'Completed'}
              {ride.status === 'cancelled' && 'Cancelled'}
            </span>
          </div>
          <p className="helper-text">
            From {ride.origin_address || `${ride.origin_lat}, ${ride.origin_lng}`} to{' '}
            {ride.dest_address || `${ride.dest_lat}, ${ride.dest_lng}`}.
          </p>

          <p><strong>From:</strong> {ride.origin_address || `${ride.origin_lat}, ${ride.origin_lng}`}</p>
          <p><strong>To:</strong> {ride.dest_address || `${ride.dest_lat}, ${ride.dest_lng}`}</p>
          <p><strong>Departure:</strong> {new Date(ride.departure_at).toLocaleString()}</p>
          <p><strong>Driver:</strong> {ride.driver_name}
            {ride.driver_rating_avg != null && <span> ★ {ride.driver_rating_avg}</span>}
          </p>
          <p><strong>Seats:</strong> {ride.seats_taken} / {ride.max_seats} taken</p>
          {Array.isArray(ride.passengers) && ride.passengers.length > 0 && (
            <p><strong>Passengers:</strong> {(ride.passengers).map((p) => p.name).join(', ')}</p>
          )}
          {routeInfo && (
            <>
              <p><strong>Distance:</strong> {routeInfo.distance_km?.toFixed(1)} km</p>
              <p><strong>Fuel cost (total):</strong> ₹{routeInfo.fuel_cost_total?.toFixed(0)}</p>
              <p><strong>Cost per passenger:</strong> ₹{routeInfo.cost_per_passenger?.toFixed(0)}</p>
              {routeInfo.co2_saved_kg != null && routeInfo.co2_saved_kg > 0 && (
                <p><strong>CO₂ saved (carpool):</strong> ~{routeInfo.co2_saved_kg.toFixed(1)} kg</p>
              )}
            </>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link to={`/rides/${id}/map`} className="btn btn-outline">
            View on map
          </Link>
          {canJoin && (
            <button type="button" onClick={handleJoin} disabled={joining} className="btn btn-primary">
              {joining ? 'Joining…' : 'Join ride'}
            </button>
          )}
          {canStartRide && (
            <button type="button" onClick={() => handleStatusUpdate('active')} disabled={statusUpdating} className="btn btn-primary">
              {statusUpdating ? 'Updating…' : 'Start ride'}
            </button>
          )}
          {canEndRide && (
            <button type="button" onClick={() => handleStatusUpdate('completed')} disabled={statusUpdating} className="btn btn-outline">
              {statusUpdating ? 'Updating…' : 'End ride'}
            </button>
          )}
          {isPassenger && (
            <button type="button" onClick={handleLeave} disabled={leaving} className="btn btn-danger">
              {leaving ? 'Leaving…' : 'Leave ride'}
            </button>
          )}
          {isDriver && ride?.status === 'scheduled' && (
            <button type="button" onClick={handleDeleteRide} disabled={deleting} className="btn btn-danger">
              {deleting ? 'Cancelling…' : 'Cancel this ride'}
            </button>
          )}
          {canRate && ratingTargets.length > 0 && (
            <div className="card-elevated" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 8, fontSize: 16 }}>Rate this ride</h3>
              <form onSubmit={handleRate}>
                {ratingTargets.length > 1 && (
                  <div style={{ marginBottom: 8 }}>
                    <label className="field-label">Rate</label>
                    <select
                      className="select-input"
                      value={ratingTargetId ?? ratingTargets[0]?.id ?? ''}
                      onChange={(e) => setRatingTargetId(parseInt(e.target.value, 10))}
                    >
                      {ratingTargets.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <label className="field-label">Score (1–5)</label>
                  <select className="select-input" value={ratingScore} onChange={(e) => setRatingScore(parseInt(e.target.value, 10))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n} ★</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label className="field-label">Comment (optional)</label>
                  <input type="text" className="text-input" value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} placeholder="Quick feedback" />
                </div>
                <button type="submit" disabled={ratingSubmitting} className="btn btn-outline">
                  {ratingSubmitting ? 'Submitting…' : 'Submit rating'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
