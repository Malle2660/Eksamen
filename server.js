require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
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
  secret: process.env.SESSION_SECRET || 'megasuperhemmeligt',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 døgn
}));

// === Middleware: kræver login ===
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/?error=login_required');
}

// === Routes ===
const authRoutes         = require('./routes/auth');
const accountsRoutes     = require('./routes/accounts');
const transactionsRoutes = require('./routes/transactionsRoutes');
const portfolioRoutes    = require('./routes/portfolioRoutes');
const exchangeRoutes     = require('./routes/exchangeRateRoutes');
const alphaRoutes        = require('./routes/alphaVantageRoutes');
const dashboardRoutes    = require('./routes/dashboardRoutes');
const growthRoutes       = require('./routes/growthRoutes');

app.use('/auth', authRoutes);
app.use('/accounts', requireAuth, accountsRoutes);
app.use('/transactions', requireAuth, transactionsRoutes);
app.use('/portfolios', requireAuth, portfolioRoutes);
app.use('/api/exchange-rate', requireAuth, exchangeRoutes);
app.use('/api/alpha-vantage', requireAuth, alphaRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/growth', requireAuth, growthRoutes);

// === Forside og dashboard ===
app.get('/', (req, res) => {
  res.render('index', { error: req.query.error });
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.redirect('/api/dashboard/dashboard');
});

// === Start server ===
const PORT = process.env.PORT || 3000;
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
