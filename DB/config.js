require('dotenv').config(); // VIGTIGT: dette skal stå helt i toppen, da den skal læse fra .env fil

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: 1433,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    enableArithAbort: true,
  }
};

module.exports = config;
