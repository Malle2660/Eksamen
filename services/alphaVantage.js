const { sql, poolPromise } = require('../db/database');
const fetch = require('node-fetch');

// Funktion til at hente aktiekurser
async function getStockQuote(symbol) {
  const pool = await poolPromise;
  // 1. Tjek cache
  const result = await pool.request()
    .input('symbol', symbol)
    .query('SELECT price, updatedAt FROM StockCache WHERE symbol = @symbol');
  if (result.recordset.length > 0) {
    const cached = result.recordset[0];
    const now = new Date();
    const updatedAt = new Date(cached.updatedAt);
    // Hvis cache er mindre end 15 min gammel, brug den
    if ((now - updatedAt) < 15 * 60 * 1000) {
      return { price: cached.price };
    }
  }
  // 2. Ellers hent fra Alpha Vantage
  const price = await fetchFromAlphaVantage(symbol);
  // 3. Gem i cache
  await pool.request()
    .input('symbol', symbol)
    .input('price', price)
    .input('updatedAt', new Date())
    .query(`
      MERGE StockCache AS target
      USING (SELECT @symbol AS symbol) AS source
      ON (target.symbol = source.symbol)
      WHEN MATCHED THEN
        UPDATE SET price = @price, updatedAt = @updatedAt
      WHEN NOT MATCHED THEN
        INSERT (symbol, price, updatedAt) VALUES (@symbol, @price, @updatedAt);
    `);
  return { price };
}

module.exports = { getStockQuote };
