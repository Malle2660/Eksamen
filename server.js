require('dotenv').config();
const express = require('express');
const path    = require('path');
const session = require('express-session');
const { poolPromise } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// === VIEW ENGINE ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === MIDDLEWARE ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'megasuperhemmeligt',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 dag
}));

// === AUTH GUARD ===
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/?error=login_required');
}

// === ROUTERS ===
const authRoutes          = require('./routes/auth');
const accountsRoutes      = require('./routes/accounts');
const transactionsRoutes  = require('./routes/transactionsRoutes');
const portfolioRoutes     = require('./routes/portfolioRoutes');
const exchangeRoutes      = require('./routes/exchangeRateRoutes');
const alphaRoutes         = require('./routes/alphaVantageRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const growthRoutes        = require('./routes/growthRoutes');

// --- JSON‐API ENDPOINTS (før view‐ruterne) ---
app.use('/api/exchange-rate', requireAuth, exchangeRoutes);
app.use('/api/alpha-vantage', requireAuth, alphaRoutes);
app.use('/api/growth',        requireAuth, growthRoutes);

// --- CRUD‐ENDPOINTS ---
app.use('/auth',         authRoutes);
app.use('/accounts',     requireAuth, accountsRoutes);
app.use('/transactions', requireAuth, transactionsRoutes);
app.use('/portfolios',   requireAuth, portfolioRoutes);

// === LANDING PAGE ===
app.get('/', (req, res) => {
  res.render('index', { error: req.query.error });
});

// === SERVER‐RENDERED DASHBOARD ===
app.use('/dashboard', requireAuth, dashboardRoutes);
app.use('/', require('./routes/growthRoutes'));

// === 404 HANDLER (fallback) ===
app.use((req, res) => {
  res.status(404).send('404 – Siden blev ikke fundet');
});

// === START SERVER ===
(async () => {
  try {
    await poolPromise;
    console.log('✅ Forbundet til databasen!');
    app.listen(PORT, () => console.log(`✅ Server kører på http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Databasefejl:', err);
    process.exit(1);
  }
})();


