const { sql, poolPromise } = require('../db/database');

const Stock = {
  // Hent alle aktier for en portefølje
  getAllForPortfolio: async (portfolioId) => {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT 
          id AS stockID,
          symbol,
          amount,
          bought_at
        FROM Stocks
        WHERE portfolio_id = @portfolioId
      `);
    return result.recordset;
  },

  // Tilføj en ny aktie og returnér den indsatte række
  addToPortfolio: async (portfolioId, symbol, amount, boughtAt) => {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId)
      .input('symbol', sql.VarChar(10), symbol)
      .input('amount', sql.Int, amount)
      .input('boughtAt', sql.Decimal(10, 2), boughtAt)
      .query(`
        INSERT INTO Stocks (portfolio_id, symbol, amount, bought_at)
        OUTPUT INSERTED.*
        VALUES (@portfolioId, @symbol, @amount, @boughtAt)
      `);
    return result.recordset[0];
  },

  // Slet en aktie
  delete: async (stockId) => {
    const pool = await poolPromise;
    await pool
      .request()
      .input('stockId', sql.Int, stockId)
      .query('DELETE FROM Stocks WHERE id = @stockId');
  },

  // Opdater en aktie
  update: async (stockId, amount, boughtAt) => {
    const pool = await poolPromise;
    await pool
      .request()
      .input('stockId', sql.Int, stockId)
      .input('amount', sql.Int, amount)
      .input('boughtAt', sql.Decimal(10, 2), boughtAt)
      .query(`
        UPDATE Stocks
        SET amount = @amount, bought_at = @boughtAt
        WHERE id = @stockId
      `);
  }
};

module.exports = Stock;
