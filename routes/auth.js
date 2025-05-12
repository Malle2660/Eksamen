// routes/auth.js 

const express = require('express'); // Importerer express 
const bcrypt  = require('bcryptjs'); // Importerer bcrypt til at hashe adgangskoden
const router  = express.Router(); // Opretter en router

// Importerer modeller til at håndtere brugerdata, konti, transaktioner og porteføljer  
const usersModel        = require('../models/usersModel'); // Importerer usersModel
const accountsModel     = require('../models/accountsModel'); // Importerer accountsModel
const transactionsModel = require('../models/transactionsModel'); // Importerer transactionsModel
const Portfolio = require('../models/portfolio'); // Importerer portfolio

// Opret bruger
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Tjekker om alle felter er udfyldt  
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' });
    }

    // Tjekker om brugernavnet er taget 
    const existing = await usersModel.findByUsername(username);
    if (existing) {
      return res.status(400).json({ message: 'Brugernavn er allerede taget' });
    }

    // Hasher adgangskoden før den gemmes i databasen 
    const hash = await bcrypt.hash(password, 10);

    // Opretter bruger i databasen  
    const user = await usersModel.create(username, email, hash);

    // Viser besked om succesfuld oprettelse og returnerer brugerens ID 
    res.status(201).json({ message: 'Bruger oprettet', userId: user.id });
  } catch (err) {
    console.error('Fejl ved oprettelse:', err);
    res.status(500).json({ message: 'Fejl ved oprettelse', error: err.message });
  }
});


//Login 
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Finder bruger i databasen ud fra brugernavn
    const user = await usersModel.findByUsername(username);
    //hvis brugeren ikke findes eller adgangskoden er forkert, returner fejlbesked
    if (!user) {
      return res.status(401).json({ error: 'Forkert brugernavn eller adgangskode' });
    }
    // Tjekker om adgangskoden er gemt i databasen
    if (!user.password) {
      return res.status(500).json({ error: 'Brugerens adgangskode mangler i databasen' });
    }
    // Tjekker om adgangskoden er korrekt med hashed adgangskode
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Forkert brugernavn eller adgangskode' });
    }

    // Opretter en session for brugeren - gemmer brugerens ID og brugernavn i sessionen 
    // så vi kan bruge det til at autentificere brugeren i de efterfølgende requests
    req.session.user = { userID: user.userID, username: user.username };
    res.json({ success: true }); //login lykkes
  } catch (err) {
    console.error(err); //vis fejlbesked
    res.status(500).json({ error: 'Serverfejl' }); //vis fejlbesked
  }
});

// Skift adgangskode
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    // Tjekker om alle felter er udfyldt
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Alle felter skal udfyldes' });
    }

    // Finder bruger i databasen ud fra brugerens ID
    const user = await usersModel.findById(userId);
    //hvis brugeren ikke findes, returner fejlbesked
    if (!user) {
      return res.status(404).json({ message: 'Bruger ikke fundet' });
    }

    // Tjekker om den nuværende adgangskode er korrekt med hash
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Nuværende adgangskode er forkert' });
    }
    // Hasher den nye adgangskode
    const hash = await bcrypt.hash(newPassword, 10);
    // Opdaterer adgangskoden i databasen
    await usersModel.updatePassword(userId, hash);
    res.json({ message: 'Adgangskode ændret succesfuldt' });
  } catch (err) {
    console.error('Fejl ved ændring af adgangskode:', err);
    res.status(500).json({ message: 'Fejl ved ændring af adgangskode', error: err.message });
  }
});
//eksempel på hvordan man kan bruge session til at sikre en route
router.get('/secret', (req, res) => {
});

router.get('/user', async (req, res) => {
  const userId = req.session.user.userID; //Henter brugerens ID fra sessionen   
  const portfolios = await Portfolio.getAllForUser(userId); //Henter alle portefolier for brugeren
  res.json(portfolios); //Returnerer porteføljerne som JSON tilbage til klienten
});

// Logout-bruger: ødelæg session og redirect til landing page
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Kunne ikke logge ud');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

//Eksporterer router så den kan bruges i andre filer
module.exports = router;

