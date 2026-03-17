import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../context/AuthContext';

function Layout({ children }) {
  const { token } = useAuth();

  // If not logged in, just render children (like Login/Register pages)
  if (!token) {
    return <main>{children}</main>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--pk-bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, paddingBottom: '2rem' }}>
        <Topbar />
        <main className="animate-slide-up" style={{ 
            marginLeft: '280px', 
            marginRight: '1rem', 
            marginTop: '2rem',
            animationDelay: '0.1s' 
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
