//importerer SQL-typer og en genbrugelig forbindelse til databasen
const { sql, poolPromise } = require('../db/database');

// Et objekt med metoder til at håndtere transaktioner i databasen
class TransactionsModel {
    // Indsæt penge på konto
    async deposit(accountId, amount) {
        const pool = await poolPromise; // Henter en åben forbindelse til databasen

        // Opdater saldoen på kontoen
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, amount)
            .query(`
                UPDATE Accounts 
                SET balance = balance + @amount 
                WHERE accountID = @accountId AND closedAccount = 0;
            `);

        // log transaktionen i Transactions-tabellen i databasen
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, amount)
            .input('transactionType', sql.NVarChar, 'Deposit')
            .query(`
                INSERT INTO Transactions (accountID, amount, transactionType, date)
                VALUES (@accountId, @amount, @transactionType, GETDATE());
            `);

        // Returner den nye saldo
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT balance FROM Accounts WHERE accountID = @accountId AND closedAccount = 0');

        return result.recordset[0].balance;
    }

    // Hæv penge fra konto
    async withdraw(accountId, amount) {
        const pool = await poolPromise;

        // Trækker beløbet fra kontoen
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

        // Returner den nye saldo
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT balance FROM Accounts WHERE accountID = @accountId');

        return result.recordset[0].balance;
    }

    // Henter transaktioner for en specifik konto
    async getTransactions(accountId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT * FROM Transactions WHERE accountID = @accountId ORDER BY date DESC');
        return result.recordset;
    }

    // køb værdipapirer
    async buySecurity(portfolioId, accountId, securityId, quantity, pricePerUnit, fee) {
        const pool = await poolPromise;

        const totalPrice = quantity * pricePerUnit + fee;

        // Tjekker om der er tilstrækkeligt beløb på kontoen
        const balanceResult = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT balance FROM Accounts WHERE accountID = @accountId AND (closedAccount = 0 OR closedAccount IS NULL)');
        
        // Henter saldoen på kontoen
        const balance = balanceResult.recordset[0]?.balance;
        // Hvis der ikke er tilstrækkeligt beløb, kastes en fejl
        if (balance < totalPrice) throw new Error("Insufficient funds");

        // Starter en database-transaktion
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // Trækker beløbet fra kontoen
            await transaction.request()
                .input('accountId', sql.Int, accountId)
                .input('amount', sql.Float, totalPrice)
                .query('UPDATE Accounts SET balance = balance - @amount WHERE accountID = @accountId');

            // Indsætter transaktionen i Trades-tabellen i databasen
            await transaction.request()
                .input('portfolioId', sql.Int, portfolioId)
                .input('accountId', sql.Int, accountId)
                .input('securityId', sql.Int, securityId)
                .input('quantity', sql.Float, quantity)
                .input('price', sql.Float, pricePerUnit)
                .input('fee', sql.Float, fee)
                .input('type', sql.NVarChar, 'Buy')
                .query(`
                    INSERT INTO Trades (portfolioID, accountID, stockID, quantity, price, fee, type, date)
                    VALUES (@portfolioId, @accountId, @securityId, @quantity, @price, @fee, @type, GETDATE());
                `);

            // Committer transaktionen
            await transaction.commit();

            // Returnerer den nye saldo
            const newBalanceResult = await pool.request()
                .input('accountId', sql.Int, accountId)
                .query('SELECT balance FROM Accounts WHERE accountID = @accountId');

            return newBalanceResult.recordset[0].balance;
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    // Sælg værdipapirer
    async sellSecurity(portfolioId, accountId, securityId, quantity, pricePerUnit, fee) {
        const pool = await poolPromise;
        const totalRevenue = quantity * pricePerUnit - fee;

        // Tjekker om der er tilstrækkeligt antal værdipapirer til at sælge
        const balanceResult = await pool.request()
            .input('portfolioId', sql.Int, portfolioId)
            .input('securityId', sql.Int, securityId)
            .query(`
                SELECT SUM(CASE WHEN type = 'Buy' THEN quantity ELSE -quantity END) AS totalHeld
                FROM Trades
                WHERE portfolioID = @portfolioId AND stockID = @securityId
            `);
        // Henter det samlede antal værdipapirer, der er købt
        const totalHeld = balanceResult.recordset[0]?.totalHeld ?? 0;
        // Hvis der ikke er tilstrækkeligt antal værdipapirer til at sælge, kastes en fejl
        if (totalHeld < quantity) {
            throw new Error("Du har desværre ikke nok værdipapir til at sælge");
        }

        // Starter en transaktion
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // Opdater kontoens saldo
            await transaction.request()
                .input('accountId', sql.Int, accountId)
                .input('amount', sql.Float, totalRevenue)
                .query('UPDATE Accounts SET balance = balance + @amount WHERE accountID = @accountId');

            // Indsætter salget i Trades-tabellen i databasen
            await transaction.request()
                .input('portfolioId', sql.Int, portfolioId)
                .input('accountId', sql.Int, accountId)
                .input('securityId', sql.Int, securityId)
                .input('quantity', sql.Float, quantity)
                .input('price', sql.Float, pricePerUnit)
                .input('fee', sql.Float, fee)
                .input('type', sql.NVarChar, 'Sell')
                .query(`
                    INSERT INTO Trades (portfolioID, accountID, stockID, quantity, price, fee, type, date)
                    VALUES (@portfolioId, @accountId, @securityId, @quantity, @price, @fee, @type, GETDATE());
                `);

            await transaction.commit();

            // Returnerer den nye saldo
            const newBalanceResult = await pool.request()
                .input('accountId', sql.Int, accountId)
                .query('SELECT balance FROM Accounts WHERE accountID = @accountId');

            return newBalanceResult.recordset[0].balance;
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    // Henter alle transaktioner for en given portefølje
    async getAllForPortfolio(portfolioId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('portfolioId', sql.Int, portfolioId)
            .query('SELECT * FROM Trades WHERE portfolioID = @portfolioId ORDER BY date ASC');
        return result.recordset;
    }
}

// Vi exporterer TransactionsModel som en model, som kan bruges i vores routes
module.exports = new TransactionsModel();
