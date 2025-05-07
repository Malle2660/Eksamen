const express = require('express');
const router = express.Router();
const { getStockQuote } = require('../services/finnhub');

// Test endpoint til at tjekke API funktionalitet
router.get('/test', async (req, res) => {
  try {
    const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];
    const results = {};
    
    for (const symbol of testSymbols) {
      try {
        const quote = await getStockQuote(symbol);
        results[symbol] = quote;
      } catch (error) {
        results[symbol] = { error: error.message };
      }
    }
    
    res.json({
      message: 'Finnhub API Test',
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Test fejlede' });
  }
});

// Hent aktiekurs
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await getStockQuote(symbol);
    res.json(quote);
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    res.status(500).json({ error: 'Kunne ikke hente aktiekurs' });
  }
});

module.exports = router; 