require('dotenv').config();
const express         = require('express');
const path            = require('path');
const session         = require('express-session');
const { poolPromise } = require('./db/database');

// ** NYT: importér growthRoutes **
const growthRoutes    = require('./routes/growthRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const accountsRoutes  = require('./routes/accounts');
// … de andre routers …

const app = express();

// — View engine —
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// — Middleware —
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'megasuperhemmeligt',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 }
}));

// — Auth guard (her defineret inline) —
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/?error=login_required');
}

// — Mount your routers —
app.use('/auth',                require('./routes/auth'));
app.use('/accounts',   requireAuth, require('./routes/accounts'));
app.use('/transactions',requireAuth, require('./routes/transactionsRoutes'));
app.use('/portfolios',  requireAuth, require('./routes/portfolioRoutes'));
app.use('/api/exchange-rate',    require('./routes/exchangeRateRoutes'));
app.use('/api/alpha-vantage',    require('./routes/alphaVantageRoutes'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboardRoutes'));
app.use('/api/growth',    requireAuth, growthRoutes);

// — Page views —
app.get('/',            (req, res) => res.render('index', { error: req.query.error }));
app.use('/', dashboardRoutes);


// Start
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
