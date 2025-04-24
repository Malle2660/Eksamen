const sql = require('mssql');
const bcrypt = require('bcryptjs');

module.exports = class Database {
  constructor(config) {
    this.config = config;
    this.db = null;
    this.connected = false;
  }

  // Opret forbindelse til databasen
  async connect() {
    try {
      if (!this.connected) {
        this.db = await sql.connect(this.config);
        this.connected = true;
        console.log('Forbundet til databasen!');
      }
    } catch (error) {
      console.error('Fejl ved forbindelse til databasen:', error);
      throw error;
    }
  }

  // Luk forbindelsen
  async disconnect() {
    if (this.connected) {
      await this.db.close();
      this.connected = false;
      console.log('Forbindelsen til databasen er lukket.');
    }
  }

  // Udfør en SQL-forespørgsel
  async query(queryString, params = []) {
    try {
      if (!this.connected) {
        await this.connect();
      }

      const request = this.db.request();

      // Tilføj parametre til forespørgslen
      params.forEach(param => {
        request.input(param.name, param.type, param.value);
      });

      const result = await request.query(queryString);
      return result.recordset;
    } catch (error) {
      console.error('Fejl ved udførelse af forespørgsel:', error);
      throw error;
    }
  }
};



