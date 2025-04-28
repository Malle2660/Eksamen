const axios = require('axios');

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;  // Hent API-nøgle fra .env

// Funktion til at hente valutakurser
const getExchangeRate = async (baseCurrency) => {
  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`);
    return response.data;  // Returner data fra API'et
  } catch (error) {
    throw new Error('Fejl ved hentning af valutakurser: ' + error.message);
  }
};

module.exports = { getExchangeRate };
