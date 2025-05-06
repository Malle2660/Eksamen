// routes/growthRoutes.js
const express        = require('express');
const router         = express.Router();
const Portfolio      = require('../models/portfolio');
const { batchQuotes }   = require('../services/alphaVantage');
const { latestRates }   = require('../services/ExchangeRate');

// Hent holdings fra din modelen 
router.get('/portfolios/:portfolioId/holdings', async (req, res) => {
  try {
    const holdings = await Portfolio.getHoldingsForPortfolio(req.params.portfolioId);
    res.json(holdings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kunne ikke hente holdings' });
  }
});

// Hent aktiekurser fra Alpha Vantage-servicen
router.get('/portfolios/:portfolioId/quotes', async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ message: 'symbols mangler' });
  try {
    const data = await batchQuotes(symbols);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kunne ikke hente quotes' });
  }
});

// Hent valutakurser
router.get('/portfolios/:portfolioId/rates', async (req, res) => {
  const base = req.query.base || 'USD';
  try {
    const data = await latestRates(base);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kunne ikke hente valutakurser' });
  }
});

// Render portefølje-siden
router.get('/portfolios/:portfolioId', async (req, res) => {
  const portfolioId = req.params.portfolioId;
  res.render('growthTech', { portfolioId });
});

router.get('/portfolios/:portfolioId/history', async (req, res) => {
  // Returnér [{date: '2024-05-01', value: 12345}, ...]
});

module.exports = router;
