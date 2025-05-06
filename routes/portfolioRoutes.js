const express = require('express');
const router = express.Router();
const Portfolio = require('../models/portfolio');
const Stock = require('../models/stock');
const { getStockQuote } = require('../services/alphaVantage');
const { getExchangeRate } = require('../services/exchangeRate');

// Middleware: kræver login
function requireAuth(req, res, next) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: 'Login påkrævet' });
  }
  next();
}

// === GET: Porteføljeoversigt (HTML-side)
router.get('/', requireAuth, async (req, res) => {
  try {
    const portfolios = await Portfolio.getAllForUser(req.session.user.id);
    res.render('portfolio', {
      user: req.session.user,
      portfolioId: null,
      portfolios,
      totalValue: 0,
      dailyChange: 0,
      dailyDKKChange: 0
    });
  } catch (error) {
    console.error('❌ Fejl ved render af portefølje:', error);
    res.status(500).send('Serverfejl');
  }
});

// === GET: API – hent porteføljer for logget bruger (med forventet værdi)
router.get('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const portfolios = await Portfolio.getAllForUser(userId);
    for (const portfolio of portfolios) {
      // Beregn forventet værdi for porteføljen (API/cache bruges automatisk)
      portfolio.expectedValue = await Portfolio.getExpectedValueForPortfolio(portfolio.portfolioID);
      // ...her kan du tilføje flere beregninger hvis nødvendigt
    }
    res.json(portfolios);
  } catch (error) {
    console.error('❌ Fejl i GET /user:', error);
    res.status(500).json({ message: 'Fejl ved hentning af porteføljer' });
  }
});

// === POST: Opret ny portefølje
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { name, accountId } = req.body;
    const userId = req.session.user.id;
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

// === POST: Tilføj aktie til portefølje
router.post('/:portfolioId/add-stock', requireAuth, async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { symbol, amount, boughtAt } = req.body;
    if (!symbol || !amount || !boughtAt) {
      return res.status(400).json({ message: 'Alle felter er påkrævet' });
    }
    const added = await Stock.addToPortfolio(
      parseInt(portfolioId),
      symbol.toUpperCase(),
      parseInt(amount),
      parseFloat(boughtAt)
    );
    if (added) {
      console.log('✅ Aktie tilføjet:', added);
      res.status(201).json({ success: true, message: '✅ Aktie tilføjet' });
    } else {
      res.status(500).json({ message: 'Kunne ikke tilføje aktie' });
    }
  } catch (err) {
    console.error('❌ Fejl i POST /:portfolioId/add-stock:', err);
    res.status(500).json({ message: 'Fejl ved tilføjelse af aktie', error: err.message });
  }
});

// Hent én specifik portefølje
router.get('/:portfolioId', requireAuth, async (req, res) => {
  const portfolioId = parseInt(req.params.portfolioId);
  // Hent portefølje og aktier fra DB
  const portfolio = await Portfolio.getById(portfolioId);
  const stocks = await Portfolio.getStocksForPortfolio(portfolioId);
  // ...hent evt. flere data, fx beregninger, grafer osv.
  res.render('growthTech', {
    portfolioId,
    portfolio,
    stocks,
    // evt. flere data til graf, piechart osv.
  });
});

// Hent alle aktier for en portefølje
router.get('/:portfolioId/stocks', requireAuth, async (req, res) => {
  try {
    const stocks = await Portfolio.getStocksForPortfolio(parseInt(req.params.portfolioId));
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af aktier', error: err.message });
  }
});

// GAK for én aktie i en portefølje
router.get('/:portfolioId/gak/:symbol', requireAuth, async (req, res) => {
  try {
    const gak = await Portfolio.getGAKForStock(parseInt(req.params.portfolioId), req.params.symbol);
    res.json({ gak });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af GAK', error: err.message });
  }
});

// Samlet erhvervelsespris for en portefølje
router.get('/:portfolioId/total-purchase', requireAuth, async (req, res) => {
  try {
    const total = await Portfolio.getTotalPurchaseForPortfolio(parseInt(req.params.portfolioId));
    res.json({ totalPurchase: total });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af total purchase', error: err.message });
  }
});

// Forventet værdi for en portefølje
router.get('/:portfolioId/expected-value', requireAuth, async (req, res) => {
  try {
    const value = await Portfolio.getExpectedValueForPortfolio(parseInt(req.params.portfolioId));
    res.json({ expectedValue: value });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af expected value', error: err.message });
  }
});

// Urealiseret gevinst/tab for én aktie
router.get('/:portfolioId/unrealized/:symbol', requireAuth, async (req, res) => {
  try {
    const unrealized = await Portfolio.getUnrealizedForStock(parseInt(req.params.portfolioId), req.params.symbol);
    res.json({ unrealized });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af unrealized', error: err.message });
  }
});

// Samlet urealiseret gevinst/tab for en portefølje
router.get('/:portfolioId/total-unrealized', requireAuth, async (req, res) => {
  try {
    const total = await Portfolio.getTotalUnrealizedForPortfolio(parseInt(req.params.portfolioId));
    res.json({ totalUnrealized: total });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af total unrealized', error: err.message });
  }
});

// DELETE: Slet portefølje
router.delete('/:portfolioId', requireAuth, async (req, res) => {
  try {
    await Portfolio.delete(parseInt(req.params.portfolioId));
    res.json({ success: true, message: 'Portefølje slettet' });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved sletning', error: err.message });
  }
});

module.exports = router;
