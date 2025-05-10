const { sql, poolPromise } = require('../db/database');

const Portfolio = {
  // Hent alle porteføljer for en bruger
  getAllForUser: async (userId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Portfolios WHERE userID = @userId');
    return result.recordset;
  },

  // Hent én specifik portefølje
  getById: async (portfolioId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query('SELECT * FROM Portfolios WHERE portfolioID = @portfolioId');
    return result.recordset[0];
  },

  // Opret ny portefølje
  create: async (name, accountId, userId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.NVarChar(255), name)
      .input('accountId', sql.Int, accountId)
      .input('userId', sql.Int, userId)
      .query(`
        INSERT INTO Portfolios (name, accountID, registrationDate, userID)
        VALUES (@name, @accountId, GETDATE(), @userId)
      `);
    return result.rowsAffected[0];
  },

  // Slet en portefølje
  delete: async (portfolioId) => {
    const pool = await poolPromise;
    await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query('DELETE FROM Portfolios WHERE portfolioID = @portfolioId');
  },

  // GAK (gennemsnitlig anskaffelseskurs) for én aktie i en portefølje
  getGAKForStock: async (portfolioId, symbol) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .input('symbol', sql.NVarChar(10), symbol)
      .query(`
        SELECT 
          SUM(CASE WHEN t.type = 'Buy' THEN t.quantity * t.price ELSE 0 END) AS totalPurchase,
          SUM(CASE WHEN t.type = 'Buy' THEN t.quantity ELSE 0 END) AS totalBought
        FROM Trades t
        JOIN Stocks s ON t.stockID = s.id
        WHERE t.portfolioID = @portfolioId AND s.symbol = @symbol
      `);
    const row = result.recordset[0];
    if (!row || !row.totalBought) return 0;
    return row.totalPurchase / row.totalBought;
  },

  // Hent alle holdings for en portefølje (udregnet fra Trades)
  getHoldingsForPortfolio: async (portfolioId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT 
          t.stockID AS id,
          s.symbol,
          SUM(CASE WHEN t.type = 'Buy' THEN t.quantity ELSE -t.quantity END) AS amount
        FROM Trades t
        JOIN Stocks s ON t.stockID = s.id
        WHERE t.portfolioID = @portfolioId
        GROUP BY t.stockID, s.symbol
        HAVING SUM(CASE WHEN t.type = 'Buy' THEN t.quantity ELSE -t.quantity END) > 0
      `);

    // Hent markedspriser og lav holdings-objekter
    const holdings = [];
    for (const row of result.recordset) {
      let price = 0;
      try {
        const quote = await require('../services/finnhub').getStockQuote(row.symbol);
        price = quote.price || 0;
      } catch (e) { price = 0; }
      holdings.push({
        id: row.id,
        symbol: row.symbol,
        amount: row.amount,
        price,
        value: row.amount * price
      });
    }
    return holdings;
  },

  // Beregn forventet værdi ud fra holdings (Trades)
  getExpectedValueFromHoldings: async (portfolioId) => {
    const holdings = await Portfolio.getHoldingsForPortfolio(portfolioId);
    return holdings.reduce((sum, h) => sum + h.value, 0);
  },

  // Urealiseret gevinst/tab for portefølje (baseret på trades/GAK)
  getTotalUnrealizedFromHoldings: async (portfolioId) => {
    const holdings = await Portfolio.getHoldingsForPortfolio(portfolioId);
    let total = 0;
    for (const h of holdings) {
      const gak = await Portfolio.getGAKForStock(portfolioId, h.symbol);
      total += (h.price - gak) * h.amount;
    }
    return total;
  },
};

module.exports = Portfolio;
