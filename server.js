require('dotenv').config();
const express = require('express');
const path = require('path');

// Opretter en ny Express applikation (vores server)
const app = express();

// === VIEW ENGINE SETUP ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === MIDDLEWARE SETUP ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// === DATABASE SETUP ===
const { poolPromise } = require('./db/database');
console.log('Leder efter database.js i:', require.resolve('./db/database'));

// === IMPORTER ROUTES ===
const authRoutes          = require('./routes/auth');
const accountsRoutes      = require('./routes/accounts');           // ← Rettet til accounts.js
const transactionRoutes   = require('./routes/transactionsRoutes');
const portfolioRoutes     = require('./routes/portfolioRoutes');

// === IMPORTER API ROUTES ===
const exchangeRateRoutes  = require('./routes/exchangeRateRoutes');
const alphaVantageRoutes  = require('./routes/alphaVantageRoutes');

// === ROUTES ===
app.use('/auth',          authRoutes);
app.use('/accounts',      accountsRoutes);
app.use('/transactions',  transactionRoutes);
app.use('/portfolios',    portfolioRoutes);

app.use('/api/exchange-rate', exchangeRateRoutes);
app.use('/api/alpha-vantage', alphaVantageRoutes);

// === HOVEDSIDE ===
app.get('/', (req, res) => {
  res.render('index');
});

// === SERVER START ===
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await poolPromise;
    app.listen(PORT, () => {
      console.log(`✅ Server kører på http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Kunne ikke starte server pga. databasefejl:', err);
    process.exit(1);
  }
}

start();
