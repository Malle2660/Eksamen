// models/accountsModel.js
const { sql, poolPromise } = require('../db/database');

class AccountsModel {
  // Opretter en ny konto for en bruger
  async createAccount(userId, name, currency, bank) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('name', sql.NVarChar, name)
      .input('currency', sql.NVarChar, currency)
      .input('bank', sql.NVarChar, bank)
      .query(`
        INSERT INTO Accounts (userID, name, currency, bank, balance, registrationsDate, closedAccount)
        VALUES (@userId, @name, @currency, @bank, 0, GETDATE(), 0);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    return result.recordset[0];
  }

  // Lukker en konto (sætter closedAccount = 1 og lukketidspunkt)
  async closeAccount(accountId) {
    const pool = await poolPromise;
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(`
        UPDATE Accounts
        SET closedAccount = 1,
            closedAt = GETDATE()
        WHERE accountID = @accountId;
      `);
  }

  // Genåbner en lukket konto
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

  // Indsætter et beløb på kontoen (hvis ikke lukket) og logger transaktionen
  async deposit(accountId, amount) {
    const pool = await poolPromise;
    // Opdater saldo
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .query(`
        UPDATE Accounts
        SET balance = balance + @amount
        WHERE accountID = @accountId
          AND closedAccount = 0;
      `);
    // Log transaktionen
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .input('transactionType', sql.NVarChar, 'Indbetaling')
      .input('date', sql.DateTime, new Date())
      .query(`
        INSERT INTO Transactions (accountID, amount, transactionType, date)
        VALUES (@accountId, @amount, @transactionType, @date)
      `);
  }

  // Hæver et beløb fra kontoen (hvis ikke lukket og der er dækning) og logger transaktionen
  async withdraw(accountId, amount) {
    const pool = await poolPromise;
    // Tjek dækning og lukket konto
    const result = await pool.request()
      .input('accountId', sql.Int, accountId)
      .query('SELECT balance, closedAccount FROM Accounts WHERE accountID = @accountId');
    const account = result.recordset[0];
    if (!account) throw new Error('Konto ikke fundet');
    if (account.closedAccount) throw new Error('Kontoen er lukket');
    if (account.balance < amount) throw new Error('Ikke nok penge på kontoen');
    // Træk beløbet fra saldoen
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .query(`
        UPDATE Accounts
        SET balance = balance - @amount
        WHERE accountID = @accountId AND closedAccount = 0;
      `);
    // Log transaktionen
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .input('transactionType', sql.NVarChar, 'Udbetaling')
      .input('date', sql.DateTime, new Date())
      .query(`
        INSERT INTO Transactions (accountID, amount, transactionType, date)
        VALUES (@accountId, @amount, @transactionType, @date)
      `);
  }

  // Henter alle transaktioner for en given konto, sorteret nyest først
  async getTransactions(accountId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(`
        SELECT *
        FROM Transactions
        WHERE accountID = @accountId
        ORDER BY date DESC;
      `);
    return result.recordset;
  }

  // Henter alle konti tilhørende en given bruger, sorteret efter oprettelsesdato
  async getAllForUser(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT
          accountID,
          name,
          bank,
          currency,
          balance,
          registrationsDate,
          closedAccount
        FROM Accounts
        WHERE userID = @userId
        ORDER BY registrationsDate DESC;
      `);
    return result.recordset;
  }

  // Hent alle transaktioner for en konto, sorteret nyeste først
  async getTransactionsForAccount(accountId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(`
        SELECT 
          date,
          amount,
          transactionType
        FROM Transactions
        WHERE accountID = @accountId
        ORDER BY date DESC
      `);
    return result.recordset;
  }
}

module.exports = new AccountsModel();
