// Importerer de nødvendige Node.js moduler/packages
require('dotenv').config(); 
const express = require('express');  // Express framework til at lave webserver
const path = require('path');        // Hjælper med at håndtere filstier
// const cors = require('cors');     // Tillader cross-origin requests (valgfrit)

// Opretter en ny Express applikation (vores server)
const app = express();

// === VIEW ENGINE SETUP ===
app.set('views', path.join(__dirname, 'views'));  // Fortæller Express hvor vores views/templates er
app.set('view engine', 'ejs');  // Fortæller Express at vi bruger EJS som template engine

// === MIDDLEWARE SETUP ===
// Middleware er funktioner der køres før vores route handlers
// app.use(cors());  // Aktiverer CORS - tillader requests fra andre domæner
app.use(express.json());  // Gør at vi kan læse JSON data fra requests
app.use(express.urlencoded({ extended: true }));  // Gør at vi kan læse form data
app.use(express.static(path.join(__dirname, 'public')));  // Gør public mappen tilgængelig for klienten

// === DATABASE SETUP ===
const Database = require('./db/database');  // Importerer vores database klasse
const config = require('./db/config.js');   // Konfiguration til Azure SQL database
const db = new Database(config);            // Opretter en ny database instans

// === IMPORTER ROUTES ===
// Disse kaldes som funktioner med db som argument
const authRoutes = require('./routes/auth')(db);               // Authentication routes
//const portfolioRoutes = require('./routes/portfolio')(db);     // Portfolio routes
//const transactionRoutes = require('./routes/transactions')(db); // Transaction routes

// === ROUTES ===
app.use('/auth', authRoutes);           // Alle auth relaterede endpoints starter med /api/auth
//app.use('/portfolio', portfolioRoutes);     // Portfolio routes starter med /portfolio
//app.use('/transactions', transactionRoutes); // Transaction routes starter med /transactions

// === HOVEDSIDE ===
app.get('/', (req, res) => {  
    res.render('index');  // Viser index.ejs når nogen besøger hovedsiden
});

// === SERVER START ===
const PORT = process.env.PORT || 3000;

async function start() {
    try {
        await db.connect();           // Forbind til databasen
        // await db.testConnection();    // Tjek at forbindelsen virker

        app.listen(PORT, () => {
            console.log(`✅ Server kører på http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Kunne ikke starte server pga. databasefejl:', err);
        process.exit(1); // Stop appen hvis DB ikke virker
    }
}

start(); // Start hele appen