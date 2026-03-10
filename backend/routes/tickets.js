const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');
const admin = require('firebase-admin');
const upload = multer({ storage: multer.memoryStorage() });

const db = admin.firestore();

function parseTicketText(text) {
  const upperText = text.toUpperCase();
  const gameType = upperText.includes('TOTO') ? 'TOTO' : '4D';

  const dateMatch = text.match(/\d{2}\/\d{2}\/(?:\d{4}|\d{2})/);
  const drawDate = dateMatch ? dateMatch[0] : null;

  let numbers = [];
  if (gameType === '4D') {
    numbers = [...text.matchAll(/\b\d{4}\b/g)].map(m => m[0]);
  } else {
    const rows = text.split('\n');
    const totoRows = rows.filter(row => {
      const nums = row.match(/\b\d{1,2}\b/g);
      return nums && nums.length === 6;
    });
    if (totoRows.length > 0) {
      numbers = totoRows[0].match(/\b\d{1,2}\b/g)
        .map(n => parseInt(n))
        .filter(n => n >= 1 && n <= 49);
    }
  }

  const systemMatch = text.match(/System\s*(\d+)/i);
  const betType = systemMatch ? `System ${systemMatch[1]}` : 'Standard';

  return { gameType, drawDate, numbers, betType };
}

router.post('/upload', upload.single('ticket'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Run OCR
    const { data: { text } } = await Tesseract.recognize(
      req.file.buffer,
      'eng',
      { logger: m => console.log(m) }
    );

    const extracted = parseTicketText(text);

    // Save to Firestore
    const ticketRef = await db.collection('tickets').add({
      ...extracted,
      filename: req.file.originalname,
      purchaseDate: new Date(),
      status: 'pending',
      processingStatus: 'done'
    });

    res.json({
      message: 'OCR completed and saved!',
      ticketId: ticketRef.id,
      filename: req.file.originalname,
      rawText: text,
      ...extracted
    });

  } catch (error) {
    console.error('OCR Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;