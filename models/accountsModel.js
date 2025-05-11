// Model til at håndtere konto-relaterede databaseoperationer
// Indeholder metoder til at oprette, lukke, genåbne konti og håndtere ind- og udbetalinger
// Logger også transaktioner og henter konto- og transaktionsdata til brugerens dashboard

// her importerer vi SQL-typer og en genbrugelig forbindelse til databasen
const { sql, poolPromise } = require('../db/database');

//Her oprettes en klasse til at håndtere konto-relaterede databaseoperationer
class AccountsModel {
  // Opretter en ny konto for en bruger med 0-saldo og registreringsdato
  async createAccount(userId, name, currency, bank) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    const result = await pool.request()
      .input('userId', sql.Int, userId) // Indsætter brugerens ID
      .input('name', sql.NVarChar, name) // Indsætter kontonavnet
      .input('currency', sql.NVarChar, currency) // Indsætter valuta f.eks. DKK eller USD
      .input('bank', sql.NVarChar, bank) // Indsætter navnet på banken
      .query(`
        INSERT INTO Accounts (userID, name, currency, bank, balance, registrationsDate, closedAccount)
        VALUES (@userId, @name, @currency, @bank, 0, GETDATE(), 0);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    return result.recordset[0]; // Returnerer den nye kontos ID
  }

  // Lukker en konto ved at sætte closedAccount = 1 og gemmer lukningstidspunktet
  async closeAccount(accountId) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    await pool.request()
      .input('accountId', sql.Int, accountId) // Kontoens ID
      .query(`
        UPDATE Accounts
        SET closedAccount = 1,     // marker konto som lukket
            closedAt = GETDATE()   // gemmer tidspunktet for lukning
        WHERE accountID = @accountId;
      `);
  }

  // Genåbner en tidligere lukket konto ved at sætte closedAccount = 0
  async reopenAccount(accountId) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    await pool.request()
      .input('accountId', sql.Int, accountId) // Kontoens ID
      .query(`
        UPDATE Accounts
        SET closedAccount = 0 // marker konto som åben igen
        WHERE accountID = @accountId;
      `);
  }

  // Indsætter penge på en konto og opretter transaktionen
  async deposit(accountId, amount) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    // Opdater saldoen på kontoen ved at lægge beløbet til saldoen
    await pool.request()
      .input('accountId', sql.Int, accountId) // Kontoens ID
      .input('amount', sql.Float, amount) // Beløbet der indsættes
      .query(`
        UPDATE Accounts
        SET balance = balance + @amount // lægger beløbet til saldoen
        WHERE accountID = @accountId 
          AND closedAccount = 0; // kun hvis kontoen er åben
      `);

    // Log transaktionen i Transactions tabellen i databasen
    await pool.request()
      .input('accountId', sql.Int, accountId) // Kontoens ID
      .input('amount', sql.Float, amount) // Beløbet der indsættes
      .input('transactionType', sql.NVarChar, 'Indbetaling') // Transaktionstype
      .input('date', sql.DateTime, new Date()) // Nuværende Dato
      .query(`
        INSERT INTO Transactions (accountID, amount, transactionType, date)
        VALUES (@accountId, @amount, @transactionType, @date)
      `);
  }

  // Hæver penge fra en konto, tjekker først kontostaus og om der er nok dækning
  async withdraw(accountId, amount) {
    const pool = await poolPromise;
    // Tjekker dækning og om kontoen er aktiv
    const result = await pool.request()
      .input('accountId', sql.Int, accountId)
      .query('SELECT balance, closedAccount FROM Accounts WHERE accountID = @accountId');
    const account = result.recordset[0];
    if (!account) throw new Error('Konto ikke fundet'); // Hvis kontoen ikke findes, kastes en fejl
    if (account.closedAccount) throw new Error('Kontoen er lukket'); // Hvis kontoen er lukket, kastes en fejl
    if (account.balance < amount) throw new Error('Ikke nok penge på kontoen'); // Hvis der ikke er nok penge på kontoen, kastes en fejl
    
    // Trækker beløbet fra saldoen
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .query(`
        UPDATE Accounts
        SET balance = balance - @amount
        WHERE accountID = @accountId AND closedAccount = 0;
      `);
  
    // Registrerer udbetalingen som en transaktionen i Transactions tabellen i databasen
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

  // Henter alle transaktioner for en bestemt konto, sorteret efter de nyeste først
  async getTransactions(accountId) {
    const pool = await poolPromise;// Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    const result = await pool.request() // 
      .input('accountId', sql.Int, accountId) // Kontoens ID
      .query(`
        SELECT *
        FROM Transactions
        WHERE accountID = @accountId
        ORDER BY date DESC; // Sorterer transaktionerne efter dato
      `);
    return result.recordset; // Returnerer alle transaktionerne som et array og udskriver en liste af transaktioner.
  }

  // Henter alle konti for en bruger, sorteret efter oprettelsesdato
  async getAllForUser(userId) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    const result = await pool.request() 
      .input('userId', sql.Int, userId) // Brugerens ID
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
        ORDER BY registrationsDate DESC; // Nyeste konto først 
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
    return result.recordset[0].totalBalance || 0; // Returnerer samlede saldo eller 0, hvis brugeren ikke har nogen aktive konti
  }
}

// Eksporter en ny instans af AccountsModel til brug i routes og services
module.exports = new AccountsModel();
