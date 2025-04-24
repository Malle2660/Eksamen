const dotenv = require('dotenv');

if(process.env.NODE_ENV === 'development') {
  dotenv.config({ path: `.env.${process.env.NODE_ENV}`, debug: true });
}

const server ="eksamen2025.database.windows.net";
const database ="Eksamen DB";
const port = 1433;
const user ="AmalieKoefoed-Hansen";
const password ="Kode123@";

const passwordConfig = {
  server,
  port,
  database,
  user,
  password,
  options: {
    encrypt: true
  }
};

module.exports = passwordConfig
