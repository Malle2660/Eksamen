
/*
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config(); // Indlæs miljøvariabler fra .env-filen

// Azure SQL-konfiguration
/* const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true, // Kræves af Azure
        enableArithAbort: true
    }
};
*/
/*
class User {
    // Opret en ny bruger
    static async create(username, email, password) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const pool = await sql.connect(config);
            const result = await pool.request()
                .input('username', sql.NVarChar, username)
                .input('email', sql.NVarChar, email)
                .input('password', sql.NVarChar, hashedPassword)
                .query(`
                    INSERT INTO users (username, email, password)
                    VALUES (@username, @email, @password);
                `);
            return result.recordset[0].id;
        } catch (err) {
            throw new Error('Fejl ved oprettelse af bruger: ' + err.message);
        }
    }

    // Find en bruger baseret på brugernavn
    static async findByUsername(username) {
        try {
            const pool = await sql.connect(config);
            const result = await pool.request()
                .input('username', sql.NVarChar, username)
                .query('SELECT * FROM users WHERE username = @username');
            return result.recordset[0];
        } catch (err) {
            throw new Error('Fejl ved hentning af bruger: ' + err.message);
        }
    }

    // Find en bruger baseret på ID
    static async findById(userId) {
        try {
            const pool = await sql.connect(config);
            const result = await pool.request()
                .input('id', sql.Int, userId)
                .query('SELECT * FROM users WHERE id = @id');
            return result.recordset[0];
        } catch (err) {
            throw new Error('Fejl ved hentning af bruger: ' + err.message);
        }
    }

    // Verificer adgangskode
    static async verifyPassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }

    // Login
    static async login(username, password) {
        try {
            const user = await this.findByUsername(username);
            if (!user) {
                throw new Error('Bruger ikke fundet.');
            }
            const isPasswordValid = await this.verifyPassword(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Forkert adgangskode.');
            }
            return user; // Returnér brugerdata ved succesfuldt login
        } catch (err) {
            throw new Error('Fejl ved login: ' + err.message);
        }
    }

    // Logout (placeholder, hvis session-håndtering er nødvendig)
    static logout() {
        // Implementér session- eller token-håndtering her, hvis relevant
        return true;
    }

    // Opdater adgangskode
    static async updatePassword(userId, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const pool = await sql.connect(config);
            await pool.request()
                .input('id', sql.Int, userId)
                .input('password', sql.NVarChar, hashedPassword)
                .query('UPDATE users SET password = @password WHERE id = @id');
            return true;
        } catch (err) {
            throw new Error('Fejl ved opdatering af adgangskode: ' + err.message);
        }
    }

    // Opret en ny konto
    static async createAccount(userId, accountName, currency) { 
        try {
            const pool = await sql.connect(config);
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('accountName', sql.NVarChar, accountName)
                .input('currency', sql.NVarChar, currency)
                .query(`
                    INSERT INTO accounts (user_id, account_name, currency, balance, created_at)
                    VALUES (@userId, @accountName, @currency, 0, GETDATE());
                    SELECT SCOPE_IDENTITY() AS id;
                `);
            return result.recordset[0].id;
        } catch (err) {
            throw new Error('Fejl ved oprettelse af konto: ' + err.message);
        }
    }

    // Luk en konto
    static async closeAccount(accountId) {
        try {
            const pool = await sql.connect(config);
            await pool.request()
                .input('accountId', sql.Int, accountId)
                .query(`
                    UPDATE accounts
                    SET closed_at = GETDATE()
                    WHERE id = @accountId AND closed_at IS NULL;
                `);
            return true;
        } catch (err) {
            throw new Error('Fejl ved lukning af konto: ' + err.message);
        }
    }

    // Genåbn en konto
    static async reopenAccount(accountId) {
        try {
            const pool = await sql.connect(config);
            await pool.request()
                .input('accountId', sql.Int, accountId)
                .query(`
                    UPDATE accounts
                    SET closed_at = NULL
                    WHERE id = @accountId AND closed_at IS NOT NULL;
                `);
            return true;
        } catch (err) {
            throw new Error('Fejl ved genåbning af konto: ' + err.message);
        }
    }

    // Indsæt penge på en konto
    static async deposit(accountId, amount, currency) {
        try {
            const pool = await sql.connect(config);
            await pool.request()
                .input('accountId', sql.Int, accountId)
                .input('amount', sql.Decimal(18, 2), amount)
                .input('currency', sql.NVarChar, currency)
                .query(`
                    INSERT INTO transactions (account_id, amount, currency, created_at)
                    VALUES (@accountId, @amount, @currency, GETDATE());
                    UPDATE accounts
                    SET balance = balance + @amount
                    WHERE id = @accountId AND closed_at IS NULL;
                `);
            return true;
        } catch (err) {
            throw new Error('Fejl ved indsættelse af penge: ' + err.message);
        }
    }

    // Hæv penge fra en konto
    static async withdraw(accountId, amount, currency) {
        try {
            const pool = await sql.connect(config);
            const result = await pool.request()
                .input('accountId', sql.Int, accountId)
                .query('SELECT balance FROM accounts WHERE id = @accountId AND closed_at IS NULL');

            if (!result.recordset[0] || result.recordset[0].balance < amount) {
                throw new Error('Ikke tilstrækkelig saldo eller konto er lukket.');
            }

            await pool.request()
                .input('accountId', sql.Int, accountId)
                .input('amount', sql.Decimal(18, 2), -amount)
                .input('currency', sql.NVarChar, currency)
                .query(`
                    INSERT INTO transactions (account_id, amount, currency, created_at)
                    VALUES (@accountId, @amount, @currency, GETDATE());
                    UPDATE accounts
                    SET balance = balance - @amount
                    WHERE id = @accountId AND closed_at IS NULL;
                `);
            return true;
        } catch (err) {
            throw new Error('Fejl ved hævning af penge: ' + err.message);
        }
    }

    // Hent transaktionsoversigt for en konto
    static async getTransactionHistory(accountId) {
        try {
            const pool = await sql.connect(config);
            const result = await pool.request()
                .input('accountId', sql.Int, accountId)
                .query(`
                    SELECT * FROM transactions
                    WHERE account_id = @accountId
                    ORDER BY created_at DESC;
                `);
            return result.recordset;
        } catch (err) {
            throw new Error('Fejl ved hentning af transaktionshistorik: ' + err.message);
        }
    }
    // Hent alle konti for en bruger
    static async getAccountsByUser(userId) {
        try {
            const pool = await sql.connect(config);
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT * FROM accounts WHERE user_id = @userId');
            return result.recordset;
        } catch (err) {
            throw new Error('Fejl ved hentning af konti: ' + err.message);
        }
    }
}

module.exports = User;
*/