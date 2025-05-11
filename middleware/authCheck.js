module.exports = function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ message: 'Login påkrævet' });
};

// vi har brugt denne fil til at sikre at kun logget ind brugere som kan navigere rundt i vores portfolio applikation
// vi har gjort det globalt, så vi kan bruge det i alle vores routes 