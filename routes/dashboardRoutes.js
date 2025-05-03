// routes/dashboardRoutes.js
const express            = require('express');
const router             = express.Router();

// Auth‑guard inline
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/?error=login_required');
}

// Model
const Portfolio          = require('../models/portfolio');

// Services
const { getStockQuote }  = require('../services/alphaVantage');
const { getExchangeRate }= require('../services/ExchangeRate');

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    // 🔑 Antag at du har gemt portfolioId på session.user
    const portfolioId = req.session.user.activePortfolioId;

    // 1) Overblik
    const overview = await Portfolio.getPortfolioOverview(portfolioId);

    // 2) Holdings
    const holdings = await Portfolio.getHoldingsForPortfolio(portfolioId);

    // 3) Hent seneste aktiekurser
    const prices = {};
    for (const h of holdings) {
      const quoteData    = await getStockQuote(h.symbol);
      const ts           = quoteData['Time Series (1min)'];
      const lastTime     = Object.keys(ts)[0];
      prices[h.symbol]   = parseFloat(ts[lastTime]['4. close']);
    }

    // 4) Hent valutakurser fra din ExchangeRate‑service
    //    Service returnerer et objekt med fx { conversion_rates: { DKK: 6.7, USD:1, ... } }
    const exchangeData = await getExchangeRate('USD');  
    // Justér basen efter behov – du kan også kalde med 'DKK' hvis API’en understøtter det
    const rates = exchangeData.conversion_rates || exchangeData.rates;
    // -> fx rates['DKK'] giver kursen for DKK

    // 5) Berig holdings med værdi & profit
    const enriched = holdings.map(h => {
      const price  = prices[h.symbol];
      // h.currency fx 'USD' eller 'EUR'
      const fx     = rates[h.currency] || 1;
      const value  = price * h.volume * fx;
      const profit = (price - h.avgCost) * h.volume * fx;
      return { name: h.symbol, value, profit };
    });

    // 6) Sortér og tag top 5
    const topValue  = enriched.slice().sort((a,b)=>b.value  - a.value).slice(0,5);
    const topProfit = enriched.slice().sort((a,b)=>b.profit - a.profit).slice(0,5);

    // 7) Render med EJS
    res.render('dashboard', {
      user:       req.session.user,
      overview,   // { totalPurchase, totalExpected, totalUnrealized }
      topValue,
      topProfit
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
