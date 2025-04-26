/*// Dette er en funktion, der håndterer søgninger efter værdipapirer (f.eks. aktier, kryptovaluta m.m.)

// Når nogen søger i systemet, som fx "Apple" eller "Aktie", sendes det som en forespørgsel i URL'en
// Eksempel: /api/stocks/search?query=apple

app.get('/api/stocks/search', async (req, res) => {
    // Her henter vi den tekst brugeren har søgt på (det kaldes en query parameter)
    const { query } = req.query;

    // Vi laver en forespørgsel til databasen og beder den finde alle værdipapirer,
    // hvor navnet eller typen ligner det brugeren har skrevet.
    // Tegnet "%" før og efter betyder "uanset hvad der står før eller efter søgeordet"
    const result = await db.query(
        `
        SELECT * FROM Stocks
        WHERE name LIKE @query OR type LIKE @query
        `,
        { query: `%${query}%` } // Her indsætter vi søgeordet sikkert, så systemet ikke bliver snydt
    );

    // Vi sender resultatet tilbage til brugeren som en liste i JSON-format
    // JSON er bare en måde at sende data på, som både maskiner og mennesker let kan læse
    res.json(result.recordset);
});

// Denne funktion bliver brugt, når en bruger vil registrere en handel – enten et køb eller et salg af fx aktier.

// Når brugeren indtaster oplysninger om handlen (hvilken portefølje, hvilken aktie, pris, mængde osv.),
// bliver disse oplysninger sendt til serveren og gemt i variablerne nedenfor.
app.post('/api/trades', async (req, res) => {
    const {
      portfolioID, // ID'et på den portefølje, hvor værdipapiret hører til
      stockID,     // ID'et på det værdipapir (fx Apple-aktie)
      type,        // Typen af handel: 'buy' for køb eller 'sell' for salg
      price,       // Prisen pr. enhed af værdipapiret
      quantity,    // Hvor mange enheder brugeren vil købe eller sælge
      fee,         // Gebyret for handlen
      date         // Dato og tidspunkt for handlen
    } = req.body;
  
    // Vi skal finde ud af, hvilken konto porteføljen tilhører.
    // Det er vigtigt, fordi pengene skal trækkes fra eller sættes ind på den rigtige konto.
    const accountResult = await db.query(`
      SELECT A.accountID, A.balance, A.closedAccount
      FROM Accounts A
      JOIN Portfolios P ON P.accountID = A.accountID
      WHERE P.portfolioID = @portfolioID
    `, { portfolioID });
  
    // Hvis der ikke findes en konto tilknyttet den valgte portefølje, stopper vi og giver en fejlbesked
    if (accountResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Portefølje ikke fundet' });
    }
  
    const account = accountResult.recordset[0]; // Vi gemmer kontoen, så vi kan bruge den senere
  
    // Her regner vi ud, hvad handlen samlet set kommer til at koste eller give.
    // Ved køb trækker vi både pris og gebyr. Ved salg får vi penge minus gebyret.
    const total = price * quantity + fee;
    const amount = type === 'buy'
      ? -total  // Hvis det er et køb, skal pengene trækkes fra kontoen
      : (price * quantity - fee); // Hvis det er et salg, skal pengene sættes ind på kontoen
  
    // Vi tjekker, om kontoen er lukket – hvis den er det, må der ikke handles på den
    if (account.closedAccount) {
      return res.status(400).json({ error: 'Kontoen er lukket' });
    }
  
    // Hvis det er et køb, tjekker vi, om der er penge nok på kontoen
    if (type === 'buy' && account.balance < total) {
      return res.status(400).json({ error: 'Ikke nok saldo på kontoen' });
    }
  
    // Hvis koden kommer herned, betyder det at alt ser fint ud, og vi kan fortsætte med at oprette handlen
  });
    
    // Først tjekker vi, om brugeren prøver at sælge aktier
if (type === 'sell') {
    // Vi laver en forespørgsel til databasen for at finde ud af, hvor mange aktier
    // brugeren har af det ønskede værdipapir i den valgte portefølje.
    // Vi lægger alle køb sammen og trækker alle tidligere salg fra.
    const holdingResult = await db.query(`
      SELECT SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END) AS totalHeld
      FROM Trades
      WHERE portfolioID = @portfolioID AND stockID = @stockID
    `, { portfolioID, stockID });
  
    // Her gemmer vi det samlede antal aktier brugeren har.
    // Hvis der ikke findes nogen poster, sætter vi tallet til 0.
    const held = holdingResult.recordset[0].totalHeld || 0;
  
    // Hvis brugeren forsøger at sælge flere aktier, end de ejer, stopper vi og sender en fejlbesked.
    if (held < quantity) {
      return res.status(400).json({ error: 'Ikke nok aktier i porteføljen' });
    }
  }
  
  // Hvis vi er kommet hertil, betyder det at alle tjek er bestået,
  // og vi kan nu gemme selve handlen i databasen (enten køb eller salg)
  const tradeInsert = await db.query(`
    INSERT INTO Trades (portfolioID, stockID, type, price, quantity, fee, total, date)
    OUTPUT INSERTED.tradeID
    VALUES (@portfolioID, @stockID, @type, @price, @quantity, @fee, @total, @date)
  `, { portfolioID, stockID, type, price, quantity, fee, total, date });
  
  // Vi gemmer ID’et for den nye handel, så vi kan referere til den i transaktionen
  const tradeID = tradeInsert.recordset[0].tradeID;
  
  // Nu opretter vi en transaktion – det betyder, at vi registrerer penge, der enten skal
  // trækkes fra eller sættes ind på brugerens konto
  await db.query(`
    INSERT INTO Transactions (accountID, tradeID, amount, date)
    VALUES (@accountID, @tradeID, @amount, @date)
  `, { accountID: account.accountID, tradeID, amount, date });
  
  // Herefter opdaterer vi kontoen, så saldoen passer med den nye handel
  // Ved køb trækkes penge fra, og ved salg sættes penge ind
  await db.query(`
    UPDATE Accounts SET balance = balance + @amount WHERE accountID = @accountID
  `, { accountID: account.accountID, amount });
  
  // Til sidst sender vi en besked tilbage til brugeren om, at handlen er gennemført
  res.json({ success: true, tradeID });
  
  // Hent en oversigt over handler (køb og salg) for en bestemt portefølje

app.get('/api/portfolios/:portfolioID/trades', async (req, res) => {
    // Hent ID’et på den portefølje vi vil vise handler fra (det kommer fra URL’en)
    const { portfolioID } = req.params;
  
    // Her beder vi databasen finde alle handler, der er knyttet til den valgte portefølje
    // Vi henter også navnet på værdipapiret, så det bliver nemmere at vise i brugerfladen
    // Resultaterne bliver sorteret så de nyeste handler vises først
    const trades = await db.query(`
      SELECT T.*, S.name AS stockName
      FROM Trades T
      JOIN Stocks S ON T.stockID = S.stockID
      WHERE T.portfolioID = @portfolioID
      ORDER BY T.date DESC
    `, { portfolioID });
  
    // Vi sender handlerne tilbage som en liste i JSON-format (et nemt format til data)
    res.json(trades.recordset);
  });
  
  