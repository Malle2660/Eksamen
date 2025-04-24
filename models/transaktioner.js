// Søgning efter værdipapirer (Stocks)
app.get('/api/stocks/search', async (req, res) => {
    const { query } = req.query;
    const result = await db.query(`
      SELECT * FROM Stocks
      WHERE name LIKE @query OR type LIKE @query
    `, { query: `%${query}%` });
    res.json(result.recordset);
  });
  
  // Registrér en handel (køb eller salg)
  app.post('/api/trades', async (req, res) => {
    const {
      portfolioID, stockID, type, price, quantity, fee, date
    } = req.body;
  
    // Hent konto tilknyttet porteføljen
    const accountResult = await db.query(`
      SELECT A.accountID, A.balance, A.closedAccount
      FROM Accounts A
      JOIN Portfolios P ON P.accountID = A.accountID
      WHERE P.portfolioID = @portfolioID
    `, { portfolioID });
  
    if (accountResult.recordset.length === 0) return res.status(404).json({ error: 'Portefølje ikke fundet' });
  
    const account = accountResult.recordset[0];
    const total = price * quantity + fee;
    const amount = type === 'buy' ? -total : (price * quantity - fee);
  
    if (account.closedAccount) return res.status(400).json({ error: 'Kontoen er lukket' });
    if (type === 'buy' && account.balance < total) {
      return res.status(400).json({ error: 'Ikke nok saldo på kontoen' });
    }
  
    // Valider salg (tjek om der er aktier)
    if (type === 'sell') {
      const holdingResult = await db.query(`
        SELECT SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END) AS totalHeld
        FROM Trades
        WHERE portfolioID = @portfolioID AND stockID = @stockID
      `, { portfolioID, stockID });
  
      const held = holdingResult.recordset[0].totalHeld || 0;
      if (held < quantity) return res.status(400).json({ error: 'Ikke nok aktier i porteføljen' });
    }
  
    // Indsæt trade
    const tradeInsert = await db.query(`
      INSERT INTO Trades (portfolioID, stockID, type, price, quantity, fee, total, date)
      OUTPUT INSERTED.tradeID
      VALUES (@portfolioID, @stockID, @type, @price, @quantity, @fee, @total, @date)
    `, { portfolioID, stockID, type, price, quantity, fee, total, date });
  
    const tradeID = tradeInsert.recordset[0].tradeID;
  
    // Indsæt transaktion
    await db.query(`
      INSERT INTO Transactions (accountID, tradeID, amount, date)
      VALUES (@accountID, @tradeID, @amount, @date)
    `, { accountID: account.accountID, tradeID, amount, date });
  
    // Opdater saldo
    await db.query(`
      UPDATE Accounts SET balance = balance + @amount WHERE accountID = @accountID
    `, { accountID: account.accountID, amount });
  
    res.json({ success: true, tradeID });
  });
  
  // Oversigt over handler (trades) for en portefølje
  app.get('/api/portfolios/:portfolioID/trades', async (req, res) => {
    const { portfolioID } = req.params;
    const trades = await db.query(`
      SELECT T.*, S.name AS stockName
      FROM Trades T
      JOIN Stocks S ON T.stockID = S.stockID
      WHERE T.portfolioID = @portfolioID
      ORDER BY T.date DESC
    `, { portfolioID });
    res.json(trades.recordset);
  });

  // Transaktionsoversigt for en portefølje
  app.get('/api/portfolios/:portfolioID/transactions', async (req, res) => {
    const { portfolioID } = req.params;
    const transactions = await db.query(`
      SELECT TR.*, T.amount, S.name AS stockName
      FROM Trades TR
      JOIN Transactions T ON TR.tradeID = T.tradeID
      JOIN Stocks S ON TR.stockID = S.stockID
      WHERE TR.portfolioID = @portfolioID
      ORDER BY TR.date DESC
    `, { portfolioID });
    res.json(transactions.recordset);
  });
  