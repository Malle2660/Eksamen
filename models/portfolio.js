const { sql, poolPromise } = require('../db/database');
const finnhubService = require('../services/Finnhub');

// Portfolio-klasse: håndterer databaseforespørgsler og beregninger for porteføljer
class Portfolio {
  // Hent alle porteføljer for en specifik bruger
  static async getAllForUser(userId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Portfolios WHERE userID = @userId');
    return result.recordset; // returnér alle rækker som array
  }

  // Hent én portefølje baseret på id
  static async getById(portfolioId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId)
      .query('SELECT * FROM Portfolios WHERE portfolioID = @portfolioId'); // vi hente én portefølje baseret på id
    return result.recordset[0]; // første (og eneste) portefølje
  }

  // Opret en ny portefølje
  // name: porteføljens navn
  // accountId: konto-id tilhørende porteføljen
  // userId: bruger-id der opretter porteføljen
  static async create(name, accountId, userId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('name', sql.NVarChar(255), name)
      .input('accountId', sql.Int, accountId)
      .input('userId', sql.Int, userId)
      .query(
        `INSERT INTO Portfolios (name, accountID, registrationDate, userID) 
         VALUES (@name, @accountId, GETDATE(), @userId)`
      );
    return result.rowsAffected[0]; // skal re
  }

  // Slet en portefølje ud fra id
  static async delete(portfolioId) {
    const pool = await poolPromise;
    await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId)
      .query('DELETE FROM Portfolios WHERE portfolioID = @portfolioId');
  }

  // Beregn gennemsnitlig anskaffelseskurs (GAK) for en given aktie
  static async getGAKForStock(portfolioId, symbol) {
    const pool = await poolPromise;
    const { recordset } = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId)
      .input('symbol', sql.NVarChar(10), symbol)
      .query(
        `SELECT
           SUM(CASE WHEN t.type='Buy' THEN t.quantity*t.price ELSE 0 END) AS totalPurchase,
           SUM(CASE WHEN t.type='Buy' THEN t.quantity ELSE 0 END) AS totalBought
         FROM Trades t
         JOIN Stocks s ON t.stockID=s.id
         WHERE t.portfolioID=@portfolioId AND s.symbol=@symbol`
      );
    const { totalPurchase = 0, totalBought = 0 } = recordset[0] || {};
    // Hvis ingen køb, returnér 0, ellers det vægtede gennemsnit
    return totalBought ? totalPurchase / totalBought : 0;
  }

  // Hent alle holdings (aktiebeholdninger) for en portefølje og beregn deres værdi
  static async getHoldingsForPortfolio(portfolioId) {
    const pool = await poolPromise;
    const { recordset } = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(
        `SELECT t.stockID AS id, s.symbol,
           SUM(CASE WHEN t.type='Buy' THEN t.quantity ELSE -t.quantity END) AS amount
         FROM Trades t
         JOIN Stocks s ON t.stockID=s.id
         WHERE t.portfolioID=@portfolioId
         GROUP BY t.stockID, s.symbol
         HAVING SUM(CASE WHEN t.type='Buy' THEN t.quantity ELSE -t.quantity END)>0`
      ); 

   
    const holdings = []; // vi opretter et array af objekter med id, symbol, amount, price, value
    for (const { id, symbol, amount } of recordset) {
      let price = 0;
      try {
        const quote = await finnhubService.getStockQuote(symbol); // vi hente aktiekursen for symbol (Vores api key er gemt i .env fil)
        price = quote.price || 0; // hvis vi ikke kan hente aktiekursen, så behold pris som 0
      } catch {
        // Hvis API-kald fejler, behold pris som 0
      }
      holdings.push({ id, symbol, amount, price, value: amount * price }); // vi pusher vores objekter til vores tidligere opret array
    }
    return holdings; //  som er et array af objekter med id, symbol, amount, price, value
  }

  // Beregn samlet forventet porteføljeværdi
  static async getExpectedValueFromHoldings(portfolioId) {
    const holdings = await this.getHoldingsForPortfolio(portfolioId);
    return holdings.reduce((sum, { value }) => sum + value, 0); // vi beregner vores forventede værdi for porteføljen
  }

  // Beregn urealiseret gevinst eller tab for porteføljen
  static async getTotalUnrealizedFromHoldings(portfolioId) {
    const holdings = await this.getHoldingsForPortfolio(portfolioId);
    let totalUnrealized = 0;
    for (const { symbol, price, amount } of holdings) {
      const gak = await this.getGAKForStock(portfolioId, symbol); // vi beregner vores GAK for symbol
      totalUnrealized += (price - gak) * amount; // vi beregner vores urealiseret gevinst eller tab for porteføljen
    }
    return totalUnrealized; // positiv = gevinst, negativ = tab
  }

  // Beregn samlet købspris (totalPurchase) for en portefølje
  static async getTotalPurchaseFromTrades(portfolioId) {
    const pool = await poolPromise;
    const { recordset } = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(
        `SELECT SUM(CASE WHEN t.type='Buy' THEN t.quantity * t.price ELSE 0 END) AS totalPurchase
         FROM Trades t
         WHERE t.portfolioID = @portfolioId`
      );
    const { totalPurchase = 0 } = recordset[0] || {}; // vi beregner vores total purchase for porteføljen
    return totalPurchase; // og retunere vores total purchase her
  }

  // Hent alle trades for en portefølje (used by growthRoutes and portfolioRoutes)
  static async getTradesForPortfolio(portfolioId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId)
      .query('SELECT * FROM Trades WHERE portfolioID = @portfolioId ORDER BY date ASC');
    return result.recordset;
  }
}

module.exports = Portfolio;
