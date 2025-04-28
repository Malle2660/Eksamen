const express = require('express');
const router = express.Router();
const alphaVantageAPI = require('../services/alphaVantage');  // Opdater stien til services/alphaVantage.js

// Route for at få aktiekurs for symbol
router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const data = await alphaVantageAPI.getStockQuote(symbol);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved hentning af aktiekurs', error: error.message });
  }
});

module.exports = router;
