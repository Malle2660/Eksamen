// Model til at håndtere konto-relaterede databaseoperationer
// Indeholder metoder til at oprette, lukke, genåbne konti og håndtere ind- og udbetalinger
// Logger også transaktioner og henter konto- og transaktionsdata til brugerens dashboard

<<<<<<< HEAD
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
=======
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
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
      .query(`
        INSERT INTO Accounts (userID, name, currency, bank, balance, registrationsDate, closedAccount)
        VALUES (@userId, @name, @currency, @bank, 0, GETDATE(), 0);
        SELECT SCOPE_IDENTITY() AS id;
      `);
<<<<<<< HEAD
    return result.recordset[0]; // Returnerer den nye kontos ID
  }

  // Lukker en konto ved at sætte closedAccount = 1 og gemmer lukningstidspunktet
  async closeAccount(accountId) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    await pool.request()
      .input('accountId', sql.Int, accountId) // Kontoens ID
=======
    return result.recordset[0]; // Returnerer den nye kontos ID som et objekt
  }

  async closeAccount(accountId) { // Her lukkes en konto
    const pool = await poolPromise; // Henter databasen
    await pool.request() // Starter en ny query-opbygning
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID  
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
      .query(`
        UPDATE Accounts
        SET closedAccount = 1,
            closedAt = GETDATE()
        WHERE accountID = @accountId;
      `);
  }

<<<<<<< HEAD
  // Genåbner en tidligere lukket konto ved at sætte closedAccount = 0
  async reopenAccount(accountId) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    await pool.request()
      .input('accountId', sql.Int, accountId) // Kontoens ID
=======
  // Genåbner en tidligere lukket konto
  async reopenAccount(accountId) { // Her genåbnes en tidligere lukket konto
    const pool = await poolPromise; // Henter databasen
    await pool.request() // Starter en ny query-opbygning
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
      .query(`
        UPDATE Accounts
        SET closedAccount = 0
        WHERE accountID = @accountId;
      `);
  }

<<<<<<< HEAD
  // Indsætter penge på en konto og opretter transaktionen
  async deposit(accountId, amount) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    // Opdater saldoen på kontoen ved at lægge beløbet til saldoen
    await pool.request()
      .input('accountId', sql.Int, accountId) // Kontoens ID
      .input('amount', sql.Float, amount) // Beløbet der indsættes
=======
  async deposit(accountId, amount) { // her indsættes penge på en konto
    const pool = await poolPromise; // Henter databasen
    await pool.request() // opdaterer balance
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .input('amount', sql.Float, amount) // Her indsættes beløbet
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
      .query(`
        UPDATE Accounts
        SET balance = balance + @amount
        WHERE accountID = @accountId
          AND closedAccount = 0;
      `);
<<<<<<< HEAD

    // Log transaktionen i Transactions tabellen i databasen
    await pool.request()
      .input('accountId', sql.Int, accountId) // Kontoens ID
      .input('amount', sql.Float, amount) // Beløbet der indsættes
      .input('transactionType', sql.NVarChar, 'Indbetaling') // Transaktionstype
      .input('date', sql.DateTime, new Date()) // Nuværende Dato
=======
    await pool.request() // logges transaktionen
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .input('amount', sql.Float, amount) // Her indsættes beløbet
      .input('transactionType', sql.NVarChar, 'Indbetaling') // Her indsættes transaktionstypen
      .input('date', sql.DateTime, new Date()) // Her indsættes datoen
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
      .query(`
        INSERT INTO Transactions (accountID, amount, transactionType, date)
        VALUES (@accountId, @amount, @transactionType, @date)
      `);
  }

<<<<<<< HEAD
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
=======
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
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
      .query(`
        UPDATE Accounts
        SET balance = balance - @amount
        WHERE accountID = @accountId AND closedAccount = 0;
      `);
  
<<<<<<< HEAD
    // Registrerer udbetalingen som en transaktionen i Transactions tabellen i databasen
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('amount', sql.Float, amount)
      .input('transactionType', sql.NVarChar, 'Udbetaling')
      .input('date', sql.DateTime, new Date())
=======
    await pool.request() // logges transaktionen
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
      .input('amount', sql.Float, amount) // Her indsættes beløbet  
      .input('transactionType', sql.NVarChar, 'Udbetaling') // Her indsættes transaktionstypen
      .input('date', sql.DateTime, new Date()) // Her indsættes datoen
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
      .query(`
        INSERT INTO Transactions (accountID, amount, transactionType, date)
        VALUES (@accountId, @amount, @transactionType, @date)
      `);
  }

<<<<<<< HEAD
  // Henter alle transaktioner for en bestemt konto, sorteret efter de nyeste først
  async getTransactions(accountId) {
    const pool = await poolPromise;// Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    const result = await pool.request() // 
      .input('accountId', sql.Int, accountId) // Kontoens ID
=======
  async getTransactions(accountId) { // Henter alle transaktioner for en bestemt konto, sorteret nyest først
    const pool = await poolPromise; // Henter databasen
    const result = await pool.request() // Starter en ny query-opbygning
      .input('accountId', sql.Int, accountId) // Her indsættes kontiets ID
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
      .query(`
        SELECT *
        FROM Transactions
        WHERE accountID = @accountId
        ORDER BY date DESC;
      `);
    return result.recordset; // Returnerer alle transaktionerne som et array og udskriver en liste af transaktioner.
  }

<<<<<<< HEAD
  // Henter alle konti for en bruger, sorteret efter oprettelsesdato
  async getAllForUser(userId) {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen og gemmer den i pool og bruger den til at udføre en SQL-forespørgsel
    const result = await pool.request() 
      .input('userId', sql.Int, userId) // Brugerens ID
=======
  async getAllForUser(userId) { // Henter alle transaktioner for en bruger
    const pool = await poolPromise; // henter databasen
    const result = await pool.request() // starter en ny query-opbygning
      .input('userId', sql.Int, userId)
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
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
  
<<<<<<< HEAD
  // Returnerer brugerens samlede saldo fra alle åbne konti
  async getTotalBalance(userId) {
    const pool = await poolPromise; 
    const result = await pool.request()
        .input('userId', sql.Int, userId)
=======
  async getTotalBalance(userId) { // Begregner samlet saldo for alle aktive kontier
    const pool = await poolPromise; // Henter databasen
    const result = await pool.request() // starter en ny query-opbygning
        .input('userId', sql.Int, userId) // Her indsættes brugerens ID
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
        .query(`
            SELECT SUM(balance) as totalBalance 
            FROM accounts 
            WHERE userId = @userId 
            AND closedAccount = 0
        `);
<<<<<<< HEAD
    return result.recordset[0].totalBalance || 0; // Returnerer samlede saldo eller 0, hvis brugeren ikke har nogen aktive konti
=======
    return result.recordset[0].totalBalance || 0; // returnere en samlet oversigt over sum eller 0
>>>>>>> parent of fb52526 (Merge branch 'main' of https://github.com/Malle2660/Eksamen)
  }
}

module.exports = new AccountsModel();
