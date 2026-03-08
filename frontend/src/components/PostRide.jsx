import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';

const CAMPUS_QUICK_PICKS = [
  { label: 'SRM Main Gate', address: 'SRM Institute of Science and Technology, Kattankulathur' },
  { label: 'SRM Dental Hospital', address: 'SRM Dental College, Potheri' },
  { label: 'SRM College Bus Stop', address: 'SRM College Bus Stop, Kattankulathur' },
  { label: 'Hostel Block', address: 'SRM University Hostel, Kattankulathur' },
  { label: 'Tech Park', address: 'SRM Tech Park, Chennai' },
];

export default function PostRide() {
  const [originAddress, setOriginAddress] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [departureAt, setDepartureAt] = useState('');
  const [maxSeats, setMaxSeats] = useState(2);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatTime, setRepeatTime] = useState('08:00');
  const [repeatDays, setRepeatDays] = useState([]);
  const navigate = useNavigate();
  const showToast = useToast();

  const WEEKDAYS = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];
  const toggleDay = (d) => setRepeatDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('Location only works on HTTPS or localhost. Open this app via https:// or http://localhost.');
      return;
    }
    setError('');
    setLocationLoading(true);
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseMyLocation(true);
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access was denied. Please allow location in your browser or device settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location is unavailable. Try moving to a spot with better GPS signal or use an address instead.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again or enter an address manually.');
            break;
          default:
            setError('Could not get your location. Try again or enter an address.');
        }
      },
      options
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const origin = useMyLocation && myLocation
      ? { lat: myLocation.lat, lng: myLocation.lng }
      : originAddress.trim();
    if (!origin || !destination.trim()) {
      setError('Please fill origin and destination.');
      setLoading(false);
      return;
    }
    if (repeatWeekly) {
      if (repeatDays.length === 0) {
        setError('Select at least one day for the recurring ride.');
        setLoading(false);
        return;
      }
      try {
        await api.post('/recurring', {
          origin,
          destination: destination.trim(),
          departure_time: repeatTime,
          days_of_week: repeatDays,
          max_seats: maxSeats,
        });
        showToast('Recurring ride created! Rides will appear on your dashboard.');
        navigate('/', { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to create recurring ride');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!departureAt) {
      setError('Please fill departure date and time.');
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.post('/rides', {
        origin,
        destination: destination.trim(),
        departure_at: new Date(departureAt).toISOString(),
        max_seats: maxSeats,
      });
      showToast('Ride posted!');
      navigate(`/rides/${data.id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-brand-bar">
        <div>
          <div className="app-brand-title">Post a campus ride</div>
          <div className="app-brand-subtitle">
            Share your route so nearby SRM students can hop in and split fuel fairly.
          </div>
        </div>
        <Link to="/" className="btn btn-ghost">
          ← Back to dashboard
        </Link>
      </header>

      <main className="app-main-card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ maxWidth: 540, width: '100%' }}>
          {error && <p className="field-error" style={{ marginBottom: 10 }}>{error}</p>}

          <div className="card-elevated">
            <h2 style={{ marginBottom: 4 }}>Ride details</h2>
            <p className="helper-text">
              Use your current GPS location or type an address for the pick-up point.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="origin">
                Origin
              </label>
              <div style={{ marginBottom: 12 }}>
                <input
                  id="origin"
                  type="text"
                  placeholder="Hostel / Gate / Landmark"
                  value={originAddress}
                  onChange={(e) => { setOriginAddress(e.target.value); setUseMyLocation(false); }}
                  disabled={useMyLocation}
                  className="text-input"
                />
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={locationLoading}
                  className="btn btn-outline"
                  style={{ marginTop: 8 }}
                >
                  {locationLoading ? 'Getting location…' : 'Use my current location'}
                </button>
                {useMyLocation && myLocation && (
                  <span style={{ marginLeft: 6, fontSize: 12, color: '#9ca3af' }}>
                    Using live GPS coordinates
                  </span>
                )}
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, marginBottom: 4 }}>Campus quick picks:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CAMPUS_QUICK_PICKS.map(({ label, address }) => (
                    <button
                      key={label}
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '6px 10px', fontSize: 12 }}
                      onClick={() => { setOriginAddress(address); setUseMyLocation(false); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field-label" htmlFor="destination">
                Destination
              </label>
              <input
                id="destination"
                type="text"
                placeholder="Destination address"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="text-input"
              />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, marginBottom: 4 }}>Campus quick picks:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CAMPUS_QUICK_PICKS.map(({ label, address }) => (
                  <button
                    key={label}
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => setDestination(address)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {!repeatWeekly && (
                <>
                  <label className="field-label" htmlFor="departure" style={{ marginTop: 12 }}>
                    Departure date &amp; time
                  </label>
                  <input
                    id="departure"
                    type="datetime-local"
                    value={departureAt}
                    onChange={(e) => setDepartureAt(e.target.value)}
                    required={!repeatWeekly}
                    className="datetime-input"
                  />
                </>
              )}

              <label className="field-label" htmlFor="max-seats" style={{ marginTop: 12 }}>
                Max seats
              </label>
              <input
                id="max-seats"
                type="number"
                min={1}
                max={6}
                value={maxSeats}
                onChange={(e) => setMaxSeats(parseInt(e.target.value, 10) || 1)}
                className="number-input"
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={repeatWeekly}
                  onChange={(e) => setRepeatWeekly(e.target.checked)}
                />
                <span>Repeat weekly</span>
              </label>
              {repeatWeekly && (
                <div style={{ marginTop: 10, padding: 12, background: 'rgba(15,23,42,0.5)', borderRadius: 10 }}>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Time each day</p>
                  <input
                    type="time"
                    value={repeatTime}
                    onChange={(e) => setRepeatTime(e.target.value)}
                    className="datetime-input"
                    style={{ marginBottom: 10 }}
                  />
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Days</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {WEEKDAYS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        className={repeatDays.includes(value) ? 'btn btn-primary' : 'btn btn-outline'}
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={() => toggleDay(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 18 }}
              >
                {loading ? 'Creating…' : 'Post ride'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
