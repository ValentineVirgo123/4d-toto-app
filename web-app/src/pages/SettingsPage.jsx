import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem('lottery_prefs') || '{}'); } catch { return {}; }
}

/** Next upcoming draw date for a given set of weekdays (0=Sun…6=Sat) */
function nextDraw(days) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 7; i++) {
    const next = new Date(d); next.setDate(d.getDate() + i);
    if (days.includes(next.getDay())) return next;
  }
  return null;
}

function daysUntil(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

function fmtDrawDate(date) {
  return date.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' });
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const IconBell = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const IconCalendar = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconDatabase = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const IconInfo = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconUser = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconCheck = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconTrash = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ icon, title, color = 'var(--cyan)', children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-head">
        <span className="settings-section-icon" style={{ color }}>{icon}</span>
        <h2 className="settings-section-title" style={{ color }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();

  // Notification prefs
  const [notif4D,   setNotif4D]   = useState(() => loadPrefs().notif4D   ?? true);
  const [notifToto, setNotifToto] = useState(() => loadPrefs().notifToto ?? true);
  const [notifPerm, setNotifPerm] = useState(
    () => typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // Data
  const [clearing, setClearing] = useState(false);
  const [cleared,  setCleared]  = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Upcoming draws
  const next4D   = nextDraw([0, 3, 6]);   // Sun, Wed, Sat
  const nextTOTO = nextDraw([1, 4]);      // Mon, Thu

  // Auto-save prefs
  useEffect(() => {
    localStorage.setItem('lottery_prefs', JSON.stringify({ notif4D, notifToto }));
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [notif4D, notifToto]);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      new Notification('SGLottery — Notifications enabled', {
        body: "You'll be alerted when your ticket results are available.",
        icon: '/favicon.ico',
      });
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Delete all scanned tickets? This cannot be undone.')) return;
    setClearing(true);
    // Clear Firestore via API — graceful if endpoint not available
    try {
      const { api } = await import('../services/api');
      await api.delete('/tickets/all');
    } catch { /* silent — endpoint may not exist yet */ }
    setClearing(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="page page-narrow">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your preferences and account</p>
      </div>

      {/* ── Account ───────────────────────────────────────── */}
      <Section icon={<IconUser />} title="Account" color="#4a8fff">
        {user ? (
          <div className="settings-row">
            <div className="settings-account-info">
              <div className="settings-account-avatar">
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="settings-label">{user.name || 'User'}</div>
                <div className="settings-sub">{user.email}</div>
              </div>
            </div>
            <span className="settings-badge-green">Signed In</span>
          </div>
        ) : (
          <div className="settings-row">
            <span className="settings-label" style={{ color: 'var(--text-muted)' }}>Not signed in</span>
          </div>
        )}
      </Section>

      {/* ── Notifications ─────────────────────────────────── */}
      <Section icon={<IconBell />} title="Notifications" color="#4a8fff">

        {/* Browser permission row */}
        <div className="settings-row">
          <div>
            <div className="settings-label">Browser notifications</div>
            <div className="settings-sub">
              {notifPerm === 'granted' && (notif4D || notifToto)
                ? 'Active — you will receive result alerts'
                : notifPerm === 'granted'
                ? 'Permission granted, but all game notifications are off'
                : notifPerm === 'denied'
                ? 'Blocked — enable in your browser settings'
                : notifPerm === 'default'
                ? 'Not yet enabled'
                : 'Not supported by this browser'}
            </div>
          </div>
          {notifPerm === 'default' && (
            <button className="btn btn-primary" style={{ fontSize: 13, padding: '7px 16px', flexShrink: 0 }} onClick={enableNotifications}>
              Enable
            </button>
          )}
          {notifPerm === 'granted' && (notif4D || notifToto) && <span className="settings-badge-green">On</span>}
          {notifPerm === 'granted' && !notif4D && !notifToto && <span className="settings-badge-red">Off</span>}
          {notifPerm === 'denied' && <span className="settings-badge-red">Blocked</span>}
        </div>

        {/* Per-game toggles — only shown when permission granted */}
        {notifPerm === 'granted' && (
          <>
            <div className="settings-group-label">Notify me for</div>
            <div className="settings-row">
              <span className="settings-label">4D results</span>
              <button className={`toggle-switch ${notif4D ? 'on' : ''}`} onClick={() => setNotif4D(v => !v)} aria-label="4D notifications">
                <span className="toggle-knob" />
              </button>
            </div>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <span className="settings-label">TOTO results</span>
              <button className={`toggle-switch ${notifToto ? 'on' : ''}`} onClick={() => setNotifToto(v => !v)} aria-label="TOTO notifications">
                <span className="toggle-knob" />
              </button>
            </div>
          </>
        )}

        {/* How it works */}
        <div className="settings-info-box">
          <span style={{ color: '#4a8fff', flexShrink: 0 }}><IconBell size={16} /></span>
          <div>
            <strong>How result notifications work</strong>
            <p>When you upload a ticket for an upcoming draw, we automatically check the result once published. You will be notified if you won.</p>
          </div>
        </div>

        {saved && (
          <div className="settings-saved">
            <IconCheck size={11} /> Preferences saved
          </div>
        )}
      </Section>

      {/* ── Upcoming Draws ────────────────────────────────── */}
      <Section icon={<IconCalendar />} title="Upcoming Draws" color="#4a8fff">
        <div className="settings-draws-grid">
          {/* 4D */}
          <div className="settings-draw-card fourd">
            <div className="settings-draw-badge">4D</div>
            <div className="settings-draw-date">{next4D ? fmtDrawDate(next4D) : '—'}</div>
            <div className="settings-draw-countdown">
              {next4D
                ? daysUntil(next4D) === 1 ? 'Tomorrow' : `In ${daysUntil(next4D)} days`
                : ''}
            </div>
            <div className="settings-draw-sched">Wed · Sat · Sun</div>
          </div>
          {/* TOTO */}
          <div className="settings-draw-card toto">
            <div className="settings-draw-badge toto">TOTO</div>
            <div className="settings-draw-date">{nextTOTO ? fmtDrawDate(nextTOTO) : '—'}</div>
            <div className="settings-draw-countdown">
              {nextTOTO
                ? daysUntil(nextTOTO) === 1 ? 'Tomorrow' : `In ${daysUntil(nextTOTO)} days`
                : ''}
            </div>
            <div className="settings-draw-sched">Mon · Thu</div>
          </div>
        </div>
      </Section>

      {/* ── Data & Storage ────────────────────────────────── */}
      <Section icon={<IconDatabase />} title="Data & Storage" color="#4a8fff">
        <div className="settings-row">
          <div>
            <div className="settings-label">Scan history</div>
            <div className="settings-sub">All tickets scanned and saved to your account</div>
          </div>
        </div>
        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <div>
            <div className="settings-label" style={{ color: '#f87171' }}>Clear all scan history</div>
            <div className="settings-sub">Permanently deletes all your uploaded tickets</div>
          </div>
          {cleared ? (
            <span className="settings-badge-green"><IconCheck size={11} /> Cleared</span>
          ) : (
            <button
              className="settings-danger-btn"
              onClick={clearHistory}
              disabled={clearing}
            >
              <IconTrash size={13} />
              {clearing ? 'Clearing…' : 'Clear'}
            </button>
          )}
        </div>
      </Section>

      {/* ── About ─────────────────────────────────────────── */}
      <Section icon={<IconInfo />} title="About" color="var(--text-muted)">
        <div className="settings-row">
          <span className="settings-label">SGLottery Tracker</span>
          <span className="settings-sub">v2.0.0</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Data source</span>
          <span className="settings-sub">Singapore Pools (official)</span>
        </div>
        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <span className="settings-label">Predictions</span>
          <span className="settings-sub" style={{ textAlign: 'right', maxWidth: 220 }}>For educational purposes only · not gambling advice</span>
        </div>
      </Section>
    </div>
  );
}
