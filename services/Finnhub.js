const { sql, poolPromise } = require('../db/database');
const fetch = require('node-fetch');
const axios = require('axios');

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

// Tilføj historiske kurser-funktion
async function getHistoricalPrices(symbol, days = 10) {
  const apiKey = process.env.FINNHUB_API_KEY; // Henter API-nøglen fra .env-filen
  const now = Math.floor(Date.now() / 1000); 
  const from = now - days * 24 * 60 * 60; // Beregner startdato (nu - dage)
  const resolution = 'D'; // Sætter opdateringsinterval til 1 dag
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${now}&token=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  const prices = {};
  if (data.s !== 'ok' || !data.c || !data.t) { // Sørger for at data er korrekt
    return prices;
  } 
  for (let i = 0; i < data.t.length; i++) {
    const date = new Date(data.t[i] * 1000).toISOString().slice(0, 10); // Konverterer Unix-tid til ISO-format
    prices[date] = data.c[i]; // Gemmer prisen for den pågældende dato
  }
  return prices;
}

// Eksporter alle funktioner, inkl. historiske kurser
module.exports = {
  getStockQuote,
  batchQuotes,
  getHistoricalPrices
};
