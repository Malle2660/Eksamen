const axios = require('axios');

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;  // Hent API-nøgle fra .env

// Funktion til at hente aktiekurser
const getStockQuote = async (symbol) => {
  try {
    const response = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'TIME_SERIES_INTRADAY',
        symbol: symbol,
        interval: '1min',
        apikey: API_KEY,
      },
    });
    return response.data;  // Returner aktiekurser data fra API'et
  } catch (error) {
    throw new Error('Fejl ved hentning af aktiekurser: ' + error.message);
  }
};

module.exports = { getStockQuote };
