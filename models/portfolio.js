// models/portfolio.js
const { sql, poolPromise } = require('../db/database');

class PortfolioModel {
  // 1) Opret portefølje
  async create(name, accountId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('accountId', sql.Int, accountId)
      .query(`
        INSERT INTO Portfolios (name, accountID)
        VALUES (@name, @accountId);
        SELECT SCOPE_IDENTITY() AS portfolioID;
      `);
    return result.recordset[0].portfolioID;
  }

  // 2) Hent alle porteføljer for en bruger
  async getAllForUser(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT p.*
        FROM Portfolios p
        INNER JOIN Accounts a ON p.accountID = a.accountID
        WHERE a.userID = @userId;
      `);
    return result.recordset;
  }

  // 3) Hent en portefølje efter ID
  async getById(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query('SELECT * FROM Portfolios WHERE portfolioID = @portfolioId');
    return result.recordset[0];
  }

  // 4) Opdater en portefølje
  async update(portfolioId, name, accountId) {
    const pool = await poolPromise;
    await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .input('name', sql.NVarChar, name)
      .input('accountId', sql.Int, accountId)
      .query(`
        UPDATE Portfolios
        SET name = @name, accountID = @accountId
        WHERE portfolioID = @portfolioId;
      `);
  }

  // 5) Slet en portefølje
  async delete(portfolioId) {
    const pool = await poolPromise;
    await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query('DELETE FROM Portfolios WHERE portfolioID = @portfolioId');
  }

  // 6) Portfolio‑oversigt (navn og oprettelsesdato)
  async getPortfolioSummary(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT name, registrationDate
        FROM Portfolios
        WHERE portfolioID = @portfolioId;
      `);
    return result.recordset[0];
  }

  // 7) Portfolio‑metrics (totalPurchase, totalExpected, totalUnrealized)
  async getPortfolioOverview(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT
          SUM(t.quantity * t.price)                                      AS totalPurchase,
          SUM(t.quantity * s.currentPrice)                               AS totalExpected,
          SUM(t.quantity * s.currentPrice) - SUM(t.quantity * t.price)   AS totalUnrealized
        FROM Trades t
        JOIN Stocks s ON t.stockID = s.stockID
        WHERE t.portfolioID = @portfolioId;
      `);
    return result.recordset[0];
  }

  // 8) Holdings‑liste (symbol fra s.name, currency, volume og avgCost)
  async getHoldingsForPortfolio(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT
          t.stockID,
          s.name          AS symbol,    -- bruger kolonnen 'name' fra Stocks som symbol
          s.currency,
          SUM(t.quantity) AS volume,
          AVG(t.price)    AS avgCost
        FROM Trades t
        JOIN Stocks s ON t.stockID = s.stockID
        WHERE t.portfolioID = @portfolioId
        GROUP BY
          t.stockID,
          s.name,
          s.currency;
      `);
    return result.recordset;
  }

  // 9) Gennemsnitlig anskaffelseskurs
  async calculateGAK(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT
          stockID,
          SUM(price * quantity) / SUM(quantity) AS GAK
        FROM Trades
        WHERE portfolioID = @portfolioId
        GROUP BY stockID;
      `);
    return result.recordset;
  }

  // 10) Forventet værdi (antal * aktuel pris)
  async calculateExpectedValue(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT
          t.stockID,
          SUM(t.quantity) * s.currentPrice AS expectedValue
        FROM Trades t
        JOIN Stocks s ON t.stockID = s.stockID
        WHERE t.portfolioID = @portfolioId
        GROUP BY t.stockID, s.currentPrice;
      `);
    return result.recordset;
  }

  // 11) Urealiseret gevinst/tab
  async calculateUnrealizedGainLoss(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT
          t.stockID,
          SUM(t.quantity * s.currentPrice) - SUM(t.quantity * t.price) AS gainOrLoss
        FROM Trades t
        JOIN Stocks s ON t.stockID = s.stockID
        WHERE t.portfolioID = @portfolioId
        GROUP BY t.stockID;
      `);
    return result.recordset;
  }
}

module.exports = new PortfolioModel();
