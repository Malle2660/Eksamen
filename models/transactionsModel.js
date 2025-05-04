 // Importer korrekt fra database.js

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

        // log transaktionen i Transactions tabellen
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

        // Returner den nye saldo
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT balance FROM Accounts WHERE accountID = @accountId');

        return result.recordset[0].balance;
    }

    // Hent transaktioner for en specifik konto
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

        // Check if sufficient balance
        const balanceResult = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT balance FROM Accounts WHERE accountID = @accountId AND (closedAccount = 0 OR closedAccount IS NULL)');
            console.log("Raw balance result:", balanceResult.recordset);
            const balance = balanceResult.recordset[0]?.balance;
            console.log("Balance:", balance, "Total Price:", totalPrice);            
        if (balance < totalPrice) throw new Error("Insufficient funds");

        // Deduct balance and insert transaction
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, totalPrice)
            .query('UPDATE Accounts SET balance = balance - @amount WHERE accountID = @accountId');

        await pool.request()
            .input('portfolioId', sql.Int, portfolioId)
            .input('accountId', sql.Int, accountId)
            .input('securityId', sql.Int, securityId)
            .input('quantity', sql.Float, quantity)
            .input('price', sql.Float, totalPrice)
            .input('fee', sql.Float, fee)
            .input('type', sql.NVarChar, 'Buy')
            .query(`
            INSERT INTO Trades (portfolioID, accountID, stockID, quantity, price, fee, type, date)
            VALUES (@portfolioId, @accountId, @securityId, @quantity, @price, @fee, @type, GETDATE());
        `);

        // returner den nye saldo 
        const newBalanceResult = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT balance FROM Accounts WHERE accountID = @accountId');

        return newBalanceResult.recordset[0].balance;


    }



    async sellSecurity(portfolioId, accountId, securityId, quantity, pricePerUnit, fee) {
        const pool = await poolPromise;

        const totalRevenue = quantity * pricePerUnit - fee;

        const balanceResult = await pool.request()
            .input('portfolioId', sql.Int, portfolioId)
            .input('securityId', sql.Int, securityId)
            .query(`SELECT SUM(CASE WHEN type = 'Buy' THEN quantity ELSE -quantity END) AS totalHeld
            FROM Trades
            WHERE portfolioID = @portfolioId AND stockID = @securityId
        `);



        const totalHeld = balanceResult.recordset[0]?.totalHeld ?? 0;
        if (totalHeld < quantity) {
            throw new Error("Du har desværre ikke nok værdipapir til at sælge");
        }



        // Opdater saldoen og indsæt transaktionen
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('amount', sql.Float, totalRevenue)
            .query('UPDATE Accounts SET balance = balance + @amount WHERE accountID = @accountId');




        // registrer salget i Trades tabellen
        await pool.request()
            .input('portfolioId', sql.Int, portfolioId)
            .input('accountId', sql.Int, accountId)
            .input('securityId', sql.Int, securityId)
            .input('quantity', sql.Float, quantity)
            .input('price', sql.Float, totalRevenue)
            .input('fee', sql.Float, fee)
            .input('type', sql.NVarChar, 'Sell')
            .query(`
        INSERT INTO Trades (portfolioID, accountID, stockID, quantity, price, fee, type, date)
        VALUES (@portfolioId, @accountId, @securityId, @quantity, @price, @fee, @type, GETDATE());
    `);


        // returner den nye saldo
        const newBalanceResult = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query('SELECT balance FROM Accounts WHERE accountID = @accountId');

        return newBalanceResult.recordset[0].balance;

    }

}

module.exports = new TransactionsModel();
