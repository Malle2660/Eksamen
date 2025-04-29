const express = require('express');
const router = express.Router();
const exchangeRateAPI = require('../services/exchangeRate');  // Opdater stien til services/exchangeRate.js

// Route for at hente valutakurser
router.get('/:baseCurrency', async (req, res) => {
  const baseCurrency = req.params.baseCurrency;
  try {
    const rates = await exchangeRateAPI.getExchangeRate(baseCurrency);
    res.json(rates);  // Returner data til klienten
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved hentning af valutakurser', error: error.message });
  }
});

module.exports = router;
