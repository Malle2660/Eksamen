const { sql, poolPromise } = require('../db/database');
const fetch = require('node-fetch');

async function fetchFromAlphaVantage(symbol) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log('Alpha Vantage response:', data);
  // Alpha Vantage returnerer prisen i dette felt:
  const price = parseFloat(data['Global Quote']?.['05. price']);
  if (!price) throw new Error('Kunne ikke hente pris fra Alpha Vantage');
  return price;
}

// Funktion til at hente aktiekurser
async function getStockQuote(symbol) {
  const pool = await poolPromise;
  // 1. Tjek cache
  const result = await pool.request()
    .input('symbol', symbol)
    .query('SELECT price, lastUpdated FROM StockCache WHERE symbol = @symbol');
  if (result.recordset.length > 0) {
    const cached = result.recordset[0];
    const now = new Date();
    const lastUpdated = new Date(cached.lastUpdated);
    // Hvis cache er mindre end 15 min gammel, brug den
    if ((now - lastUpdated) < 15 * 60 * 1000) {
      return { price: cached.price };
    }
  }
  // 2. Ellers hent fra Alpha Vantage
  const price = await fetchFromAlphaVantage(symbol);
  // 3. Gem i cache
  await pool.request()
    .input('symbol', symbol)
    .input('price', price)
    .input('lastUpdated', new Date())
    .query(`
      MERGE StockCache AS target
      USING (SELECT @symbol AS symbol) AS source
      ON (target.symbol = source.symbol)
      WHEN MATCHED THEN
        UPDATE SET price = @price, lastUpdated = @lastUpdated
      WHEN NOT MATCHED THEN
        INSERT (symbol, price, lastUpdated) VALUES (@symbol, @price, @lastUpdated);
    `);
  return { price };
}

module.exports = { getStockQuote };
