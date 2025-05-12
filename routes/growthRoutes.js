// routes/growthRoutes.js
const express        = require('express');
const router         = express.Router();
const Portfolio      = require('../models/portfolio');
// Henter live- og historiske aktiekurser fra Finnhub
const { batchQuotes, getStockQuote, getHistoricalPrices } = require('../services/Finnhub');
// Henter valutakurser fra ExchangeRate-service
const { latestRates } = require('../services/ExchangeRate');
const TransactionsModel = require('../models/transactionsModel');
// SQL-typer og forbindelse til database
const { sql, poolPromise } = require('../db/database');
// Bruges til dato-beregninger i history-route
const dayjs = require('dayjs');

// HENT HOLDINGS 
// GET /portfolios/:portfolioId/holdings
// Returnerer alle beholdninger (antal units per aktie) for en given portefølje
router.get('/portfolios/:portfolioId/holdings', async (req, res) => {
  try {
    // 1) Læs porteføljeId fra URL
    const portfolioId = req.params.portfolioId;
    // 2) Hent holdings fra databasen
    const holdings = await Portfolio.getHoldingsForPortfolio(portfolioId);
    // 3) Returner som JSON
    res.json(holdings);
  } catch (err) {
    console.error('Fejl i holdings-rut:', err);
    res.status(500).json({ message: 'Kunne ikke hente holdings' });
  }
});

// HENT AKTIE-QUOTES 
// GET /portfolios/:portfolioId/quotes?symbols=SYM1,SYM2
// Returnerer live-priser for en liste af symbols via Finnhub
router.get('/portfolios/:portfolioId/quotes', async (req, res) => {
  // 1) Læs symbols fra query-parameter (komma-separeret)
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ message: 'symbols mangler' });
  try {
    // 2) Hent live-priser i batch
    const data = await batchQuotes(symbols);
    // 3) Send data til klienten
    res.json(data);
  } catch (err) {
    console.error('Fejl i quotes-rut:', err);
    res.status(500).json({ message: 'Kunne ikke hente quotes' });
  }
});

// HENT VALUTAKURSER 
// GET /portfolios/:portfolioId/rates?base=EUR
// Returnerer valutakurser mod basevaluta (default USD)
router.get('/portfolios/:portfolioId/rates', async (req, res) => {
  // 1) Læs basevaluta fra query (hvis ikke, brug USD)
  const base = req.query.base || 'USD';
  try {
    // 2) Hent kurser og returner
    const data = await latestRates(base);
    res.json(data);
  } catch (err) {
    console.error('Fejl i rates-rut:', err);
    res.status(500).json({ message: 'Kunne ikke hente valutakurser' });
  }
});

// VIS PORTFOLJE-SIDE 
// GET /portfolios/:portfolioId
// Renders EJS-skabelon growthTech med portfolioId
router.get('/portfolios/:portfolioId', async (req, res) => {
  res.render('growthTech', { portfolioId: req.params.portfolioId });
});

// HISTORIK-TJENESTE 
// GET /portfolios/:portfolioId/history
// Returnerer daglig porteføljetrend { date, value } fra første handel til i dag
router.get('/portfolios/:portfolioId/history', async (req, res) => {
  try {
    // 1) Hent alle trades for porteføljen
    const trades = await Portfolio.getTradesForPortfolio(req.params.portfolioId);
    if (!trades.length) return res.json([]); // Ingen handel → tom liste

    // 2) Udtræk unikke stockID'er fra trades
    const stockIDs = [];
    for (const t of trades) {
      if (t.stockID && !stockIDs.includes(t.stockID)) stockIDs.push(t.stockID);
    }

    // 3) Slå stockID op til symbol fra Stocks-tabellen
    const idToSymbol = {};
    if (stockIDs.length) {
      const pool = await poolPromise;
      const result = await pool.request()
        .query(`SELECT id, symbol FROM Stocks WHERE id IN (${stockIDs.join(',')})`);
      for (const row of result.recordset) idToSymbol[row.id] = row.symbol;
    }
    // 4) her skal vi tilføje et symbol til hver trade
    for (const trade of trades) trade.symbol = idToSymbol[trade.stockID] || trade.symbol;

    // 5) Find unikke symbols for historik-beregning
    const symbols = [];
    for (const t of trades) {
      if (t.symbol && !symbols.includes(t.symbol)) symbols.push(t.symbol);
    }

    // 6) Beregn første handelsdato og antal dage
    const firstDate = dayjs(trades[0].date).startOf('day');
    const today = dayjs().startOf('day');
    const days = today.diff(firstDate, 'day') + 1;

    // 7) Hent historiske priser for alle dage i perioden pr. symbol
    const historicalPrices = {};
    for (const symbol of symbols) {
      historicalPrices[symbol] = await getHistoricalPrices(symbol, days);
    }

    // 8) Beregn daglig porteføljeværdi
    const history = [];
    for (let i = 0; i < days; i++) {
      const date = firstDate.add(i, 'day').format('YYYY-MM-DD');
      // Saml beholdning antal pr. symbol op til denne dag
      const dailyHoldings = {};
      for (const symbol of symbols) {
        const tradesUpToDate = trades.filter(t => t.symbol === symbol && t.date <= date);
        dailyHoldings[symbol] = tradesUpToDate.reduce((sum, t) =>
          sum + (t.type === 'Buy' ? t.quantity : -t.quantity), 0);
      }
      // Beregn samlet værdi for dagen
      let totalValue = 0;
      for (const symbol of symbols) {
        const amount = dailyHoldings[symbol] || 0;
        const price = historicalPrices[symbol][date] || 0;
        totalValue += amount * price;
      }
      history.push({ date, value: totalValue });
    }

    // 9) Returner historik som JSON
    res.json(history);
  } catch (err) {
    console.error('Fejl i historik-rut:', err);
    res.status(500).json({ message: 'Kunne ikke hente historik' });
  }
});

// HENT TRADES 
// GET /portfolios/:portfolioId/trades
// Returnerer alle individuelle trades for en given portefølje til visning i trade-historik
router.get('/portfolios/:portfolioId/trades', async (req, res) => {
  try {
    const portfolioId = req.params.portfolioId; // Læs porteføljeId fra URL
    const trades = await Portfolio.getTradesForPortfolio(portfolioId); // Hent alle trades fra model
    res.json(trades); // Send trades som JSON
  } catch (err) {
    console.error('Fejl i trades-rut:', err);
    res.status(500).json({ message: 'Kunne ikke hente trades' });
  }
});

//  skal åhndtere KØB AF AKTIE 

router.post('/stocks/buy', async (req, res) => {
  try {
    // 1) Læs data fra request-body
    const { portfolioId, accountId, symbol, quantity, pricePerUnit, fee } = req.body;
    // 2) Tjek om symbol findes i Stocks, ellers opret ny
    const pool = await poolPromise;
    let stockResult = await pool.request()
      .input('symbol', sql.NVarChar, symbol)
      .query('SELECT id FROM Stocks WHERE symbol = @symbol');
    let stockId;
    if (!stockResult.recordset.length) {
      const insertRes = await pool.request()
        .input('symbol', sql.NVarChar, symbol)
        .input('portfolioId', sql.Int, portfolioId)
        .input('amount', sql.Float, quantity)
        .input('boughtAt', sql.Float, pricePerUnit)
        .query(
          'INSERT INTO Stocks (symbol, portfolio_id, amount, bought_at) OUTPUT INSERTED.id VALUES (@symbol, @portfolioId, @amount, @boughtAt)'
        );
      stockId = insertRes.recordset[0].id;
    } else {
      stockId = stockResult.recordset[0].id;
    }
    // 3) Udfør køb via TransactionsModel og få ny balance
    const newBalance = await TransactionsModel.buySecurity(
      portfolioId, accountId, stockId, quantity, pricePerUnit, fee
    );
    // 4) Returner success og balance
    res.json({ success: true, newBalance, message: 'Aktie købt succesfuldt' });
  } catch (err) {
    console.error('Fejl ved køb af aktie:', err);
    res.status(400).json({ success: false, message: err.message || 'Kunne ikke købe aktie' });
  }
});

//  Denne post skal håndtere salg af aktier inde i porteføljen 
router.post('/stocks/sell', async (req, res) => {
  try {
    // 1) Læs data fra request-body
    const { portfolioId, accountId, stockID, quantity, pricePerUnit, fee } = req.body;
    // 2) Valider om stockID er med
    if (!stockID) return res.status(400).json({ success: false, message: 'stockID mangler' });
    // 3) Udfør salg og få opdateret vores samlet balance
    const newBalance = await TransactionsModel.sellSecurity(
      portfolioId, accountId, stockID, quantity, pricePerUnit, fee
    );
    // 4)Returner resultat
    res.json({ success: true, newBalance, message: 'Aktie solgt succesfuldt' });
  } catch (err) {
    console.error('Fejl ved salg af aktie:', err);
    res.status(400).json({ success: false, message: err.message || 'Kunne ikke sælge aktie' });
  }
});

module.exports = router;
