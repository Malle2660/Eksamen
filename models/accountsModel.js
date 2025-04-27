const { sql, poolPromise } = require('../db/database');

class AccountsModel {
    // Opret konto
    async createAccount(userId, currency, bank) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('currency', sql.NVarChar, currency)
            .input('bank', sql.NVarChar, bank)
            .query(`
                INSERT INTO Accounts (userID, currency, bank, balance, registrationsDate, closedAccount)
                VALUES (@userId, @currency, @bank, 0, GETDATE(), 0);
                SELECT SCOPE_IDENTITY() AS id;
            `);
        return result.recordset[0];
    }

    // Luk konto
    async closeAccount(accountId) {
        const pool = await poolPromise;
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .query(`
                UPDATE Accounts
                SET closedAccount = 1
                WHERE accountID = @accountId;
            `);
    }

    // Genåbn konto
    async reopenAccount(accountId) {
        const pool = await poolPromise;
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .query(`
                UPDATE Accounts
                SET closedAccount = 0
                WHERE accountID = @accountId;
            `);
    }

    // Hæv penge
    async withdraw(accountId, amount) {
        const pool = await poolPromise;
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, amount)
            .query(`
                UPDATE Accounts
                SET balance = balance - @amount
                WHERE accountID = @accountId AND closedAccount = 0;
            `);
    }

    // Indsæt penge
    async deposit(accountId, amount) {
        const pool = await poolPromise;
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, amount)
            .query(`
                UPDATE Accounts
                SET balance = balance + @amount
                WHERE accountID = @accountId AND closedAccount = 0;
            `);
    }

    // Hent alle transaktioner for en konto
    async getTransactions(accountId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query(`
                SELECT * FROM Transactions
                WHERE accountID = @accountId
                ORDER BY date DESC;
            `);
        return result.recordset;
    }
}

module.exports = new AccountsModel();
