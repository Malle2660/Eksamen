const express = require('express');
const router = express.Router();
const Portfolio = require('../models/portfolio');
const { getStockQuote } = require('../services/alphaVantage');
const { getExchangeRate } = require('../services/exchangeRate');

// Auth-guard (kræver login)
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/?error=login_required');
}

// === GET: Dashboard-HTML-side ===
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const portfolioId = req.session.user.activePortfolioId || 1;

    const overview = await Portfolio.getPortfolioOverview(portfolioId);
    const holdings = await Portfolio.getHoldingsForPortfolio(portfolioId);

    const prices = {};
    for (const h of holdings) {
      const data = await getStockQuote(h.symbol);
      const ts = data['Time Series (1min)'];
      const latestKey = Object.keys(ts)[0];
      prices[h.symbol] = parseFloat(ts[latestKey]['4. close']);
    }

    const fxData = await getExchangeRate('USD');
    const fxRates = fxData.conversion_rates || fxData.rates;

    const enriched = holdings.map(h => {
      const price = prices[h.symbol];
      const fx = fxRates[h.currency] || 1;
      const value = price * h.volume * fx;
      const profit = (price - h.avgCost) * h.volume * fx;
      return { ...h, price, value, profit, symbol: h.symbol };
    });

    const topValue = [...enriched].sort((a, b) => b.value - a.value).slice(0, 5);
    const topProfit = [...enriched].sort((a, b) => b.profit - a.profit).slice(0, 5);

    const totalExpected = enriched.reduce((sum, h) => sum + h.value, 0);
    const totalUnrealized = enriched.reduce((sum, h) => sum + h.profit, 0);

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
module.exports = router;
