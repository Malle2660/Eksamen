// Simpel validering af login-input (email og password skal udfyldes)
// Returnerer false hvis et felt mangler – ellers true
// Der kan evt. tilføjes mere validering senere (fx regex på email)
function validateLogin({ email, password }) {
  if (!email || !password) return false;
  return true;
}

module.exports = { validateLogin }; 