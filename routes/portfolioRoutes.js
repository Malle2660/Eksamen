const express = require('express');
const router = express.Router();
const Portfolio = require('../models/portfolio');
const Stock = require('../models/stock');
const { getStockQuote } = require('../services/finnhub');
const { getExchangeRate } = require('../services/exchangeRate');




// === GET: Porteføljeoversigt (HTML-side)
router.get('/', async (req, res) => {
  console.log('SESSION:', req.session.user);
  try {
    const portfolios = await Portfolio.getAllForUser(req.session.user.userID);
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
router.get('/user', async (req, res) => {
  const userId = req.session.user.userID;
  const portfolios = await Portfolio.getAllForUser(userId);

  // Tilføj beregninger for hver portefølje
  const result = [];
  for (const p of portfolios) {
    const expectedValue = await Portfolio.getExpectedValueFromHoldings(p.portfolioID);
    const unrealizedGain = await Portfolio.getTotalUnrealizedForPortfolio(p.portfolioID);
    // Tilføj evt. dailyChange hvis du har det
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

// === POST: Tilføj aktie til portefølje
router.post('/:portfolioId/add-stock', async (req, res) => {
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

// Hent alle aktier for en portefølje
router.get('/:portfolioId/stocks', async (req, res) => {
  try {
    const stocks = await Portfolio.getStocksForPortfolio(parseInt(req.params.portfolioId));
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af aktier', error: err.message });
  }
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
    const total = await Portfolio.getTotalPurchaseForPortfolio(parseInt(req.params.portfolioId));
    res.json({ totalPurchase: total });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af total purchase', error: err.message });
  }
});

// Forventet værdi for en portefølje
router.get('/:portfolioId/expected-value', async (req, res) => {
  try {
    const value = await Portfolio.getExpectedValueForPortfolio(parseInt(req.params.portfolioId));
    res.json({ expectedValue: value });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af expected value', error: err.message });
  }
});

// Urealiseret gevinst/tab for én aktie
router.get('/:portfolioId/unrealized/:symbol', async (req, res) => {
  try {
    const unrealized = await Portfolio.getUnrealizedForStock(parseInt(req.params.portfolioId), req.params.symbol);
    res.json({ unrealized });
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af unrealized', error: err.message });
  }
});

// Samlet urealiseret gevinst/tab for en portefølje
router.get('/:portfolioId/total-unrealized', async (req, res) => {
  try {
    const total = await Portfolio.getTotalUnrealizedForPortfolio(parseInt(req.params.portfolioId));
    res.json({ totalUnrealized: total });
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

// Vis detaljer for én portefølje
router.get('/:portfolioID', async (req, res) => {
  const portfolioID = req.params.portfolioID;
  const portfolio = await Portfolio.getById(portfolioID); // Hent evt. portefølje-info
  const holdings = await Portfolio.getHoldingsForPortfolio(portfolioID);
  res.render('portfolio_detail', { portfolio, holdings });
});

module.exports = router;
