console.log("Portfoliooversigt.js loaded");
function showNotification(message, type = 'success', timeout = 3000) {
  const notif = document.getElementById('notification');
  notif.textContent = message;
  notif.className = `notification ${type}`;
  notif.style.display = 'block';
  setTimeout(() => {
    notif.style.display = 'none';
  }, timeout);
}

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('portfolioTableBody');
  const btnCreate = document.getElementById('createPortfolioBtn');
  const nameInput = document.getElementById('newPortfolioName');
  const accountInput = document.getElementById('newPortfolioAccount');
  const countEl = document.getElementById('overviewCount');
  const valueEl = document.getElementById('overviewTotalValue');
  const percentEl = document.getElementById('overviewChangePercent');
  const dkkChangeEl = document.getElementById('overviewChangeValue');
  const pieChartEl = document.getElementById('portfolioPieChart');
  const pieLegendEl = document.getElementById('portfolioPieLegend');
  const userId = window.USER_ID;

  let pieChart;
  let currentPortfolioId = null;

  async function loadPortfolios() {
    try {
      const res = await fetch(`/portfolios/user`);
      const portfolios = await res.json();
      tableBody.innerHTML = '';

      if (!Array.isArray(portfolios) || portfolios.length === 0) {
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
          <td>${p.name || '-'}</td>
          <td>${p.expectedValue !== undefined ? p.expectedValue.toFixed(2) + ' DKK' : '-'}</td>
          <td class="${(p.dailyChange || 0) >= 0 ? 'percent positive' : 'percent negative'}">
            ${(p.dailyChange || 0).toFixed(2)}%
          </td>
          <td>${(p.realizedGain || 0).toFixed(2)} DKK</td>
          <td>${(p.unrealizedGain || 0).toFixed(2)} DKK</td>
          <td>${(p.expectedValue || 0).toFixed(2)} DKK</td>
          <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString('da-DK') : '-'}</td>
          <td><button class="add-stock-btn" data-id="${p.portfolioID}">Tilføj aktie</button></td>
        `;
        tableBody.appendChild(row);
      });

      updateMetrics(portfolios);
      updatePieChart(portfolios);

      document.querySelectorAll('.add-stock-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const portfolioId = btn.getAttribute('data-id');
          showAddStockForm(portfolioId);
        });
      });
    } catch (err) {
      console.error('🚨 Kunne ikke hente porteføljer:', err);
      showNotification('Der opstod en fejl ved indlæsning af porteføljer.', 'error');
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

  btnCreate.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const accountId = accountInput.value.trim();

    if (!name || !accountId) {
      showNotification('Du skal udfylde både navn og konto-ID.', 'error');
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
        showNotification(data.message || 'Noget gik galt', 'error');
        return;
      }

      showNotification('✅ Portefølje oprettet', 'success');
      nameInput.value = '';
      accountInput.value = '';
      loadPortfolios();
    } catch (err) {
      console.error('🚨 Fejl ved oprettelse:', err);
      showNotification('Kunne ikke oprette porteføljen', 'error');
    }
  });

  function showAddStockForm(portfolioId) {
    currentPortfolioId = portfolioId;
    document.getElementById('addStockForm').style.display = 'block';
  }

  document.getElementById('cancelStockBtn').addEventListener('click', () => {
    document.getElementById('addStockForm').style.display = 'none';
  });

  document.getElementById('submitStockBtn').addEventListener('click', async () => {
    const symbol = document.getElementById('stockSymbol').value.trim();
    const amount = document.getElementById('stockAmount').value.trim();
    const boughtAt = document.getElementById('stockPrice').value.trim();

    if (!symbol || !amount || !boughtAt) {
      showNotification('Alle felter skal udfyldes', 'error');
      return;
    }

    try {
      const res = await fetch(`/portfolios/${currentPortfolioId}/add-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, amount, boughtAt })
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.message || 'Noget gik galt', 'error');
        return;
      }

      showNotification('✅ Aktie tilføjet!', 'success');
      document.getElementById('addStockForm').style.display = 'none';
      // Ryd felter
      document.getElementById('stockSymbol').value = '';
      document.getElementById('stockAmount').value = '';
      document.getElementById('stockPrice').value = '';
      loadPortfolios();
    } catch (err) {
      showNotification('Kunne ikke tilføje aktien', 'error');
    }
  });

  loadPortfolios();
});
