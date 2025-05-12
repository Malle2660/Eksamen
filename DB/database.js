// Importerer Azure SQL Server-forbindelse
const sql = require('mssql');
// Importerer dotenv for at læse miljøvariabler fra .env fil
require('dotenv').config();  
// den er meget vigtigt, da den skal læse fra .env fil

// Konfigurerer forbindelsen til Azure SQL Server
const config = {
  user: process.env.DB_USER, // bruger navnet fra .env fil
  password: process.env.DB_PASSWORD, // bruger password fra .env fil
  server: process.env.DB_SERVER, // bruger server fra .env fil
  database: process.env.DB_DATABASE, // bruger database fra .env fil
  options: {
    encrypt: true, // krypterer forbindelsen til Azure SQL Server
    enableArithAbort: true // Forbreder fejlbehandling i SQL Server
  }
};

// Opretter en pool for forbindelser til Azure SQL Server og gemmer i poolPromise
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log(' Forbundet til databasen!'); // besked til konsollen
    return pool; // returnerer den åbne forbindelse til (pool)
  })
  .catch(err => console.log(' Database fejl:', err)); // fejlbesked til konsollen

// Eksporter forbindelsen og poolen
module.exports = {
  sql,
  poolPromise
};
