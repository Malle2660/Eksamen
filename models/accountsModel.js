// Model til at håndtere konto-relaterede databaseoperationer
// Indeholder metoder til at oprette, lukke, genåbne konti og håndtere ind- og udbetalinger
// Logger også transaktioner og henter konto- og transaktionsdata til brugerens dashboard

// her importerer vi SQL-typer og en genbrugelig forbindelse til databasen
const { sql, poolPromise } = require('../db/database');

//Her oprettes en klasse til at håndtere konto-relaterede databaseoperationer
class AccountsModel {
  // Opretter en ny konto for en bruger med 0-saldo og registreringsdato
  async createAccount(userId, name, currency, bank) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('name', sql.NVarChar, name)
      .input('currency', sql.NVarChar, currency)
      .input('bank', sql.NVarChar, bank)
      .query(
        `INSERT INTO Accounts (userID, name, currency, bank, balance, registrationsDate, closedAccount)
        VALUES (@userId, @name, @currency, @bank, 0, GETDATE(), 0);
         SELECT SCOPE_IDENTITY() AS id;`
      );
    return result.recordset[0];
  }

  // Lukker en konto ved at sætte closedAccount = 1 og gemmer lukningstidspunktet
  async closeAccount(accountId) {
    const pool = await poolPromise;
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(
        `UPDATE Accounts
        SET closedAccount = 1,
            closedAt = GETDATE()
         WHERE accountID = @accountId;`
      );
  }

  // Genåbner en tidligere lukket konto ved at sætte closedAccount = 0
  async reopenAccount(accountId) {
    const pool = await poolPromise;
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(
        `UPDATE Accounts
        SET closedAccount = 0
         WHERE accountID = @accountId;`
      );
  }

  // Indsætter penge på en konto og opretter transaktionen
  async deposit(accountId, amount) {
    const pool = await poolPromise;
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .query(
        `UPDATE Accounts
        SET balance = balance + @amount
         WHERE accountID = @accountId AND closedAccount = 0;`
      );
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .input('transactionType', sql.NVarChar, 'Indbetaling')
      .input('date', sql.DateTime, new Date())
      .query(
        `INSERT INTO Transactions (accountID, amount, transactionType, date)
         VALUES (@accountId, @amount, @transactionType, @date);`
      );
  }

  // Hæver penge fra en konto efter at have tjekket status og dækning
  async withdraw(accountId, amount) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(
        `SELECT balance, closedAccount
         FROM Accounts
         WHERE accountID = @accountId;`
      );
    const account = result.recordset[0];
    if (!account) throw new Error('Konto ikke fundet');
    if (account.closedAccount) throw new Error('Kontoen er lukket');
    if (account.balance < amount) throw new Error('Ikke nok penge på kontoen');

    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .query(
        `UPDATE Accounts
        SET balance = balance - @amount
         WHERE accountID = @accountId AND closedAccount = 0;`
      );
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .input('transactionType', sql.NVarChar, 'Udbetaling')
      .input('date', sql.DateTime, new Date())
      .query(
        `INSERT INTO Transactions (accountID, amount, transactionType, date)
         VALUES (@accountId, @amount, @transactionType, @date);`
      );
  }

  // Henter alle transaktioner for en konto
  async getTransactionsForAccount(accountId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('accountId', sql.Int, accountId)
      .query(
        `SELECT date, amount, transactionType
        FROM Transactions
        WHERE accountID = @accountId
         ORDER BY date DESC;`
      );
    return result.recordset;
  }

  // Henter alle konti for en bruger (inkl. lukkede), sorteret efter oprettelsesdato
  async getAllForUser(userId) {
    const pool = await poolPromise;
    const result = await pool.request() 
      .input('userId', sql.Int, userId)
      .query(
        `SELECT accountID, name, bank, currency, balance, registrationsDate, closedAccount
        FROM Accounts
        WHERE userID = @userId
         ORDER BY registrationsDate DESC;`
      );
    return result.recordset;
  }

  // Henter kun aktive konti for en bruger, sorteret efter navn
  async getAccountsByUserId(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(
        `SELECT accountID, name, bank, currency, balance, registrationsDate, closedAccount
         FROM Accounts
         WHERE userID = @userId AND closedAccount = 0
         ORDER BY name;`
      );
    return result.recordset;
  }
  
  // Returnerer den samlede saldo for alle aktive konti for en bruger
  async getTotalBalance(userId) {
    const pool = await poolPromise; 
    const result = await pool.request()
        .input('userId', sql.Int, userId)
      .query(
        `SELECT SUM(balance) AS totalBalance
         FROM Accounts
         WHERE userID = @userId AND closedAccount = 0;`
      );
    return result.recordset[0].totalBalance || 0;
  }
}

module.exports = new AccountsModel();
