const express = require('express');
const router = express.Router();
const Database = require('../db/database'); // Importer database.js
const sql = require('mssql'); // Kun brugt til at definere datatyper

// Konfiguration til Azure SQL (flyttet til database.js)
const config = {
    user: 'your-username',
    password: 'your-password',
    server: 'your-server.database.windows.net',
    database: 'your-database-name',
    options: {
        encrypt: true,
        enableArithAbort: true,
    },
};

// Opret en databaseinstans
const db = new Database(config);

// === Vis alle handler ===
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT * FROM transactions';
        const transactions = await db.query(query); // Brug database.js til forespørgslen
        res.render('transactions', { transactions });
    } catch (err) {
        console.error('Fejl ved hentning af handler:', err);
        res.status(500).send('Fejl i forbindelse med database');
    }
});

// === Vis formular til oprettelse af handel ===
router.get('/create', (req, res) => {
    res.render('createTransaction');
});

// === Opret ny handel ===
router.post('/create', async (req, res) => {
    const { portfolio_id, symbol, type, quantity, price } = req.body;
    const date = new Date().toISOString();

    try {
        const query = `
            INSERT INTO transactions (portfolio_id, symbol, type, quantity, price, date)
            VALUES (@portfolio_id, @symbol, @type, @quantity, @price, @date)
        `;
        const params = [
            { name: 'portfolio_id', type: sql.Int, value: portfolio_id },
            { name: 'symbol', type: sql.NVarChar, value: symbol },
            { name: 'type', type: sql.NVarChar, value: type },
            { name: 'quantity', type: sql.Int, value: quantity },
            { name: 'price', type: sql.Decimal(18, 2), value: price },
            { name: 'date', type: sql.NVarChar, value: date },
        ];

        await db.query(query, params); // Brug database.js til forespørgslen
        res.redirect('/transactions');
    } catch (err) {
        console.error('Fejl ved oprettelse af handel:', err);
        res.status(500).send('Kunne ikke gemme handel');
    }
});

module.exports = router;
