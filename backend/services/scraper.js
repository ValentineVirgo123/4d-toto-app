/**
 * Singapore Pools Results Scraper
 * Scrapes 4D and TOTO official results from Singapore Pools.
 * Falls back to cached Firestore data, then mock data for offline demo.
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const admin   = require('../firebase');

const db = admin.firestore();

// ── Headers to mimic a browser ────────────────────────────────────────────────
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-SG,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Referer: 'https://www.singaporepools.com.sg/',
  Origin:  'https://www.singaporepools.com.sg',
};

// ── Singapore Pools URLs ──────────────────────────────────────────────────────
const SP_4D_URL   = 'https://www.singaporepools.com.sg/en/product/pages/4d_results.aspx';
const SP_TOTO_URL = 'https://www.singaporepools.com.sg/en/product/pages/toto_results.aspx';

// ── Mock data for offline demo / scraping fallback ────────────────────────────
function getMock4DResults(drawDate) {
  return {
    drawDate:   drawDate || '07/03/2026',
    drawNumber: '4518',
    first:      '3829',
    second:     '7164',
    third:      '0547',
    starters:   ['1234', '5678', '9012', '3456', '7890', '2345', '6789', '0123', '4567', '8901'],
    consolation:['1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '0000'],
    source:     'mock',
  };
}

function getMockTOTOResults(drawDate) {
  return {
    drawDate:    drawDate || '06/03/2026',
    drawNumber:  '3926',
    winningNums: [4, 15, 22, 33, 41, 46],
    addlNum:     7,
    jackpot:     '$3,200,000',
    source:      'mock',
  };
}

// ── 4D Scraper ────────────────────────────────────────────────────────────────

async function scrape4DResults(drawDate) {
  // 1. Check Firestore cache first
  if (drawDate) {
    const cached = await db.collection('results_4d')
      .where('drawDate', '==', drawDate).limit(1).get();
    if (!cached.empty) {
      return { ...cached.docs[0].data(), source: 'cache' };
    }
  }

  // 2. Try live scrape
  try {
    const resp = await axios.get(SP_4D_URL, { headers: HEADERS, timeout: 12000 });
    const $    = cheerio.load(resp.data);

    // Singapore Pools 4D result structure
    const result = {};

    // Draw date
    const dateEl = $('[class*="drawDate"], .draw-date, .drawDate, h2, h3')
      .filter((_, el) => /\d{2}\/\d{2}\/\d{4}/.test($(el).text()))
      .first();
    result.drawDate = dateEl.text().match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || drawDate;

    // Prize numbers
    const nums = [];
    $('td, .prize-number, .winNum').each((_, el) => {
      const t = $(el).text().trim();
      if (/^\d{4}$/.test(t)) nums.push(t);
    });

    if (nums.length >= 3) {
      result.first      = nums[0];
      result.second     = nums[1];
      result.third      = nums[2];
      result.starters   = nums.slice(3, 13);
      result.consolation= nums.slice(13, 23);
      result.source     = 'live';

      // Upsert: remove any existing record for this draw date before caching
      result.source = 'live';
      const existSnap = await db.collection('results_4d')
        .where('drawDate', '==', result.drawDate).get();
      await Promise.all(existSnap.docs.map(d => d.ref.delete()));
      await db.collection('results_4d').add({
        ...result,
        scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return result;
    }
  } catch (err) {
    console.warn('[scraper] 4D live scrape failed:', err.message);
  }

  // 3. Fallback — only save mock if nothing is cached for today
  console.log('[scraper] Using mock 4D data');
  const mock = getMock4DResults(drawDate);
  const todaySnap = await db.collection('results_4d')
    .where('drawDate', '==', mock.drawDate).limit(1).get().catch(() => ({ empty: true }));
  if (todaySnap.empty) {
    await db.collection('results_4d').add({
      ...mock,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  }
  return mock;
}

// ── TOTO Scraper ──────────────────────────────────────────────────────────────

async function scrapeTOTOResults(drawDate) {
  if (drawDate) {
    const cached = await db.collection('results_toto')
      .where('drawDate', '==', drawDate).limit(1).get();
    if (!cached.empty) {
      return { ...cached.docs[0].data(), source: 'cache' };
    }
  }

  try {
    const resp = await axios.get(SP_TOTO_URL, { headers: HEADERS, timeout: 12000 });
    const $    = cheerio.load(resp.data);

    const result = {};

    const dateEl = $('[class*="drawDate"], .draw-date, h2, h3')
      .filter((_, el) => /\d{2}\/\d{2}\/\d{4}/.test($(el).text()))
      .first();
    result.drawDate = dateEl.text().match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || drawDate;

    // TOTO winning numbers (1–49)
    const nums = [];
    $('td, .ball, .totoNum, .winning-number').each((_, el) => {
      const n = parseInt($(el).text().trim());
      if (n >= 1 && n <= 49) nums.push(n);
    });

    if (nums.length >= 7) {
      result.winningNums = nums.slice(0, 6);
      result.addlNum     = nums[6];
      result.source      = 'live';

      // Upsert
      const existSnap = await db.collection('results_toto')
        .where('drawDate', '==', result.drawDate).get();
      await Promise.all(existSnap.docs.map(d => d.ref.delete()));
      await db.collection('results_toto').add({
        ...result,
        scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return result;
    }
  } catch (err) {
    console.warn('[scraper] TOTO live scrape failed:', err.message);
  }

  console.log('[scraper] Using mock TOTO data');
  const mock = getMockTOTOResults(drawDate);
  const todaySnap = await db.collection('results_toto')
    .where('drawDate', '==', mock.drawDate).limit(1).get().catch(() => ({ empty: true }));
  if (todaySnap.empty) {
    await db.collection('results_toto').add({
      ...mock,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  }
  return mock;
}

// ── Bulk Past Results (for Predictions + History) ─────────────────────────────

// Parse DD/MM/YYYY → timestamp for sorting newest first
function parseDrawDate(str) {
  if (!str) return 0;
  const [dd, mm, yyyy] = str.split('/');
  return new Date(`${yyyy}-${mm}-${dd}`).getTime() || 0;
}

async function getPast4DResults(limit = 50) {
  const snap = await db.collection('results_4d').get();
  if (!snap.empty) {
    // Deduplicate by drawDate, keep newest scrapedAt per date, sort newest draw first
    const byDate = {};
    for (const doc of snap.docs) {
      const d = doc.data();
      const key = d.drawDate || '';
      const ts = d.scrapedAt?.toMillis?.() || 0;
      if (!byDate[key] || ts > byDate[key]._ts) {
        byDate[key] = { ...d, _ts: ts };
      }
    }
    return Object.values(byDate)
      .sort((a, b) => parseDrawDate(b.drawDate) - parseDrawDate(a.drawDate))
      .slice(0, limit)
      .map(({ _ts, ...rest }) => rest);
  }
  return generateMock4DHistory(limit);
}

async function getPastTOTOResults(limit = 100) {
  const snap = await db.collection('results_toto').get();
  if (!snap.empty) {
    const byDate = {};
    for (const doc of snap.docs) {
      const d = doc.data();
      const key = d.drawDate || '';
      const ts = d.scrapedAt?.toMillis?.() || 0;
      if (!byDate[key] || ts > byDate[key]._ts) {
        byDate[key] = { ...d, _ts: ts };
      }
    }
    return Object.values(byDate)
      .sort((a, b) => parseDrawDate(b.drawDate) - parseDrawDate(a.drawDate))
      .slice(0, limit)
      .map(({ _ts, ...rest }) => rest);
  }
  return generateMockTOTOHistory(limit);
}

// ── Singapore Pools draw schedule ─────────────────────────────────────────────
// 4D:  Wednesday (3), Saturday (6), Sunday (0)
// TOTO: Monday (1), Thursday (4)

function fmtDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function rand4D() { return String(Math.floor(Math.random() * 10000)).padStart(4, '0'); }

function randTOTO7() {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 7);
}

// Returns last N past draw dates for 4D (Wed/Sat/Sun), from today backwards
function recentDraw4DDates(n) {
  const dates = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (dates.length < n) {
    const day = d.getDay();
    if (day === 0 || day === 3 || day === 6) dates.push(fmtDate(new Date(d)));
    d.setDate(d.getDate() - 1);
  }
  return dates; // newest first
}

// Returns last N past draw dates for TOTO (Mon/Thu), from today backwards
function recentDrawTOTODates(n) {
  const dates = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (dates.length < n) {
    const day = d.getDay();
    if (day === 1 || day === 4) dates.push(fmtDate(new Date(d)));
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

// Base 4D draw number anchored to a known real draw (Draw 4518 = 07/03/2026 Fri — use offset)
// 4D has ~3 draws/week ≈ 156/year. Draw 4518 was around early March 2026.
function estimate4DDrawNumber(drawDateStr, baseDrawNo = 4518, baseDateStr = '07/03/2026') {
  const t = parseDrawDate(drawDateStr);
  const base = parseDrawDate(baseDateStr);
  const diffDays = Math.round((t - base) / 86400000);
  const diffDraws = Math.round(diffDays * 3 / 7);
  return String(Math.max(1, baseDrawNo + diffDraws));
}

// TOTO draw number: ~2 draws/week. Draw 3926 around early March 2026.
function estimateTOTODrawNumber(drawDateStr, baseDrawNo = 3926, baseDateStr = '06/03/2026') {
  const t = parseDrawDate(drawDateStr);
  const base = parseDrawDate(baseDateStr);
  const diffDays = Math.round((t - base) / 86400000);
  const diffDraws = Math.round(diffDays * 2 / 7);
  return String(Math.max(1, baseDrawNo + diffDraws));
}

function generateMock4DHistory(count) {
  const dates = recentDraw4DDates(count);
  return dates.map((drawDate, i) => ({
    drawDate,
    drawNumber:  estimate4DDrawNumber(drawDate),
    first:       rand4D(),
    second:      rand4D(),
    third:       rand4D(),
    starters:    Array.from({ length: 10 }, rand4D),
    consolation: Array.from({ length: 10 }, rand4D),
    source:      'mock',
  }));
}

function generateMockTOTOHistory(count) {
  const dates = recentDrawTOTODates(count);
  return dates.map((drawDate) => {
    const nums = randTOTO7();
    return {
      drawDate,
      drawNumber:  estimateTOTODrawNumber(drawDate),
      winningNums: nums.slice(0, 6).sort((a, b) => a - b),
      addlNum:     nums[6],
      source:      'mock',
    };
  });
}

// Returns today's date as YYYY-MM-DD string (local, no UTC drift)
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Returns the cutoff date string for N days ago as YYYY-MM-DD
function cutoffStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Convert DD/MM/YYYY → YYYY-MM-DD for string comparison
function toISO(drawDate) {
  const [dd, mm, yyyy] = (drawDate || '').split('/');
  return `${yyyy}-${mm}-${dd}`;
}

// ── Auto-populate Firestore with last 30 draws if no RECENT data exists ───────
async function ensureResultsPopulated() {
  try {
    const recentCutoff = cutoffStr(6); // last 7 days inclusive

    const [snap4d, snapTOTO] = await Promise.all([
      db.collection('results_4d').get(),
      db.collection('results_toto').get(),
    ]);

    const hasRecent4D = snap4d.docs.some(d => toISO(d.data().drawDate) >= recentCutoff);
    const hasRecentTOTO = snapTOTO.docs.some(d => toISO(d.data().drawDate) >= recentCutoff);

    // If both 4D and TOTO already have at least one draw in the last 7 days, keep existing data.
    if (hasRecent4D && hasRecentTOTO) {
      return;
    }

    console.log('[scraper] No recent draws in last 7 days — resetting mock history.');

    // Clear ALL existing mock data before regenerating, so we don't keep stale February dates.
    const batch = db.batch();
    snap4d.forEach(doc => batch.delete(doc.ref));
    snapTOTO.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Regenerate fresh mock data from "today backwards"
    const history4d = generateMock4DHistory(30);
    const historyToto = generateMockTOTOHistory(30);

    const batch2 = db.batch();
    history4d.forEach(r => {
      batch2.set(db.collection('results_4d').doc(), {
        ...r,
        scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    historyToto.forEach(r => {
      batch2.set(db.collection('results_toto').doc(), {
        ...r,
        scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch2.commit();
    console.log('[scraper] 4D & TOTO mock history regenerated.');
  } catch (err) {
    console.warn('[scraper] Auto-populate failed:', err.message);
  }
}

module.exports = {
  scrape4DResults,
  scrapeTOTOResults,
  getPast4DResults,
  getPastTOTOResults,
  ensureResultsPopulated,
};
