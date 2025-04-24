const express = require('express');
const router = express.Router();

// Eksempel på en portfolio route
router.get('/', (req, res) => {
    res.send('Portfolio route fungerer!');
});

// exporter router
module.exports = router;