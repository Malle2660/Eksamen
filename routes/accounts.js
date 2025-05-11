// Definerer express routes til konto, transaktioner og valutkonventering via ExchangeRate API
const express           = require('express'); // Importerer express
const accountsModel     = require('../models/accountsModel'); // Model til konti
const { getExchangeRate } = require('../services/ExchangeRate'); // Service til at hente valutakurser

const router = express.Router(); // Opretter en router

// Viser kontooversigten med accounts.ejs
router.get('/', async (req, res) => { // GET /accounts
  try {
    const userId = 1; // Midlertidigt bruger-ID
    const accounts = await accountsModel.getAccountsByUserId(userId); // Henter alle konti for brugeren
    const totalBalance = await accountsModel.getTotalBalance(userId); // Henter den samlede balance for brugeren
    
    res.render('accounts', {  // viser siden accounts.ejs
      accounts, 
      totalBalance,
      error: null 
    });
  } catch (err) {
    console.error('Fejl ved hentning af konti:', err); // Logger fejl
    res.render('accounts', {
      accounts: [], 
      totalBalance: 0,
      error: 'Kunne ikke hente konti'  // Visersiden med fejlbesked "Kunne ikke hente konti"
    });
  }
});

// Opretter en ny konto
router.post('/create', async (req, res) => { // POST /accounts/create
  const userId = req.session.user.userID; // Henter brugerens ID fra sessionen
  const { name, currency, bank } = req.body; // Henter navn, valuta og bank fra request body
  if (!name || !currency || !bank) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' }); // Returnerer fejlbesked hvis ikke alle felter er udfyldt
    }
    const account = await accountsModel.createAccount(userId, name, currency, bank); // Opretter en ny konto
    res.status(201).json({ message: 'Konto oprettet!', accountId: account.id }); // Returnerer besked om at kontoen er oprettet
});

// Lukker en konto hvis brugeren ejer den
router.post('/close', async (req, res) => { // POST /accounts/close
  try {
    if (!req.session.user || !req.session.user.userID) { // Tjekker om brugeren er logget ind
      return res.status(401).json({ message: 'Ikke logget ind' }); // Returnerer fejlbesked hvis brugeren ikke er logget ind, det vil altså sige Unauthorized
    }
    const userId = req.session.user.userID; // Henter brugerens ID fra sessionen
    const { accountId } = req.body; // Henter konto-ID fra request body
    if (!accountId) { // tjekker input
      return res.status(400).json({ message: 'Account ID mangler' }); // Returnerer fejlbesked "Account ID mangler" hvis konto-ID ikke er indtastet
    }
    // Tjek ejerskab
    const accounts = await accountsModel.getAllForUser(userId); // Henter alle konti for brugeren
    if (!accounts.some(acc => acc.accountID == accountId)) { // Tjekker om brugeren ejer kontoen
      return res.status(403).json({ message: 'Du har ikke adgang til denne konto' }); // Returnerer fejlbesked "Du har ikke adgang til denne konto" hvis brugeren ikke ejer kontoen
    }
    await accountsModel.closeAccount(accountId); // Lukker kontoen
    res.json({ message: 'Konto lukket!' }); // Returnerer besked om at kontoen er lukket
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved lukning af konto', error: error.message }); // Returnerer fejlbesked "Fejl ved lukning af konto"
  }
});

// Genåbner en tidligere lukket konto
router.post('/reopen', async (req, res) => {
  try {
    const { accountId } = req.body; // Henter konto-ID fra request body
    if (!accountId) { // tjekker input
      return res.status(400).json({ message: 'Account ID mangler' }); // Returnerer fejlbesked "Account ID mangler" hvis konto-ID ikke er indtastet
    }
    await accountsModel.reopenAccount(accountId); // Genåbner kontoen
    res.json({ message: 'Konto genåbnet!' }); // Success med besked om at kontoen er genåbnet
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved genåbning af konto', error: error.message }); // Returnerer fejlbesked "Fejl ved genåbning af konto"
  }
});

// API: Returner konti med USD som balence valuta
router.get('/api', async (req, res) => { // GET /accounts/api
  const userId = req.session.user.userID;
  const accounts = await accountsModel.getAllForUser(userId);
  const ratesData = await getExchangeRate('USD');
  const rates = ratesData.conversion_rates; // fx { USD: 1, DKK: 6.8, EUR: ... }  // Konverter alle saldoer til USD
  const accountsWithUSD = accounts.map(acc => {
    const rate = rates[acc.currency] || 1;
    const balanceUSD = acc.balance / rate;
    return { // tilføjer feltet balanceUSD til hver konto
      ...acc,
      balanceUSD
    };
  });

  res.json(accountsWithUSD); // Returnerer konti med USD som balence valuta
});

// Henter alle transaktioner for en given konto
router.get('/transactions/:accountId', async (req, res) => { // GET /accounts/transactions/:accountId
  try {
    const accountId = req.params.accountId; // Henter konto-ID fra request params
    const transactions = await accountsModel.getTransactionsForAccount(accountId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved hentning af transaktioner', error: error.message });
  }
});

// Indsætter beløb på konto hvis bruger ejer kontoen
router.post('/deposit', async (req, res) => { // POST /accounts/deposit
  try {
    if (!req.session.user || !req.session.user.userID) { // Tjekker om brugeren er logget ind
      return res.status(401).json({ message: 'Ikke logget ind' }); // Returnerer fejlbesked hvis brugeren ikke er logget ind, det vil altså sige Unauthorized
    }
    const userId = req.session.user.userID; // Henter brugerens ID fra sessionen
    const { accountId, amount } = req.body; // Henter konto-ID og beløb fra request body
    if (!accountId || !amount) {
      return res.status(400).json({ message: 'Account ID og beløb mangler' }); // Returnerer fejlbesked "Account ID og beløb mangler" hvis konto-ID eller beløb ikke er indtastet
    }
    const accounts = await accountsModel.getAllForUser(userId); // Henter alle konti for brugeren
    if (!accounts.some(acc => acc.accountID == accountId)) { // Tjekker om brugeren ejer kontoen
      return res.status(403).json({ message: 'Du har ikke adgang til denne konto' }); // Returnerer fejlbesked "Du har ikke adgang til denne konto" hvis brugeren ikke ejer kontoen
    }
    await accountsModel.deposit(accountId, amount); // Indsætter beløb på kontoen
    res.json({ message: 'Beløb indsat!' }); // Returnerer besked om at beløb er indsat
  } catch (error) {
    res.status(500).json({ message: 'Fejl ved indsættelse af beløb', error: error.message }); // // Returnerer fejlbesked "Fejl ved indsættelse af beløb"
  }
});

// Hæver beløb fra konto (kræver kun konto-id og beløb)
router.post('/withdraw', async (req, res) => {
  try {
    const { accountId, amount } = req.body; // Henter input fra request body
    if (!accountId || !amount) { // tjekker input
      return res.status(400).json({ message: 'Account ID og beløb mangler' });
    }
    await accountsModel.withdraw(accountId, amount);
    res.json({ message: 'Beløb hævet!' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Fejl ved hævning af beløb' });
  }
});

module.exports = router;


