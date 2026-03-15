import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { BASE_URL } from '../services/api';

const NAV_ITEMS = [
  {
    to: '/upload', label: 'Upload Ticket',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12l4-4 4 4"/>
      </svg>
    ),
  },
  {
    to: '/results', label: 'Results',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Ticket shape with semicircular notches on left and right */}
        <path d="M3 6 L21 6 Q23 6 23 8 L23 10 A2 2 0 0 0 23 14 L23 16 Q23 18 21 18 L3 18 Q1 18 1 16 L1 14 A2 2 0 0 0 1 10 L1 8 Q1 6 3 6 Z"/>
        {/* Perforated centre line */}
        <line x1="12" y1="7" x2="12" y2="17" strokeDasharray="2 1.5"/>
      </svg>
    ),
  },
  {
    to: '/history', label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/>
      </svg>
    ),
  },
  {
    to: '/predict', label: 'Predict',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
  },
  {
    to: '/settings', label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate   = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen]  = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      try {
        const res  = await fetch(`${BASE_URL}/tickets?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        setUnread((data.tickets || []).filter(t => t.notification && !t.notification.read).length);
      } catch { /* silent */ }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [user]);

  if (!user) return null;

  return (
    <>
      {/* Backdrop when open */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className="sidebar"
        initial={false}
        animate={{ width: open ? 220 : 68 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Toggle / Logo */}
        <button className="sidebar-toggle" onClick={() => setOpen(o => !o)}>
          <div className="sidebar-logo-icon">4T</div>
          <AnimatePresence>
            {open && (
              <motion.span
                className="sidebar-brand-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                SG<span>Lottery</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
              title={label}
            >
              <span className="sidebar-item-icon">{icon}</span>
              <AnimatePresence>
                {open && (
                  <motion.span
                    className="sidebar-item-label"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {label}
                    {label === 'Settings' && unread > 0 && (
                      <span className="sidebar-badge">{unread > 9 ? '9+' : unread}</span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* User + logout at bottom */}
        <div className="sidebar-footer">
          <AnimatePresence>
            {open && (
              <motion.div
                className="sidebar-user"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="sidebar-username">{user.name}</span>
                <button className="sidebar-logout" onClick={logout}>Out</button>
              </motion.div>
            )}
          </AnimatePresence>
          {!open && (
            <button className="sidebar-logout-icon" onClick={logout} title="Log Out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
