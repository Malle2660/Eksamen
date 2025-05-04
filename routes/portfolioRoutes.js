const express = require('express');
const router = express.Router();
const Portfolio = require('../models/portfolio');
const Stock = require('../models/stock');
const alphaVantage = require('../services/alphaVantage');

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
  try {
    const userId = req.session.user.id;
    const portfolios = await Portfolio.getAllForUser(userId);

    const enriched = await Promise.all(
      portfolios.map(async (p) => {
        const stocks = await Stock.getAllForPortfolio(p.portfolioID);

        let expectedValue = 0;
        let unrealizedGain = 0;

        for (const stock of stocks) {
          try {
            const data = await alphaVantage.getStockQuote(stock.symbol);
            const timeSeries = data?.['Time Series (1min)'];

            if (!timeSeries) {
              console.warn(`⚠️ Manglende timeSeries for ${stock.symbol}`, data);
              continue;
            }

            const latestKey = Object.keys(timeSeries)[0];
            const latestPrice = parseFloat(timeSeries[latestKey]['4. close']);

            expectedValue += latestPrice * stock.amount;
            unrealizedGain += (latestPrice - stock.bought_at) * stock.amount;
          } catch (err) {
            console.warn(`⚠️ API-fejl for ${stock.symbol}:`, err.message);
          }
        }

        return {
          ...p,
          createdAt: p.registrationDate || new Date(),
          realizedGain: 0, // placeholder
          unrealizedGain,
          expectedValue
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('❌ Fejl ved GET /portfolios/user:', err);
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

module.exports = router;
