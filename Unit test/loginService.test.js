// Unit test for validateLogin-funktionen (tjekker om både email og password er angivet)
// Vi tester både korrekt input og fejl-scenarier med manglende eller tomme felter
const { expect } = require('chai');
const { validateLogin } = require('./loginService.js');

describe('validateLogin', function () {
  it('should return true for valid email and password', function () {
    // happy-path-test: begge felter udfyldt korrekt
    const result = validateLogin({ email: 'test@example.com', password: 'secret' });
    expect(result).to.be.true;
  });

  it('should return false if email is missing', function () {
    // sad-path-test: mangler email
    const result = validateLogin({ password: 'secret' });
    expect(result).to.be.false;
  });
});
