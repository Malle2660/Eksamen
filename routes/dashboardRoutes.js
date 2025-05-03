// routes/dashboard.js
const express = require('express');
const {
  getPortfolioOverviewForUser,
  getTopByValueForUser,
  getTopByProfitForUser
} = require('../models/portfolio');

const router = express.Router();

// Middleware til at parse & validere userId-parametre
function parseUserId(req, res, next) {
  const id = Number(req.params.userId);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ugyldigt userId' });
  }
  req.userId = id;
  next();
}

// GET /dashboard/metrics/:userId
router.get('/metrics/:userId', parseUserId, async (req, res) => {
  try {
    const { totalExpected, totalPurchase, totalUnrealized } =
      await getPortfolioOverviewForUser(req.userId);
    res.json({
      totalValue: totalExpected,
      realized:   totalPurchase,
      unrealized: totalUnrealized
    });
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ message: 'Kunne ikke hente metrics' });
  }
});

// GET /dashboard/top/value/:userId
router.get('/top/value/:userId', parseUserId, async (req, res) => {
  try {
    const list = await getTopByValueForUser(req.userId, 5);
    res.json(list);
  } catch (err) {
    console.error('Top by value error:', err);
    res.status(500).json({ message: 'Kunne ikke hente top efter værdi' });
  }
});

// GET /dashboard/top/profit/:userId
router.get('/top/profit/:userId', parseUserId, async (req, res) => {
  try {
    const list = await getTopByProfitForUser(req.userId, 5);
    res.json(list);
  } catch (err) {
    console.error('Top by profit error:', err);
    res.status(500).json({ message: 'Kunne ikke hente top efter profit' });
  }
});

module.exports = router;
