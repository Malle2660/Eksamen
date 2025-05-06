const express = require('express');
const router = express.Router();
const Portfolio = require('../models/portfolio');
const Stock = require('../models/stock');
const alphaVantage = require('../services/alphaVantage');
const { getStockQuote } = require('../services/alphaVantage');
const { getExchangeRate } = require('../services/exchangeRate');
const { getPortfoliosForUser, getStocksForPortfolio } = require('../models/portfolio');

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

// === GET: API – hent porteføljer for logget bruger
router.get('/user', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const portfolios = await Portfolio.getPortfoliosForUser(userId);

  for (const portfolio of portfolios) {
    let totalValue = 0;
    const stocks = await Portfolio.getStocksForPortfolio(portfolio.portfolioID);

    for (const stock of stocks) {
      // 1. Hent aktuel aktiekurs fra Alpha Vantage (cache bruges automatisk)
      let price = 0;
      try {
        const quote = await getStockQuote(stock.symbol);
        price = quote.price || 0;
      } catch (e) {
        price = 0; // fallback hvis kurs ikke kan hentes
      }

      // 2. Hent valutakurs hvis nødvendigt (fx hvis aktien er i USD og du vil vise i DKK)
      let rate = 1;
      if (stock.currency && stock.currency !== 'DKK') {
        try {
          const rates = await getExchangeRate('DKK');
          rate = rates[stock.currency] || 1;
        } catch (e) {
          rate = 1; // fallback hvis valutakurs ikke kan hentes
        }
      }

      // 3. Beregn værdi for denne aktie
      totalValue += (stock.amount || 0) * price * rate;
    }

    portfolio.expectedValue = totalValue;
    // ...beregn evt. realiseret/urealiseret gevinst osv...
  }

  res.json(portfolios);
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

module.exports = router;
