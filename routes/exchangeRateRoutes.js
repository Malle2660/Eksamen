const express = require('express');
const router = express.Router();
const { getExchangeRate } = require('../services/ExchangeRate');

// Route for at hente valutakurser
router.get('/:baseCurrency', async (req, res) => {
  const baseCurrency = req.params.baseCurrency;
  try {
    const rates = await getExchangeRate(baseCurrency);
    res.json(rates);  // Returner data til klienten
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved hentning af valutakurser', error: error.message });
  }
});

module.exports = router;




