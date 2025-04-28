const { sql, poolPromise } = require('../db/database'); // Importer korrekt fra database.js

class TransactionsModel {
    // Indsæt penge på konto
    async deposit(accountId, amount) {
        const pool = await poolPromise;
        // Opdater saldoen på kontoen
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, amount)
            .query(`
                UPDATE Accounts 
                SET balance = balance + @amount 
                WHERE accountID = @accountId AND closedAccount = 0;
            `);
        
            await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, amount)
            .input('transactionType', sql.NVarChar, 'Deposit')
            .query(`
                INSERT INTO Transactions (accountID, amount, transactionType, date)
                VALUES (@accountId, @amount, @transactionType, GETDATE());
            `);
        
    }

    // Hæv penge fra konto
    async withdraw(accountId, amount) {
        const pool = await poolPromise;
        // Opdater saldoen på kontoen
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, amount)
            .query(`
                UPDATE Accounts 
                SET balance = balance - @amount 
                WHERE accountID = @accountId AND closedAccount = 0;
            `);
        
        // Indsæt transaktionen i Transactions tabellen
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, amount)
            .input('transactionType', sql.NVarChar, 'Withdraw')
            .query(`
                INSERT INTO Transactions (accountID, amount, transactionType, date)
                VALUES (@accountId, @amount, @transactionType, GETDATE());
            `);
    }

    // Hent transaktioner for en specifik konto
    async getTransactions(accountId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT * FROM Transactions WHERE accountID = @accountId ORDER BY date DESC');
        return result.recordset;
    }
}

module.exports = new TransactionsModel();
