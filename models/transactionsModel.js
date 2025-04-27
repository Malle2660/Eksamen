const db = require('../db/database');

class TransactionsModel {
    async deposit(accountId, amount) {
        await db.request()
            .input('accountId', db.sql.Int, accountId)
            .input('amount', db.sql.Float, amount)
            .query('UPDATE Accounts SET balance = balance + @amount WHERE accountID = @accountId AND closedAccount = 0');
    }

    async withdraw(accountId, amount) {
        await db.request()
            .input('accountId', db.sql.Int, accountId)
            .input('amount', db.sql.Float, amount)
            .query('UPDATE Accounts SET balance = balance - @amount WHERE accountID = @accountId AND closedAccount = 0');
    }

    async getTransactions(accountId) {
        const result = await db.request()
            .input('accountId', db.sql.Int, accountId)
            .query('SELECT * FROM Transactions WHERE accountID = @accountId ORDER BY date DESC');
        return result.recordset;
    }
}

module.exports = new TransactionsModel();
