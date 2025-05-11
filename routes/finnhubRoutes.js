const express = require('express');
const router = express.Router();
const { getStockQuote } = require('../services/Finnhub');

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

// Hent historiske priser og beregn værdier
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);

    // Saml alle trades på tværs af porteføljer
    let allTrades = [];
    for (const portfolio of portfolios) {
      const transactionsModel = require('../models/transactionsModel');
      const trades = await transactionsModel.getAllForPortfolio(portfolio.portfolioID);
      allTrades = allTrades.concat(trades);
    }

    // Slå symbols op for alle stockID
    const stockIDs = [...new Set(allTrades.map(t => t.stockID).filter(Boolean))];
    let idToSymbol = {};
    if (stockIDs.length > 0) {
      const pool = await poolPromise;
      const result = await pool.request()
        .query(`SELECT id, symbol FROM Stocks WHERE id IN (${stockIDs.join(',')})`);
      for (const row of result.recordset) {
        idToSymbol[row.id] = row.symbol;
      }
      for (const trade of allTrades) {
        trade.symbol = idToSymbol[trade.stockID];
      }
    }
    const symbols = [...new Set(allTrades.map(t => t.symbol).filter(Boolean))];

    // Hent historiske kurser for de sidste 10 dage
    const { getHistoricalPrices } = require('../services/Finnhub');
    const historicalPrices = {};
    for (const symbol of symbols) {
      historicalPrices[symbol] = await getHistoricalPrices(symbol, 10);
    }

    // Beregn porteføljeværdi for hver dag
    const today = new Date();
    const history = [];
    for (let i = 9; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      // Beregn beholdning for hver aktie på denne dag
      const holdings = {};
      for (const symbol of symbols) {
        const tradesForSymbol = allTrades.filter(t => t.symbol === symbol && t.date <= dateStr);
        const amount = tradesForSymbol.reduce((sum, t) => sum + (t.type === 'Buy' ? t.quantity : -t.quantity), 0);
        holdings[symbol] = amount;
      }

      // Beregn samlet værdi for denne dag
      let totalValue = 0;
      for (const symbol of symbols) {
        const amount = holdings[symbol];
        const price = historicalPrices[symbol][dateStr] || 0;
        totalValue += amount * price;
      }

      history.push({
        date: dateStr,
        value: totalValue
      });
    }

    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router; 