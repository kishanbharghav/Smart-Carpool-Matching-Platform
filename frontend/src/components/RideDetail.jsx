import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export default function RideDetail() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const showToast = useToast();

  const isDriver = ride && user && ride.driver?.id === user.id;
  const isPassenger = ride?.passengers?.some(p => p.user.id === user?.id);
  const seatsRemaining = ride ? (ride.maxSeats - (ride.passengers?.length || 0)) : 0;
  const canJoin = ride && !isDriver && !isPassenger && seatsRemaining > 0 && ride.status === 'scheduled';
  
  const canChat = isDriver || isPassenger;

  useEffect(() => {
    api.get(`/rides/${id}`)
      .then(({ data }) => {
         setRide(data.data.ride);
         setMessages(data.data.ride.messages || []);
      })
      .catch(() => setError('Ride not found'));
  }, [id]);

  useEffect(() => {
    if (!ride?.id) return;
    api.get(`/rides/${id}/route`)
      .then(({ data }) => setRouteInfo(data.data || data)) // backward compat with direct return vs nest
      .catch(() => setRouteInfo(null));
  }, [ride?.id, id]);

  // Socket logic for Chat
  useEffect(() => {
    if (!socket || !ride?.id || !canChat) return;
    socket.emit('join_ride', { rideId: ride.id });
    
    const onNewMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    
    socket.on('new_message', onNewMessage);
    return () => socket.off('new_message', onNewMessage);
  }, [socket, ride?.id, canChat]);

  const handleJoin = () => {
    setJoining(true); setError('');
    api.post(`/rides/${id}/join`)
      .then(() => {
        showToast('You joined this ride!', 'success');
        navigate(`/rides/${id}/map`);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to join'))
      .finally(() => setJoining(false));
  };

  const handleLeave = () => {
    setLeaving(true); setError('');
    // For Prisma implementation, leaving implies removing passenger
    api.post(`/rides/${id}/leave`)
      .then(() => {
        showToast('You left the ride'); navigate('/');
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to leave'))
      .finally(() => setLeaving(false));
  };

  const handleStatusUpdate = async (newStatus) => {
    setStatusUpdating(true); setError('');
    try {
      const { data } = await api.patch(`/rides/${id}/status`, { status: newStatus });
      setRide(prev => ({ ...prev, status: newStatus }));
      showToast(`Ride marked as ${newStatus}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socket) return;
    socket.emit('send_message', { rideId: ride.id, text: chatMessage });
    setChatMessage('');
  };

  if (error && !ride) return <div style={{maxWidth:600, margin:'0 auto', padding: '2rem'}}><Card><p className="text-danger">{error}</p><Link to="/"><Button variant="outline">Back</Button></Link></Card></div>;
  if (!ride) return <div className="flex-center" style={{height:'300px'}}><div className="animate-pulse">Loading ride details...</div></div>;

  return (
    <div className="grid-cols-2" style={{ maxWidth: '1100px', margin: '0 auto', alignItems: 'start' }}>
      
      {/* LEFT COL: INFO */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
             <h1 className="text-title" style={{ fontSize: '2rem' }}>Ride Details</h1>
             <span className="badge" style={{ padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, background: ride.status==='active'?'var(--pk-primary-light)':'var(--pk-surface)', color: ride.status==='active'?'var(--pk-primary)':'var(--pk-text-muted)', textTransform:'uppercase' }}>
               {ride.status}
             </span>
          </div>
          
          {error && <div style={{ padding: '0.75rem', background: 'var(--pk-danger-bg)', color: 'var(--pk-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>{error}</div>}

          <Card>
             <h3 style={{ marginBottom: '1rem' }}>Route</h3>
             <div style={{ paddingLeft: '1rem', borderLeft: '2px dashed var(--pk-border)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-6px', top: '0', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--pk-primary)' }}></div>
                <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{ride.originAddress || `${ride.originLat.toFixed(4)}, ${ride.originLng.toFixed(4)}`}</p>
                <p className="text-sm text-muted">Pick-up Location</p>
                
                <div style={{ height: '1.5rem' }}></div>

                <div style={{ position: 'absolute', left: '-6px', bottom: '2rem', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--pk-accent)' }}></div>
                <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{ride.destAddress || `${ride.destLat.toFixed(4)}, ${ride.destLng.toFixed(4)}`}</p>
                <p className="text-sm text-muted">Drop-off Location</p>
             </div>

             <div style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem' }}>
                <div>
                   <p className="text-sm text-muted">Departure</p>
                   <p style={{ fontWeight: 600 }}>{new Date(ride.departureAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div>
                   <p className="text-sm text-muted">Available Seats</p>
                   <p style={{ fontWeight: 600, color: seatsRemaining===0?'var(--pk-danger)':'var(--pk-success)' }}>{seatsRemaining} / {ride.maxSeats}</p>
                </div>
             </div>
          </Card>

          {routeInfo && (
            <Card>
               <h3 style={{ marginBottom: '1rem' }}>Cost Breakdown (Est.)</h3>
               <div className="flex-between" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--pk-border)' }}>
                  <span className="text-muted">Total Distance</span>
                  <span>{routeInfo.distanceKm?.toFixed(1) || routeInfo.distance_km?.toFixed(1) || 0} km</span>
               </div>
               <div className="flex-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--pk-border)' }}>
                  <span className="text-muted">Total Fuel Cost</span>
                  <span>₹{routeInfo.totalFuelCost || routeInfo.fuel_cost_total || "--"}</span>
               </div>
               <div className="flex-between" style={{ paddingTop: '0.5rem', fontWeight: 600, color: 'var(--pk-primary)', fontSize: '1.1rem' }}>
                  <span>Split per person</span>
                  <span>₹{routeInfo.costPerPerson || routeInfo.cost_per_passenger || "--"}</span>
               </div>
            </Card>
          )}

          <Card style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
             <Link to={`/rides/${id}/map`} style={{ flex: 1 }}><Button variant="outline" style={{width:'100%'}}>View Live Map</Button></Link>
             
             {canJoin && <Button onClick={handleJoin} isLoading={joining} style={{ flex: 1 }}>Join Carpool</Button>}
             
             {isDriver && ride.status === 'scheduled' && <Button onClick={() => handleStatusUpdate('active')} isLoading={statusUpdating} style={{ flex: 1 }}>Start Ride</Button>}
             {isDriver && ride.status === 'active' && <Button variant="outline" style={{ borderColor:'var(--pk-success)', color:'var(--pk-success)', flex: 1 }} onClick={() => handleStatusUpdate('completed')} isLoading={statusUpdating}>End Ride</Button>}
             
             {isPassenger && <Button variant="outline" style={{ borderColor:'var(--pk-danger)', color:'var(--pk-danger)' }} onClick={handleLeave} isLoading={leaving}>Leave carpool</Button>}
          </Card>
      </div>

      {/* RIGHT COL: CHAT & PASSENGERS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <Card>
           <h3 style={{ marginBottom: '1rem' }}>Manifest</h3>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--pk-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {ride.driver?.name?.charAt(0) || 'D'}
              </div>
              <div>
                 <p style={{ margin: 0, fontWeight: 500 }}>{ride.driver?.name} <span style={{fontSize:'0.75rem', color:'var(--pk-primary)', background:'var(--pk-primary-light)', padding:'0.1rem 0.3rem', borderRadius:'2px'}}>Driver</span></p>
                 <p className="text-sm text-muted" style={{ margin: 0 }}>{ride.driver?.totalRides || 0} rides • ★4.9</p>
              </div>
           </div>

           {ride.passengers?.map((p, i) => (
             <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--pk-border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--pk-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {p.user?.name?.charAt(0) || 'P'}
                </div>
                <p style={{ margin: 0, fontWeight: 500, fontSize:'0.9rem' }}>{p.user?.name}</p>
             </div>
           ))}
        </Card>

        {canChat && (
          <Card style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
             <h3 style={{ marginBottom: '0.5rem', pb:'0.5rem', borderBottom:'1px solid var(--pk-border)' }}>In-Ride Chat</h3>
             
             <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               {messages.length === 0 ? (
                 <p className="text-muted text-sm text-center" style={{marginTop:'auto', marginBottom:'auto'}}>No messages yet. Say hi!</p>
               ) : (
                 messages.map((msg, idx) => {
                   const isMe = msg.sender?.id === user.id || msg.senderId === user.id;
                   return (
                     <div key={idx} style={{ 
                         alignSelf: isMe ? 'flex-end' : 'flex-start', 
                         maxWidth: '85%',
                         background: isMe ? 'var(--pk-primary)' : 'var(--pk-surface)',
                         color: isMe ? '#fff' : 'var(--pk-text)',
                         padding: '0.5rem 0.75rem',
                         borderRadius: 'var(--radius-md)',
                         borderBottomRightRadius: isMe ? '2px' : 'var(--radius-md)',
                         borderBottomLeftRadius: isMe ? 'var(--radius-md)' : '2px',
                     }}>
                        {!isMe && <span style={{ fontSize: '0.7rem', display: 'block', marginBottom: '2px', opacity: 0.7 }}>{msg.sender?.name || 'User'}</span>}
                        <span style={{ fontSize: '0.9rem' }}>{msg.text}</span>
                     </div>
                   );
                 })
               )}
               <div ref={chatEndRef} />
             </div>

             <form onSubmit={sendChat} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Input 
                  placeholder="Message driver/passengers..." 
                  value={chatMessage} 
                  onChange={(e) => setChatMessage(e.target.value)} 
                  className="flex-1" 
                  style={{ marginBottom: 0 }}
                />
                <Button type="submit" style={{ padding: '0.5rem 1rem' }}>Send</Button>
             </form>
          </Card>
        )}

      </div>
    </div>
  );
}
