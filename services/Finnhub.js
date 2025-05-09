const { sql, poolPromise } = require('../db/database');
const fetch = require('node-fetch');

async function fetchFromFinnhub(symbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log('Finnhub response:', data);

  // Finnhub returnerer prisen i 'c' feltet (current price)
  const price = parseFloat(data.c);
  if (!price) throw new Error('Kunne ikke hente pris fra Finnhub');
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
  // 2. Ellers hent fra Finnhub
  const price = await fetchFromFinnhub(symbol);
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

async function batchQuotes(symbols) {
  // symbols = 'AAPL,TSLA'
  const arr = symbols.split(',').filter(Boolean); // filtrer tomme
  const results = {};
  for (const symbol of arr) {
    results[symbol] = await getStockQuote(symbol);
  }
  return { 'Stock Quotes': arr.map(s => ({ '1. symbol': s, '2. price': results[s].price })) };
}

module.exports = { getStockQuote, batchQuotes };
