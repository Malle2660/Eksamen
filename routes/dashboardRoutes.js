// ------------------------------------------------------------
const express = require('express'); // Henter Express til at oprette ruter og middleware
const router = express.Router(); // Opretter en router-instans til dashboard-endpoints
const Portfolio = require('../models/portfolio'); // Model til at hente porteføljer og beholdninger fra databasen
const { getStockQuote } = require('../services/Finnhub'); // Service til at hente aktuelle aktiekurser fra Finnhub
const transactionsModel = require('../models/transactionsModel'); // Model til at hente handels-transaktioner
const sql = require('mssql'); // SQL-bibliotek til at sende rå forespørgsler til databasen
const { poolPromise } = require('../db/database'); // Forbindelsespulje til databasen med promises

// === VISNING: Dashboard-side ===
// GET /dashboard
router.get('/', async (req, res, next) => { // Håndterer GET-forespørgsel til /dashboard
  try {
    const userId = req.session.user.userID; // Hent den loggede brugers ID fra session-objektet
    const portfolios = await Portfolio.getAllForUser(userId); // Hent alle porteføljer for denne bruger

    // 3. Indsaml alle beholdninger fra hver portefølje
    let allHoldings = [];
    for (const portfolio of portfolios) { // Loop gennem hver portefølje
      const holdings = await Portfolio.getHoldingsForPortfolio(portfolio.portfolioID); // Hent beholdninger for portefølje
      allHoldings = allHoldings.concat(
        holdings.map(h => ({ ...h, portfolioName: portfolio.name })) // Tilføj porteføljens navn til hver beholdning
      );
    }

    // 4. Hent live-priser og beregn værdi og gevinst for hver beholdning
    for (const h of allHoldings) { // Gennemgå hver enkelt beholdning
      try {
        const quote = await getStockQuote(h.symbol); // Hent aktuel kurs for symbolet
        h.price = quote.price || 0; // Brug 0 hvis kurs ikke er tilgængelig
      } catch (e) {
        h.price = 0; // Ved API-fejl sættes kurs til 0
      }
      h.value = (h.amount || 0) * h.price; // Beregn positionsværdi i USD
      h.profit = (h.price - (h.bought_at || 0)) * (h.amount || 0); // Beregn urealiseret gevinst
    }

    // 5. Find top 5 beholdninger efter værdi og profit
    const topValue = allHoldings
      .slice()
      .sort((a, b) => b.value - a.value) // Sortér faldende efter samlet værdi
      .slice(0, 5); // Vælg de 5 største positioner
    const topProfit = allHoldings
      .slice()
      .sort((a, b) => b.profit - a.profit) // Sortér faldende efter gevinst
      .slice(0, 5); // Vælg de 5 mest profitable positioner

    // 6. Beregn samlede porteføljemetrics
    const totalExpected = allHoldings.reduce((sum, h) => sum + h.value, 0); // Samlet værdi af alle positioner
    const totalUnrealized = allHoldings.reduce((sum, h) => sum + h.profit, 0); // Samlet urealiseret gevinst

    // 7. Gengiv dashboard-siden med beregnede data
    res.render('dashboard', { // Render EJS-skabelonen med data
      user: req.session.user, // Brugerinfo til header og layout
      overview: { totalExpected, totalUnrealized }, // Metrics til oversigten i UI
      topValue, // Data til top-værdi-tabel
      topProfit // Data til top-profit-tabel
    });
  } catch (err) {
    next(err); // Videregiv fejl til Express-fejlhandleren
  }
});


// Returnerer JSON { totalValue, realized, unrealized }
router.get('/metrics', async (req, res, next) => {
  try {
    const userId = req.session.user.userID; // Hent bruger-ID fra session
    const portfolios = await Portfolio.getAllForUser(userId); // Hent alle porteføljer for brugeren

    let totalValue = 0;
    let totalUnrealized = 0;
    let totalRealized = 0; // Pladsholder for realiseret gevinst

    // Beregn samlet værdi og urealiseret gevinst
    for (const p of portfolios) {
      const holdings = await Portfolio.getHoldingsForPortfolio(p.portfolioID); // Hent beholdninger
      for (const h of holdings) {
        totalValue += h.value || 0; // Læg hver positions værdi til totalen
      }
      const unreal = await Portfolio.getTotalUnrealizedFromHoldings(p.portfolioID); // Hent urealiseret gevinst for portefølje
      totalUnrealized += unreal; // Læg til den samlede urealiserede gevinst
    }

    // Send statistik som JSON til klienten
    res.json({
      totalValue,
      realized: totalRealized,
      unrealized: totalUnrealized
    });
  } catch (err) {
    next(err);
  }
});

// === API: Historiske porteføljeværdier til Chart.js ===
// GET /dashboard/history?days=N (standard N=10)
// Returnerer JSON-array [{ date, value }] for de sidste N dage
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.session.user.userID; // Hent bruger-ID fra session
    const portfolios = await Portfolio.getAllForUser(userId); // Hent alle porteføljer

    // Indsaml alle handels-transaktioner
    let allTrades = [];
    for (const portfolio of portfolios) {
      const trades = await transactionsModel.getAllForPortfolio(portfolio.portfolioID); // Hent transaktioner for portefølje
      allTrades = allTrades.concat(trades); // Saml transaktioner i én liste
    }

    // Standardiser datoformat til 'ÅÅÅÅ-MM-DD'
    allTrades = allTrades.map(t => ({
      ...t,
      date: t.date instanceof Date
        ? t.date.toISOString().slice(0, 10)
        : t.date.toString().slice(0, 10)
    }));

    // Find unikke stockIDs fra transaktionerne (fjern tomme og duplikerede)
    const stockIDs = [];
    for (const trade of allTrades) {
      if (trade.stockID && !stockIDs.includes(trade.stockID)) {
        stockIDs.push(trade.stockID);
      }
    }
    const idToSymbol = {}; // Map fra stockID til symbol
    if (stockIDs.length) {
      const pool = await poolPromise; // Hent databaseforbindelse
      const result = await pool.request()
        .query(`SELECT id, symbol FROM Stocks WHERE id IN (${stockIDs.join(',')})`); // Hent symboler fra DB
      for (const row of result.recordset) {
        idToSymbol[row.id] = row.symbol; // Gem mapping
      }
    }
    allTrades.forEach(t => { t.symbol = idToSymbol[t.stockID]; }); // Tildel symbol til hver transaktion

    // Find unikke symboler fra transaktionerne (fjern tomme og duplikerede)
    const symbols = [];
    for (const trade of allTrades) {
      const s = trade.symbol;
      if (s && !symbols.includes(s)) {
        symbols.push(s);
      }
    }
    
    // Hent historiske og nuværende priser
    const { getHistoricalPrices } = require('../services/Finnhub'); // Service til historiske priser
    const historicalPrices = {}; // Objekt: symbol → { dato: pris }
    const currentPrices = {}; // Objekt: symbol → seneste pris
    for (const symbol of symbols) {
      historicalPrices[symbol] = await getHistoricalPrices(symbol, 10); // Hent sidste 10 dages priser
      try {
        const quote = await getStockQuote(symbol); // Hent aktuel pris
        currentPrices[symbol] = quote.price || 0;
      } catch {
        currentPrices[symbol] = 0; // Brug 0 hvis der ikke er en pris
      }
    }

    // Build history array for each day
    const days = parseInt(req.query.days, 10) || 10;
    const history = [];
    for (let i = days - 1; i >= 0; i--) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - i);
      const dateStr = dateObj.toISOString().slice(0, 10);

      // Calculate holdings by symbol up to this date
      const holdings = symbols.reduce((acc, symbol) => {
        const tradesForSymbol = allTrades.filter(
          t => t.symbol === symbol && t.date <= dateStr
        );
        acc[symbol] = tradesForSymbol.reduce(
          (sum, t) => sum + (t.type === 'Buy' ? t.quantity : -t.quantity),
          0
        );
        return acc;
      }, {});

      // Sum total portfolio value for the day
      let totalValueForDay = 0;
      for (const symbol of symbols) {
        const amount = holdings[symbol] || 0;
        const price = historicalPrices[symbol]?.[dateStr] ?? currentPrices[symbol] ?? 0;
        totalValueForDay += amount * price;
      }
      history.push({ date: dateStr, value: totalValueForDay });
    }

    res.json(history);
  } catch (err) {
    next(err);
  }
});

// === API: Top 5 efter værdi på GET /dashboard/top/value ===
// Henter de fem aktier med størst samlet værdi i dine porteføljer
router.get('/top/value', async (req, res, next) => {
  try {
    // 1) Hent bruger-ID og alle porteføljer for at kende hvad vi skal vise
    const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);

    // 2) Saml alle beholdninger fra hver portefølje i en liste
    let allHoldings = [];
    for (const portfolio of portfolios) {
      const holdings = await Portfolio.getHoldingsForPortfolio(portfolio.portfolioID);
      allHoldings = allHoldings.concat(
        holdings.map(h => ({ ...h, portfolioName: portfolio.name }))
      );
    }

    // 3) Hent live-pris for hver aktie og beregn dens værdien
    for (const h of allHoldings) {
      try {
        const quote = await getStockQuote(h.symbol);
        h.price = quote.price || 0;
      } catch (e) {
        h.price = 0;
      }
      h.value = (h.amount || 0) * h.price;
    }

    // 4) Sortér beholdningerne efter værdi (stor til lille) og tag de første 5
    const topValue = allHoldings.sort((a,b) => b.value - a.value).slice(0,5);
    // 5) Returnér de 5 største som JSON til klienten
    res.json(topValue);
  } catch (err) {
    next(err);
  }
});

// API: der skal hente Top 5 efter profit fra /dashboard/top/profit 
// Henter de fem aktier med størst urealiseret gevinst i dine porteføljer
router.get('/top/profit', async (req, res, next) => {
  try {
    // 1) Hent bruger-ID og porteføljer
    const userId = req.session.user.userID;
    const portfolios = await Portfolio.getAllForUser(userId);

    // 2) Saml alle beholdninger i én liste
    let allHoldings = [];
    for (const portfolio of portfolios) {
      const holdings = await Portfolio.getHoldingsForPortfolio(portfolio.portfolioID);
      allHoldings = allHoldings.concat(
        holdings.map(h => ({ ...h, portfolioName: portfolio.name }))
      );
    }

    // 3) Hent live-pris for hver aktie og beregn gevinst
    for (const h of allHoldings) {
      try {
        const quote = await getStockQuote(h.symbol);
        h.price = quote.price || 0;
      } catch (e) {
        h.price = 0;
      }
      h.profit = (h.price - (h.bought_at || 0)) * (h.amount || 0);
    }

    // 4) Sortér efter gevinst og tag de første 5
    const topProfit = allHoldings.sort((a,b) => b.profit - a.profit).slice(0,5);
    // 5) Sender top 5 som JSON til klienten
    res.json(topProfit);
  } catch (err) {
    next(err);
  }
});

//  DEBUG:  for at se alle aktier for brugerens porteføljer 
// Viser alle aktier i hver portefølje som JSON, kun til udvikling og fejlfinding
router.get('/debug/stocks', async (req, res) => {
  // 1) Hent alle porteføljer for brugeren
  const portfolios = await Portfolio.getAllForUser(req.session.user.userID);
  // 2) Indsaml alle aktier fra hver portefølje
  let allStocks = [];
  for (const p of portfolios) {
    const stocks = await Portfolio.getStocksForPortfolio(p.portfolioID);
    allStocks = allStocks.concat(stocks);
  }
  // 3) Returnér alle aktier som JSON, så vi kan se data under udvikling
  res.json(allStocks);
});

module.exports = router;
