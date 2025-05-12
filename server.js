// Indlæs miljøvariabler fra .env-filen i process.env
require('dotenv').config();

const express = require('express');                 // webframework til HTTP-server
const path    = require('path');                    // hjælpefunktioner til filstier
const session = require('express-session');         // session-håndtering til login
const { poolPromise } = require('./db/database');   // database-pool (mssql) via Promises
const requireAuth = require('./middleware/authCheck'); // middleware der beskytter ruter

const app = express();                              // opret Express-app
const PORT = process.env.PORT || 3000;              // brug ENV eller default-port 3000

// VIEW ENGINE 
// Angiv at vi bruger EJS til at gengive HTML-skabeloner
app.set('view engine', 'ejs');
// Fortæl Express hvor EJS-filerne (views) ligger
app.set('views', path.join(__dirname, 'views'));

// MIDDLEWARE 
// Parse JSON-body i POST/PUT-forespørgsler
app.use(express.json());
// Parse URL-encoded (formular) body
app.use(express.urlencoded({ extended: true }));
// Server statiske filer fra /public (CSS, JS, billeder)
app.use(express.static(path.join(__dirname, 'public')));
// Konfigurer sessions: cookie med maxAge 1 dag, hemmeligt nøgleord
app.use(session({
  secret: process.env.SESSION_SECRET || 'megasuperhemmeligt', // krypteringsnøgle
  resave: false,        // gem kun session hvis ændret
  saveUninitialized: false, // gem ikke tomme sessioner
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 dag i ms
}));

// ROUTERS
// Importér ruter fra filer
const authRoutes          = require('./routes/auth');
const accountsRoutes      = require('./routes/accounts');
const transactionsRoutes  = require('./routes/transactionsRoutes');
const portfolioRoutes     = require('./routes/portfolioRoutes');
const exchangeRoutes      = require('./routes/exchangeRateRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const growthRoutes        = require('./routes/growthRoutes');
const finnhubRoutes       = require('./routes/finnhubRoutes');

// API‐ENDPOINTS (beskyttet med login) 
// Exchange-rate API
app.use('/api/exchange-rate', requireAuth, exchangeRoutes);
// Growth API
app.use('/api/growth',        requireAuth, growthRoutes);
// Finnhub (aktiekurser) API
app.use('/api/finnhub',       requireAuth, finnhubRoutes);

// CRUD‐ENDPOINTS 
// Auth (login, logout, register) - ikke beskyttet
app.use('/auth',         authRoutes);
// Accounts (kreditter, transaktioner) - kræver login
app.use('/accounts',     requireAuth, accountsRoutes);
// Transactions  - kræver login
app.use('/transactions', requireAuth, transactionsRoutes);

// LANDING PAGE 
// Roteres til index.ejs, sender evt. error-query til visning af fejl
app.get('/', (req, res) => {
  res.render('index', { error: req.query.error });
});

// PORTFOLIO & RELATEREDE ROUTES 
// portfolios ruter kræver login
app.use('/portfolios', requireAuth, portfolioRoutes);

// SERVER‐RENDERED DASHBOARD
// Dashboard-views kræver login
app.use('/dashboard', requireAuth, dashboardRoutes);
// Growth-sektionen kræver login
app.use('/growth',    requireAuth, growthRoutes);

// 404 HANDLER (fallback)
// Hvis ingen routing matcher, send 404-fejl
app.use((req, res) => {
  res.status(404).send('404 – Siden blev ikke fundet');
});

// START SERVER 
// Vent på at database-forbindelsen er klar, før serveren kører
(async () => {
  try {
    await poolPromise;  // opret forbindelse til SQL-databasen
    console.log('Forbundet til databasen!');
    app.listen(PORT, () => 
      console.log(`Server kører på http://localhost:${PORT}`)
    );
  } catch (err) {
    // Hvis DB-forbindelse fejler, log og afslut processen
    console.error('Databasefejl:', err);
    process.exit(1);
  }
})();
