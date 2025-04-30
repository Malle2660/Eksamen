require('dotenv').config(); 
const express = require('express');
const path = require('path');

// Opretter en ny Express applikation (vores server)
const app = express();

// === VIEW ENGINE SETUP ===
app.set('view engine', 'ejs');  // Angiver EJS som template engine
app.set('views', path.join(__dirname, 'views')); // Angiver views-mappen

// === MIDDLEWARE SETUP ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// === DATABASE SETUP ===
const { poolPromise } = require('./db/database');
console.log('Leder efter database.js i:', require.resolve('./db/database'));

// === IMPORTER ROUTES ===
const authRoutes = require('./routes/auth');
const accountsRoutes = require('./routes/accounts');  // <-- Importer accounts routes
const transactionRoutes = require('./routes/transactions'); // <-- Importer transactions routes
const portfolioRoutes = require('./routes/portfolioRoutes'); // <-- Importer portfolio routes

// === IMPORTER API ROUTES ===
// Opdateret sti for API routes
const exchangeRateRoutes = require('./routes/exchangeRateRoutes');  // <-- Valutakurser routes
const alphaVantageRoutes = require('./routes/alphaVantageRoutes');  // <-- Aktiekurser routes

// === ROUTES ===
app.use('/auth', authRoutes);  // Authentication routes
app.use('/account', accountsRoutes);  // Account routes
app.use('/transactions', transactionRoutes);  // Transaction routes
app.use('/portfolios', portfolioRoutes);  // Portfolio routes


// API routes
app.use('/api/exchange-rate', exchangeRateRoutes);  // Valutakurser routes
app.use('/api/alpha-vantage', alphaVantageRoutes);  // Aktiekurser routes


// === HOVEDSIDE ===
app.get('/', (req, res) => {
    res.render('index');  // Viser index.ejs når nogen besøger hovedsiden
});

// === SERVER START ===
const PORT = process.env.PORT || 3000;

async function start() {
    try {
        await poolPromise;  // Vent på at database forbindelsen er klar
        app.listen(PORT, () => {
            console.log(`✅ Server kører på http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Kunne ikke starte server pga. databasefejl:', err);
        process.exit(1);
    }
}

start(); // Start hele appen
