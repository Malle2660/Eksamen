document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('portfolioTableBody');
  const btnCreate = document.getElementById('createPortfolioBtn');
  const countEl = document.getElementById('overviewCount');
  const valueEl = document.getElementById('overviewTotalValue');
  const percentEl = document.getElementById('overviewChangePercent');
  const dkkChangeEl = document.getElementById('overviewChangeValue');
  const pieChartEl = document.getElementById('portfolioPieChart');
  const pieLegendEl = document.getElementById('portfolioPieLegend');
  const userId = window.USER_ID;

  let pieChart;

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
        updatePieChart([]);
        return;
      }

      portfolios.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.name}</td>
          <td>${p.bankAccount || '-'}</td>
          <td class="${(p.dailyChange || 0) >= 0 ? 'percent positive' : 'percent negative'}">
            ${(p.dailyChange || 0).toFixed(2)}%
          </td>
          <td>${(p.realizedGain || 0).toFixed(2)} DKK</td>
          <td>${(p.unrealizedGain || 0).toFixed(2)} DKK</td>
          <td>${(p.expectedValue || 0).toFixed(2)} DKK</td>
          <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString('da-DK') : '-'}</td>
        `;
        tableBody.appendChild(row);
      });

      updateMetrics(portfolios);
      updatePieChart(portfolios);
    } catch (err) {
      console.error('🚨 Kunne ikke hente porteføljer:', err);
      alert('Der opstod en fejl ved indlæsning af porteføljer.');
    }
  }

  function updateMetrics(portfolios) {
    const total = portfolios.reduce((sum, p) => sum + (p.expectedValue || 0), 0);
    const avgChange = portfolios.length
      ? portfolios.reduce((sum, p) => sum + (p.dailyChange || 0), 0) / portfolios.length
      : 0;
    const dkkChange = portfolios.length
      ? portfolios.reduce((sum, p) => sum + (p.unrealizedGain || 0), 0)
      : 0;

    countEl.textContent = portfolios.length;
    valueEl.textContent = `${total.toFixed(2)} DKK`;
    percentEl.textContent = `${avgChange.toFixed(2)}%`;
    dkkChangeEl.textContent = `${dkkChange.toFixed(2)} DKK`;
  }

  function updatePieChart(portfolios) {
    if (!pieChartEl) return;
    const labels = portfolios.map(p => p.name);
    const data = portfolios.map(p => p.expectedValue || 0);
    const colors = [
      '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
      '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
    ];

    if (pieChart) pieChart.destroy();

    pieChart = new Chart(pieChartEl, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
        }]
      },
      options: {
        plugins: {
          legend: { display: false }
        },
        cutout: '70%',
        responsive: false
      }
    });

    // Custom legend
    if (pieLegendEl) {
      pieLegendEl.innerHTML = labels.map((label, i) => `
        <li>
          <span style="display:inline-block;width:12px;height:12px;background:${colors[i % colors.length]};margin-right:8px;border-radius:2px;"></span>
          ${label} (${((data[i] / data.reduce((a, b) => a + b, 0)) * 100 || 0).toFixed(0)}%)
        </li>
      `).join('');
    }
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
