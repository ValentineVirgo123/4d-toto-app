const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const admin    = require('../firebase');
const { requireAuth } = require('../middleware/auth');

const db         = admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET || 'sglottery-secret-key-2026';

function makeToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if email already exists
    const existing = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const ref = await db.collection('users').add({
      email:        email.toLowerCase(),
      name:         name.trim(),
      passwordHash,
      createdAt:    admin.firestore.FieldValue.serverTimestamp(),
    });

    const user = { id: ref.id, email: email.toLowerCase(), name: name.trim() };
    res.status(201).json({ user, token: makeToken(user) });
  } catch (err) {
    console.error('[auth/register]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const snap = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (snap.empty) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const doc  = snap.docs[0];
    const data = doc.data();
    const ok   = await bcrypt.compare(password, data.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const user = { id: doc.id, email: data.email, name: data.name };
    res.json({ user, token: makeToken(user) });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.user.userId).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found.' });
    const { email, name, createdAt } = doc.data();
    res.json({ user: { id: doc.id, email, name, createdAt } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
