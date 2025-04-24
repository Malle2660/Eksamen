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
        console.log('✅ Forbundet til databasen!');
      }
    } catch (error) {
      console.error('❌ Fejl ved forbindelse til databasen:', error);
      throw error;
    }
  }

  // Luk forbindelsen
  async disconnect() {
    if (this.connected) {
      await this.db.close();
      this.connected = false;
      console.log('🔌 Forbindelsen til databasen er lukket.');
    }
  }

  // Opret en ny bruger
  async create(username, email, password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      if (!this.connected) await this.connect();

      const result = await this.db.request()
        .input('username', sql.NVarChar, username)
        .input('email', sql.NVarChar, email)
        .input('password', sql.NVarChar, hashedPassword)
        .query(`
          INSERT INTO users (username, email, password)
          VALUES (@username, @email, @password);
          SELECT SCOPE_IDENTITY() AS id;
        `);

      return result.recordset[0]; // returner brugerens id
    } catch (err) {
      console.error('❌ Fejl ved oprettelse af bruger:', err);
      throw err;
    }
  }

  // Find en bruger baseret på brugernavn
  async findByUsername(username) {
    try {
      if (!this.connected) await this.connect();

      const result = await this.db.request()
        .input('username', sql.NVarChar, username)
        .query('SELECT * FROM users WHERE username = @username');

      return result.recordset[0];
    } catch (err) {
      console.error('❌ Fejl ved hentning af bruger:', err);
      throw err;
    }
  }

  // Verificer adgangskode
  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Find bruger baseret på ID
  async findById(userId) {
    try {
      if (!this.connected) await this.connect();

      const result = await this.db.request()
        .input('id', sql.Int, userId)
        .query('SELECT * FROM users WHERE id = @id');

      return result.recordset[0];
    } catch (err) {
      throw new Error('Fejl ved hentning af bruger: ' + err.message);
    }
  }

  // Opdater adgangskode
  async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      if (!this.connected) await this.connect();

      await this.db.request()
        .input('id', sql.Int, userId)
        .input('password', sql.NVarChar, hashedPassword)
        .query('UPDATE users SET password = @password WHERE id = @id');

      return true;
    } catch (err) {
      throw new Error('Fejl ved opdatering af adgangskode: ' + err.message);
    }
  }
};