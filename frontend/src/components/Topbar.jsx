import React from 'react';
import { useAuth } from '../context/AuthContext';

function Topbar() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <header className="glass-nav flex-between animate-slide-up" style={{
      height: '70px', padding: '0 2rem', borderRadius: 'var(--radius-md)',
      position: 'sticky', top: '1rem', zIndex: 40, marginLeft: '280px', marginRight: '1rem'
    }}>
       <div>
         <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Welcome back, {user.name.split(' ')[0]} 👋</h1>
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--pk-success)' }}>{user.totalCarbonSaved || 0}kg CO₂ Saved</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--pk-text-muted)' }}>{user.totalRides || 0} Rides total</span>
         </div>
       </div>
    </header>
  );
}

export default Topbar;
