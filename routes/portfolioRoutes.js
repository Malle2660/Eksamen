// routes/portfolioRoutes.js

const express   = require('express');
const router    = express.Router();
const Portfolio = require('../models/portfolio');

console.log('Portfolio route loader kører');

// === VIEW‐ROUTE: Porteføljeoversigt ===
// This must come *before* any /:portfolioId routes
router.get('/', async (req, res) => {
  try {
    const userId     = req.session.user.id;
    const portfolios = await Portfolio.getAllForUser(userId);

    // Beregn total værdi
    const totalValue = portfolios.reduce((sum, p) => sum + (p.value||0), 0);

    // Daglig procent ændring (gennemsnit)
    const dailyChange = portfolios.length
      ? portfolios.reduce((sum, p) => sum + (p.change||0), 0) / portfolios.length
      : 0;

    // Daglig ændring i DKK
    const dailyDKKChange = portfolios.reduce(
      (sum, p) => sum + ((p.value||0) * ((p.change||0) / 100)),
      0
    );

    // RENDER flat file: views/portfolio.ejs
    res.render('portfolio', {
      userId,
      portfolios,
      totalValue,
      dailyChange,
      dailyDKKChange
    });
  } catch (error) {
    console.error('❌ Fejl ved render af porteføljeoversigt:', error);
    res.status(500).json({ message: 'Der skete en fejl ved visning af porteføljeoversigt' });
  }
});

// === Opret en ny portefølje (API) ===
router.post('/create', async (req, res) => {
  try {
    const { name, accountId } = req.body;
    if (!name || !accountId) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' });
    }
    await Portfolio.create(name, accountId);
    res.status(201).json({ message: 'Portefølje oprettet succesfuldt' });
  } catch (error) {
    console.error('❌ Fejl i POST /portfolios/create:', error);
    res.status(500).json({
      message: 'Der skete en fejl ved oprettelse af portefølje',
      error: error.message
    });
  }
});

// === Hent alle porteføljer for en given bruger (API) ===
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const portfolios = await Portfolio.getAllForUser(userId);
    res.json(portfolios);
  } catch (err) {
    console.error('❌ Fejl ved GET /portfolios/user/:userId:', err);
    res.status(500).json({ message: 'Der skete en fejl ved hentning af porteføljer' });
  }
});

// === Hent én portefølje (API) ===
router.get('/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const portfolio = await Portfolio.getById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ message: 'Portefølje ikke fundet' });
    }
    res.json(portfolio);
  } catch (err) {
    console.error('❌ Fejl ved GET /portfolios/:portfolioId:', err);
    res.status(500).json({ message: 'Der skete en fejl ved hentning af portefølje' });
  }
});

// === Portfolio‐summary (API) ===
router.get('/:portfolioId/summary', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const summary = await Portfolio.getPortfolioSummary(portfolioId);
    res.json(summary);
  } catch (err) {
    console.error('❌ Fejl ved GET /portfolios/:portfolioId/summary:', err);
    res.status(500).json({ message: 'Der skete en fejl ved hentning af porteføljesammendrag' });
  }
});

// === Opdater en portefølje (API) ===
router.put('/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { name, accountId } = req.body;
    if (!name || !accountId) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' });
    }
    await Portfolio.update(portfolioId, name, accountId);
    res.json({ message: 'Portefølje opdateret succesfuldt' });
  } catch (err) {
    console.error('❌ Fejl ved PUT /portfolios/:portfolioId:', err);
    res.status(500).json({ message: 'Der skete en fejl ved opdatering af portefølje' });
  }
});

// === Slet en portefølje (API) ===
router.delete('/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    await Portfolio.delete(portfolioId);
    res.json({ message: 'Portefølje slettet succesfuldt' });
  } catch (err) {
    console.error('❌ Fejl ved DELETE /portfolios/:portfolioId:', err);
    res.status(500).json({ message: 'Der skete en fejl ved sletning af portefølje' });
  }
});

module.exports = router;
