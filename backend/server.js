process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT ERROR:', err);
});

const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
require('dotenv').config();

// Initialize Firebase FIRST before anything else
const admin = require('./firebase');
const db    = admin.firestore();

const { scrape4DResults, scrapeTOTOResults, ensureResultsPopulated } = require('./services/scraper');
const { compare4DTicket, compareTOTOTicket, classifyDrawDate } = require('./services/matcher');

const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/results', require('./routes/results'));
app.use('/api/predict', require('./routes/predict'));

app.get('/', (req, res) => {
  res.json({
    message: '4D/TOTO SGLottery Backend',
    version: '2.0.0',
    endpoints: [
      'POST /api/tickets/upload',
      'GET  /api/tickets',
      'GET  /api/tickets/:id',
      'DELETE /api/tickets/:id',
      'GET  /api/results/4d',
      'GET  /api/results/toto',
      'POST /api/results/check/:ticketId',
      'POST /api/results/scrape',
      'GET  /api/predict',
    ],
  });
});

// ── Cron: Poll results for pending future-draw tickets ────────────────────────
// Runs every hour. Checks for tickets with drawType='future' and resultStatus='pending'.
// Case A: draw date now past → scrape result → compare → update → notify.
cron.schedule('0 * * * *', async () => {
  console.log('[cron] Checking pending future-draw tickets...');
  try {
    const snap = await db.collection('tickets')
      .where('resultStatus', '==', 'pending')
      .where('drawType',     '==', 'future')
      .limit(50)
      .get();

    if (snap.empty) {
      console.log('[cron] No pending tickets.');
      return;
    }

    for (const doc of snap.docs) {
      const ticket   = doc.data();
      const drawType = classifyDrawDate(ticket.drawDate);

      // Still in the future — skip
      if (drawType === 'future') continue;

      console.log(`[cron] Checking ticket ${doc.id} (drawDate: ${ticket.drawDate})`);

      try {
        const official = ticket.gameType === '4D'
          ? await scrape4DResults(ticket.drawDate)
          : await scrapeTOTOResults(ticket.drawDate);

        const comparison = ticket.gameType === '4D'
          ? compare4DTicket(ticket, official)
          : compareTOTOTicket(ticket, official);

        await doc.ref.update({
          resultStatus:  comparison.won ? 'won' : 'not_won',
          prizeTier:     comparison.prizeTier || null,
          winMatches:    comparison.matches || [],
          drawType:      'past',
          resultChecked: admin.firestore.FieldValue.serverTimestamp(),
          // Store notification data for client polling
          notification: {
            title:   comparison.won ? '🎉 You won!' : 'Draw result available',
            body:    comparison.won
              ? comparison.isSystemBet && comparison.totalWinningCombos > 1
                  ? `Your System ${comparison.systemSize} ticket has ${comparison.totalWinningCombos} winning combination(s)! Best prize: ${comparison.prizeTier}`
                  : `Your ${ticket.gameType} ticket won ${comparison.prizeTier}!`
              : comparison.isSystemBet
                  ? `Your System ${comparison.systemSize} ticket (${comparison.totalCombosChecked} combos) for ${ticket.drawDate} did not win.`
                  : `Your ${ticket.gameType} ticket for ${ticket.drawDate} did not win.`,
            won:     comparison.won,
            prizeTier: comparison.prizeTier,
            drawDate:  ticket.drawDate,
            createdAt: new Date().toISOString(),
            read:    false,
          },
        });

        console.log(`[cron] Ticket ${doc.id}: ${comparison.won ? 'WON ' + comparison.prizeTier : 'Not won'}`);
      } catch (innerErr) {
        console.error(`[cron] Failed to check ticket ${doc.id}:`, innerErr.message);
      }
    }
  } catch (err) {
    console.error('[cron] Cron error:', err.message);
  }
});

// ── Cron: Refresh latest Singapore Pools results daily at 11 PM SGT ──────────
// 4D draws: Wed, Sat, Sun. TOTO draws: Mon, Thu.
cron.schedule('0 23 * * *', async () => {
  console.log('[cron] Daily results refresh...');
  try {
    await Promise.all([scrape4DResults(null), scrapeTOTOResults(null)]);
    console.log('[cron] Results refreshed.');
  } catch (err) {
    console.error('[cron] Daily refresh error:', err.message);
  }
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ SGLottery Backend running on port ${PORT}`);
  console.log('   Cron jobs: hourly result polling + daily result refresh');
  // Seed Firestore with last 30 draws if the results collections are empty
  ensureResultsPopulated();
});
