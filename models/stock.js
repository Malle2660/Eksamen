//importerer SQL-typer og en genbrugelig forbindelse til databasen
const { sql, poolPromise } = require('../db/database');

// Et objekt med metoder til at håndtere aktier i databasen
const Stock = {
  // Hent alle aktier for en givenportefølje ud fra dens ID
  getAllForPortfolio: async (portfolioId) => {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen
    const result = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId) // Indsætter porteføljens ID i SQL-forespørgslen som parameter
      .query(`
        SELECT 
          id AS stockID, // ID'et på aktien
          symbol, // symbollet på aktien f.eks. AAPL
          amount, // antal aktier
          bought_at // købsprisen for aktien
        FROM Stocks
        WHERE portfolio_id = @portfolioId
      `);
    return result.recordset; // Returnerer listen af aktier for en given portefølje som en array
  },

  // Tilføj en ny aktie og returnér den indsatte række
  addToPortfolio: async (portfolioId, symbol, amount, boughtAt) => {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen
    const result = await pool
      .request()
      .input('portfolioId', sql.Int, portfolioId) // Indsætter porteføljens ID i SQL-forespørgslen som parameter
      .input('symbol', sql.VarChar(10), symbol) // Indsætter symbollet på aktien i SQL-forespørgslen som parameter
      .input('amount', sql.Int, amount) // Indsætter antal aktier i SQL-forespørgslen som parameter
      .input('boughtAt', sql.Decimal(10, 2), boughtAt) // Indsætter købsprisen for aktien i SQL-forespørgslen som parameter
      .query(`
        INSERT INTO Stocks (portfolio_id, symbol, amount, bought_at)
        OUTPUT INSERTED.*
        VALUES (@portfolioId, @symbol, @amount, @boughtAt)
      `);
    return result.recordset[0]; // Returnerer den indsatte række som et objekt    
  },

  // Slet en aktie
  delete: async (stockId) => {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen
    await pool
      .request()
      .input('stockId', sql.Int, stockId) // Indsætter aktienens ID i SQL-forespørgslen som parameter
      .query('DELETE FROM Stocks WHERE id = @stockId'); // Sletter aktien fra databasen
  },

  // Opdater en aktie
  update: async (stockId, amount, boughtAt) => {
    const pool = await poolPromise; // Henter en åben forbindelse til databasen
    await pool
      .request()
      .input('stockId', sql.Int, stockId) // Indsætter aktienens ID i SQL-forespørgslen som parameter
      .input('amount', sql.Int, amount) // Indsætter antal aktier i SQL-forespørgslen som parameter
      .input('boughtAt', sql.Decimal(10, 2), boughtAt) // Indsætter købsprisen for aktien i SQL-forespørgslen som parameter
      .query(`
        UPDATE Stocks
        SET amount = @amount, bought_at = @boughtAt
        WHERE id = @stockId
      `);
    return result.rowsAffected[0]; // Returnerer antal rækker, der blev opdateret
  }
};

// Vi exporterer Stock som en model, som kan bruges i vores routes
module.exports = Stock;
