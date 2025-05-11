// Model til at håndtere konto-relaterede databaseoperationer
// Indeholder metoder til at oprette, lukke, genåbne konti og håndtere ind- og udbetalinger
// Logger også transaktioner og henter konto- og transaktionsdata til brugerens dashboard
const { sql, poolPromise } = require('../db/database');

class AccountsModel {
  // Opretter en ny konto for en bruger med 0-saldo og registreringsdato
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

  // Sætter en konto som lukket og angiver lukningstidspunkt
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

  // Genåbner en tidligere lukket konto
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

  // Indsætter penge på en konto og opretter transaktionslog
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

  // Hæver penge fra en konto hvis den er åben og har nok dækning
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

  // Henter alle transaktioner for en bestemt konto, sorteret nyest først
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

  // Henter alle konti for en bruger, sorteret efter oprettelsesdato
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

  // Ekstra metode til at hente transaktioner for en specifik konto (gentagelse af ovenstående)
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

  // Henter alle aktive (åbne) konti for en bruger, sorteret alfabetisk
  async getAccountsByUserId(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT * FROM accounts 
            WHERE userId = @userId 
            AND closedAccount = 0
            ORDER BY accountName
        `);
    return result.recordset;
  }
  
// Returnerer brugerens samlede saldo fra alle åbne konti
  async getTotalBalance(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT SUM(balance) as totalBalance 
            FROM accounts 
            WHERE userId = @userId 
            AND closedAccount = 0
        `);
    return result.recordset[0].totalBalance || 0;
  }
}

module.exports = new AccountsModel();
