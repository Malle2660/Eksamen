// routes/growthRoutes.js
const express        = require('express');
const router         = express.Router();
const Portfolio      = require('../models/portfolio');
const { batchQuotes }   = require('../services/Finnhub');
const { latestRates }   = require('../services/ExchangeRate');
const { getStockQuote } = require('../services/Finnhub');
const TransactionsModel = require('../models/transactionsModel');
const { sql, poolPromise } = require('../db/database');
const dayjs = require('dayjs'); // Installer evt. med: npm install dayjs

// Hent holdings fra din  model test
router.get('/portfolios/:portfolioId/holdings', async (req, res) => {
  try {
    const holdings = await Portfolio.getHoldingsForPortfolio(req.params.portfolioId);
    res.json(holdings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kunne ikke hente holdings' });
  }
});

// Hent aktiekurser fra FinHub
router.get('/portfolios/:portfolioId/quotes', async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ message: 'symbols mangler' });
  try {
    const data = await batchQuotes(symbols);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kunne ikke hente quotes' });
  }
});

// Hent valutakurser
router.get('/portfolios/:portfolioId/rates', async (req, res) => {
  const base = req.query.base || 'USD';
  try {
    const data = await latestRates(base);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kunne ikke hente valutakurser' });
  }
});

// Render portefølje-siden
router.get('/portfolios/:portfolioId', async (req, res) => {
  const portfolioId = req.params.portfolioId;
  res.render('growthTech', { portfolioId });
});

router.get('/portfolios/:portfolioId/history', async (req, res) => {
  const portfolioId = req.params.portfolioId;
  try {
    // 1. Hent alle trades for porteføljen
    const trades = await Portfolio.getTradesForPortfolio(portfolioId);
    if (!trades.length) return res.json([]); // Ingen historik hvis ingen handler

    // 2. Slå symbol op hvis nødvendigt
    const stockIDs = [...new Set(trades.map(t => t.stockID).filter(Boolean))];
    let idToSymbol = {};
    if (stockIDs.length > 0) {
      const pool = await poolPromise;
      const result = await pool.request()
        .query(`SELECT id, symbol FROM Stocks WHERE id IN (${stockIDs.join(',')})`);
      for (const row of result.recordset) {
        idToSymbol[row.id] = row.symbol;
      }
      for (const trade of trades) {
        trade.symbol = idToSymbol[trade.stockID];
      }
    }
    const symbols = [...new Set(trades.map(t => t.symbol).filter(Boolean))];

    // 3. Hent historiske kurser for de sidste 10 dage
    const { getHistoricalPrices } = require('../services/Finnhub');
    const historicalPrices = {};
    for (const symbol of symbols) {
      historicalPrices[symbol] = await getHistoricalPrices(symbol, 10);
    }

    // 4. Find første trade-dato
    const firstDate = dayjs(trades[0].date).startOf('day');
    const today = dayjs().startOf('day');
    const days = today.diff(firstDate, 'day') + 1;

    // 5. For hver dag: beregn værdi
    const history = [];
    for (let i = 0; i < days; i++) {
      const d = firstDate.add(i, 'day').format('YYYY-MM-DD');
      // Beregn beholdning for hver aktie på denne dag
      const holdings = {};
      for (const symbol of symbols) {
        const tradesForSymbol = trades.filter(t => t.symbol === symbol && t.date <= d);
        const amount = tradesForSymbol.reduce((sum, t) => sum + (t.type === 'Buy' ? t.quantity : -t.quantity), 0);
        holdings[symbol] = amount;
      }
      // Beregn samlet værdi for denne dag
      let totalValue = 0;
      for (const symbol of symbols) {
        const amount = holdings[symbol];
        const price = historicalPrices[symbol][d] || 0;
        totalValue += amount * price;
      }
      history.push({
        date: d,
        value: totalValue
      });
    }
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Kunne ikke hente historik' });
  }
});

// Køb aktie
router.post('/stocks/buy', async (req, res) => {
    try {
        const { portfolioId, accountId, symbol, quantity, pricePerUnit, fee } = req.body;
        
        // 1. Tjek om aktien findes i databasen, ellers opret den
        const pool = await poolPromise;
        let stockResult = await pool.request()
            .input('symbol', sql.NVarChar, symbol)
            .query('SELECT id FROM Stocks WHERE symbol = @symbol');
            
        let stockId;
        if (stockResult.recordset.length === 0) {
            // Opret ny aktie
            const insertResult = await pool.request()
                .input('symbol', sql.NVarChar, symbol)
                .query('INSERT INTO Stocks (symbol) OUTPUT INSERTED.id VALUES (@symbol)');
            stockId = insertResult.recordset[0].id;
        } else {
            stockId = stockResult.recordset[0].id;
        }

        // 2. Køb aktien via TransactionsModel
        const newBalance = await TransactionsModel.buySecurity(
            portfolioId,
            accountId,
            stockId,
            quantity,
            pricePerUnit,
            fee
        );

        res.json({ 
            success: true, 
            newBalance,
            message: 'Aktie købt succesfuldt'
        });
    } catch (err) {
        console.error('Fejl ved køb af aktie:', err);
        res.status(400).json({ 
            success: false, 
            message: err.message || 'Kunne ikke købe aktie'
        });
  }
});

router.post('/stocks/sell', async (req, res) => {
    try {
        const { portfolioId, accountId, stockID, quantity, pricePerUnit, fee } = req.body;

        // Brug stockID direkte, ingen grund til at slå op via symbol!
        if (!stockID) {
            return res.status(400).json({ success: false, message: 'stockID mangler' });
        }

        // Sælg aktien via TransactionsModel
        const newBalance = await TransactionsModel.sellSecurity(
            portfolioId,
            accountId,
            stockID,
            quantity,
            pricePerUnit,
            fee
        );

        res.json({
            success: true,
            newBalance,
            message: 'Aktie solgt succesfuldt'
        });
    } catch (err) {
        console.error('Fejl ved salg af aktie:', err);
        res.status(400).json({
            success: false,
            message: err.message || 'Kunne ikke sælge aktie'
        });
    }
});

module.exports = router;
