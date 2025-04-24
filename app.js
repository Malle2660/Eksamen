/*
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

// Database setup (vigtigt at dette kommer FØR routes!)
const Database = require('./db/database');
const config = require('./db/config');
const db = new Database(config);

// Routes (skal komme EFTER db er klar)
const authRoutes = require('./routes/auth')(db);
const portfolioRoutes = require('./routes/portfolio')(db);
const transactionsRouter = require('./routes/transactions')(db);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Brug routes
app.use('/auth', authRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/transactions', transactionsRouter);

// Forside
app.get('/', (req, res) => {
    res.render('index');
});
app.get('/portfolio', (req, res) => {
    res.render('portfolio');
});

// Fejlhåndtering
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Noget gik galt!' });
});

// Start server
app.listen(3000, () => {
    console.log('Serveren kører på http://localhost:3000');
});

*/