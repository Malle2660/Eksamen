const express = require('express');
const router = express.Router();
const accountsModel = require('../models/accountsModel');
const transactionsModel = require('../models/transactionsModel');

// === Opret konto ===
router.post('/create', async (req, res) => {
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
router.post('/close', async (req, res) => {
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
router.post('/reopen', async (req, res) => {
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
router.post('/deposit', async (req, res) => {
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
router.post('/withdraw', async (req, res) => {
    try {
        const { accountId, amount } = req.body;
        if (!accountId || !amount) {
            return res.status(400).json({ message: 'Account ID og beløb mangler' });
        }

        const balance = await transactionsModel.withdraw(accountId, amount);

        res.json({ message: `Hævet ${amount} fra konto!`,balance });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved hævning', error: error.message });
    }
});


// === Se transaktioner ===
router.get('/transactions/:accountId', async (req, res) => {
    try {
        const accountId = req.params.accountId;
        const transactions = await transactionsModel.getTransactions(accountId);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved hentning af transaktioner', error: error.message });
    }
});

module.exports = router;
