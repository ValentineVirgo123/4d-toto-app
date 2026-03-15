import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BASE_URL } from '../services/api';

const links = [
  { to: '/',        label: 'Home'     },
  { to: '/upload',  label: 'Scan'     },
  { to: '/history', label: 'History'  },
  { to: '/results', label: 'Results'  },
  { to: '/predict', label: 'Predict'  },
];

function BellIcon({ count }) {
  return (
    <div className="navbar-bell">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && <span className="bell-badge">{count > 9 ? '9+' : count}</span>}
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread notification count
  useEffect(() => {
    const check = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      try {
        const res  = await fetch(`${BASE_URL}/tickets?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const count = (data.tickets || []).filter(t => t.notification && !t.notification.read).length;
        setUnreadCount(count);
      } catch { /* silent */ }
    };
    if (user) { check(); }
    const iv = setInterval(() => { if (user) check(); }, 60000);
    return () => clearInterval(iv);
  }, [user]);

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <div className="navbar-logo">4T</div>
        <span className="navbar-title">SG<span>Lottery</span></span>
      </div>

      <div className="navbar-links">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <NavLink to="/settings" className="navbar-bell-link" title="Notifications &amp; Settings">
            <BellIcon count={unreadCount} />
          </NavLink>
        )}

        {user ? (
          <div className="navbar-user">
            <NavLink to="/settings" className="navbar-username">{user.name}</NavLink>
            <button className="btn btn-secondary navbar-logout" onClick={logout}>Log Out</button>
          </div>
        ) : (
          <button className="navbar-cta" onClick={() => navigate('/')}>Sign In</button>
        )}
      </div>
    </nav>
  );
}
