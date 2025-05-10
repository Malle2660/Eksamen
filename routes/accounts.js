// routes/accounts.js
const express           = require('express');
const path              = require('path');
const accountsModel     = require('../models/accountsModel');
const transactionsModel = require('../models/accountsModel'); // eller transactionsModel hvis det er en anden fil
const { getExchangeRate } = require('../services/ExchangeRate');

const router = express.Router();

// Viser kontooversigten (render accounts.ejs)
router.get('/', async (req, res) => {
  try {
    const userId = 1; // Midlertidigt hardcoded
    const accounts = await accountsModel.getAccountsByUserId(userId);
    const totalBalance = await accountsModel.getTotalBalance(userId);
    
    res.render('accounts', { 
      accounts, 
      totalBalance,
      error: null 
    });
  } catch (err) {
    console.error('Fejl ved hentning af konti:', err);
    res.render('accounts', { 
      accounts: [], 
      totalBalance: 0,
      error: 'Kunne ikke hente konti' 
    });
  }
});

// Opretter en ny konto
router.post('/create', async (req, res) => {
  const userId = req.session.user.userID;
  const { name, currency, bank } = req.body;
  if (!name || !currency || !bank) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' });
    }
    const account = await accountsModel.createAccount(userId, name, currency, bank);
    res.status(201).json({ message: 'Konto oprettet!', accountId: account.id });
});

// Lukker en konto hvis brugeren ejer den
router.post('/close', async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.userID) {
      return res.status(401).json({ message: 'Ikke logget ind' });
    }
    const userId = req.session.user.userID;
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID mangler' });
    }
    // Tjek ejerskab
    const accounts = await accountsModel.getAllForUser(userId);
    if (!accounts.some(acc => acc.accountID == accountId)) {
      return res.status(403).json({ message: 'Du har ikke adgang til denne konto' });
    }
    await accountsModel.closeAccount(accountId);
    res.json({ message: 'Konto lukket!' });
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved lukning af konto', error: error.message });
  }
});

// Genåbner en tidligere lukket konto
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

// Returnerer konti som JSON til client-side fetch (JS)
router.get('/api', async (req, res) => {
  const userId = req.session.user.userID;
  const accounts = await accountsModel.getAllForUser(userId);

  // Hent valutakurser med base USD
  const ratesData = await getExchangeRate('USD');
  const rates = ratesData.conversion_rates; // fx { USD: 1, DKK: 6.8, EUR: ... }

  // Konverter alle saldoer til USD
  const accountsWithUSD = accounts.map(acc => {
    const rate = rates[acc.currency] || 1;
    // Hvis kontoen er i USD, rate = 1, ellers divider for at få USD
    const balanceUSD = acc.balance / rate;
    return {
      ...acc,
      balanceUSD
    };
  });

  res.json(accountsWithUSD);
});

// Henter transaktioner for en given konto
router.get('/transactions/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const transactions = await accountsModel.getTransactionsForAccount(accountId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved hentning af transaktioner', error: error.message });
  }
});

// Indsætter beløb på konto hvis bruger ejer kontoen
router.post('/deposit', async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.userID) {
      return res.status(401).json({ message: 'Ikke logget ind' });
    }
    const userId = req.session.user.userID;
    const { accountId, amount } = req.body;
    if (!accountId || !amount) {
      return res.status(400).json({ message: 'Account ID og beløb mangler' });
    }
    const accounts = await accountsModel.getAllForUser(userId);
    if (!accounts.some(acc => acc.accountID == accountId)) {
      return res.status(403).json({ message: 'Du har ikke adgang til denne konto' });
    }
    await accountsModel.deposit(accountId, amount);
    res.json({ message: 'Beløb indsat!' });
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved indsættelse af beløb', error: error.message });
  }
});

// Hæver beløb fra konto (kræver kun konto-id og beløb)
router.post('/withdraw', async (req, res) => {
  try {
    const { accountId, amount } = req.body;
    if (!accountId || !amount) {
      return res.status(400).json({ message: 'Account ID og beløb mangler' });
    }
    await accountsModel.withdraw(accountId, amount);
    res.json({ message: 'Beløb hævet!' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Fejl ved hævning af beløb' });
  }
});

module.exports = router;


