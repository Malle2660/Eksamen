require('dotenv').config();
const express         = require('express');
const path            = require('path');
const session         = require('express-session');
const { poolPromise } = require('./db/database');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'megasuperhemmeligt',
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 1000 * 60 * 60 * 24 }
}));

// Auth-middleware
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/?error=login_required');
}

// Routes
const authRoutes           = require('./routes/auth');
const accountsRoutes       = require('./routes/accounts');
const transactionRoutes    = require('./routes/transactionsRoutes');
const portfolioRoutes      = require('./routes/portfolioRoutes');
const exchangeRateRoutes   = require('./routes/exchangeRateRoutes');
const alphaVantageRoutes   = require('./routes/alphaVantageRoutes');
// *** Korrekt kræving af din dashboard‐router ***
const dashboardRoutes      = require('./routes/dashboardRoutes');

app.use('/auth',             authRoutes);
app.use('/accounts',         accountsRoutes);
app.use('/transactions',     transactionRoutes);
app.use('/portfolios',       portfolioRoutes);
app.use('/api/exchange-rate', exchangeRateRoutes);
app.use('/api/alpha-vantage', alphaVantageRoutes);

// Mount dashboard-routeren på /dashboard
app.use('/dashboard', requireAuth, dashboardRoutes);

// View-routes
app.get('/', (req, res) => {
  res.render('index', { error: req.query.error });
});
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('Dashboard/dashboard', { user: req.session.user });
});

// Start server
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await poolPromise;
    app.listen(PORT, () => console.log(`✅ Server kører på http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Databasefejl:', err);
    process.exit(1);
  }
})();
