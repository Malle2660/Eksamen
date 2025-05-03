// routes/auth.js

const express = require('express');
const bcrypt  = require('bcryptjs');
const router  = express.Router();

const usersModel        = require('../models/usersModel');
const accountsModel     = require('../models/accountsModel');
const transactionsModel = require('../models/transactionsModel');

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
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' });
    }

    const user = await usersModel.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Ugyldigt brugernavn eller adgangskode' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Ugyldigt brugernavn eller adgangskode' });
    }

    // --- Sæt session på succesfuldt login ---
    req.session.user = {
      id:       user.userID || user.id,
      username: user.username
    };

    // Returnér et simpelt JSON-svar
    res.json({ message: 'OK', userId: req.session.user.id });
  } catch (err) {
    console.error('Fejl ved login:', err);
    res.status(500).json({ message: 'Fejl ved login', error: err.message });
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

module.exports = router;
