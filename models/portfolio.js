const { sql, poolPromise } = require('../db/database');

const Portfolio = {
  // Hent ALLE porteføljer for en bruger
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

  // Opret ny portefølje med brugerID
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

  // Dashboard: aktiebeholdning
  getHoldingsForPortfolio: async (portfolioId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT 
          s.symbol,
          s.amount AS volume,
          s.bought_at AS avgCost,
          a.currency
        FROM Stocks s
        JOIN Portfolios p ON s.portfolio_id = p.portfolioID
        JOIN Accounts a ON p.accountID = a.accountID
        WHERE p.portfolioID = @portfolioId
      `);
    return result.recordset;
  },

  // Dashboard: samlet værdi og profit (placeholder)
  getPortfolioOverview: async (portfolioId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT
          ISNULL(SUM(s.amount * s.bought_at), 0) AS totalPurchase,
          0 AS totalExpected,
          0 AS totalUnrealized
        FROM Stocks s
        WHERE s.portfolio_id = @portfolioId
      `);
    return result.recordset[0];
  }
};

module.exports = Portfolio;
