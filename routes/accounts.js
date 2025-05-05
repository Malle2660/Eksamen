// routes/accounts.js
const express           = require('express');
const path              = require('path');
const accountsModel     = require('../models/accountsModel');
const transactionsModel = require('../models/accountsModel'); // eller transactionsModel hvis det er en anden fil

const router = express.Router();

// ————— VIS accounts-siden —————
router.get('/', async (req, res) => {
  // Du kan i fremtiden hente data server-side og sende til view:
  // const data = await accountsModel.getAllForUser( … );
  // res.render('accounts', { accounts: data });

  // Nu bare render viewet
  res.render('accounts');
});

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

// === Se konti for API (bruges af client-JS) ===
router.get('/api', async (req, res) => {
  try {
    // TODO: filtrer på logget-ind bruger
    const accounts = await accountsModel.getAllForUser(/* userId */ 1);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: 'Fejl ved hentning af konti', error: err.message });
  }
});

// === Hent transaktioner ===
router.get('/transactions/:accountId', async (req, res) => {
  try {
    const transactions = await accountsModel.getTransactions(req.params.accountId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved hentning af transaktioner', error: error.message });
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


