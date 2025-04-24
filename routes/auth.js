const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// Eksempel på en auth route
router.get('/', (req, res) => {
    res.send('Auth route fungerer!');
});

// Register bruger
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
 
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Alle felter skal udfyldes' });
        }

        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ message: 'Brugernavn er allerede taget' });
        }

        const userId = await User.create(username, email, password);
        res.status(201).json({ message: 'Bruger oprettet succesfuldt', userId });
    } catch (error) {
        res.status(500).json({ message: 'Der skete en fejl ved oprettelse af bruger' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(401).json({ message: 'Ugyldigt brugernavn eller adgangskode' });
        }

        const isValid = await User.verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Ugyldigt brugernavn eller adgangskode' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token, userId: user.id, username: user.username });
    } catch (error) {
        res.status(500).json({ message: 'Der skete en fejl ved login' });
    }
});

// Ændre adgangskode
router.post('/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Bruger ikke fundet' });
        }

        const isValid = await User.verifyPassword(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Nuværende adgangskode er forkert' });
        }

        await User.updatePassword(userId, newPassword);
        res.json({ message: 'Adgangskode ændret succesfuldt' });
    } catch (error) {
        res.status(500).json({ message: 'Der skete en fejl ved ændring af adgangskode' });
    }
});

module.exports = router;