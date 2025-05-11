const express = require('express');
const router = express.Router();
const sql = require('mssql');
const Portfolio = require('../models/portfolio');
const TransactionsModel = require('../models/transactionsModel');
const { getStockQuote } = require('../services/Finnhub');

// === GET: Porteføljeoversigt (HTML-side)
router.get('/', async (req, res) => {
  try {
    const portfolios = await Portfolio.getAllForUser(req.session.user.userID);
    // Beregn værdier dynamisk ud fra trades
    const result = [];
    for (const p of portfolios) {
      const expectedValue = Math.round(await Portfolio.getExpectedValueFromHoldings(p.portfolioID) * 100) / 100;
      let unrealizedGain = 0;
      try {
        unrealizedGain = Math.round(await Portfolio.getTotalUnrealizedFromHoldings(p.portfolioID) * 100) / 100;
      } catch (e) {}
      result.push({
        ...p,
        expectedValue,
        unrealizedGain,
        dailyChange: 0 // eller beregn rigtigt hvis du har data
      });
    }
    res.render('portfolio', {
      user: req.session.user,
      portfolioId: null,
      portfolios: result,
      totalValue: result.reduce((sum, p) => sum + (p.expectedValue || 0), 0),
      dailyChange: 0,
      dailyDKKChange: 0
    });
  } catch (error) {
    console.error('❌ Fejl ved render af portefølje:', error);
    res.status(500).send('Serverfejl');
  }
});

// === GET: API – hent porteføljer for logget bruger (med forventet værdi)
router.get('/user', async (req, res) => {
  const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);

  const result = [];
  for (const p of portfolios) {
    const expectedValue = Math.round(await Portfolio.getExpectedValueFromHoldings(p.portfolioID) * 100) / 100;
    let unrealizedGain = 0;
    try {
      unrealizedGain = Math.round(await Portfolio.getTotalUnrealizedFromHoldings(p.portfolioID) * 100) / 100;
    } catch (e) {}
    result.push({
          ...p,
      expectedValue,
          unrealizedGain,
      dailyChange: 0 // eller beregn rigtigt hvis du har data
    });
  }
  res.json(result);
});

// === POST: Opret ny portefølje
router.post('/create', async (req, res) => {
  try {
    const { name, accountId } = req.body;
    const userId = req.session.user.userID;
    if (!name || !accountId) {
      return res.status(400).json({ message: 'Navn og konto-ID er påkrævet' });
    }
    await Portfolio.create(name, parseInt(accountId), userId);
    res.status(201).json({ message: '✅ Portefølje oprettet' });
  } catch (error) {
    console.error('❌ Fejl i POST /portfolios/create:', error);
    res.status(500).json({ message: 'Fejl ved oprettelse af portefølje' });
  }
});

// === POST: Køb aktie til portefølje
router.post('/:portfolioId/add-stock', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { symbol, amount, boughtAt, accountId } = req.body;
    
    if (!symbol || !amount || !boughtAt || !accountId) {
      return res.status(400).json({ message: 'Alle felter er påkrævet' });
    }

    // Først opret eller find stock ID
    const pool = await require('../db/database').poolPromise;
    let stockResult = await pool.request()
      .input('symbol', sql.NVarChar(10), symbol.toUpperCase())
      .query('SELECT id FROM Stocks WHERE symbol = @symbol');
    
    let stockId;
    if (stockResult.recordset.length === 0) {
      // Opret ny stock hvis den ikke findes
      const insertResult = await pool.request()
        .input('symbol', sql.NVarChar(10), symbol.toUpperCase())
        .query('INSERT INTO Stocks (symbol) OUTPUT INSERTED.id VALUES (@symbol)');
      stockId = insertResult.recordset[0].id;
    } else {
      stockId = stockResult.recordset[0].id;
    }

    // Køb aktien via TransactionsModel
    const newBalance = await TransactionsModel.buySecurity(
      parseInt(portfolioId),
      parseInt(accountId),
      stockId,
      parseInt(amount),
      parseFloat(boughtAt),
      0 // fee
    );

    res.status(201).json({ 
      success: true, 
      message: '✅ Aktie købt',
      newBalance 
    });
  } catch (err) {
    console.error('❌ Fejl i POST /:portfolioId/add-stock:', err);
    res.status(500).json({ message: 'Fejl ved køb af aktie', error: err.message });
  }
});

// Hent én specifik portefølje
router.get('/:portfolioId', async (req, res) => {
  const portfolioId = parseInt(req.params.portfolioId);
  const portfolio = await Portfolio.getById(portfolioId);
  const holdings = await Portfolio.getHoldingsForPortfolio(portfolioId);
  res.render('growthTech', {
    portfolioId,
    portfolio,
    holdings,
  });
});

// GAK for én aktie i en portefølje
router.get('/:portfolioId/gak/:symbol', async (req, res) => {
  try {
    const gak = await Portfolio.getGAKForStock(parseInt(req.params.portfolioId), req.params.symbol);
    res.json({ gak });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af GAK', error: err.message });
  }
});

// Samlet erhvervelsespris for en portefølje
router.get('/:portfolioId/total-purchase', async (req, res) => {
  try {
    const total = await Portfolio.getTotalPurchaseFromTrades(parseInt(req.params.portfolioId));
    res.json({ totalPurchase: total });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af total purchase', error: err.message });
  }
});

// Forventet værdi for en portefølje
router.get('/:portfolioId/expected-value', async (req, res) => {
  try {
    const value = await Portfolio.getExpectedValueFromHoldings(parseInt(req.params.portfolioId));
    res.json({ expectedValue: Math.round(value * 100) / 100 });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af expected value', error: err.message });
  }
});

// Samlet urealiseret gevinst/tab for en portefølje
router.get('/:portfolioId/total-unrealized', async (req, res) => {
  try {
    const total = await Portfolio.getTotalUnrealizedFromHoldings(parseInt(req.params.portfolioId));
    res.json({ totalUnrealized: Math.round(total * 100) / 100 });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af total unrealized', error: err.message });
  }
});

// DELETE: Slet portefølje
router.delete('/:portfolioId', async (req, res) => {
  try {
    await Portfolio.delete(parseInt(req.params.portfolioId));
    res.json({ success: true, message: 'Portefølje slettet' });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved sletning', error: err.message });
  }
});

// Kun porteføljer for den loggede bruger
router.get('/portfolios', async (req, res) => {
  const userId = req.session.user.userID;
  const portfolios = await Portfolio.getAllForUser(userId);
  res.json(portfolios);
});

router.get('/api/stock-price/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const quote = await getStockQuote(symbol);
    res.json({ price: quote.price });
  } catch (err) {
    res.status(500).json({ message: 'Kunne ikke hente aktiekurs' });
  }
});

// Hent holdings (samme som GrowthTech)
router.get('/:portfolioId/holdings', async (req, res) => {
  try {
    const holdings = await Portfolio.getHoldingsForPortfolio(parseInt(req.params.portfolioId));
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af holdings', error: err.message });
  }
});

router.get('/:portfolioId/trades', async (req, res) => {
  const trades = await Portfolio.getTradesForPortfolio(parseInt(req.params.portfolioId));
  res.json(trades);
});

module.exports = router;
