const { sql, poolPromise } = require('../db/database');
const bcrypt = require('bcryptjs');

class UsersModel {
    // Opret bruger
    async create(username, email, password) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .query(`
                INSERT INTO users (username, email, password)
                VALUES (@username, @email, @password);
                SELECT SCOPE_IDENTITY() AS id;
            `);
        return result.recordset[0];
    }
    // Login bruger
    async login(username, password) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM users WHERE username = @username');
        
        const user = result.recordset[0];
        if (!user) {
            throw new Error('Ugyldigt brugernavn eller adgangskode');
        }

        // Sammenlign den krypterede adgangskode med den indtastede
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Ugyldigt brugernavn eller adgangskode');
        }

        return user; // Hvis alt er ok, returner brugerdata
    }

    // Find bruger baseret på brugernavn
    async findByUsername(username) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM users WHERE username = @username');
        return result.recordset[0];
    }

    // Opdater adgangskode
    async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('password', sql.NVarChar(255), hashedPassword)  // Sørg for at sætte korrekt længde
            .query('UPDATE users SET password = @password WHERE userID = @userId');
    }

    // Find bruger baseret på userId
    async findById(userId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT * FROM users WHERE userID = @userId');
        return result.recordset[0];
    }
}

module.exports = new UsersModel();
