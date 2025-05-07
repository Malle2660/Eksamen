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

  // Hent alle aktier for en portefølje
  getStocksForPortfolio: async (portfolioId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT 
          s.id AS stockID,
          s.symbol,
          s.amount,
          s.bought_at,
          s.portfolio_id
        FROM Stocks s
        WHERE s.portfolio_id = @portfolioId
      `);
    return result.recordset;
  },

  // GAK (gennemsnitlig anskaffelseskurs) for én aktie i en portefølje
  getGAKForStock: async (portfolioId, symbol) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .input('symbol', sql.NVarChar(10), symbol)
      .query(`
        SELECT 
          SUM(s.amount * s.bought_at) AS totalPurchase,
          SUM(s.amount) AS totalAmount
        FROM Stocks s
        WHERE s.portfolio_id = @portfolioId AND s.symbol = @symbol
      `);
    const row = result.recordset[0];
    if (!row || !row.totalAmount) return 0;
    return row.totalPurchase / row.totalAmount;
  },

  // Samlet erhvervelsespris for en portefølje
  getTotalPurchaseForPortfolio: async (portfolioId) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT ISNULL(SUM(s.amount * s.bought_at), 0) AS totalPurchase
        FROM Stocks s
        WHERE s.portfolio_id = @portfolioId
      `);
    return result.recordset[0].totalPurchase;
  },

  // Forventet værdi for en portefølje (alle aktier)
  getExpectedValueForPortfolio: async (portfolioId) => {
    let totalValue = 0;
    const stocks = await Portfolio.getStocksForPortfolio(portfolioId);
    for (const stock of stocks) {
      let price = 0;
      try {
        const quote = await require('../services/alphaVantage').getStockQuote(stock.symbol);
        price = quote.price || 0;
      } catch (e) { price = 0; }
      totalValue += (stock.amount || 0) * price;
    }
    return totalValue;
  },

  // Urealiseret gevinst/tab for én aktie
  getUnrealizedForStock: async (portfolioId, symbol) => {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .input('symbol', sql.NVarChar(10), symbol)
      .query(`
        SELECT SUM(s.amount * s.bought_at) AS totalPurchase, SUM(s.amount) AS totalAmount
        FROM Stocks s
        WHERE s.portfolio_id = @portfolioId AND s.symbol = @symbol
      `);
    const row = result.recordset[0];
    if (!row || !row.totalAmount) return 0;
    let price = 0;
    try {
      const quote = await require('../services/alphaVantage').getStockQuote(symbol);
      price = quote.price || 0;
    } catch (e) { price = 0; }
    const expectedValue = row.totalAmount * price;
    return expectedValue - row.totalPurchase;
  },

  // Samlet urealiseret gevinst/tab for en portefølje
  getTotalUnrealizedForPortfolio: async (portfolioId) => {
    const stocks = await Portfolio.getStocksForPortfolio(portfolioId);
    let total = 0;
    for (const stock of stocks) {
      let price = 0;
      try {
        const quote = await require('../services/alphaVantage').getStockQuote(stock.symbol);
        price = quote.price || 0;
      } catch (e) { price = 0; }
      total += (stock.amount || 0) * (price - (stock.bought_at || 0));
    }
    return total;
  },

  // Hent alle holdings for en portefølje (med pris og værdi)
  getHoldingsForPortfolio: async (portfolioId) => {
    const stocks = await Portfolio.getStocksForPortfolio(portfolioId);
    const holdings = [];
    for (const stock of stocks) {
      let price = 0;
      try {
        const quote = await require('../services/alphaVantage').getStockQuote(stock.symbol);
        price = quote.price || 0;
      } catch (e) { price = 0; }
      // Hvis du har currency på stock, hent valutakurs
      let rate = 1;
      if (stock.currency && stock.currency !== 'DKK') {
        try {
          const { getExchangeRate } = require('../services/exchangeRate');
          rate = await getExchangeRate(stock.currency, 'DKK');
        } catch (e) { rate = 1; }
      }
      holdings.push({
        ...stock,
        price,
        value: (stock.amount || 0) * price * rate
      });
    }
    return holdings;
  }
};

module.exports = Portfolio;
