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
    const portfolioId = req.session.user.activePortfolioId || 1;
    const overview    = await Portfolio.getPortfolioOverview(portfolioId);
    const holdings    = await Portfolio.getHoldingsForPortfolio(portfolioId);

    // Hent aktuel pris for hver holding
    const prices = {};
    for (const h of holdings) {
      const data      = await getStockQuote(h.symbol);
      const ts        = data['Time Series (1min)'];
      const latestKey = Object.keys(ts)[0];
      prices[h.symbol] = parseFloat(ts[latestKey]['4. close']);
    }

    // Berig holdings med value & profit
    const enriched = holdings.map(h => {
      const price = prices[h.symbol];
      const fx    = 1; // USD
      return {
        ...h,
        price,
        value:  price * h.amount * fx,
        profit: (price - h.bought_at) * h.amount * fx
      };
    });

    // Top 5 lister
    const topValue  = enriched.slice().sort((a,b) => b.value  - a.value).slice(0,5);
    const topProfit = enriched.slice().sort((a,b) => b.profit - a.profit).slice(0,5);

    // Oversigtstal
    const totalExpected   = enriched.reduce((sum,h) => sum + h.value, 0);
    const totalUnrealized = enriched.reduce((sum,h) => sum + h.profit, 0);

    res.render('dashboard', {
      user: req.session.user,
      overview: {
        totalPurchase: overview.totalPurchase,
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
    const portfolioId = req.session.user.activePortfolioId || 1;
    const holdings    = await Portfolio.getHoldingsForPortfolio(portfolioId);

    // Hent priser
    const prices = {};
    for (const h of holdings) {
      const data      = await getStockQuote(h.symbol);
      const ts        = data['Time Series (1min)'];
      const latestKey = Object.keys(ts)[0];
      prices[h.symbol] = parseFloat(ts[latestKey]['4. close']);
    }

    const enriched = holdings.map(h => {
      const price = prices[h.symbol];
      const fx    = 1;
      return {
        ...h,
        price,
        value:  price * h.amount * fx,
        profit: (price - h.bought_at) * h.amount * fx
      };
    });

    const totalValue   = enriched.reduce((sum,h) => sum + h.value, 0);
    const totalUnrealized = enriched.reduce((sum,h) => sum + h.profit, 0);

    res.json({
      totalValue,
      realized:   0,
      unrealized: totalUnrealized
    });
  } catch (err) {
    next(err);
  }
});

// === API: Top 5 efter værdi på GET /dashboard/top/value ===
router.get('/top/value', requireAuth, async (req, res, next) => {
  try {
    const portfolioId = req.session.user.activePortfolioId || 1;
    const holdings    = await Portfolio.getHoldingsForPortfolio(portfolioId);

    // Hent priser
    const prices = {};
    for (const h of holdings) {
      const data      = await getStockQuote(h.symbol);
      const ts        = data['Time Series (1min)'];
      const latestKey = Object.keys(ts)[0];
      prices[h.symbol] = parseFloat(ts[latestKey]['4. close']);
    }

    const enriched = holdings.map(h => ({
      ...h,
      price: prices[h.symbol],
      value: prices[h.symbol] * h.amount
    }));

    const topValue = enriched.sort((a,b) => b.value - a.value).slice(0,5);
    res.json(topValue);
  } catch (err) {
    next(err);
  }
});

// === API: Top 5 efter profit på GET /dashboard/top/profit ===
router.get('/top/profit', requireAuth, async (req, res, next) => {
  try {
    const portfolioId = req.session.user.activePortfolioId || 1;
    const holdings    = await Portfolio.getHoldingsForPortfolio(portfolioId);

    // Hent priser
    const prices = {};
    for (const h of holdings) {
      const data      = await getStockQuote(h.symbol);
      const ts        = data['Time Series (1min)'];
      const latestKey = Object.keys(ts)[0];
      prices[h.symbol] = parseFloat(ts[latestKey]['4. close']);
    }

    const enriched = holdings.map(h => ({
      ...h,
      price: prices[h.symbol],
      profit: (prices[h.symbol] - h.bought_at) * h.amount
    }));

    const topProfit = enriched.sort((a,b) => b.profit - a.profit).slice(0,5);
    res.json(topProfit);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
