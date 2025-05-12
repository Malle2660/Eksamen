// Importerer express og opretter en router
const express = require('express');
const router = express.Router();

// Importerer transactionsModel som bruges til at håndtere transaktioner og databasekald
const transactionsModel = require('../models/transactionsModel');

// Indsæt penge på konto
router.post('/account/deposit', async (req, res) => {
    try {
        const { accountId, amount } = req.body;
        // Sørger for at alle nødvendige data er med
        if (!accountId || !amount) {
            return res.status(400).json({ message: 'Account ID og beløb mangler' });
        }
        // kalder modellen til at indsætte penge på konto og får den nye saldo retur
        const newBalance = await transactionsModel.deposit(accountId, amount);
        res.json({ message: `Indsat ${amount} på konto!`, balance: newBalance }); // Sørger for at meddelelserne er korrekte
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved indsættelse', error: error.message }); // Sørger for at fejlmeddelelserne er korrekte
    }
});

// Hæv penge fra konto
router.post('/account/withdraw', async (req, res) => { 
    try {
        const { accountId, amount } = req.body; 
        // Sørger for at alle nødvendige data er med
        if (!accountId || !amount) {
            return res.status(400).json({ message: 'Account ID og beløb mangler' }); // Sørger for at alle nødvendige data er med
        }
        // kalder modellen til at hæve penge fra konto og får den nye saldo retur
        const newBalance = await transactionsModel.withdraw(accountId, amount);
        res.json({ message: `Hævet ${amount} fra konto!`, balance: newBalance });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved hævning', error: error.message });
    }
});

// Henter alle transaktioner for en konto
router.get('/account/transactions/:accountId', async (req, res) => {
    try {
        const accountId = req.params.accountId;
        //Henter transaktionshistorikken fra modellen
        const transactions = await transactionsModel.getTransactions(accountId); // Henter transaktionerne for den pågældende konto

    // Returnerer transaktionerne som JSON
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved hentning af transaktioner', error: error.message });
    }


})


// Køb værdipapir
router.post('/trade/buy', async (req, res) => { 
    try {
        const { portfolioId, accountId, securityId, quantity, pricePerUnit, fee } = req.body; // Henter data fra request body
        // Sørger for at alle nødvendige data er med
        if (!portfolioId || !accountId || !securityId || !quantity || !pricePerUnit) {
            return res.status(400).json({ message: 'Nødvendige data mangler til køb af værdipapir' });
        }
        // kalder modellen og opdaterer saldo og logger handlen 
        const newBalance = await transactionsModel.buySecurity(portfolioId, accountId, securityId, quantity, pricePerUnit, fee || 0);
        res.json({ message: 'Værdipapir købt!', balance: newBalance });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved køb', error: error.message }); // Sørger for at fejlmeddelelserne er korrekte
    }
});

// Sælg værdipapir 
router.post('/trade/sell', async (req, res) => {
    try {
        const { portfolioId, accountId, securityId, quantity, pricePerUnit, fee = 0 } = req.body; // Henter data fra request body
        // Sørger for at alle nødvendige data er med
        if (!portfolioId || !accountId || !securityId || !quantity || !pricePerUnit) {
            return res.status(400).json({ message: 'Nødvendige data mangler til salg af værdipapir' }); // Sørger for at alle nødvendige data er med
        }
        // kalder modellen for at udføre salget
        const newBalance = await transactionsModel.sellSecurity(portfolioId, accountId, securityId, quantity, pricePerUnit, fee || 0);
        res.json({ message: 'Værdipapir solgt!', balance: newBalance });
    } catch (error) {
        res.status(500).json({ message: 'Fejl ved salg', error: error.message });
    }
});

// Eksporter router
module.exports = router;


