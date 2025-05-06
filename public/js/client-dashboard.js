console.log("test bror");
const API_BASE = '/api/dashboard';

function handleError(msg) {
  console.error(msg);
  alert(msg);
}

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include'
  });

  let body = {};
  try {
    body = await res.json();
  } catch (_) {
    throw new Error(`Ugyldigt JSON fra ${path}`);
  }

  if (!res.ok) {
    throw new Error(body.message || `Fejl på ${path}`);
  }

  return body;
}

function updateMetrics({ totalValue, realized, unrealized }) {
  const totalValueEl = document.getElementById('totalValue');
  const realizedProfitEl = document.getElementById('realizedProfit');
  const unrealizedProfitEl = document.getElementById('unrealizedProfit');

  if (totalValueEl)
    totalValueEl.textContent = `${totalValue.toLocaleString('da-DK', { minimumFractionDigits: 2 })} DKK`;
  if (realizedProfitEl)
    realizedProfitEl.textContent = `${realized.toLocaleString('da-DK', { minimumFractionDigits: 2 })} DKK`;
  if (unrealizedProfitEl)
    unrealizedProfitEl.textContent = `${unrealized.toLocaleString('da-DK', { minimumFractionDigits: 2 })} DKK`;
}

function populateTable(tbodyId, data, key, limit = 5) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const showData = data.slice(0, limit);
  tbody.innerHTML = showData.map(item => `
    <tr>
      <td>${item.name || item.symbol || 'Ukendt'}</td>
      <td>${(item[key] || 0).toLocaleString('da-DK', { minimumFractionDigits: 2 })} DKK</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Hent porteføljer fra backend
  let portfolios = [];
  try {
    const res = await fetch('/portfolios/user');
    portfolios = await res.json();
  } catch (err) {
    document.getElementById('totalValue').textContent = 'Fejl!';
    return;
  }

  // Beregn total værdi, ændringer osv. ud fra API-data
  const totalValue = portfolios.reduce((sum, p) => sum + (p.expectedValue || 0), 0);
  const avgChange = portfolios.length
    ? portfolios.reduce((sum, p) => sum + (p.dailyChange || 0), 0) / portfolios.length
    : 0;

  // Opdater DOM
  document.getElementById('totalValue').textContent = totalValue.toLocaleString('da-DK') + ' DKK';
  document.getElementById('overviewChangePercent').textContent = avgChange.toFixed(2) + '%';

  // ...opdater evt. flere felter og pie chart...

  const tableBody = document.getElementById('portfolioTableBody');
  tableBody.innerHTML = '';
  for (const portfolio of portfolios) {
    const stocks = await Portfolio.getStocksForPortfolio(portfolio.portfolioID);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <a href="/portfolios/${portfolio.portfolioID}" class="portfolio-link" data-id="${portfolio.portfolioID}">
          ${portfolio.name || '-'}
        </a>
      </td>
      <td>${portfolio.bankAccount || '-'}</td>
      <td class="${(portfolio.dailyChange || 0) >= 0 ? 'positive' : 'negative'}">
        ${(portfolio.dailyChange || 0).toFixed(2)}%
      </td>
      <td>${portfolio.lastTrade ? new Date(portfolio.lastTrade).toLocaleString('da-DK') : '-'}</td>
      <td>${(portfolio.expectedValue || 0).toLocaleString('da-DK')} DKK</td>
    `;
    tableBody.appendChild(row);
  }

  const stocks = await require('../models/stock').getAllForPortfolio(p.portfolioID);
  allStocks = allStocks.concat(stocks.map(s => ({ ...s, portfolioID: p.portfolioID })));

  console.log('allStocks:', allStocks);
  const stockIds = allStocks.map(s => s.stockID).filter(Boolean);
  console.log('stockIds:', stockIds);

  // Efter du har hentet porteføljer fra backend:
  const labels = portfolios.map(p => p.name);
  const data = portfolios.map(p => p.expectedValue || 0);

  const ctx = document.getElementById('portfolioPie').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7'
        ]
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  updateChart(portfolios);
  await loadValueHistory();
});

function updateChart(newPortfolios) {
  chart.data.labels = newPortfolios.map(p => p.name);
  chart.data.datasets[0].data = newPortfolios.map(p => p.expectedValue || 0);
  chart.update();
}

async function loadValueHistory() {
  try {
    const data = await fetchJSON('/history'); // eller '/api/dashboard/history'
    // data = [{ date: '2024-05-01', value: 12345 }, ...]
    renderValueChart(data);
  } catch (err) {
    console.error('Kunne ikke hente grafdata:', err);
  }
}

function renderValueChart(history) {
  const ctx = document.getElementById('totalValueChart').getContext('2d');
  const labels = history.map(point => point.date);
  const values = history.map(point => point.value);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Samlet værdi',
        data: values,
        borderColor: '#4e79a7',
        backgroundColor: 'rgba(78,121,167,0.1)',
        tension: 0.4,
        pointRadius: 0,
        fill: true
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => value.toLocaleString('da-DK') + ' DKK'
          }
        }
      }
    }
  });
}
