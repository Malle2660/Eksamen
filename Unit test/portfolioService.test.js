// Unit test for calculatePortfolioValue (beregner samlet værdi af en portefølje)
// Tester normale og fejlsituationer: gyldige data, tom portefølje, manglende felter, forkert inputtype
const { expect } = require('chai');
const { calculatePortfolioValue } = require('./portfolioService');

describe('calculatePortfolioValue', function () {
  it('should return correct total value for valid portfolio', function () {
    // Test med korrekt input: 3 AAPL á 1000 + 2 GOOG á 500 = 4000
    const portfolio = [
      { aktie: 'AAPL', antal: 3, pris: 1000 },
      { aktie: 'GOOG', antal: 2, pris: 500 }
    ];
    const result = calculatePortfolioValue(portfolio);
    expect(result).to.equal(3 * 1000 + 2 * 500);
  });

  it('should return 0 for empty array', function () {
    // Tom portefølje = 0
    const result = calculatePortfolioValue([]);
    expect(result).to.equal(0);
  });

  it('should return 0 for undefined input', function () {
    // Manglende input = 0
    const result = calculatePortfolioValue(undefined);
    expect(result).to.equal(0);
  });

  it('should ignore items with missing antal or pris', function () {
    // Kun den første aktie tæller med – de andre mangler antal/pris
    const portfolio = [
      { aktie: 'AAPL', antal: 3, pris: 1000 },
      { aktie: 'GOOG', antal: 2 }, 
      { aktie: 'MSFT', pris: 2000 }
    ];
    const result = calculatePortfolioValue(portfolio);
    expect(result).to.equal(3 * 1000);
  });

  it('should return 0 for non-array input', function () {
    // Forkert inputtype skal give 0
    const result = calculatePortfolioValue('not an array');
    expect(result).to.equal(0);
  });
});
