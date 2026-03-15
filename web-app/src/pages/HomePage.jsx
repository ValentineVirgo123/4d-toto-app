import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// ── Auth forms ────────────────────────────────────────────────────────────────

function AuthPanel() {
  const { login, register } = useAuth();
  const [mode, setMode]     = useState('login');
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!email.includes('@')) {
      setError('Please enter a valid email address (must include @).');
      return;
    }
    if (mode === 'register' && pw.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') await login(email, pw);
      else await register(name, email, pw);
    } catch (err) {
      const msg = err.message;
      if (msg === 'Failed to fetch') {
        setError(mode === 'login'
          ? 'Account not found. Please check your email and try again.'
          : 'Unable to create account. Please try again later.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const cardVariants = {
    hidden:  { opacity: 0, y: 40, scale: 0.96 },
    visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };
  const fieldVariants = {
    hidden:  { opacity: 0, x: -20 },
    visible: (i) => ({ opacity: 1, x: 0, transition: { delay: 0.2 + i * 0.08, duration: 0.35, ease: 'easeOut' } }),
  };

  return (
    <div className="auth-page">
      {/* Top-right corner: solid circle + 2 ripple rings */}
      <div className="auth-corner auth-corner-tr" />
      <div className="auth-corner auth-ring-tr" style={{ animationDelay: '1.3s' }} />
      <div className="auth-corner auth-ring-tr" style={{ animationDelay: '2.2s' }} />

      {/* Bottom-left corner: solid circle + 2 ripple rings */}
      <div className="auth-corner auth-corner-bl" />
      <div className="auth-corner auth-ring-bl" style={{ animationDelay: '1.3s' }} />
      <div className="auth-corner auth-ring-bl" style={{ animationDelay: '2.2s' }} />

      <motion.div
        className="auth-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div
          className="auth-logo-wrap"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
        >
          <div className="auth-logo-badge">4T</div>
          <p className="auth-logo-sub">4D &amp; TOTO</p>
        </motion.div>

        {/* Form */}
        <form className="auth-form" onSubmit={submit}>
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="name-field"
                className="auth-input-wrap"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="FULL NAME"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="auth-input-wrap" custom={0} variants={fieldVariants} initial="hidden" animate="visible">
            <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              className="auth-input"
              type="email"
              placeholder="USERNAME"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </motion.div>

          <motion.div className="auth-input-wrap" custom={1} variants={fieldVariants} initial="hidden" animate="visible">
            <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              className="auth-input"
              type="password"
              placeholder="PASSWORD"
              value={pw}
              onChange={e => setPw(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p
                className="auth-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
            <motion.button
              type="submit"
              className="auth-btn"
              disabled={loading}
              whileHover={{ scale: 1.02, backgroundColor: '#e8efff' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {loading ? 'PLEASE WAIT…' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
            </motion.button>
          </motion.div>
        </form>

        <motion.p
          className="auth-footer-link"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
        >
          {mode === 'login'
            ? <><span>Forgot password?</span> &nbsp;·&nbsp; No account? <span>Register</span></>
            : <>Already have an account? <span>Sign In</span></>
          }
        </motion.p>
      </motion.div>
    </div>
  );
}

// ── Authenticated hero ────────────────────────────────────────────────────────

const features = [
  { icon: '📸', color: 'red',    title: 'Instant Photo Upload',  desc: 'Snap a photo of your 4D or TOTO ticket. Supports gallery upload, drag-and-drop, and camera capture on mobile browsers.' },
  { icon: '🧠', color: 'purple', title: 'AI-Powered OCR',        desc: 'Automatically extracts numbers, draw dates, bet types, system categories, and combination counts from any ticket layout.' },
  { icon: '📋', color: 'gold',   title: 'Ticket History',        desc: 'All your scanned tickets are stored securely in the cloud. Filter by game type and review past entries any time.' },
  { icon: '⚡', color: 'cyan',   title: 'Works Everywhere',      desc: 'Fully responsive — use it on your desktop browser, mobile web, or as a native Android/iOS app via Expo.' },
];

const steps = [
  { n: 1, title: 'Capture Ticket',  desc: 'Take a photo or upload an image of your 4D / TOTO ticket.' },
  { n: 2, title: 'OCR Processing',  desc: 'Our engine reads and extracts all key information automatically.' },
  { n: 3, title: 'Review Results',  desc: 'Confirm game type, draw date, combinations and bet category.' },
  { n: 4, title: 'Saved to Cloud',  desc: 'Ticket is stored in Firestore — accessible across all your devices.' },
];

function HeroDashboard() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  return (
    <>
      <section className="hero">
        <div className="hero-eyebrow">
          <span>👋</span> Welcome back, {user.name}
        </div>

        <h1 className="hero-title">
          Scan Your Ticket.<br />
          <span className="highlight-red">Know Your Numbers.</span>
          <br />
          <span className="highlight-purple">Win Smarter.</span>
        </h1>

        <p className="hero-desc">
          Upload a photo of any Singapore 4D or TOTO ticket and let our
          AI instantly extract your numbers, draw dates, and bet details —
          no manual input required.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/upload')}>
            📸 &nbsp;Scan a Ticket
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/history')}>
            📋 &nbsp;View History
          </button>
        </div>
      </section>

      <div className="features-grid">
        {features.map(f => (
          <div className="feature-card" key={f.title}>
            <div className={`feature-icon ${f.color}`}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      <section className="how-section">
        <h2>How It Works</h2>
        <p>From ticket to data in seconds</p>
        <div className="steps">
          {steps.map(s => (
            <div className="step" key={s.n}>
              <div className="step-num">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ padding: '0 24px 80px', maxWidth: 860, margin: '0 auto' }}>
        <div className="home-cta-banner">
          <h2>Ready to scan your ticket?</h2>
          <p>Upload a photo now and let our OCR engine do the rest.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/upload')}>
            Get Started
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page entry ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();
  return user ? <HeroDashboard /> : <AuthPanel />;
}
