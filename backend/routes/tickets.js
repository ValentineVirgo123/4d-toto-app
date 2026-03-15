const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const Tesseract = require('tesseract.js');
const sharp    = require('sharp');
const admin    = require('../firebase');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const upload   = multer({ storage: multer.memoryStorage() });
const { expandSystemBet, formatCombinations } = require('../services/combinations');
const { classifyDrawDate, compare4DTicket, compareTOTOTicket } = require('../services/matcher');
const { scrape4DResults, scrapeTOTOResults } = require('../services/scraper');

const db = admin.firestore();

// ─── Enhanced OCR Parser ────────────────────────────────────────────────────

function parseTicketText(rawText) {
  const upper = rawText.toUpperCase();

  // ── Game Type ──────────────────────────────────────────────────────────────
  // TOTO tickets always contain the word "TOTO".
  // 4D System Bet tickets (System 5/6/7) do NOT contain "TOTO".
  const isTOTO  = upper.includes('TOTO');
  const gameType = isTOTO ? 'TOTO' : '4D';

  // ── Normalise OCR date separators ─────────────────────────────────────────
  const normText = rawText
    .replace(/(\d{1,2})\s*[\|\.]\s*(\d{1,2})\s*[\|\.]\s*(\d{2,4})/g, '$1/$2/$3');

  // ── Purchase date: the timestamp line (DD/MM/YY HH:MM AM/PM) ──────────────
  // This appears directly below the DRAW line on Singapore Pools tickets.
  const purchaseTsMatch = normText.match(
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+\d{1,2}:\d{2}/
  );
  const ticketPurchaseDate = purchaseTsMatch ? purchaseTsMatch[1] : null;

  // ── Draw Date ──────────────────────────────────────────────────────────────
  // Priority 1: from the DRAW line only (no newline crossing)
  const drawLineMatch =
    normText.match(/DRAW[^\n]{0,30}?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
    normText.match(/(?:MON|TUE|WED|THU|FRI|SAT|SUN)[^\n]{0,15}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  const drawDates = [];
  if (drawLineMatch) drawDates.push(drawLineMatch[1]);

  // Priority 2: any other date-like patterns — but NEVER the purchase timestamp
  const dateRegexes = [
    /\b(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\b/g,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
    /\b(\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/g,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4})\b/gi,
  ];
  for (const re of dateRegexes) {
    for (const m of normText.matchAll(re)) {
      if (!drawDates.includes(m[1]) && m[1] !== ticketPurchaseDate) {
        drawDates.push(m[1]);
      }
    }
  }
  const drawDate = drawDates[0] || null;

  // ── Numbers & Bet Type ─────────────────────────────────────────────────────
  let combinations = [];
  let betType = 'Ordinary';
  let systemSize = null;
  let combinationCount = 0;

  // Helper: find where the footer starts (PRICE or DRAW line)
  const footerIdx = (() => {
    const p = rawText.search(/PRICE\s*[:\s$]/i);
    const d = rawText.search(/\bDRAW\b/i);
    const hits = [p, d].filter(n => n > 0);
    return hits.length ? Math.min(...hits) : rawText.length;
  })();
  const bodyText = rawText.slice(0, footerIdx);

  if (gameType === '4D') {
    const seen  = new Set();
    // Search the full text (not just bodyText) for letter-labelled numbers —
    // the A./B. prefix is strong enough to avoid false positives in serial lines.
    const searchText = rawText;
    const lines = searchText.split('\n');

    // Strategy 1 — alphabet-iteration rule (primary):
    // Tickets print numbers as "A. 5888", "B:4392", "C . 1234" etc.
    // Iterate A→Z in order; find each letter at a word boundary followed by
    // optional separator chars (., :, spaces — up to 5 chars) then a 4-digit number.
    // This preserves the original ticket ordering.
    for (let code = 65; code <= 90; code++) {          // A=65 … Z=90
      const letter = String.fromCharCode(code);
      // Pattern: word-boundary + letter + optional [.:space]* + 4 digits
      const re = new RegExp(`(?:^|[\\s,;])${letter}[\\s.:]{0,5}(\\d{4})\\b`, 'gm');
      for (const m of searchText.matchAll(re)) {
        if (!seen.has(m[1])) { seen.add(m[1]); combinations.push(m[1]); }
      }
    }

    // Strategy 1B — letter-anchor digit-squeeze:
    // Handles OCR that inserts spaces inside numbers, e.g. "A. 5 888" → "5888".
    // For each line starting with a capital letter + separator, strip all
    // non-digit chars from the remainder and take the first 4 digits as the number.
    for (const line of lines) {
      const labelM = line.match(/^([A-Z])\s*[.:\s]\s*(.{1,20})/);
      if (!labelM) continue;
      const digits = labelM[2].replace(/[^0-9]/g, '');
      if (digits.length >= 4) {
        const num = digits.slice(0, 4);
        if (!seen.has(num)) { seen.add(num); combinations.push(num); }
      }
    }

    // Strategy 2 — BIG/SML anchor (catches OCR-split lines where letter+number
    // end up on different lines, e.g. "B" on line N, "4392 BIG…" on line N+1).
    // Scan ALL preceding lines (up to 5) so both A and B numbers are found even
    // when multiple BIG/SML lines appear back-to-back.
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/\bBIG\b|\bSML\b/i.test(line)) continue;
      // Check the BIG/SML line itself first (merged-line case)
      for (const m of line.matchAll(/(?<![-/])\b(\d{4})\b(?![-/])/g)) {
        if (!seen.has(m[1])) { seen.add(m[1]); combinations.push(m[1]); }
      }
      // Look back up to 5 lines — do NOT break early; collect every 4-digit number found
      for (let back = 1; back <= 5; back++) {
        if (i - back < 0) break;
        const prev = lines[i - back].trim();
        // Stop scanning back once we hit a non-number line that isn't a letter label
        if (prev && !/^\d{4}$/.test(prev) && !/^[A-Z]\s*[.:]/.test(prev) && back > 2) break;
        for (const m of prev.matchAll(/(?<![-/])\b(\d{4})\b(?![-/])/g)) {
          if (!seen.has(m[1])) { seen.add(m[1]); combinations.push(m[1]); }
        }
      }
    }

    // Fallback: all 4-digit numbers in the body (heavily degraded scan)
    if (combinations.length === 0) {
      combinations = [...new Set(
        [...bodyText.matchAll(/(?<![-/])\b(\d{4})\b(?![-/])/g)].map(m => m[1])
      )];
    }

    console.log('[ocr] combinations:', combinations);

    // ── 4D bet type detection ──────────────────────────────────────────────────
    // Priority: iBet → 4D Roll → System Entry → Ordinary
    const sys4dMatch = rawText.match(/System\s*(5|6|7)\b/i);
    const hasRollDigit = /\bR\b/.test(rawText) || combinations.some(n => /R/i.test(n));

    if (upper.includes('IBET') || upper.includes('I-BET')) {
      betType = 'iBet';
      // iBet: count unique permutations of the number (fewer for repeated digits)
      if (combinations.length > 0) {
        const digits = combinations[0].split('');
        const perms = new Set();
        const permute = (arr, cur = '') => {
          if (!arr.length) { perms.add(cur); return; }
          for (let i = 0; i < arr.length; i++)
            permute([...arr.slice(0, i), ...arr.slice(i + 1)], cur + arr[i]);
        };
        permute(digits);
        combinationCount = perms.size * combinations.length;
      }
    } else if (hasRollDigit || /\bROLL\b/i.test(rawText)) {
      betType = '4D Roll';
      combinationCount = 10 * combinations.length; // each Roll covers 10 combos
    } else if (sys4dMatch) {
      systemSize = parseInt(sys4dMatch[1]);
      betType = 'System Entry';
      // System 5 → C(5,4)=5, System 6 → C(6,4)=15, System 7 → C(7,4)=35
      const sys4dComboMap = { 5: 5, 6: 15, 7: 35 };
      combinationCount = sys4dComboMap[systemSize] || combinations.length || 1;
    } else {
      betType = 'Ordinary';
    }
    if (!combinationCount) combinationCount = combinations.length || 1;

  } else {
    // TOTO ──────────────────────────────────────────────────────────────────
    // Bet types: Standard (default), System 7–12, Quick Pick, Group TOTO
    betType = 'Standard';
    const sysMatch = rawText.match(/System\s*(7|8|9|10|11|12)\b/i);
    if (sysMatch) {
      systemSize = parseInt(sysMatch[1]);
      betType = `System ${systemSize}`;
      const sysComboMap = { 7: 7, 8: 28, 9: 84, 10: 210, 11: 462, 12: 924 };
      combinationCount = sysComboMap[systemSize] || 0;
    } else if (upper.includes('GROUP')) {
      betType = 'Group TOTO';
    } else if (upper.includes('QUICK PICK') || /\bQP\b/.test(upper)) {
      betType = 'Quick Pick';
    }

    if (systemSize) {
      // ── System Bet: extract ALL valid TOTO numbers (n >= systemSize numbers needed) ──
      // Strategy: labeled rows first, then broad body scan.
      const seenNums = new Set();
      const allNums  = [];

      // Pass 1 – labeled rows (may contain > 6 numbers for system bets)
      for (const line of bodyText.split('\n')) {
        const labelM = line.match(/^\s*[A-Z]\s*[\.:]?\s*([\d\s]{3,})/);
        if (labelM) {
          for (const m of labelM[1].matchAll(/\b(\d{1,2})\b/g)) {
            const n = parseInt(m[1]);
            if (n >= 1 && n <= 49 && !seenNums.has(n)) { seenNums.add(n); allNums.push(n); }
          }
        }
      }

      // Pass 2 – any line with 2+ valid TOTO numbers
      for (const line of bodyText.split('\n')) {
        const nums = [...line.matchAll(/\b(\d{1,2})\b/g)]
          .map(m => parseInt(m[1])).filter(n => n >= 1 && n <= 49);
        for (const n of nums) {
          if (!seenNums.has(n)) { seenNums.add(n); allNums.push(n); }
        }
      }

      // Pass 3 – last resort: full body scan
      if (allNums.length < systemSize) {
        for (const m of bodyText.matchAll(/\b(\d{1,2})\b/g)) {
          const n = parseInt(m[1]);
          if (n >= 1 && n <= 49 && !seenNums.has(n)) { seenNums.add(n); allNums.push(n); }
        }
      }

      if (allNums.length >= 6) {
        const systemNumbers = allNums.slice(0, systemSize);
        combinations = [systemNumbers.map(n => String(n).padStart(2, '0')).join('  ')];
        // Recalculate combinationCount based on actual numbers found
        if (allNums.length >= systemSize) {
          const sysComboMap = { 7: 7, 8: 28, 9: 84, 10: 210, 11: 462, 12: 924 };
          combinationCount = sysComboMap[systemSize] || combinationCount;
        }
      }
    } else {
      // ── Standard / Quick Pick: extract exactly-6-number rows ──────────────
      const seen = new Set();
      for (const line of rawText.split('\n')) {
        // Labeled TOTO row: "A. 01 05 11 22 34 45"
        const labelM = line.match(/^\s*[A-Z]\s*[\.:]?\s*((?:\d{1,2}[ \t]+){5}\d{1,2})/);
        if (labelM) {
          const valid = labelM[1].trim().split(/\s+/)
            .map(n => parseInt(n)).filter(n => n >= 1 && n <= 49);
          if (valid.length >= 6) {
            const row = valid.slice(0, 6).map(n => String(n).padStart(2, '0')).join('  ');
            if (!seen.has(row)) { seen.add(row); combinations.push(row); }
            continue;
          }
        }
        // Generic 6-number row
        const nums = line.match(/\b(\d{1,2})\b/g);
        if (!nums) continue;
        const valid = nums.map(n => parseInt(n)).filter(n => n >= 1 && n <= 49);
        if (valid.length === 6) {
          const row = valid.map(n => String(n).padStart(2, '0')).join('  ');
          if (!seen.has(row)) { seen.add(row); combinations.push(row); }
        }
      }
    }

    if (combinationCount === 0) combinationCount = combinations.length || 1;
  }

  // ── Ticket Serial Number ───────────────────────────────────────────────────
  // Serial always starts with a digit and sits right after the AM/PM timestamp.
  let serialNumber = null;
  const afterTimestamp = rawText.match(/\d{1,2}:\d{2}\s*(?:AM|PM)([\s\S]{0,120})/i);
  if (afterTimestamp) {
    // Grab the first run of digits+dashes+spaces after the timestamp (handles both "846367-8-..." and "846367 8 ...")
    const m = afterTimestamp[1].match(/(\d[\d\s\-]{8,})/);
    if (m) serialNumber = m[1].trim().replace(/\s+/g, '');
  }

  // ── Amount Paid ────────────────────────────────────────────────────────────
  let amount = null;
  const amtMatch = rawText.match(/PRICE\s*[:\-]?\s*\$\s*(\d+(?:\.\d{1,2})?)/i)
                || rawText.match(/TOTAL\s*[:\-]?\s*\$\s*(\d+(?:\.\d{1,2})?)/i);
  if (amtMatch) amount = parseFloat(amtMatch[1]);

  return {
    gameType,
    drawDate,
    ...(drawDates.length > 1 ? { drawDates } : {}),
    ...(ticketPurchaseDate ? { ticketPurchaseDate } : {}),
    numbers: combinations,
    combinationCount,
    betType,
    ...(systemSize   ? { systemSize }   : {}),
    ...(serialNumber ? { serialNumber } : {}),
    ...(amount       ? { amount }       : {}),
  };
}

// ─── POST /upload ───────────────────────────────────────────────────────────

router.post('/upload', optionalAuth, upload.single('ticket'), async (req, res) => {
  console.log('[upload] Request received');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // ── OCR: OCR.Space first (free API, handles watermarked tickets well),
    // Tesseract with HSV watermark removal as fallback.
    let text = '';
    let ocrEngine = 'tesseract';

    try {
      // Resize to max 1600px before sending to stay under OCR.Space 5MB limit
      const ocrImageBuffer = await sharp(req.file.buffer)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      const base64Image = `data:image/jpeg;base64,${ocrImageBuffer.toString('base64')}`;
      const body = new URLSearchParams({
        base64Image,
        language:          'eng',
        OCREngine:         '2',
        scale:             'true',
        isTable:           'false',
        detectOrientation: 'true',
      });

      const ocrRes  = await fetch('https://api.ocr.space/parse/image', {
        method:  'POST',
        headers: {
          apikey:         process.env.OCRSPACE_API_KEY || 'helloworld',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const ocrData  = await ocrRes.json();
      const detected = ocrData.ParsedResults?.[0]?.ParsedText?.trim() || '';

      if (detected.length > 20) {
        text      = detected;
        ocrEngine = 'ocr.space';
        console.log('[upload] OCR via OCR.Space, length:', text.length);
      } else {
        throw new Error('OCR.Space returned too little text');
      }
    } catch (ocrSpaceErr) {
      console.warn('[upload] OCR.Space unavailable, falling back to Tesseract:', ocrSpaceErr.message);

      // ── Watermark removal: Singapore Pools tickets have a red/pink watermark.
      // Use HSV to identify only saturated red pixels and replace with white —
      // black ticket text (zero saturation) is never touched.
      const metadata = await sharp(req.file.buffer).metadata();
      const resized  = await sharp(req.file.buffer)
        .resize({
          width:  Math.max(metadata.width  || 0, 2400),
          height: Math.max(metadata.height || 0, 2400),
          fit: 'inside',
          withoutEnlargement: false,
        })
        .toColorspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data: rawPixels, info } = resized;
      const ch = info.channels;
      for (let i = 0; i < rawPixels.length; i += ch) {
        const r = rawPixels[i]     / 255;
        const g = rawPixels[i + 1] / 255;
        const b = rawPixels[i + 2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        const sat = max === 0 ? 0 : delta / max;
        let hue = 0;
        if (delta > 0) {
          if (max === r)      hue = ((g - b) / delta) % 6;
          else if (max === g) hue = (b - r)  / delta + 2;
          else                hue = (r - g)  / delta + 4;
          hue = hue * 60;
          if (hue < 0) hue += 360;
        }
        if ((hue < 30 || hue > 330) && sat > 0.18) {
          rawPixels[i] = rawPixels[i + 1] = rawPixels[i + 2] = 255;
          if (ch === 4) rawPixels[i + 3] = 255;
        }
      }

      const processedBuffer = await sharp(rawPixels, {
        raw: { width: info.width, height: info.height, channels: ch },
      })
        .grayscale()
        .normalise()
        .png()
        .toBuffer();

      console.log('[upload] Watermark removal applied, running Tesseract...');
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({ tessedit_pageseg_mode: '3' });
      const { data: { text: tesseractText } } = await worker.recognize(processedBuffer);
      await worker.terminate();
      text = tesseractText;
    }

    console.log(`[upload] OCR engine: ${ocrEngine}, text length: ${text.length}`);

    console.log('[upload] OCR complete, text length:', text.length);
    console.log('[upload] OCR raw text:\n---\n' + text + '\n---');
    const extracted = parseTicketText(text);
    console.log('[upload] Parsed result:', JSON.stringify(extracted));

    // ── Expand TOTO system bets into all C(n,6) combinations ──────────────
    let expandedCombinations = null;
    if (extracted.gameType === 'TOTO' && extracted.systemSize) {
      const rawNums = extracted.numbers.flatMap(row =>
        row.split(/\s+/).map(n => parseInt(n)).filter(n => n >= 1 && n <= 49)
      );
      if (rawNums.length >= extracted.systemSize) {
        const combos = expandSystemBet(rawNums, extracted.systemSize);
        expandedCombinations = formatCombinations(combos);
        console.log(`[upload] Expanded System ${extracted.systemSize}: ${expandedCombinations.length} combos`);
      }
    }

    // ── Upload image to Firebase Storage ─────────────────────────────────
    let imageUrl = null;
    try {
      const bucket = admin.storage().bucket();
      const fileName = `tickets/${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(fileName);
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });
      await file.makePublic();
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } catch (imgErr) {
      console.warn('[upload] Image storage skipped:', imgErr.message);
    }

    // ── Determine draw context (past vs future) ───────────────────────────
    const drawType = classifyDrawDate(extracted.drawDate);

    // ── Deduplication: reject if identical ticket already saved ───────────
    const fingerprint = [
      extracted.gameType,
      extracted.serialNumber || '',
      extracted.drawDate || (extracted.drawDates || []).join(','),
      (extracted.numbers || []).slice().sort().join('|'),
    ].join('::').toLowerCase();

    const dupeQuery = await db.collection('tickets')
      .where('fingerprint', '==', fingerprint)
      .limit(1)
      .get();

    if (!dupeQuery.empty) {
      const existing = dupeQuery.docs[0];
      return res.json({
        success: true,
        duplicate: true,
        ticketId: existing.id,
        filename: req.file.originalname,
        rawText: text,
        imageUrl: existing.data().imageUrl || null,
        drawType,
        expandedCombinationCount: existing.data().expandedCombinations?.length || null,
        comparison: null,
        officialResult: null,
        ...extracted,
      });
    }

    // ── Save ticket ───────────────────────────────────────────────────────
    const ticketRef = await db.collection('tickets').add({
      fingerprint,
      ...extracted,
      ...(expandedCombinations ? { expandedCombinations } : {}),
      filename:  req.file.originalname,
      imageUrl:  imageUrl || null,
      rawText:   text,
      drawType,
      resultStatus: 'pending',
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      // ticketPurchaseDate: the date printed on the ticket (e.g. "20/02/26")
      // purchaseDate: ISO timestamp of when this ticket was uploaded to the app
      purchaseDate: new Date().toISOString(),
      status: 'active',
      userId: req.user?.userId || null,
    });

    // ── For past draws: immediately check results ─────────────────────────
    let comparison = null;
    let officialResult = null;
    if (drawType === 'past') {
      try {
        officialResult = extracted.gameType === '4D'
          ? await scrape4DResults(extracted.drawDate)
          : await scrapeTOTOResults(extracted.drawDate);

        const ticketWithExpanded = {
          ...extracted,
          expandedCombinations,
        };
        comparison = extracted.gameType === '4D'
          ? compare4DTicket(ticketWithExpanded, officialResult)
          : compareTOTOTicket(ticketWithExpanded, officialResult);

        await db.collection('tickets').doc(ticketRef.id).update({
          resultStatus: comparison.won ? 'won' : 'not_won',
          prizeTier:    comparison.prizeTier || null,
          winMatches:   comparison.matches || [],
          resultChecked: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (resultErr) {
        console.warn('[upload] Result check skipped:', resultErr.message);
      }
    }

    res.json({
      success: true,
      ticketId: ticketRef.id,
      filename: req.file.originalname,
      rawText: text,
      imageUrl,
      drawType,
      expandedCombinationCount: expandedCombinations?.length || null,
      comparison,
      officialResult,
      ...extracted,
    });

  } catch (error) {
    console.error('[upload] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET / (list all tickets) ───────────────────────────────────────────────

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { gameType, limit } = req.query;
    const limitInt = parseInt(limit) || 50;
    // Build query with only equality filters (no orderBy) to avoid requiring
    // a composite Firestore index. Sort and slice in memory instead.
    let query = db.collection('tickets');
    if (req.user?.userId) {
      query = query.where('userId', '==', req.user.userId);
    }
    if (gameType === '4D' || gameType === 'TOTO') {
      query = query.where('gameType', '==', gameType);
    }
    const snapshot = await query.get();
    const all = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() || null,
      }))
      .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));

    // Deduplicate: keep only the first (newest) occurrence of each fingerprint.
    // For legacy records without a stored fingerprint, compute one on the fly.
    const makeFingerprint = (t) => [
      t.gameType || '',
      t.serialNumber || '',
      t.drawDate || (t.drawDates || []).join(','),
      (t.numbers || []).slice().sort().join('|'),
    ].join('::').toLowerCase();

    const seen = new Set();
    const tickets = [];
    for (const t of all) {
      const fp = t.fingerprint || makeFingerprint(t);
      if (!seen.has(fp)) { seen.add(fp); tickets.push(t); }
    }

    res.json({ tickets: tickets.slice(0, limitInt), total: tickets.length });
  } catch (error) {
    console.error('[list] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /:id ───────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('tickets').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Ticket not found' });
    res.json({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /:id/mark-read  (mark notification as read) ──────────────────────

router.patch('/:id/mark-read', optionalAuth, async (req, res) => {
  try {
    await db.collection('tickets').doc(req.params.id).update({
      'notification.read': true,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /:id ────────────────────────────────────────────────────────────

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.collection('tickets').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
