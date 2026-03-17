import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
    { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];
  const toggleDay = (d) => setRepeatDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setError('');
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseMyLocation(true);
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        setError('Location access failed. Please enter the address manually.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // In actual implementation, we'd geocode coordinates to an address if myLocation is used
    // For now we map it appropriately to match Prisma schema
    let payload = {};
    if (useMyLocation && myLocation) {
        payload = { originLat: myLocation.lat, originLng: myLocation.lng, originAddress: 'Current GPS Location' };
    } else {
        // Dummy geocoding assumption (real geocoding should happen here or on backend parsing origin string)
        payload = { originLat: 12.8236, originLng: 80.0435, originAddress: originAddress.trim() }; 
    }
    payload.destAddress = destination.trim();
    // Dummy dest cords
    payload.destLat = 12.8230;
    payload.destLng = 80.0450;
    payload.maxSeats = maxSeats;

    if (!payload.originAddress || !payload.destAddress) {
      setError('Please fill origin and destination.');
      setLoading(false); return;
    }

    if (repeatWeekly) {
      if (repeatDays.length === 0) { setError('Select at least one day.'); setLoading(false); return; }
      payload.departureTime = repeatTime;
      payload.daysOfWeek = repeatDays.join(',');
      try {
        await api.post('/recurring', payload);
        showToast('Recurring ride created!', 'success');
        navigate('/', { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to create recurring template');
      } finally { setLoading(false); }
      return;
    }

    if (!departureAt) {
      setError('Please provide departure date & time.');
      setLoading(false); return;
    }

    payload.departureAt = new Date(departureAt).toISOString();

    try {
      const { data } = await api.post('/rides', payload);
      showToast('Ride posted successfully!', 'success');
      navigate(`/rides/${data.data.ride.id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
         <div>
            <h1 className="text-title" style={{ fontSize: '2rem' }}>Post a Ride</h1>
            <p className="text-muted">Share your commute and split costs.</p>
         </div>
         <Link to="/"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>

      {error && (
          <div style={{ padding: '1rem', background: 'var(--pk-danger-bg)', color: 'var(--pk-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            {error}
          </div>
      )}

      <Card>
        <form onSubmit={handleSubmit}>
          
          <div style={{ marginBottom: '1.5rem' }}>
             <Input
                label="Origin Pick-up Point"
                placeholder="Hostel block, Main Gate..."
                value={originAddress}
                onChange={(e) => { setOriginAddress(e.target.value); setUseMyLocation(false); }}
                disabled={useMyLocation}
             />
             <div className="flex-between" style={{ marginTop: '0.5rem' }}>
                 <p className="text-xs text-muted">Or use GPS location:</p>
                 <Button type="button" variant={useMyLocation ? 'primary' : 'outline'} onClick={getLocation} disabled={locationLoading} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                   {locationLoading ? 'Locating...' : (useMyLocation ? 'Location set!' : 'Use current location')}
                 </Button>
             </div>
             
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                 {CAMPUS_QUICK_PICKS.map(({ label, address }) => (
                    <Button key={label} type="button" variant="ghost" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--pk-surface)' }}
                            onClick={() => { setOriginAddress(address); setUseMyLocation(false); }}>
                       {label}
                    </Button>
                 ))}
             </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
             <Input
                label="Destination"
                placeholder="Where are you heading?"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
             />
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                 {CAMPUS_QUICK_PICKS.map(({ label, address }) => (
                    <Button key={`dest-${label}`} type="button" variant="ghost" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--pk-surface)' }}
                            onClick={() => setDestination(address)}>
                       {label}
                    </Button>
                 ))}
             </div>
          </div>

          <div className="grid-cols-2">
             {!repeatWeekly && (
               <Input
                  label="Departure Date & Time"
                  type="datetime-local"
                  value={departureAt}
                  onChange={(e) => setDepartureAt(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  required={!repeatWeekly}
               />
             )}
             
             <Input
                label="Available Seats"
                type="number"
                min="1" max="6"
                value={maxSeats}
                onChange={(e) => setMaxSeats(parseInt(e.target.value, 10) || 1)}
                required
             />
          </div>

          <div style={{ background: 'var(--pk-bg-glass)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '1.5rem', border: '1px solid var(--pk-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                 <input type="checkbox" checked={repeatWeekly} onChange={(e) => setRepeatWeekly(e.target.checked)} />
                 Repeat as a recurring route
              </label>

              {repeatWeekly && (
                 <div className="animate-slide-up" style={{ marginTop: '1rem', borderTop: '1px solid var(--pk-border)', paddingTop: '1rem' }}>
                    <Input label="Departure time every day" type="time" value={repeatTime} onChange={(e) => setRepeatTime(e.target.value)} />
                    <p className="form-label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Select active days:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {WEEKDAYS.map(({ value, label }) => (
                         <Button key={value} type="button" variant={repeatDays.includes(value) ? 'primary' : 'outline'}
                                 style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                 onClick={() => toggleDay(value)}>
                             {label}
                         </Button>
                      ))}
                    </div>
                 </div>
              )}
          </div>

          <Button type="submit" isLoading={loading} style={{ width: '100%', marginTop: '2rem' }}>
             Publish Route
          </Button>

        </form>
      </Card>
    </div>
  );
}
