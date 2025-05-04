document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('portfolioTableBody');
  const btnCreate = document.getElementById('createPortfolioBtn');
  const countEl = document.getElementById('overviewCount');
  const valueEl = document.getElementById('overviewTotalValue');
  const percentEl = document.getElementById('overviewChangePercent');
  const dkkChangeEl = document.getElementById('overviewChangeValue');

  const userId = window.USER_ID;

  async function loadPortfolios() {
    try {
      const res = await fetch(`/portfolios/user/${userId}`);
      const portfolios = await res.json();
      tableBody.innerHTML = '';

      if (portfolios.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="7">Ingen porteføljer endnu</td>`;
        tableBody.appendChild(row);
        updateMetrics([]);
        return;
      }

      portfolios.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.name}</td>
          <td>${(p.expectedValue || 0).toFixed(2)} DKK</td>
          <td>${(p.unrealizedGain || 0).toFixed(2)} DKK</td>
          <td>${(p.realizedGain || 0).toFixed(2)} DKK</td>
          <td>${(p.unrealizedGain || 0).toFixed(2)} DKK</td>
          <td>${(p.expectedValue || 0).toFixed(2)} DKK</td>
          <td>${new Date(p.createdAt).toLocaleDateString('da-DK')}</td>
        `;
        row.addEventListener('click', () => buyStockFlow(p.portfolioID));
        tableBody.appendChild(row);
      });

      updateMetrics(portfolios);
    } catch (err) {
      console.error('🚨 Kunne ikke hente porteføljer:', err);
      alert('Der opstod en fejl ved indlæsning af porteføljer.');
    }
  }

  function updateMetrics(portfolios) {
    const total = portfolios.reduce((sum, p) => sum + (p.expectedValue || 0), 0);
    const avgChange = portfolios.length
      ? portfolios.reduce((sum, p) => sum + (p.unrealizedGain || 0), 0) / portfolios.length
      : 0;
    const dkkChange = avgChange;

    countEl.textContent = portfolios.length;
    valueEl.textContent = `${total.toFixed(2)} DKK`;
    percentEl.textContent = `${avgChange.toFixed(2)}%`;
    dkkChangeEl.textContent = `${dkkChange.toFixed(2)} DKK`;
  }

  async function buyStockFlow(portfolioId) {
    const symbol = prompt('Indtast aktiesymbol (f.eks. AAPL):');
    const amount = prompt('Antal aktier:');
    const boughtAt = prompt('Pris pr. aktie (DKK):');

    if (!symbol || !amount || !boughtAt) {
      alert('Alle felter skal udfyldes');
      return;
    }

    try {
      const res = await fetch(`/portfolios/${portfolioId}/add-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, amount, boughtAt })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message || '✅ Aktie tilføjet!');
      loadPortfolios();
    } catch (err) {
      console.error('🚨 Fejl ved tilføjelse af aktie:', err);
      alert('Kunne ikke tilføje aktien: ' + err.message);
    }
  }

  btnCreate.addEventListener('click', async () => {
    const name = prompt('Navn på portefølje:');
    const accountId = prompt('Konto-ID (fx 1, 2, 3):');

    if (!name || !accountId) {
      alert('Du skal udfylde både navn og konto-ID.');
      return;
    }

    try {
      const res = await fetch('/portfolios/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, accountId })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Noget gik galt');
        return;
      }

      alert('✅ Portefølje oprettet');
      loadPortfolios();
    } catch (err) {
      console.error('🚨 Fejl ved oprettelse:', err);
      alert('Kunne ikke oprette porteføljen');
    }
  });

  loadPortfolios();
});
