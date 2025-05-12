const express = require('express');
const router = express.Router();
const sql = require('mssql'); // Til at specificere SQL-typer og køre rå forespørgsler mod Stocks-tabellen
const Portfolio = require('../models/portfolio'); // Portefølje-logik: her har vi alle vores metoder til at hente, oprette, slette og opdatere porteføljer
const TransactionsModel = require('../models/transactionsModel'); // Håndterer køb/salg, opdaterer saldi
const { getStockQuote } = require('../services/Finnhub'); // Tjeneste til aktiekurser

// VIS PORTFØLJEOVERSIGT (HTML)
router.get('/', async (req, res) => {
  try {
    // Hent bruger-id fra session
    const userId = req.session.user.userID;
    // Hent alle porteføljer for brugeren
    const portfolios = await Portfolio.getAllForUser(userId);
    // Beregn forventet værdi og urealiseret gevinst for hver portefølje
    const data = await Promise.all(
      portfolios.map(async p => ({
        ...p,
        // Samlet markedsværdi af beholdningen (afrundet to decimaler)
        expectedValue: Math.round((await Portfolio.getExpectedValueFromHoldings(p.portfolioID)) * 100) / 100,
        // Urealiseret gevinst/tab baseret på aktuel kurs vs GAK
        unrealizedGain: Math.round((await Portfolio.getTotalUnrealizedFromHoldings(p.portfolioID)) * 100) / 100,
        dailyChange: 0 // Placeholder for daglig udvikling, kan tilføjes senere
      }))
    );

    // Send data til skabelon for visning
    res.render('portfolio', {
      user: req.session.user,
      portfolios: data,
      // Total værdi af alle porteføljer
      totalValue: data.reduce((sum, p) => sum + p.expectedValue, 0),
      dailyChange: 0,
      dailyDKKChange: 0
    });
  } catch (err) {
    console.error('Fejl ved visning af portefølje:', err); //vi logger fejl, hvis der sker en fejl
    res.status(500).send('Serverfejl'); //vi sender en fejlbesked tilbage til klienten
  }
});

// HENT PORTFØLJER SOM JSON (API)
router.get('/user', async (req, res) => { 
  // Samme som ovenfor, men returnerer JSON
  const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);
  const data = []; // vi laver et t0kt array for at kunne gemme vores data
  for (const p of portfolios) {
    const expectedValue = Math.round((await Portfolio.getExpectedValueFromHoldings(p.portfolioID)) * 100) / 100; //vi beregner forventet værdi for hver portefølje
    const unrealizedGain = Math.round((await Portfolio.getTotalUnrealizedFromHoldings(p.portfolioID)) * 100) / 100; //vi beregner urealiseret gevinst/tab for hver portefølje
    data.push({ ...p, expectedValue, unrealizedGain, dailyChange: 0, realizedGain: 0 }); //vi pusher vores data til vores tidligere oprettede tomme array
  }
  res.json(data); //vi returnerer vores data som JSON
});

// OPRET NY PORTFØLJE
router.post('/create', async (req, res) => {
    const { name, accountId } = req.body;
  // Tjek at både navn og konto-id er udfyldt
    if (!name || !accountId) {
    return res.status(400).json({ message: 'Navn og konto-ID mangler' }); //vi sender en fejlbesked tilbage til brugeren, hvis navn eller konto-id ikke er udfyldt
    }
  const userId = req.session.user.userID;
  try {
    // Opret portefølje i databasen
    await Portfolio.create(name, parseInt(accountId, 10), userId); //vi opretter en ny portefølje i vores database, ved at man taster navn og konto-id
    res.status(201).json({ message: 'Portefølje oprettet' }); //vi returnerer en besked om at porteføljen er oprettet
  } catch (err) {
    console.error('Fejl ved oprettelse:', err); //vi logger fejl, hvis kriterierne ikke er opfyldt
    res.status(500).json({ message: 'Serverfejl' }); 
  }
});

// TILFØJ AKTIE TIL PORTFØLJE
router.post('/:portfolioId/add-stock', async (req, res) => {
  // Hent portefølje-id fra URL
  const portfolioId = parseInt(req.params.portfolioId, 10);
    const { symbol, amount, boughtAt, accountId } = req.body;
  // Tjek at alle felter er til stede
    if (!symbol || !amount || !boughtAt || !accountId) {
    return res.status(400).json({ message: 'Udfyld alle felter' }); 
    }

  try {
    // Forbind til database for Stocks-tabellen
    const pool = await require('../db/database').poolPromise;
    const sym = symbol.trim().toUpperCase(); // vi tjekker om symbol er udfyldt 
    // Byg én request, som kan genbruges til SELECT og INSERT
    const request = pool.request().input('symbol', sql.NVarChar(10), sym); // vi opretter en request, som kan genbruges til SELECT og INSERT

    // Check om stock findes
    let result = await request.query('SELECT id FROM Stocks WHERE symbol = @symbol'); 
    let stockId;
    if (result.recordset.length > 0) {
      // Brug eksisterende stock-id
      stockId = result.recordset[0].id;
    } else {
      // Opret ny stock og hent nyt id, incl. amount and bought_at for non-nullable columns
      result = await request
        .input('portfolioId', sql.Int, portfolioId)
        .input('amount', sql.Float, parseFloat(amount))
        .input('boughtAt', sql.Float, parseFloat(boughtAt))
        .query(
          'INSERT INTO Stocks(symbol, portfolio_id, amount, bought_at) OUTPUT INSERTED.id VALUES(@symbol, @portfolioId, @amount, @boughtAt)'
        );
      stockId = result.recordset[0].id;
    }

    // Udfør køb via TransactionsModel
    const newBalance = await TransactionsModel.buySecurity(
      portfolioId,
      parseInt(accountId, 10),
      stockId,
      parseInt(amount, 10),
      parseFloat(boughtAt),
      0 // kan justeres, i vores teste har vi kørt med 0 kr
    );

    res.status(201).json({ message: 'Aktie købt', newBalance });
  } catch (err) {
    console.error('Fejl ved køb af aktie:', err);
    res.status(500).json({ message: 'Serverfejl' });
  }
});

// VIS hvert ENKELT PORTFØLJE 
router.get('/:portfolioId', async (req, res) => {
  const id = parseInt(req.params.portfolioId, 10);
  // Hent portefølje-data og aktiebeholdninger
  const portfolio = await Portfolio.getById(id); 
  const holdings = await Portfolio.getHoldingsForPortfolio(id);
  // Render side til at vise vækst og tech-data
  res.render('growthTech', { portfolio, holdings, portfolioId: id });
});


// Skal Hente GAK for én aktie 
router.get('/:portfolioId/gak/:symbol', async (req, res) => {
  const id = parseInt(req.params.portfolioId, 10);
  const gak = await Portfolio.getGAKForStock(id, req.params.symbol);
  res.json({ gak }); //vi returnerer vores GAK som JSON, så det kan ses i vores frontend
});
// Hent samlet købspris
router.get('/:portfolioId/total-purchase', async (req, res) => {
  const total = await Portfolio.getTotalPurchaseFromTrades(
    parseInt(req.params.portfolioId, 10)
  );
  res.json({ totalPurchase: total }); //vi returnerer vores total purchase som JSON, så det kan ses i vores frontend
});
// Hent forventet værdi
router.get('/:portfolioId/expected-value', async (req, res) => {
  const value = await Portfolio.getExpectedValueFromHoldings(
    parseInt(req.params.portfolioId, 10)
  );
    res.json({ expectedValue: Math.round(value * 100) / 100 });
});
// Hent urealiseret gevinst/tab
router.get('/:portfolioId/total-unrealized', async (req, res) => {
  const total = await Portfolio.getTotalUnrealizedFromHoldings(
    parseInt(req.params.portfolioId, 10)
  );
    res.json({ totalUnrealized: Math.round(total * 100) / 100 });
});

// SLET PORTFØLJE
router.delete('/:portfolioId', async (req, res) => {
  // Slet portefølje i databasen
  await Portfolio.delete(parseInt(req.params.portfolioId, 10));
  res.json({ message: 'Portefølje slettet' });
});

// GENERELLE ENDPOINTS TIL FRONTEND
// Hent alle porteføljer som JSON (uden beregninger)
router.get('/portfolios', async (req, res) => {
  const userId = req.session.user.userID;
  res.json(await Portfolio.getAllForUser(userId)); //vi returnerer alle porteføljerne for brugeren som JSON
});
// Hent aktiekurs for symbol
router.get('/api/stock-price/:symbol', async (req, res) => {
  const quote = await getStockQuote(req.params.symbol);
    res.json({ price: quote.price });
});
// Hent holdings som JSON
router.get('/:portfolioId/holdings', async (req, res) => {
  res.json(await Portfolio.getHoldingsForPortfolio(
    parseInt(req.params.portfolioId, 10)
  ));
});
// Hent transaktioner som JSON
router.get('/:portfolioId/trades', async (req, res) => {
  res.json(await Portfolio.getTradesForPortfolio(
    parseInt(req.params.portfolioId, 10)
  ));
});

module.exports = router; // vi exporterer vores router til at kunne bruges i vores app.js fil
