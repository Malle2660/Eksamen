require('dotenv').config();
const express       = require('express');
const path          = require('path');
const session       = require('express-session');
const { poolPromise } = require('./db/database');

// Opret Express-app
const app = express();

// === VIEW ENGINE SETUP ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === MIDDLEWARE SETUP ===
// JSON- og URL-encoded body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve /public mappen
app.use(express.static(path.join(__dirname, 'public')));

// === SESSION SETUP ===
app.use(session({
  secret:   process.env.SESSION_SECRET || 'megasuperhemmeligt',
  resave:   false,
  saveUninitialized: false,
  cookie:   { maxAge: 1000 * 60 * 60 * 24 } // 1 dag
}));

// === ROUTES IMPORT & MOUNT ===
const authRoutes          = require('./routes/auth');
const accountsRoutes      = require('./routes/accounts');
const transactionRoutes   = require('./routes/transactionsRoutes');
const portfolioRoutes     = require('./routes/portfolioRoutes');
const exchangeRateRoutes  = require('./routes/exchangeRateRoutes');
const alphaVantageRoutes  = require('./routes/alphaVantageRoutes');

app.use('/auth',            authRoutes);
app.use('/accounts',        accountsRoutes);
app.use('/transactions',    transactionRoutes);
app.use('/portfolios',      portfolioRoutes);
app.use('/api/exchange-rate', exchangeRateRoutes);
app.use('/api/alpha-vantage', alphaVantageRoutes);

// === HOVEDSIDE (login/landing) ===
app.get('/', (req, res) => {
  // Du kan sende en fejlbesked ind hvis du vil:
  // res.render('index', { error: req.query.error });
  res.render('index')
  res.render('portfolio');
});

// === SERVER START ===
const PORT = process.env.PORT || 3000;
start();
async function start() {
  try {
    // Vent på databaseforbindelse
    await poolPromise;
    app.listen(PORT, () => {
      console.log(`✅ Server kører på http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Kunne ikke starte server pga. databasefejl:', err);
    process.exit(1);
  }
}
