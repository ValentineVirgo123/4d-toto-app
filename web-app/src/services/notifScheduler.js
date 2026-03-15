/**
 * Notification Scheduler
 * Schedules draw-result notifications for future-draw tickets.
 * Persists to localStorage so they survive page refreshes.
 *
 * Singapore Pools result release times (SGT = UTC+8):
 *   4D  (Wed/Sat/Sun) → 18:30 SGT
 *   TOTO (Mon/Thu)    → 21:30 SGT
 */

const KEY = 'sglottery_pending_notifs';

// Active setTimeout handles keyed by notification id
const activeTimers = new Map();

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse DD/MM/YY or DD/MM/YYYY → { day, month, year } */
function parseDraw(dateStr) {
  const m = String(dateStr || '').match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
  return { day: parseInt(m[1]), month: parseInt(m[2]), year };
}

/** Build UTC timestamp for result-release time in SGT (UTC+8) */
function resultFireAt(dateStr, game) {
  const d = parseDraw(dateStr);
  if (!d) return null;
  const [hour, min] = game === 'TOTO' ? [21, 30] : [18, 30]; // SGT
  // SGT = UTC+8, so subtract 8h to get UTC
  return new Date(Date.UTC(d.year, d.month - 1, d.day, hour - 8, min, 0)).getTime();
}

/** True if notifications are allowed and user enabled for this game */
function notifAllowed(game) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const prefs = JSON.parse(localStorage.getItem('lottery_prefs') || '{}');
    if (game === '4D')   return prefs.notif4D   !== false;
    if (game === 'TOTO') return prefs.notifToto !== false;
  } catch { /* empty */ }
  return true;
}

// ── Storage ───────────────────────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// ── Fire a WIN notification ────────────────────────────────────────────────────

function fireWin(entry, prizeTier) {
  if (!notifAllowed(entry.game)) return;

  const prize = prizeTier ? ` — ${prizeTier}` : '';
  const title = `You won! ${entry.game} Draw ${entry.drawDate}${prize}`;
  const body  = `Congratulations! Your ${entry.game} ticket for ${entry.drawDate} is a winner. Open SGLottery to see your prize details.`;

  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `win-${entry.ticketId}`,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (e) {
    console.warn('[notifScheduler] Notification failed:', e.message);
  }
}

// ── Check ticket result via API, then notify only if won ──────────────────────

async function checkAndNotify(entry) {
  if (!notifAllowed(entry.game)) return;

  try {
    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3001/api';
    const res  = await fetch(`${apiBase}/results/check/${entry.ticketId}`, { method: 'POST', headers });
    if (!res.ok) {
      console.warn('[notifScheduler] Check API returned', res.status, '— skipping notification');
      return;
    }

    const data = await res.json();
    console.log(`[notifScheduler] Check result for ${entry.ticketId}:`, data.won, data.prizeTier);

    if (data.won) {
      fireWin(entry, data.prizeTier);
    }
    // If not won → silent. User is not bothered.
  } catch (err) {
    console.warn('[notifScheduler] Could not check result:', err.message);
    // Network error / backend down — skip notification silently
  }
}

// ── Remove a single entry ──────────────────────────────────────────────────────

function remove(id) {
  if (activeTimers.has(id)) {
    clearTimeout(activeTimers.get(id));
    activeTimers.delete(id);
  }
  save(load().filter(e => e.id !== id));
}

// ── Schedule one entry for this session ───────────────────────────────────────

function scheduleTimer(entry) {
  const delay = entry.fireAt - Date.now();
  if (delay <= 0) return; // already due — caller handles this
  if (delay > 48 * 60 * 60 * 1000) return; // > 48h away — don't set timer, rely on re-check on load

  if (activeTimers.has(entry.id)) clearTimeout(activeTimers.get(entry.id));

  const handle = setTimeout(() => {
    checkAndNotify(entry);
    remove(entry.id);
  }, delay);

  activeTimers.set(entry.id, handle);
  console.log(`[notifScheduler] Timer set for "${entry.game} ${entry.drawDate}" in ${Math.round(delay / 60000)} min`);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Schedule a draw-result notification for a ticket.
 * Safe to call even if permission not yet granted — it will be checked at fire time.
 */
export function scheduleDrawNotification(ticket) {
  const { id: ticketId, gameType: game, drawDate, serialNumber } = ticket;
  if (!ticketId || !game || !drawDate) return;

  const fireAt = resultFireAt(drawDate, game);
  if (!fireAt || fireAt <= Date.now()) return; // draw already past

  const id    = `${ticketId}-${drawDate}`;
  const list  = load();

  // Avoid duplicates
  if (list.find(e => e.id === id)) return;

  const entry = { id, ticketId, game, drawDate, serial: serialNumber || null, fireAt };
  save([...list, entry]);
  scheduleTimer(entry);

  console.log(`[notifScheduler] Scheduled notification: ${game} ${drawDate} → ${new Date(fireAt).toLocaleString('en-SG')}`);
}

/**
 * Cancel a scheduled notification for a ticket (e.g. ticket deleted).
 */
export function cancelDrawNotification(ticketId) {
  const list = load();
  list.filter(e => e.ticketId === ticketId).forEach(e => remove(e.id));
}

/**
 * Called on app load + periodically.
 * Fires any overdue notifications and sets timers for upcoming ones.
 */
export function checkPendingNotifications() {
  const now  = Date.now();
  const list = load();
  const keep = [];

  for (const entry of list) {
    if (entry.fireAt <= now) {
      // Overdue — fire immediately (result should be available)
      checkAndNotify(entry);
      if (activeTimers.has(entry.id)) {
        clearTimeout(activeTimers.get(entry.id));
        activeTimers.delete(entry.id);
      }
      // keep in list for 10 more minutes in case of re-check, then remove
      if (now - entry.fireAt < 10 * 60 * 1000) keep.push(entry);
    } else {
      keep.push(entry);
      scheduleTimer(entry); // (re)set timer for this session
    }
  }

  if (keep.length !== list.length) save(keep);
}

/**
 * Returns all pending scheduled notifications (for display in UI).
 */
export function getPendingNotifications() {
  return load().filter(e => e.fireAt > Date.now());
}
