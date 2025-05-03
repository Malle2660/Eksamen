// routes/portfolioRoutes.js
const express = require('express');
const router = express.Router();
const Portfolio = require('../models/portfolio');

console.log('Portfolio route loader kører');

// — Auth-guard inline —
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/?error=login_required');
}

// *** GÆLDER FOR ALLE UNDERSTÅENDE ROUTES ***
router.use(requireAuth);

// === VIEW-ROUTE: Porteføljeoversigt ===
router.get('/', async (req, res, next) => {
  try {
    const user = req.session.user;
    const portfolios = await Portfolio.getAllForUser(user.id);

    const totalValue = portfolios.reduce((sum, p) => sum + (p.value || 0), 0);
    const dailyChange = portfolios.length
      ? portfolios.reduce((sum, p) => sum + (p.change || 0), 0) / portfolios.length
      : 0;
    const dailyDKKChange = portfolios.reduce(
      (sum, p) => sum + ((p.value || 0) * ((p.change || 0) / 100)),
      0
    );

    res.render('portfolio', {
      user,
      portfolioId: null,
      portfolios,
      totalValue,
      dailyChange,
      dailyDKKChange
    });

  } catch (error) {
    console.error('❌ Fejl ved render af porteføljeoversigt:', error);
    next(error);
  }
});

// === API: Opret en ny portefølje ===
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

// === API: Hent alle porteføljer for en bruger ===
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

// === API: Hent ét portefølje-objekt ===
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

// === API: Portefølje-summary ===
router.get('/:portfolioId/summary', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const summary = await Portfolio.getPortfolioSummary(portfolioId);
    res.json(summary);
  } catch (err) {
    console.error('❌ Fejl ved GET /portfolios/:portfolioId/summary:', err);
    res.status(500).json({ message: 'Der skete en fejl ved hentning af sammendrag' });
  }
});

// === API: Portefølje-overview ===
router.get('/:portfolioId/overview', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const overview = await Portfolio.getPortfolioOverview(portfolioId);
    res.json(overview);
  } catch (err) {
    console.error('❌ Fejl ved GET /portfolios/:portfolioId/overview:', err);
    res.status(500).json({ message: 'Der skete en fejl ved hentning af overview' });
  }
});

// === API: Opdater en portefølje ===
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

// === API: Slet en portefølje ===
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
