import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const { user, logout } = useAuth();
  
  if (!user) return null;

  return (
    <aside className="sidebar glass-panel animate-slide-up" style={{
      width: '260px', height: 'calc(100vh - 2rem)', position: 'fixed', left: '1rem', top: '1rem',
      padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', zIndex: 50
    }}>
      <div className="sidebar-brand" style={{ marginBottom: '3rem' }}>
        <h2 className="text-title text-gradient" style={{ fontSize: '1.75rem' }}>Carpool v2</h2>
        <p className="text-muted text-xs">SRM University</p>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        <NavLink to="/" end
          className={({isActive}) => isActive ? 'nav-link active' : 'nav-link' }
          style={navStyle}
        >
           <span style={iconStyle}>🏠</span> Dashboard
        </NavLink>
        <NavLink to="/post"
          className={({isActive}) => isActive ? 'nav-link active' : 'nav-link' }
          style={navStyle}
        >
           <span style={iconStyle}>➕</span> Post a Ride
        </NavLink>
        <NavLink to="/history"
          className={({isActive}) => isActive ? 'nav-link active' : 'nav-link' }
          style={navStyle}
        >
           <span style={iconStyle}>📜</span> Ride History
        </NavLink>
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid var(--pk-border)', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
           <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--pk-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user.name.charAt(0).toUpperCase()}
           </div>
           <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--pk-text-muted)', textTransform: 'capitalize' }}>{user.role}</p>
           </div>
        </div>
        <button onClick={logout} className="btn btn-outline" style={{ width: '100%', fontSize: '0.85rem' }}>Logout</button>
      </div>
    </aside>
  );
}

const navStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-md)',
  color: 'var(--pk-text)',
  fontWeight: 500,
  transition: 'var(--transition)'
};

const iconStyle = {
  marginRight: '0.75rem',
  fontSize: '1.25rem'
};

export default Sidebar;
