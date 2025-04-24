const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function (db) {
  const router = express.Router();

  console.log('✅ auth.js blev indlæst');

  // GET test
  router.get('/', (req, res) => {
    res.send('Auth route fungerer!');
  });

  // REGISTER
  router.post('/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Alle felter skal udfyldes' });
      }

      const existingUser = await db.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Brugernavn er allerede taget' });
      }

      const newUser = await db.create(username, email, password);
      res.status(201).json({ message: 'Bruger oprettet succesfuldt', userId: newUser.id });
    } catch (error) {
      console.error('❌ Fejl i /register:', error);
      res.status(500).json({ message: 'Der skete en fejl ved oprettelse af bruger' });
    }
  });

  // LOGIN
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Alle felter skal udfyldes' });
      }

      const user = await db.findByUsername(username);
      if (!user || !(await db.verifyPassword(password, user.password))) {
        return res.status(401).json({ message: 'Ugyldigt brugernavn eller adgangskode' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'hemmelig',
        { expiresIn: '24h' }
      );

      res.json({ token, userId: user.id, username: user.username });
    } catch (error) {
      console.error('❌ Fejl i /login:', error);
      res.status(500).json({ message: 'Der skete en fejl ved login' });
    }
  });

  // CHANGE PASSWORD
  router.post('/change-password', async (req, res) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;

      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Alle felter skal udfyldes' });
      }

      const user = await db.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Bruger ikke fundet' });
      }

      const isValid = await db.verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Nuværende adgangskode er forkert' });
      }

      await db.updatePassword(userId, newPassword);
      res.json({ message: 'Adgangskode ændret succesfuldt' });
    } catch (error) {
      console.error('❌ Fejl i /change-password:', error);
      res.status(500).json({ message: 'Der skete en fejl ved ændring af adgangskode' });
    }
  });

  return router;
};