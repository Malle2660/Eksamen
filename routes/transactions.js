const express = require('express');
const router = express.Router();
const transactionsModel = require('../models/transactionsModel');

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
