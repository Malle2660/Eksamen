const express = require('express');
const router = express.Router();
const Portfolio = require('../models/portfolio'); // Importer Portfolio-modellen


console.log('Portfolio route loader kører');

// Opret en ny portefølje
router.post('/create', async (req, res) => {
   try {
       const { name, accountId } = req.body;


       if (!name || !accountId) {
           return res.status(400).json({ message: 'Alle felter skal udfyldes' });
       }


       await Portfolio.create(name, accountId);
       res.status(201).json({ message: 'Portefølje oprettet succesfuldt' });
   } catch (error) {
       console.error('❌ Fejl i /create:', error.message);
       res.status(500).json({ message: 'Der skete en fejl ved oprettelse af portfølje', error: error.message });
   }
});


// Hent alle porteføljer for en bruger
router.get('/user/:userId', async (req, res) => {
   try {
       const { userId } = req.params;


       const portfolios = await Portfolio.getAllForUser(userId);
       res.json(portfolios);
   } catch (err) {
       console.error('❌ Fejl ved hentning af porteføljer:', err.message);
       res.status(500).json({ message: 'Der skete en fejl ved hentning af porteføljer' });
   }
});


// Hent en specifik portefølje baseret på ID
router.get('/:portfolioId', async (req, res) => {
   try {
       const { portfolioId } = req.params;


       const portfolio = await Portfolio.getById(portfolioId);
       if (!portfolio) {
           return res.status(404).json({ message: 'Portefølje ikke fundet' });
       }


       res.json(portfolio);
   } catch (err) {
       console.error('❌ Fejl ved hentning af portefølje:', err.message);
       res.status(500).json({ message: 'Der skete en fejl ved hentning af portefølje' });
   }
});


// Opdater en eksisterende portefølje
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
       console.error('❌ Fejl ved opdatering af portefølje:', err.message);
       res.status(500).json({ message: 'Der skete en fejl ved opdatering af portefølje' });
   }
});


// Slet en portefølje
router.delete('/:portfolioId', async (req, res) => {
   try {
       const { portfolioId } = req.params;
       await Portfolio.delete(portfolioId);
       res.json({ message: 'Portefølje slettet succesfuldt' });
   } catch (err) {
       console.error('❌ Fejl ved sletning af portefølje:', err.message);
       res.status(500).json({ message: 'Der skete en fejl ved sletning af portefølje' });
   }
});


// Henter porteføljesammendrag
router.get('/:portfolioId/summary', async (req, res) => {
   try {
       const { portfolioId } = req.params;


       const summary = await Portfolio.getPortfolioSummary(portfolioId);
       res.json(summary);
   } catch (err) {
       console.error('❌ Fejl ved hentning af porteføljesammendrag:', err.message);
       res.status(500).json({ message: 'Der skete en fejl ved hentning af porteføljesammendrag' });
   }
});


// Hent alle porteføljer for den nuværende bruger
router.get('/', async (req, res) => {
   try {
       const userId = req.session.userId;
       const portfolios = await Portfolio.getAllForUser(userId);
       res.render('portfolio', { portfolios });
   } catch (error) {
       console.error('❌ Fejl ved hentning af porteføljer:', error.message);
       res.status(500).json({ message: 'Der skete en fejl ved hentning af porteføljer' });
   }
})
// === portfolioroutes.js (udvidede routes) ===


// GAK – gennemsnitlig anskaffelseskurs
router.get('/:portfolioId/gak', async (req, res) => {
   try {
       const portfolioId = parseInt(req.params.portfolioId);
       if (isNaN(portfolioId)) return res.status(400).json({ message: 'Ugyldigt portfolioId' });


       const result = await Portfolio.calculateGAK(portfolioId);
       res.json(result);
   } catch (err) {
       console.error('❌ Fejl ved beregning af GAK:', err.message);
       res.status(500).json({ message: 'Fejl ved GAK-beregning' });
   }
});


// Forventet værdi – samlet værdi af beholdning
router.get('/:portfolioId/expected-value', async (req, res) => {
   try {
       const portfolioId = parseInt(req.params.portfolioId);
       if (isNaN(portfolioId)) return res.status(400).json({ message: 'Ugyldigt portfolioId' });


       const result = await Portfolio.calculateExpectedValue(portfolioId);
       res.json(result);
   } catch (err) {
       console.error('❌ Fejl ved forventet værdi:', err.message);
       res.status(500).json({ message: 'Fejl ved beregning af forventet værdi' });
   }
});


// Urealiseret gevinst eller tab
router.get('/:portfolioId/unrealized', async (req, res) => {
   try {
       const portfolioId = parseInt(req.params.portfolioId);
       if (isNaN(portfolioId)) return res.status(400).json({ message: 'Ugyldigt portfolioId' });


       const result = await Portfolio.calculateUnrealizedGainLoss(portfolioId);
       res.json(result);
   } catch (err) {
       console.error('❌ Fejl ved urealiseret gevinst/tab:', err.message);
       res.status(500).json({ message: 'Fejl ved urealiseret gevinst/tab' });
   }
});


// Porteføljeoversigt – total købspris, nuværende værdi og gevinst/tab
router.get('/:portfolioId/overview', async (req, res) => {
   try {
       const portfolioId = parseInt(req.params.portfolioId);
       if (isNaN(portfolioId)) return res.status(400).json({ message: 'Ugyldigt portfolioId' });


       const result = await Portfolio.getPortfolioOverview(portfolioId);
       res.json(result);
   } catch (err) {
       console.error('❌ Fejl ved porteføljeoversigt:', err.message);
       res.status(500).json({ message: 'Fejl ved oversigt' });
   }
});




module.exports = router; // Eksporterer routeren