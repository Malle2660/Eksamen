// Samler dashboard-data og sikrer standardværdier, hvis noget mangler.
// Brugt til at vise saldo, transaktioner og samlet antal aktier. 
// Forhindrer fejl ved tomme eller ugyldige input.
function aggregateDashboardData({ saldo, transaktioner, aktier }) {
  return {
    samletSaldo: typeof saldo === 'number' ? saldo : 0,
    transaktioner: Array.isArray(transaktioner) ? transaktioner : [],
    aktier: Array.isArray(aktier) ? aktier : [],
    aktieAntal: Array.isArray(aktier) ? aktier.reduce((sum, a) => sum + (a.antal || 0), 0) : 0
  };
}

module.exports = { aggregateDashboardData };  