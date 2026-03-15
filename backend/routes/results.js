/**
 * /api/results
 * Fetch, cache, and serve Singapore Pools 4D and TOTO results.
 * Also handles ticket-vs-result comparison and notification triggers.
 */

const express = require('express');
const router  = express.Router();
const admin   = require('../firebase');
const { scrape4DResults, scrapeTOTOResults, getPast4DResults, getPastTOTOResults } = require('../services/scraper');

// Timezone-safe day filter: "days=7" means today + 6 previous days = 7 total
// e.g. today=15 Mar → cutoff=9 Mar → shows 9,10,11,12,13,14,15 Mar
function filterByDays(results, days) {
  const d = new Date();
  d.setDate(d.getDate() - (parseInt(days) - 1));
  const cutoff = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return results.filter(r => {
    const [dd, mm, yyyy] = (r.drawDate || '').split('/');
    if (!dd || !mm || !yyyy) return false;
    const fullYear = yyyy.length <= 2 ? String(2000 + parseInt(yyyy)) : yyyy;
    return `${fullYear}-${mm}-${dd}` >= cutoff;
  });
}
const { compare4DTicket, compareTOTOTicket, classifyDrawDate, check4DNumber, checkTOTOCombination } = require('../services/matcher');

const db = admin.firestore();

// ── GET /api/results/4d  ──────────────────────────────────────────────────────
// Returns the latest (or specified draw date) 4D results.
router.get('/4d', async (req, res) => {
  try {
    const { date, days, limit = 100 } = req.query;
    // Specific date search → fetch / scrape that draw
    if (date) {
      const result = await scrape4DResults(date);
      return res.json({ results: result ? [result] : [] });
    }
    const all = await getPast4DResults(parseInt(limit));
    res.json({ results: days ? filterByDays(all, days) : all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/results/toto ─────────────────────────────────────────────────────
router.get('/toto', async (req, res) => {
  try {
    const { date, days, limit = 100 } = req.query;
    if (date) {
      const result = await scrapeTOTOResults(date);
      return res.json({ results: result ? [result] : [] });
    }
    const all = await getPastTOTOResults(parseInt(limit));
    res.json({ results: days ? filterByDays(all, days) : all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/results/check/:ticketId ────────────────────────────────────────
// Manually trigger a result check for a specific ticket.
router.post('/check/:ticketId', async (req, res) => {
  try {
    const ticketDoc = await db.collection('tickets').doc(req.params.ticketId).get();
    if (!ticketDoc.exists) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = ticketDoc.data();
    const drawType = classifyDrawDate(ticket.drawDate);

    let officialResult, comparison;

    if (ticket.gameType === '4D') {
      officialResult = await scrape4DResults(ticket.drawDate);
      comparison     = compare4DTicket(ticket, officialResult);
    } else {
      officialResult = await scrapeTOTOResults(ticket.drawDate);
      comparison     = compareTOTOTicket(ticket, officialResult);
    }

    // Update Firestore ticket with result
    const update = {
      resultStatus:  comparison.won ? 'won' : 'not_won',
      prizeTier:     comparison.prizeTier || null,
      winMatches:    comparison.matches || [],
      resultChecked: admin.firestore.FieldValue.serverTimestamp(),
      drawType,
    };
    await db.collection('tickets').doc(req.params.ticketId).update(update);

    res.json({
      ticketId:           req.params.ticketId,
      drawType,
      won:                comparison.won,
      prizeTier:          comparison.prizeTier,
      matches:            comparison.matches,
      prizeBreakdown:     comparison.prizeBreakdown     || null,
      totalWinningCombos: comparison.totalWinningCombos || null,
      totalCombosChecked: comparison.totalCombosChecked || null,
      isSystemBet:        comparison.isSystemBet        || false,
      systemSize:         comparison.systemSize         || null,
      officialResult,
    });
  } catch (err) {
    console.error('[check] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/results/4d  (manual entry) ─────────────────────────────────────
// Body: { drawDate, drawNumber?, first, second, third, starters[], consolation[] }
router.post('/4d', async (req, res) => {
  try {
    const { drawDate, drawNumber, first, second, third, starters = [], consolation = [] } = req.body;
    if (!drawDate || !first || !second || !third) {
      return res.status(400).json({ error: 'drawDate, first, second, third are required' });
    }
    const result = {
      drawDate,
      drawNumber: drawNumber || null,
      first:       String(first).padStart(4, '0'),
      second:      String(second).padStart(4, '0'),
      third:       String(third).padStart(4, '0'),
      starters:    starters.map(n => String(n).trim().padStart(4, '0')).filter(n => /^\d{4}$/.test(n)),
      consolation: consolation.map(n => String(n).trim().padStart(4, '0')).filter(n => /^\d{4}$/.test(n)),
      source:      'manual',
      scrapedAt:   admin.firestore.FieldValue.serverTimestamp(),
    };
    // Upsert: replace any existing record for this draw date
    const existing = await db.collection('results_4d').where('drawDate', '==', drawDate).limit(1).get();
    if (!existing.empty) await existing.docs[0].ref.delete();
    const ref = await db.collection('results_4d').add(result);
    res.json({ success: true, id: ref.id, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/results/toto  (manual entry) ────────────────────────────────────
// Body: { drawDate, drawNumber?, winningNums[6], addlNum, group1Prize?, prizeGroups? }
// prizeGroups: [{ group, shareAmount, winningShares }]
router.post('/toto', async (req, res) => {
  try {
    const { drawDate, drawNumber, winningNums = [], addlNum, group1Prize, prizeGroups } = req.body;
    if (!drawDate || winningNums.length < 6 || !addlNum) {
      return res.status(400).json({ error: 'drawDate, winningNums (6), addlNum are required' });
    }
    const result = {
      drawDate,
      drawNumber:   drawNumber || null,
      winningNums:  winningNums.slice(0, 6).map(Number),
      addlNum:      Number(addlNum),
      group1Prize:  group1Prize || null,
      prizeGroups:  Array.isArray(prizeGroups) ? prizeGroups : [],
      source:       'manual',
      scrapedAt:    admin.firestore.FieldValue.serverTimestamp(),
    };
    const existing = await db.collection('results_toto').where('drawDate', '==', drawDate).limit(1).get();
    if (!existing.empty) await existing.docs[0].ref.delete();
    const ref = await db.collection('results_toto').add(result);
    res.json({ success: true, id: ref.id, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/results/lookup  (number checker) ─────────────────────────────────
// ?game=4d&number=1234&date=21/02/26
// ?game=toto&numbers=1,5,12,22,33,41&date=06/03/26
router.get('/lookup', async (req, res) => {
  try {
    const { game, number, numbers, date } = req.query;
    if (!game || !date) return res.status(400).json({ error: 'game and date are required' });

    if (game === '4d') {
      if (!number) return res.status(400).json({ error: 'number is required for 4D lookup' });
      const result = await scrape4DResults(date);
      const n = String(number).padStart(4, '0');
      const prize = check4DNumber(n, result);
      return res.json({ game: '4d', number: n, drawDate: date, prize: prize || null, won: !!prize, result });
    }

    if (game === 'toto') {
      if (!numbers) return res.status(400).json({ error: 'numbers is required for TOTO lookup' });
      const result = await scrapeTOTOResults(date);
      const combo  = numbers.split(',').map(n => parseInt(n.trim())).filter(n => n >= 1 && n <= 49);
      if (combo.length < 6) return res.status(400).json({ error: 'Provide 6 valid TOTO numbers (1–49)' });
      const prize = checkTOTOCombination(combo.slice(0, 6), result);
      return res.json({ game: 'toto', numbers: combo, drawDate: date, prize: prize || null, won: !!prize, result });
    }

    res.status(400).json({ error: 'game must be 4d or toto' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/results/scrape  (admin: force refresh) ─────────────────────────
router.post('/scrape', async (req, res) => {
  try {
    const [result4D, resultTOTO] = await Promise.all([
      scrape4DResults(null),
      scrapeTOTOResults(null),
    ]);
    res.json({ success: true, result4D, resultTOTO });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
