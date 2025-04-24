const Database = require('./database'); // Importer database.js
const sql = require('mssql'); // Kun brugt til at definere datatyper

// Opret en databaseinstans
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
const db = new Database(config);

class Portfolio {
    // 1. Opret en ny portefølje
    static async create(name, accountId, userId) {
        try {
            const query = `
                INSERT INTO portfolios (name, account_id, user_id)
                VALUES (@name, @account_id, @user_id);
                SELECT SCOPE_IDENTITY() AS id;
            `;
            const params = [
                { name: 'name', type: sql.NVarChar, value: name },
                { name: 'account_id', type: sql.Int, value: accountId },
                { name: 'user_id', type: sql.Int, value: userId },
            ];
            const result = await db.query(query, params);
            return result[0].id;
        } catch (err) {
            throw new Error('Fejl ved oprettelse af portefølje: ' + err.message);
        }
    }

    // 2. Hent alle porteføljer for en bruger
    static async getAllForUser(userId) {
        try {
            const query = 'SELECT * FROM portfolios WHERE user_id = @user_id';
            const params = [{ name: 'user_id', type: sql.Int, value: userId }];
            const result = await db.query(query, params);
            return result;
        } catch (err) {
            throw new Error('Fejl ved hentning af porteføljer: ' + err.message);
        }
    }

    // 3. Hent en specifik portefølje baseret på ID
    static async getById(portfolioId) {
        try {
            const query = 'SELECT * FROM portfolios WHERE id = @id';
            const params = [{ name: 'id', type: sql.Int, value: portfolioId }];
            const result = await db.query(query, params);
            return result[0];
        } catch (err) {
            throw new Error('Fejl ved hentning af portefølje: ' + err.message);
        }
    }

    // 4. Opdater en eksisterende portefølje
    static async update(portfolioId, name, accountId) {
        try {
            const query = `
                UPDATE portfolios
                SET name = @name, account_id = @account_id
                WHERE id = @id
            `;
            const params = [
                { name: 'id', type: sql.Int, value: portfolioId },
                { name: 'name', type: sql.NVarChar, value: name },
                { name: 'account_id', type: sql.Int, value: accountId },
            ];
            await db.query(query, params);
            return true;
        } catch (err) {
            throw new Error('Fejl ved opdatering af portefølje: ' + err.message);
        }
    }

    // 5. Slet en portefølje
    static async delete(portfolioId) {
        try {
            const query = 'DELETE FROM portfolios WHERE id = @id';
            const params = [{ name: 'id', type: sql.Int, value: portfolioId }];
            await db.query(query, params);
            return true;
        } catch (err) {
            throw new Error('Fejl ved sletning af portefølje: ' + err.message);
        }
    }

    // 6. Tæl antallet af porteføljer for en bruger
    static async countForUser(userId) {
        try {
            const query = 'SELECT COUNT(*) AS count FROM portfolios WHERE user_id = @user_id';
            const params = [{ name: 'user_id', type: sql.Int, value: userId }];
            const result = await db.query(query, params);
            return result[0].count;
        } catch (err) {
            throw new Error('Fejl ved optælling af porteføljer: ' + err.message);
        }
    }

    // 7. Hent porteføljer med tilknyttede handler
    static async getWithTransactions(userId) {
        try {
            const query = `
                SELECT p.*, t.*
                FROM portfolios p
                LEFT JOIN transactions t ON p.id = t.portfolio_id
                WHERE p.user_id = @user_id
            `;
            const params = [{ name: 'user_id', type: sql.Int, value: userId }];
            const result = await db.query(query, params);
            return result;
        } catch (err) {
            throw new Error('Fejl ved hentning af porteføljer med handler: ' + err.message);
        }
    }

    // 8. Søg efter porteføljer baseret på navn
    static async searchByName(userId, searchTerm) {
        try {
            const query = `
                SELECT * FROM portfolios
                WHERE user_id = @user_id AND name LIKE @searchTerm
            `;
            const params = [
                { name: 'user_id', type: sql.Int, value: userId },
                { name: 'searchTerm', type: sql.NVarChar, value: `%${searchTerm}%` },
            ];
            const result = await db.query(query, params);
            return result;
        } catch (err) {
            throw new Error('Fejl ved søgning efter porteføljer: ' + err.message);
        }
    }

    // 9. Hent porteføljesammendrag (forventet værdi, GAK, urealiseret gevinst/tab)
    static async getPortfolioSummary(portfolioId) {
        try {
            const query = `
                SELECT 
                    SUM(t.quantity * t.price) AS total_value,
                    SUM(t.quantity * t.price) / NULLIF(SUM(t.quantity), 0) AS average_price,
                    SUM((t.quantity * t.price) - (t.quantity * t.purchase_price)) AS unrealized_gain_loss
                FROM transactions t
                WHERE t.portfolio_id = @portfolio_id
            `;
            const params = [{ name: 'portfolio_id', type: sql.Int, value: portfolioId }];
            const result = await db.query(query, params);
            return result[0];
        } catch (err) {
            throw new Error('Fejl ved beregning af porteføljesammendrag: ' + err.message);
        }
    }
}

module.exports = Portfolio;



