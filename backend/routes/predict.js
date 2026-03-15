/**
 * /api/predict
 * Returns predictions from all three statistical models.
 */

const express = require('express');
const router  = express.Router();
const { getPast4DResults, getPastTOTOResults } = require('../services/scraper');
const { generatePredictions } = require('../services/predictor');

// ── GET /api/predict ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [past4D, pastTOTO] = await Promise.all([
      getPast4DResults(50),
      getPastTOTOResults(100),
    ]);
    const predictions = await generatePredictions(past4D, pastTOTO);
    res.json({
      predictions,
      dataPoints: { fourd: past4D.length, toto: pastTOTO.length },
      generatedAt: new Date().toISOString(),
      disclaimer: '⚠️ All predictions are purely for educational purposes and are NOT intended for gambling or financial decision-making. Lottery draws are independent random events.',
    });
  } catch (err) {
    console.error('[predict] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
