const { sql, poolPromise } = require('../db/database');


// Opretter en klasse til at håndtere porteføljemodellen
class PortfolioModel {
    // opretter en ny portefølje
    async create(name, accountId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('accountId', sql.Int, accountId)
            .query(`
                INSERT INTO Portfolios (name, accountID)
                VALUES (@name, @accountId);
                SELECT SCOPE_IDENTITY() AS portfolioId;
            `);
        return result.recordset[0].portfolioId;
    }


// Metode til at hente alle porteføljer for en bestemt bruger via deres account
async getAllForUser(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
                SELECT p.*
                FROM Portfolios p
                INNER JOIN Accounts a ON p.accountID = a.accountID
                WHERE a.userID = @userId;
            `);
    return result.recordset;
}

// Metode til at hente en portefølje baseret på portfolioID
async getById(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .query('SELECT * FROM Portfolios WHERE portfolioID = @portfolioId');
    return result.recordset[0];
}

// Metode til at opdatere en portefølje
async update(portfolioId, name, accountId) {
    const pool = await poolPromise;
    await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .input('name', sql.NVarChar, name)
        .input('accountId', sql.Int, accountId)
        .query(`
            UPDATE Portfolios 
            SET name = @name, accountID = @accountId 
            WHERE portfolioID = @portfolioId;
        `);
}

// Metode til at slette en portefølje
async delete(portfolioId) {
    const pool = await poolPromise;
    await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .query('DELETE FROM Portfolios WHERE portfolioID = @portfolioId');
}

// Metode til at hente porteføljeoversigt
async getPortfolioSummary(portfolioId) {
    const pool = await poolPromise; // Hent poolen
    const request = pool.request(); // Opret en ny request
    const result = await request
        .input('portfolioId', sql.Int, portfolioId)
        .query(`
            SELECT name, registrationDate
            FROM Portfolios
            WHERE portfolioID = @portfolioId;
        `);

    return result.recordset[0]; // Returnér det første resultat
}

}

// Exporter instans af PortfolioModel klassen som et modul
module.exports = new PortfolioModel();




