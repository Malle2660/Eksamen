// Beregner den samlede værdi af en portefølje (antal * pris pr. aktie)
// Returnerer 0 hvis porteføljen er tom eller ugyldig
// Ignorerer ugyldige aktieobjekter uden antal eller pris
function calculatePortfolioValue(portfolio) {
    if (!Array.isArray(portfolio) || portfolio.length === 0) return 0;
    return portfolio.reduce((sum, item) => {
      if (!item || typeof item.antal !== 'number' || typeof item.pris !== 'number') return sum;
      return sum + (item.antal * item.pris);
    }, 0);
  }
  
  module.exports = { calculatePortfolioValue };
  