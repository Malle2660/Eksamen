// Unit test for validateLogin-funktionen (tjekker om både email og password er angivet)
// Vi tester både korrekt input og forskellige fejl-scenarier med manglende eller tomme felter
const { expect } = require('chai');
const { validateLogin } = require('./loginService.js');

describe('validateLogin', function () {
  it('should return true for valid email and password', function () {
    // Positiv test: begge felter udfyldt korrekt
    const result = validateLogin({ email: 'test@example.com', password: 'secret' });
    expect(result).to.be.true;
  });

  it('should return false if email is missing', function () {
    // Manglende email
    const result = validateLogin({ password: 'secret' });
    expect(result).to.be.false;
  });

  it('should return false if password is missing', function () {
    // Manglende password
    const result = validateLogin({ email: 'test@example.com' });
    expect(result).to.be.false;
  });

  it('should return false if both are missing', function () {
    // Ingen data sendt ind
    const result = validateLogin({});
    expect(result).to.be.false;
  });

  it('should return false if email is empty string', function () {
    // Email er tom streng
    const result = validateLogin({ email: '', password: 'secret' });
    expect(result).to.be.false;
  });

  it('should return false if password is empty string', function () {
    // Password er tom streng
    const result = validateLogin({ email: 'test@example.com', password: '' });
    expect(result).to.be.false;
  });
});