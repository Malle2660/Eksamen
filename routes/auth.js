const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const usersModel = require('../models/usersModel');
const accountsModel = require('../models/accountsModel');
const transactionsModel = require('../models/transactionsModel');

// === Opret bruger ===
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Alle felter skal udfyldes' });
        }

        const existingUser = await usersModel.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ message: 'Brugernavn er allerede taget' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await usersModel.create(username, email, hashedPassword);
        res.status(201).json({ message: 'Bruger oprettet', userId: user.id });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved oprettelse', error: error.message });
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

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Ugyldigt brugernavn eller adgangskode' });
        }

        const token = jwt.sign({ userId: user.userID }, process.env.JWT_SECRET || 'hemmelig', { expiresIn: '24h' });
        res.json({ token, userId: user.userID });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved login', error: error.message });
    }
});

// === Ændre adgangskode ===
router.post('/change-password', async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;

        console.log('🔐 Indkomne data:', { userId, oldPassword, newPassword });

        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Alle felter skal udfyldes' });
        }

        const user = await usersModel.findById(userId);
        console.log('👤 Fundet bruger:', user);

        if (!user) {
            return res.status(404).json({ message: 'Bruger ikke fundet' });
        }

        const isValid = await bcrypt.compare(oldPassword, user.password);
        console.log('🔍 Password match:', isValid);

        if (!isValid) {
            return res.status(401).json({ message: 'Nuværende adgangskode er forkert' });
        }

        await usersModel.updatePassword(userId, newPassword);
        res.json({ message: 'Adgangskode ændret succesfuldt' });

    } catch (error) {
        console.error('❌ Fejl ved ændring af adgangskode:', error.message);
        res.status(500).json({ message: 'Fejl ved ændring af adgangskode', error: error.message });
    }
});




module.exports = router;
