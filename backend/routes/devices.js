/**
 * Device push token registration
 * POST /api/devices/register  — save Expo push token to Firestore
 */
const express = require('express');
const router  = express.Router();
const admin   = require('../firebase');
const db      = admin.firestore();

// POST /api/devices/register
router.post('/register', async (req, res) => {
  const { token, platform } = req.body;
  if (!token || !token.startsWith('ExponentPushToken[')) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }

  try {
    await db.collection('devices').doc(token).set({
      token,
      platform: platform || 'unknown',
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`[devices] Registered token: ${token}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[devices] Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
