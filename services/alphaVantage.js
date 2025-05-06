const { sql, poolPromise } = require('../db/database');
const fetch = require('node-fetch');

// Funktion til at hente aktiekurser
async function getStockQuote(symbol) {
  const pool = await poolPromise;
  // 1. Tjek om vi har et friskt cache-hit (fx < 15 min gammelt)
  const cacheResult = await pool.request()
    .input('symbol', sql.NVarChar(10), symbol)
    .query(`
      SELECT price, currency, lastUpdated
      FROM StockCache
      WHERE symbol = @symbol
    `);

  if (cacheResult.recordset.length > 0) {
    const cached = cacheResult.recordset[0];
    const now = new Date();
    const last = new Date(cached.lastUpdated);
    const diffMinutes = (now - last) / (1000 * 60);
    if (diffMinutes < 15) {
      console.log('Henter fra cache:', symbol, cached.price);
      return { price: cached.price, currency: cached.currency };
    }
  }

  // 2. Hvis ikke: Hent fra Alpha Vantage
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  // Håndter rate limit eller fejl
  if (data.Information) throw new Error('Alpha Vantage rate limit!');

  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) throw new Error('No price found');

  const price = parseFloat(quote['05. price']);
  const currency = 'USD'; // eller hent fra andet sted

  // 3. Gem i cache
  await pool.request()
    .input('symbol', sql.NVarChar(10), symbol)
    .input('price', sql.Float, price)
    .input('currency', sql.NVarChar(10), currency)
    .input('lastUpdated', sql.DateTime, new Date())
    .query(`
      MERGE StockCache AS target
      USING (SELECT @symbol AS symbol) AS source
      ON (target.symbol = source.symbol)
      WHEN MATCHED THEN
        UPDATE SET price = @price, currency = @currency, lastUpdated = @lastUpdated
      WHEN NOT MATCHED THEN
        INSERT (symbol, price, currency, lastUpdated)
        VALUES (@symbol, @price, @currency, @lastUpdated);
    `);

  return { price, currency };
}

module.exports = { getStockQuote };
