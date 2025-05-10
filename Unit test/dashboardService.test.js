// Unit test af dashboard-funktionen aggregateDashboardData
// Tester forskellige scenarier, korrekt data, tomme arrays, manglede input og akiter unden tal
// Sikrer at funktionen altid returnerer stabile og forventede værdier til dashboardet
const { expect } = require('chai');
const { aggregateDashboardData } = require('./dashboardService');

describe('aggregateDashboardData', function () {
  it('should aggregate all dashboard data correctly', function () {
    // Setup: almindeligt input med saldo, 2 transaktioner og 2 aktier
    const input = {
      saldo: 5000,
      transaktioner: [ { id: 1, type: 'køb' }, { id: 2, type: 'salg' } ],
      aktier: [ { navn: 'AAPL', antal: 3 }, { navn: 'GOOG', antal: 2 } ]
    };
    // Exercise: kør funktionen med inputtet
    const result = aggregateDashboardData(input);
    // Verify: sikre at outputtet er korrekt
    expect(result.samletSaldo).to.equal(5000);
    expect(result.transaktioner).to.have.lengthOf(2);
    expect(result.aktier).to.have.lengthOf(2);
    expect(result.aktieAntal).to.equal(5);
  });

  it('should handle empty datasets', function () {
    // Test med tomme lister - skal stadig virke og returnere 0/tomme arrays
    const input = { saldo: 0, transaktioner: [], aktier: [] };
    const result = aggregateDashboardData(input);
    expect(result.samletSaldo).to.equal(0);
    expect(result.transaktioner).to.be.an('array').that.is.empty;
    expect(result.aktier).to.be.an('array').that.is.empty;
    expect(result.aktieAntal).to.equal(0);
  });

  it('should handle missing or partial data', function () {
    // Test med manglede saldo og transaktioner - kun aktier med antal
    const input = { saldo: undefined, transaktioner: undefined, aktier: [ { navn: 'AAPL', antal: 2 } ] };
    const result = aggregateDashboardData(input);
    expect(result.samletSaldo).to.equal(0);
    expect(result.transaktioner).to.be.an('array').that.is.empty;
    expect(result.aktier).to.have.lengthOf(1);
    expect(result.aktieAntal).to.equal(2);
  });

  it('should handle aktier with missing antal', function () {
    // Test hvor én aktie mangler antal – skal tolkes som 0
    const input = { saldo: 100, transaktioner: [], aktier: [ { navn: 'AAPL' }, { navn: 'GOOG', antal: 1 } ] };
    const result = aggregateDashboardData(input);
    expect(result.aktieAntal).to.equal(1);
  });
}); 