const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

module.exports = function (db) {
    const router = express.Router();

    console.log('✅ auth.js blev indlæst');

    // === GET Test ===
    router.get('/', (req, res) => {
        res.send('Auth route fungerer!');
    });

    // === Register bruger ===
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

            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = await db.create(username, email, hashedPassword);

            res.status(201).json({ message: 'Bruger oprettet succesfuldt', userId });
        } catch (error) {
            console.error('❌ Fejl i /register:', error.message, error.stack);
            res.status(500).json({ message: 'Der skete en fejl ved oprettelse af bruger', error: error.message });
        }
    }
    );        
    // === Login ===
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Alle felter skal udfyldes' });
        }

        // Brug db.login metoden (som vi lige lavede!)
        const user = await db.login(username, password);

        // Opret JWT token efter succesfuldt login
        const token = jwt.sign(
            { userId: user.userID, username: user.username },
            process.env.JWT_SECRET || 'hemmelig',
            { expiresIn: '24h' }
        );

        res.json({ token, userId: user.userID, username: user.username });
    } catch (error) {
        console.error('❌ Fejl i /login:', error.message, error.stack);
        res.status(500).json({ message: 'Der skete en fejl ved login', error: error.message });
    }
});


    // === Ændre adgangskode ===
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

            const isValid = await bcrypt.compare(currentPassword, user.password);
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
