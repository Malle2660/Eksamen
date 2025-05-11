//UsersModel som håndterer brugeroprettelse, login og adgangskodeopdatering    

// Her importerer vi SQL-typer og en genbrugelig forbindelse til databasen  
const { sql, poolPromise } = require('../db/database');

// Her importerer vi bcrypt til hashing og sammenligning af adgangskoder    
const bcrypt = require('bcryptjs');

// Her oprettes en klasse til at håndtere brugerrelaterede databaseoperationer
class UsersModel {
    // Oprettelse af ny bruger med brugernavn, email og adgangskode
    async create(username, email, password) {
        const pool = await poolPromise; // Henter en åben forbindelse til databasen og bruger den til at udføre en SQL-forespørgsel
        const result = await pool.request()
            .input('username', sql.NVarChar, username) // Indsætter brugernavnet i SQL-forespørgslen    
            .input('email', sql.NVarChar, email) // Indsætter emailen i SQL-forespørgslen
            .input('password', sql.NVarChar, password) // Indsætter adgangskoden i SQL-forespørgslen - bcrypt bruges til at hashe adgangskoden
            .query(`
                INSERT INTO users (username, email, password)
                VALUES (@username, @email, @password); // Indsætter ny bruger i databsen 
                SELECT SCOPE_IDENTITY() AS id; // Returnerer ID på den oprettede bruger
            `);
        return result.recordset[0]; // Returnerer den oprettede brugers ID
    }
    // Logger en bruger ind ved at sammenligne brugernavn og adgangskode
    async login(username, password) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar, username) // Indsætter brugernavnet i SQL-forespørgslen
            .query('SELECT * FROM users WHERE username = @username'); // Henter brugerdata fra databasen
        
        const user = result.recordset[0]; // Gemmer brugerdata i user
        if (!user) {
            throw new Error('Ugyldigt brugernavn eller adgangskode'); // Hvis bruger ikke findes, kastes en fejl
        }

        // Sammenligner den indtastet adgangskode med den has'ede version i databasen
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Ugyldigt brugernavn eller adgangskode'); // Hvis adgangskoden ikke er korrekt, kastes en fejl  
        }

        return user; // Hvis login er vellykket, returneres brugerdata  
    }

    // Finder en bruger baseret på brugernavn
    async findByUsername(username) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM users WHERE username = @username'); // Henter brugernavnet fra databasen
        return result.recordset[0]; // Returnerer brugerdata eller null, hvis brugeren ikke findes
    }

    // Opdaterer adgangskodenfor en bruger for en bruger (hash'er den nye adgangskode)
    async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10); // Hasher den nye adgangskode
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, userId) //Brugerens ID
            .input('password', sql.NVarChar(255), hashedPassword)  // Sørg for at sætte korrekt længde
            .query('UPDATE users SET password = @password WHERE userID = @userId'); // Opdaterer adgangskoden i databasen
    }

    // Find en bruger baseret på deres userId
    async findById(userId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId) // Brugerens ID   
            .query('SELECT * FROM users WHERE userID = @userId'); // Henter brugerdata fra databasen
        return result.recordset[0]; // Returnerer brugerdata eller null, hvis brugeren ikke findes
    }
}

// Exporterer en ny instans af UsersModel, så den kan bruges i routes og services
module.exports = new UsersModel();
