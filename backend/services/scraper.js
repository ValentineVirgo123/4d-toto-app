/**
 * Singapore Pools Results Scraper
 * Scrapes 4D and TOTO official results from Singapore Pools.
 * Falls back to cached Firestore data, then mock data for offline demo.
 */

const puppeteer = require('puppeteer');
const admin     = require('../firebase');

const db = admin.firestore();

// ── Singapore Pools URLs ──────────────────────────────────────────────────────
const SP_4D_URL   = 'https://www.singaporepools.com.sg/en/product/pages/4d_results.aspx';
const SP_TOTO_URL = 'https://www.singaporepools.com.sg/en/product/pages/toto_results.aspx';

// ── Puppeteer browser singleton ───────────────────────────────────────────────
let _browser = null;
async function getBrowser() {
  if (!_browser || !_browser.connected) {
    _browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return _browser;
}

// ── Parse date string in various SP formats → DD/MM/YYYY ──────────────────────
const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
function parseSpDate(text) {
  if (!text) return null;
  // "15 Mar 2026" or "Sunday, 15 Mar 2026"
  const m = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (m) {
    const mon = MONTHS[m[2].slice(0,3).toLowerCase()];
    if (mon) return `${m[1].padStart(2,'0')}/${String(mon).padStart(2,'0')}/${m[3]}`;
  }
  // DD/MM/YYYY or DD/MM/YY
  const m2 = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m2) {
    const y = m2[3].length === 2 ? 2000 + parseInt(m2[3]) : parseInt(m2[3]);
    return `${m2[1].padStart(2,'0')}/${m2[2].padStart(2,'0')}/${y}`;
  }
  return null;
}

// Extract the LATEST draw date from SP page.
// Singapore Pools shows "Next Draw Date: 18 Mar" BEFORE "Draw Date: 15 Mar",
// so we must skip any candidate date that is in the future.
function extractLatestDrawDate(pageText) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const parts = pageText.split(/Draw\s+Date/i);
  for (let i = 1; i < parts.length; i++) {
    const d = parseSpDate(parts[i]);
    if (!d) continue;
    const [dd, mm, yyyy] = d.split('/').map(Number);
    const candidate = new Date(yyyy, mm - 1, dd);
    if (candidate <= todayEnd) return d;   // first non-future date wins
  }
  return null;
}

// ── Puppeteer: scrape 4D results page ─────────────────────────────────────────
async function puppeteerScrape4D(drawDate) {
  const browser = await getBrowser();
  const page    = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const url = drawDate
      ? `${SP_4D_URL}?drawing-dt=${encodeURIComponent(drawDate)}`
      : SP_4D_URL;

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForFunction(
      () => [...document.querySelectorAll('td, span, div, li')]
              .some(el => /^\d{4}$/.test(el.textContent.trim())),
      { timeout: 15000 }
    ).catch(() => {});

    const data = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Log first 800 chars to help debug SP page structure
      return {
        preview:    bodyText.slice(0, 800),
        title:      document.title,
        drawNumber: (bodyText.match(/Draw\s*(?:No\.?|Number)\s*[:\-]?\s*(\d{3,5})/i) || [])[1] || null,
        nums: (() => {
          const seen = new Set();
          const arr  = [];
          document.querySelectorAll('td, span, div, li, p, strong, b').forEach(el => {
            const t = el.textContent.trim();
            if (/^\d{4}$/.test(t) && !seen.has(t)) { seen.add(t); arr.push(t); }
          });
          return arr;
        })(),
      };
    });

    console.log('[4D page title]', data.title);
    console.log('[4D nums found]', data.nums.slice(0, 5));

    // Extract the LATEST draw date (first date under "Draw Date" section, not "Next Draw")
    const parsedDate = extractLatestDrawDate(data.preview) || drawDate;
    const drawNumber = parsedDate ? estimate4DDrawNumber(parsedDate) : null;
    console.log('[4D parsed date]', parsedDate, '→ Draw No.', drawNumber);

    if (data.nums.length >= 3) {
      return {
        drawDate:    parsedDate,
        drawNumber,
        first:       data.nums[0],
        second:      data.nums[1],
        third:       data.nums[2],
        starters:    data.nums.slice(3, 13),
        consolation: data.nums.slice(13, 23),
        source:      'live',
      };
    }
    return null;
  } catch (err) {
    console.warn('[puppeteer] 4D scrape error:', err.message);
    return null;
  } finally {
    await page.close();
  }
}

// ── Puppeteer: scrape TOTO results page ───────────────────────────────────────
async function puppeteerScrapeTOTO(drawDate) {
  const browser = await getBrowser();
  const page    = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const url = drawDate
      ? `${SP_TOTO_URL}?drawing-dt=${encodeURIComponent(drawDate)}`
      : SP_TOTO_URL;

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForFunction(
      () => [...document.querySelectorAll('td, span, div, li')]
              .some(el => { const n = parseInt(el.textContent.trim()); return n >= 1 && n <= 49; }),
      { timeout: 15000 }
    ).catch(() => {});

    const data = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      const drawNoMatch = bodyText.match(/Draw\s*(?:No\.?|Number)\s*[:\-]?\s*(\d{3,5})/i);
      const drawNumber  = drawNoMatch?.[1] || null;

      const prizeMatch  = bodyText.match(/\$[\d,]+/);
      const group1Prize = prizeMatch?.[0] || null;

      const seen = new Set();
      const nums = [];
      document.querySelectorAll('td, span, div, li, p, strong, b').forEach(el => {
        const t = el.textContent.trim();
        const n = parseInt(t);
        if (n >= 1 && n <= 49 && t === String(n) && !seen.has(n)) {
          seen.add(n);
          nums.push(n);
        }
      });

      return { preview: bodyText.slice(0, 800), title: document.title, drawNumber, group1Prize, nums };
    });

    console.log('[TOTO page title]', data.title);
    console.log('[TOTO nums found]', data.nums.slice(0, 8));

    const parsedDate = extractLatestDrawDate(data.preview) || drawDate;
    const drawNumber = parsedDate ? estimateTOTODrawNumber(parsedDate) : null;
    console.log('[TOTO parsed date]', parsedDate, '→ Draw No.', drawNumber);

    if (data.nums.length >= 7) {
      return {
        drawDate:    parsedDate,
        drawNumber,
        winningNums: data.nums.slice(0, 6),
        addlNum:     data.nums[6],
        group1Prize: data.group1Prize,
        source:      'live',
      };
    }
    return null;
  } catch (err) {
    console.warn('[puppeteer] TOTO scrape error:', err.message);
    return null;
  } finally {
    await page.close();
  }
}

// ── Mock data for offline demo / scraping fallback ────────────────────────────
function getMock4DResults(drawDate) {
  const r4 = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const date = drawDate || '07/03/2026';
  return {
    drawDate:    date,
    drawNumber:  estimate4DDrawNumber(date),
    first:       r4(),
    second:      r4(),
    third:       r4(),
    starters:    Array.from({ length: 10 }, r4),
    consolation: Array.from({ length: 10 }, r4),
    source:      'mock',
  };
}

function getMockTOTOResults(drawDate) {
  const date = drawDate || '06/03/2026';
  const nums = randTOTO7();
  return {
    drawDate:    date,
    drawNumber:  estimateTOTODrawNumber(date),
    winningNums: nums.slice(0, 6).sort((a, b) => a - b),
    addlNum:     nums[6],
    source:      'mock',
  };
}

// ── Normalise DD/MM/YY or DD/MM/YYYY → DD/MM/YYYY ────────────────────────────
function normaliseDateStr(str) {
  const p = parseSpDate(str);  // reuses existing parser
  return p || str;
}

// True when the scraped result's date matches what was requested
function dateMatches(requestedStr, resultDateStr) {
  if (!requestedStr) return true;          // no specific date requested — always OK
  return normaliseDateStr(requestedStr) === normaliseDateStr(resultDateStr);
}

// ── 4D Scraper ────────────────────────────────────────────────────────────────

async function scrape4DResults(drawDate) {
  // 1. Check Firestore cache first
  if (drawDate) {
    const normDate = normaliseDateStr(drawDate);
    const cached = await db.collection('results_4d')
      .where('drawDate', '==', normDate).limit(1).get();
    if (!cached.empty) {
      return { ...cached.docs[0].data(), source: 'cache' };
    }
  }

  // 2. Try live scrape via Puppeteer
  try {
    const result = await puppeteerScrape4D(drawDate);
    if (result) {
      // Guard: SP always returns its latest draw — reject if the date doesn't match
      if (!dateMatches(drawDate, result.drawDate)) {
        console.log(`[scraper] 4D date mismatch — requested ${drawDate}, got ${result.drawDate}. Returning null.`);
        return null;
      }
      const existSnap = await db.collection('results_4d')
        .where('drawDate', '==', result.drawDate).get();
      await Promise.all(existSnap.docs.map(d => d.ref.delete()));
      await db.collection('results_4d').add({
        ...result,
        scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('[scraper] 4D live scrape success:', result.drawDate);
      return result;
    }
  } catch (err) {
    console.warn('[scraper] 4D live scrape failed:', err.message);
  }

  // 3. If a specific date was requested and nothing matched → return null (no mock for wrong date)
  if (drawDate) {
    console.log(`[scraper] No 4D result found for ${drawDate}`);
    return null;
  }

  // 4. No specific date — fallback to mock for default "latest" view
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
    const normDate = normaliseDateStr(drawDate);
    const cached = await db.collection('results_toto')
      .where('drawDate', '==', normDate).limit(1).get();
    if (!cached.empty) {
      return { ...cached.docs[0].data(), source: 'cache' };
    }
  }

  try {
    const result = await puppeteerScrapeTOTO(drawDate);
    if (result) {
      // Guard: SP always returns its latest draw — reject if the date doesn't match
      if (!dateMatches(drawDate, result.drawDate)) {
        console.log(`[scraper] TOTO date mismatch — requested ${drawDate}, got ${result.drawDate}. Returning null.`);
        return null;
      }
      const existSnap = await db.collection('results_toto')
        .where('drawDate', '==', result.drawDate).get();
      await Promise.all(existSnap.docs.map(d => d.ref.delete()));
      await db.collection('results_toto').add({
        ...result,
        scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('[scraper] TOTO live scrape success:', result.drawDate);
      return result;
    }
  } catch (err) {
    console.warn('[scraper] TOTO live scrape failed:', err.message);
  }

  if (drawDate) {
    console.log(`[scraper] No TOTO result found for ${drawDate}`);
    return null;
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

// Parse DD/MM/YYYY or DD/MM/YY → timestamp for sorting newest first
function parseDrawDate(str) {
  if (!str) return 0;
  const [dd, mm, yyyy] = str.split('/');
  if (!dd || !mm || !yyyy) return 0;
  const year = parseInt(yyyy);
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, parseInt(mm) - 1, parseInt(dd)).getTime() || 0;
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

// Count actual 4D draw days (Wed=3, Sat=6, Sun=0) between two timestamps
function count4DDrawDays(fromMs, toMs) {
  let count = 0;
  const d = new Date(fromMs);
  const target = new Date(toMs);
  d.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const step = fromMs <= toMs ? 1 : -1;
  d.setDate(d.getDate() + step);
  while (step === 1 ? d <= target : d >= target) {
    const day = d.getDay();
    if (day === 0 || day === 3 || day === 6) count++;
    d.setDate(d.getDate() + step);
  }
  return count * step;
}

// Count actual TOTO draw days (Mon=1, Thu=4) between two timestamps
function countTOTODrawDays(fromMs, toMs) {
  let count = 0;
  const d = new Date(fromMs);
  const target = new Date(toMs);
  d.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const step = fromMs <= toMs ? 1 : -1;
  d.setDate(d.getDate() + step);
  while (step === 1 ? d <= target : d >= target) {
    const day = d.getDay();
    if (day === 1 || day === 4) count++;
    d.setDate(d.getDate() + step);
  }
  return count * step;
}

// Anchor: Draw 4522 = Sat 15/03/2026 (verified from live scrape)
function estimate4DDrawNumber(drawDateStr, baseDrawNo = 4522, baseDateStr = '15/03/2026') {
  const t    = parseDrawDate(drawDateStr);
  const base = parseDrawDate(baseDateStr);
  if (!t || !base) return String(baseDrawNo);
  return String(Math.max(1, baseDrawNo + count4DDrawDays(base, t)));
}

// Anchor: Draw 3926 = Thu 05/03/2026
function estimateTOTODrawNumber(drawDateStr, baseDrawNo = 3926, baseDateStr = '05/03/2026') {
  const t    = parseDrawDate(drawDateStr);
  const base = parseDrawDate(baseDateStr);
  if (!t || !base) return String(baseDrawNo);
  return String(Math.max(1, baseDrawNo + countTOTODrawDays(base, t)));
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

// Convert DD/MM/YYYY or DD/MM/YY → YYYY-MM-DD for string comparison
function toISO(drawDate) {
  const [dd, mm, yyyy] = (drawDate || '').split('/');
  if (!dd || !mm || !yyyy) return '';
  const year = parseInt(yyyy);
  const fullYear = year < 100 ? 2000 + year : year;
  return `${fullYear}-${String(parseInt(mm)).padStart(2,'0')}-${String(parseInt(dd)).padStart(2,'0')}`;
}

// ── Auto-populate Firestore with last 30 draws (always regenerate mock data) ──
async function ensureResultsPopulated() {
  try {
    const [snap4d, snapTOTO] = await Promise.all([
      db.collection('results_4d').get(),
      db.collection('results_toto').get(),
    ]);

    // Always clear and regenerate mock data so draw numbers are always correct.
    // Real scraped data (source: 'live' or 'cache') is preserved.
    console.log('[scraper] Regenerating mock history with correct draw numbers...');

    // Clear only mock records — preserve any real scraped data (source: 'live')
    const batch = db.batch();
    snap4d.forEach(doc => { if (doc.data().source !== 'live') batch.delete(doc.ref); });
    snapTOTO.forEach(doc => { if (doc.data().source !== 'live') batch.delete(doc.ref); });
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
