/**
 * Expo Push Notification sender
 * Sends push notifications to all registered devices via Expo Push API
 */
const { Expo } = require('expo-server-sdk');
const admin    = require('../firebase');
const db       = admin.firestore();

const expo = new Expo();

/**
 * Send a push notification to all registered devices
 * @param {string} title
 * @param {string} body
 * @param {object} data  — extra payload sent to the app
 */
async function sendPushToAll(title, body, data = {}) {
  try {
    // Load all registered device tokens
    const snap = await db.collection('devices').get();
    if (snap.empty) {
      console.log('[push] No registered devices');
      return;
    }

    const tokens = snap.docs.map(d => d.data().token).filter(t => Expo.isExpoPushToken(t));
    if (!tokens.length) {
      console.log('[push] No valid Expo push tokens');
      return;
    }

    // Build messages
    const messages = tokens.map(to => ({ to, title, body, data, sound: 'default' }));

    // Send in chunks (Expo limit: 100 per request)
    const chunks   = expo.chunkPushNotifications(messages);
    const receipts = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        receipts.push(...ticketChunk);
        console.log(`[push] Sent chunk of ${chunk.length} notifications`);
      } catch (err) {
        console.error('[push] Chunk send error:', err.message);
      }
    }

    // Log any errors from Expo
    for (const receipt of receipts) {
      if (receipt.status === 'error') {
        console.error('[push] Delivery error:', receipt.message, receipt.details);
      }
    }
  } catch (err) {
    console.error('[push] sendPushToAll error:', err.message);
  }
}

/**
 * Send a push notification to a specific device token
 */
async function sendPushToToken(token, title, body, data = {}) {
  if (!Expo.isExpoPushToken(token)) {
    console.warn('[push] Invalid token:', token);
    return;
  }
  try {
    const [receipt] = await expo.sendPushNotificationsAsync([
      { to: token, title, body, data, sound: 'default' },
    ]);
    if (receipt?.status === 'error') {
      console.error('[push] Delivery error:', receipt.message);
    } else {
      console.log(`[push] Sent to ${token}`);
    }
  } catch (err) {
    console.error('[push] sendPushToToken error:', err.message);
  }
}

module.exports = { sendPushToAll, sendPushToToken };
