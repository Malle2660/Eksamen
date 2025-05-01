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
    
                SELECT SCOPE_IDENTITY() AS portfolioID;
            `);
    
        return result.recordset[0].portfolioID;
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
    // GAK (gennemsnitlig anskaffelseskurs) pr. værdipapir i portefølje
async calculateGAK(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .query(`
            SELECT 
                stockID,
                SUM(price * quantity) / SUM(quantity) AS GAK
            FROM Trades
            WHERE portfolioID = @portfolioId
            GROUP BY stockID;
        `);
    return result.recordset;
}

// Forventet værdi = antal * aktuel pris
async calculateExpectedValue(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .query(`
            SELECT 
                t.stockID,
                SUM(t.quantity) * s.currentPrice AS expectedValue
            FROM Trades t
            JOIN Stocks s ON t.stockID = s.stockID
            WHERE t.portfolioID = @portfolioId
            GROUP BY t.stockID, s.currentPrice;
        `);
    return result.recordset;
}

// Urealiseret gevinst/tab = forventet værdi - samlet erhvervelsespris
async calculateUnrealizedGainLoss(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .query(`
            SELECT 
                t.stockID,
                SUM(t.quantity * s.currentPrice) - SUM(t.quantity * t.price) AS gainOrLoss
            FROM Trades t
            JOIN Stocks s ON t.stockID = s.stockID
            WHERE t.portfolioID = @portfolioId
            GROUP BY t.stockID;
        `);
    return result.recordset;
}

// Oversigt: totaler for portefølje
async getPortfolioOverview(portfolioId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .query(`
            SELECT
                SUM(t.quantity * t.price) AS totalPurchase,
                SUM(t.quantity * s.currentPrice) AS totalExpected,
                SUM(t.quantity * s.currentPrice) - SUM(t.quantity * t.price) AS totalUnrealized
            FROM Trades t
            JOIN Stocks s ON t.stockID = s.stockID
            WHERE t.portfolioID = @portfolioId;
        `);
    return result.recordset[0];
}

    
}

// Exporter instans af PortfolioModel klassen som et modul
module.exports = new PortfolioModel();
