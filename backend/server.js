const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase FIRST before anything else
require('./firebase');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tickets', require('./routes/tickets'));

app.get('/', (req, res) => {
  res.json({ message: '4D/TOTO Backend is running!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));