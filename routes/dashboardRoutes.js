const express = require('express');
const router  = express.Router();
const Portfolio = require('../models/portfolio');
const { getStockQuote } = require('../services/alphaVantage');

// Auth‐guard
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/?error=login_required');
}

// === VIEW: Dashboard (EJS) på GET /dashboard ===
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const portfolios = await Portfolio.getAllForUser(userId);

    // Saml alle aktier på tværs af porteføljer
    let allHoldings = [];
    for (const portfolio of portfolios) {
      const stocks = await Portfolio.getStocksForPortfolio(portfolio.portfolioID);
      allHoldings = allHoldings.concat(stocks.map(s => ({ ...s, portfolioName: portfolio.name })));
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
router.get('/metrics', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const portfolios = await Portfolio.getAllForUser(userId);

    let totalValue = 0;
    let totalUnrealized = 0;
    let totalRealized = 0; // Hvis du har realiseret gevinst

    for (const portfolio of portfolios) {
      const stocks = await Portfolio.getStocksForPortfolio(portfolio.portfolioID);
      for (const stock of stocks) {
        let price = 0;
        try {
          const quote = await getStockQuote(stock.symbol);
          price = quote.price || 0;
        } catch (e) { price = 0; }
        let rate = 1;
        if (stock.currency && stock.currency !== 'DKK') {
          // ...hent valutakurs...
        }
        totalValue += (stock.amount || 0) * price * rate;
        // totalUnrealized += ... (hvis du vil vise gevinst)
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
router.get('/top/value', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const portfolios = await Portfolio.getAllForUser(userId);

    let allHoldings = [];
    for (const portfolio of portfolios) {
      const stocks = await Portfolio.getStocksForPortfolio(portfolio.portfolioID);
      allHoldings = allHoldings.concat(stocks.map(s => ({ ...s, portfolioName: portfolio.name })));
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
router.get('/top/profit', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const portfolios = await Portfolio.getAllForUser(userId);

    let allHoldings = [];
    for (const portfolio of portfolios) {
      const stocks = await Portfolio.getStocksForPortfolio(portfolio.portfolioID);
      allHoldings = allHoldings.concat(stocks.map(s => ({ ...s, portfolioName: portfolio.name })));
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
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const portfolios = await Portfolio.getAllForUser(userId);

    // Find alle stocks for brugerens porteføljer
    let allStocks = [];
    for (const portfolio of portfolios) {
      // Brug Stock.getAllForPortfolio for at få stockID!
      const stocks = await require('../models/stock').getAllForPortfolio(portfolio.portfolioID);
      allStocks = allStocks.concat(stocks.map(s => ({ ...s, portfolioID: portfolio.portfolioID })));
    }

    // Hent prisdata for de sidste 30 dage for alle stocks
    const pool = await require('../db/database').poolPromise;
    const days = 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Hent alle pricehistory-rows for disse stocks og dato-interval
    const stockIds = allStocks.map(s => s.stockID).filter(Boolean);
    if (stockIds.length === 0) return res.json([]);

    const result = await pool.request()
      .input('dateFrom', require('mssql').DateTime, dateFrom)
      .query(`
        SELECT stockID, price, date
        FROM PriceHistory
        WHERE stockID IN (${stockIds.join(',')})
          AND date >= @dateFrom
        ORDER BY date ASC
      `);

    // Saml daglig værdi
    const dailyValue = {};
    for (const row of result.recordset) {
      // Find antal aktier for denne stockID
      const stock = allStocks.find(s => s.stockID === row.stockID);
      if (!stock) continue;
      const dateKey = row.date.toISOString().slice(0, 10);
      if (!dailyValue[dateKey]) dailyValue[dateKey] = 0;
      dailyValue[dateKey] += (stock.amount || 0) * row.price;
    }

    // Formatér til array til graf
    const graphData = Object.entries(dailyValue).map(([date, value]) => ({
      date,
      value
    }));

    res.json(graphData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
