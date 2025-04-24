const express = require('express');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const transactionsRouter = require('./routes/transactions');
const Database = require('./db/database'); // Importer database.js
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', portfolioRoutes);
app.use('/transactions', transactionsRouter);

// Render hovedsiden
app.get('/', (req, res) => {
    res.render('index');
});

// Tilføj denne nye route for porteføljesiden
app.get('/portfolio', (req, res) => {
    res.render('portfolio');
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Noget gik galt!' });
});

app.listen(3000, () => {
    console.log('Serveren kører på http://localhost:3000');
});

module.exports = app;