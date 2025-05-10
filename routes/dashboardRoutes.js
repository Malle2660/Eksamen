const express = require('express');
const router  = express.Router();
const Portfolio = require('../models/portfolio');
const { getStockQuote } = require('../services/finnhub');
const sql = require('mssql');
const { poolPromise } = require('../db/database');

// === VIEW: Dashboard (EJS) på GET /dashboard ===
router.get('/', async (req, res, next) => {
  try {
    const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);

    // Saml alle aktier på tværs af porteføljer
    let allHoldings = [];
    for (const portfolio of portfolios) {
      const holdings = await Portfolio.getHoldingsForPortfolio(portfolio.portfolioID);
      allHoldings = allHoldings.concat(holdings.map(h => ({ ...h, portfolioName: portfolio.name })));
    }

    // Hent aktuel pris for hver aktie (fra cache/api)
    for (const h of allHoldings) {
      try {
        const quote = await getStockQuote(h.symbol);
        h.price = quote.price || 0;
        console.log(`${h.symbol} quote:`, quote);
      } catch (e) {
        h.price = 0;
      }
      h.value = (h.amount || 0) * h.price;
      h.profit = ((h.price - (h.bought_at || 0)) * (h.amount || 0));
    }

    // Top 5 lister
    const topValue  = allHoldings.slice().sort((a,b) => b.value  - a.value).slice(0,5);
    const topProfit = allHoldings.slice().sort((a,b) => b.profit - a.profit).slice(0,5);

    // Oversigtstal
    const totalExpected   = allHoldings.reduce((sum,h) => sum + h.value, 0);
    const totalUnrealized = allHoldings.reduce((sum,h) => sum + h.profit, 0);

    console.log('topValue:', topValue);
    console.log('topProfit:', topProfit);
    console.log('Alle aktier:', allHoldings);

    res.render('dashboard', {
      user: req.session.user,
      overview: {
        totalPurchase: 0, // Kan beregnes hvis ønsket
        totalExpected,
        totalUnrealized
      },
      topValue,
      topProfit
    });
  } catch (err) {
    next(err);
  }
});

// === API: Metrics på GET /dashboard/metrics ===
router.get('/metrics', async (req, res, next) => {
  try {
    const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);

    let totalValue = 0;
    let totalUnrealized = 0;
    let totalRealized = 0; // Hvis du har realiseret gevinst

    for (const portfolio of portfolios) {
      const holdings = await Portfolio.getHoldingsForPortfolio(portfolio.portfolioID);
      for (const h of holdings) {
        totalValue += h.value || 0;
      //   totalUnrealized += ... (hvis du vil vise gevinst)
      }
    }

    res.json({
      totalValue,
      realized: totalRealized,
      unrealized: totalUnrealized
    });
  } catch (err) {
    next(err);
  }
});

// === API: Top 5 efter værdi på GET /dashboard/top/value ===
router.get('/top/value', async (req, res, next) => {
  try {
    const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);

    let allHoldings = [];
    for (const portfolio of portfolios) {
      const holdings = await Portfolio.getHoldingsForPortfolio(portfolio.portfolioID);
      allHoldings = allHoldings.concat(holdings.map(h => ({ ...h, portfolioName: portfolio.name })));
    }

    for (const h of allHoldings) {
      try {
        const quote = await getStockQuote(h.symbol);
        h.price = quote.price || 0;
      } catch (e) { h.price = 0; }
      h.value = (h.amount || 0) * h.price;
    }

    const topValue = allHoldings.sort((a,b) => b.value - a.value).slice(0,5);
    res.json(topValue);
  } catch (err) {
    next(err);
  }
});

// === API: Top 5 efter profit på GET /dashboard/top/profit ===
router.get('/top/profit', async (req, res, next) => {
  try {
    const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);

    let allHoldings = [];
    for (const portfolio of portfolios) {
      const holdings = await Portfolio.getHoldingsForPortfolio(portfolio.portfolioID);
      allHoldings = allHoldings.concat(holdings.map(h => ({ ...h, portfolioName: portfolio.name })));
    }

    for (const h of allHoldings) {
      try {
        const quote = await getStockQuote(h.symbol);
        h.price = quote.price || 0;
      } catch (e) { h.price = 0; }
      h.profit = ((h.price - (h.bought_at || 0)) * (h.amount || 0));
    }

    const topProfit = allHoldings.sort((a,b) => b.profit - a.profit).slice(0,5);
    res.json(topProfit);
  } catch (err) {
    next(err);
  }
});

// === API: Historisk samlet værdi til grafen ===
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

    // Slå symbols op
    const stockIDs = [...new Set(allTrades.map(t => t.stockID).filter(Boolean))];
    let idToSymbol = {};
    if (stockIDs.length > 0) {
      const { poolPromise } = require('../db/database');
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
    const { getHistoricalPrices } = require('../services/finnhub');
    const historicalPrices = {};
    for (const symbol of symbols) {
      historicalPrices[symbol] = await getHistoricalPrices(symbol, 10);
    }

    // Beregn porteføljeværdi for hver dag
    const startDate = new Date('2025-01-01');
    const today = new Date();
    const history = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
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

// === DEBUG: Se alle aktier for brugerens porteføljer ===
router.get('/debug/stocks', async (req, res) => {
  const portfolios = await Portfolio.getAllForUser(req.session.user.userID);
  console.log('DEBUG: Portfolios:', portfolios);
  console.log('DEBUG: Session user:', req.session.user);
  let allStocks = [];
  for (const p of portfolios) {
    console.log('DEBUG: Henter aktier for portfolioID:', p.portfolioID);
    const stocks = await Portfolio.getStocksForPortfolio(p.portfolioID);
    console.log('DEBUG: Fandt aktier:', stocks);
    allStocks = allStocks.concat(stocks);
  }
  res.json(allStocks);
});

module.exports = router;
