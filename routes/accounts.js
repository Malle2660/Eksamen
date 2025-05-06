// routes/accounts.js
const express           = require('express');
const path              = require('path');
const accountsModel     = require('../models/accountsModel');
const transactionsModel = require('../models/accountsModel'); // eller transactionsModel hvis det er en anden fil

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Ikke logget ind' });
  }
  next();
}

// ————— VIS accounts-siden —————
router.get('/', async (req, res) => {
  // Du kan i fremtiden hente data server-side og sende til view:
  // const data = await accountsModel.getAllForUser( … );
  // res.render('accounts', { accounts: data });

  // Nu bare render viewet
  res.render('accounts');
});

// === Opret konto ===
router.post('/create', requireLogin, async (req, res) => {
  const userId = req.session.user.userID;
  const { name, currency, bank } = req.body;
  if (!name || !currency || !bank) {
    return res.status(400).json({ message: 'Alle felter skal udfyldes' });
  }
  const account = await accountsModel.createAccount(userId, name, currency, bank);
  res.status(201).json({ message: 'Konto oprettet!', accountId: account.id });
});

// === Luk konto ===
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

// === Se konti for API (bruges af client-JS) ===
router.get('/api', requireLogin, async (req, res) => {
  const userId = req.session.user.userID;
  const accounts = await accountsModel.getAllForUser(userId);
  res.json(accounts);
});

// === Hent transaktioner ===
router.get('/transactions/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const transactions = await accountsModel.getTransactionsForAccount(accountId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved hentning af transaktioner', error: error.message });
  }
});

// === Indsæt penge på konto ===
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

// === Hæv penge fra konto ===
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

// Models/accountsModel.js
const { sql, poolPromise } = require('../db/database');

class AccountsModel {
  // … dine eksisterende metoder …

  // Hent alle konti for en bruger
  async getAllForUser(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT accountID, name, bank, currency, balance, registrationsDate, closedAccount
        FROM Accounts
        WHERE userID = @userId
        ORDER BY registrationsDate DESC;
      `);
    return result.recordset;
  }
}

module.exports = router;

let currentHistoryAccountId = null;


