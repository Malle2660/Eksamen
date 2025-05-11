// routes/auth.js

const express = require('express');
const bcrypt  = require('bcryptjs');
const router  = express.Router();
const usersModel        = require('../models/usersModel');
const accountsModel     = require('../models/accountsModel');
const transactionsModel = require('../models/transactionsModel');
const Portfolio = require('../models/portfolio');

// === Opret bruger ===
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' });
    }

    const existing = await usersModel.findByUsername(username);
    if (existing) {
      return res.status(400).json({ message: 'Brugernavn er allerede taget' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await usersModel.create(username, email, hash);
    res.status(201).json({ message: 'Bruger oprettet', userId: user.id });
  } catch (err) {
    console.error('Fejl ved oprettelse:', err);
    res.status(500).json({ message: 'Fejl ved oprettelse', error: err.message });
  }
});

// === Login ===
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await usersModel.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Forkert brugernavn eller adgangskode' });
    }
    if (!user.password) {
      return res.status(500).json({ error: 'Brugerens adgangskode mangler i databasen' });
    }
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Forkert brugernavn eller adgangskode' });
    }
    req.session.user = { userID: user.userID, username: user.username };
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfejl' });
  }
});

// === Skift adgangskode ===
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' });
    }

    const user = await usersModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Bruger ikke fundet' });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Nuværende adgangskode er forkert' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await usersModel.updatePassword(userId, hash);
    res.json({ message: 'Adgangskode ændret succesfuldt' });
  } catch (err) {
    console.error('Fejl ved ændring af adgangskode:', err);
    res.status(500).json({ message: 'Fejl ved ændring af adgangskode', error: err.message });
  }
});

router.get('/secret', (req, res) => {
  // Implementation of the route
});

router.get('/user', async (req, res) => {
  const userId = req.session.user.userID;
  const portfolios = await Portfolio.getAllForUser(userId);
  res.json(portfolios);
});

module.exports = router;
