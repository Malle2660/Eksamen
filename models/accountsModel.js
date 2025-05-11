// Model til at håndtere konto-relaterede databaseoperationer
// Indeholder metoder til at oprette, lukke, genåbne konti og håndtere ind- og udbetalinger
// Logger også transaktioner og henter konto- og transaktionsdata til brugerens dashboard

const { sql, poolPromise } = require('../db/database'); // Importerer SQL-helper og forbindelse til database

// Opretter en ny konto for en bruger med 0-saldo og registreringsdato
class AccountsModel {
  async createAccount(userId, name, currency, bank) { // Her oprttes der der en ny konto for en bruger
    const pool = await poolPromise; // Henter databasen
    const result = await pool.request() // Starter en ny query-opbygning
      .input('userId', sql.Int, userId) // Her indsættes brugerens ID
      .input('name', sql.NVarChar, name) // Her indsættes kontiets navn
      .input('currency', sql.NVarChar, currency) // Her indsættes kontiets valuta
      .input('bank', sql.NVarChar, bank) // Indsætter brugerens bank
      .query(`
        INSERT INTO Accounts (userID, name, currency, bank, balance, registrationsDate, closedAccount)
        VALUES (@userId, @name, @currency, @bank, 0, GETDATE(), 0);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    return result.recordset[0]; // Returnerer den nye kontos ID som et objekt
  }

  async closeAccount(accountId) { // Her lukkes en konto
    const pool = await poolPromise; // Henter databasen
    await pool.request() // Starter en ny query-opbygning
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID  
      .query(`
        UPDATE Accounts
        SET closedAccount = 1,
            closedAt = GETDATE()
        WHERE accountID = @accountId;
      `);
  }

  // Genåbner en tidligere lukket konto
  async reopenAccount(accountId) { // Her genåbnes en tidligere lukket konto
    const pool = await poolPromise; // Henter databasen
    await pool.request() // Starter en ny query-opbygning
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .query(`
        UPDATE Accounts
        SET closedAccount = 0
        WHERE accountID = @accountId;
      `);
  }

  async deposit(accountId, amount) { // her indsættes penge på en konto
    const pool = await poolPromise; // Henter databasen
    await pool.request() // opdaterer balance
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .input('amount', sql.Float, amount) // Her indsættes beløbet
      .query(`
        UPDATE Accounts
        SET balance = balance + @amount
        WHERE accountID = @accountId
          AND closedAccount = 0;
      `);
    await pool.request() // logges transaktionen
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .input('amount', sql.Float, amount) // Her indsættes beløbet
      .input('transactionType', sql.NVarChar, 'Indbetaling') // Her indsættes transaktionstypen
      .input('date', sql.DateTime, new Date()) // Her indsættes datoen
      .query(`
        INSERT INTO Transactions (accountID, amount, transactionType, date)
        VALUES (@accountId, @amount, @transactionType, @date)
      `);
  }

  async withdraw(accountId, amount) { // Her udbetales penge fra en konto
    const pool = await poolPromise; // Henter databasen
    const result = await pool.request() // Henter kontiets information
      .input('accountId', sql.Int, accountId)
      .query('SELECT balance, closedAccount FROM Accounts WHERE accountID = @accountId'); // queryen der henter kontiets balance og om den er lukket
    const account = result.recordset[0]; // tager første resultat
    if (!account) throw new Error('Konto ikke fundet'); // Fejl hvis konto ikke findes
    if (account.closedAccount) throw new Error('Kontoen er lukket'); // Fejl hvis kontoen er lukket
    if (account.balance < amount) throw new Error('Ikke nok penge på kontoen'); // Fejl hvis der ikke er nok penge på kontoen
    await pool.request() // opdaterer balance
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .input('amount', sql.Float, amount) // Her indsættes beløbet
      .query(`
        UPDATE Accounts
        SET balance = balance - @amount
        WHERE accountID = @accountId AND closedAccount = 0;
      `);
  
    await pool.request() // logges transaktionen
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .input('amount', sql.Float, amount) // Her indsættes beløbet  
      .input('transactionType', sql.NVarChar, 'Udbetaling') // Her indsættes transaktionstypen
      .input('date', sql.DateTime, new Date()) // Her indsættes datoen
      .query(`
        INSERT INTO Transactions (accountID, amount, transactionType, date)
        VALUES (@accountId, @amount, @transactionType, @date)
      `);
  }

  async getTransactions(accountId) { // Henter alle transaktioner for en bestemt konto, sorteret nyest først
    const pool = await poolPromise; // Henter databasen
    const result = await pool.request() // Starter en ny query-opbygning
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .query(`
        SELECT *
        FROM Transactions
        WHERE accountID = @accountId
        ORDER BY date DESC;
      `);
    return result.recordset; // Returnerer alle transaktionerne som et array og udskriver en liste af transaktioner.
  }

  async getAllForUser(userId) { // Henter alle transaktioner for en bruger
    const pool = await poolPromise; // henter databasen
    const result = await pool.request() // starter en ny query-opbygning
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
    return result.recordset; // Returnerer alle konti for en bruger som et array og udskriver en liste af konti.
  }

  async getTransactionsForAccount(accountId) { // hent en historie af transaktioner for en konto
    const pool = await poolPromise; // Henter databasen
    const result = await pool.request() // starter en ny query-opbygning
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .query(`
        SELECT 
          date,
          amount,
          transactionType
        FROM Transactions
        WHERE accountID = @accountId
        ORDER BY date DESC
      `);
    return result.recordset; // Returnerer en historik af transaktioner for en konto
  }

  async getAccountsByUserId(userId) { // Begregner samlet saldo for alle aktive kontier
    const pool = await poolPromise; // Henter databasen
    const result = await pool.request() // starter en ny query-opbygning
        .input('userId', sql.Int, userId) // Her indsættes brugerens ID
        .query(`
            SELECT * FROM accounts 
            WHERE userId = @userId 
            AND closedAccount = 0
            ORDER BY accountName
        `);
    return result.recordset; // returnere en samlet oversigt over sum eller 0
  }
  
  async getTotalBalance(userId) { // Begregner samlet saldo for alle aktive kontier
    const pool = await poolPromise; // Henter databasen
    const result = await pool.request() // starter en ny query-opbygning
        .input('userId', sql.Int, userId) // Her indsættes brugerens ID
        .query(`
            SELECT SUM(balance) as totalBalance 
            FROM accounts 
            WHERE userId = @userId 
            AND closedAccount = 0
        `);
    return result.recordset[0].totalBalance || 0; // returnere en samlet oversigt over sum eller 0
  }
}

module.exports = new AccountsModel();
