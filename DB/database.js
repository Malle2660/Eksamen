const sql = require('mssql');
require('dotenv').config();  // <-- meget vigtigt, læser fra .env

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    enableArithAbort: true
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ Forbundet til databasen!');
    return pool;
  })
  .catch(err => console.log('❌ Database fejl:', err));

module.exports = {
  sql,
  poolPromise
};
