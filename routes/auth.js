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
        const { userId, currentPassword, newPassword } = req.body;
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Alle felter skal udfyldes' });
        }

        const user = await usersModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Bruger ikke fundet' });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Nuværende adgangskode er forkert' });
        }

        await usersModel.updatePassword(userId, newPassword);
        res.json({ message: 'Adgangskode ændret succesfuldt' });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved ændring af adgangskode', error: error.message });
    }
});

// === Opret konto ===
router.post('/account/create', async (req, res) => {
    try {
        const { userId, currency, bank } = req.body;
        if (!userId || !currency || !bank) {
            return res.status(400).json({ message: 'Alle felter skal udfyldes' });
        }

        const account = await accountsModel.createAccount(userId, currency, bank);
        res.status(201).json({ message: 'Konto oprettet!', accountId: account.id });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved oprettelse af konto', error: error.message });
    }
});

// === Luk konto ===
router.post('/account/close', async (req, res) => {
    try {
        const { accountId } = req.body;
        if (!accountId) {
            return res.status(400).json({ message: 'Account ID mangler' });
        }

        await accountsModel.closeAccount(accountId);
        res.json({ message: 'Konto lukket!' });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved lukning af konto', error: error.message });
    }
});

// === Genåbn konto ===
router.post('/account/reopen', async (req, res) => {
    try {
        const { accountId } = req.body;
        if (!accountId) {
            return res.status(400).json({ message: 'Account ID mangler' });
        }

        await accountsModel.reopenAccount(accountId);
        res.json({ message: 'Konto genåbnet!' });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved genåbning af konto', error: error.message });
    }
});

// === Indsæt penge ===
router.post('/account/deposit', async (req, res) => {
    try {
        const { accountId, amount } = req.body;
        if (!accountId || !amount) {
            return res.status(400).json({ message: 'Account ID og beløb mangler' });
        }

        await transactionsModel.deposit(accountId, amount);
        res.json({ message: `Indsat ${amount} på konto!` });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved indsættelse', error: error.message });
    }
});

// === Hæv penge ===
router.post('/account/withdraw', async (req, res) => {
    try {
        const { accountId, amount } = req.body;
        if (!accountId || !amount) {
            return res.status(400).json({ message: 'Account ID og beløb mangler' });
        }

        await transactionsModel.withdraw(accountId, amount);
        res.json({ message: `Hævet ${amount} fra konto!` });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved hævning', error: error.message });
    }
});

// === Se transaktioner ===
router.get('/account/transactions/:accountId', async (req, res) => {
    try {
        const accountId = req.params.accountId;
        const transactions = await transactionsModel.getTransactions(accountId);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved hentning af transaktioner', error: error.message });
    }
});

module.exports = router;
