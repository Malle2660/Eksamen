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
  portfolios.forEach(p => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <a href="/portfolios/${p.portfolioID}" class="portfolio-link" data-id="${p.portfolioID}">
          ${p.name || '-'}
        </a>
      </td>
      <td>${p.bankAccount || '-'}</td>
      <td class="${(p.dailyChange || 0) >= 0 ? 'positive' : 'negative'}">
        ${(p.dailyChange || 0).toFixed(2)}%
      </td>
      <td>${p.lastTrade ? new Date(p.lastTrade).toLocaleString('da-DK') : '-'}</td>
      <td>${(p.expectedValue || 0).toLocaleString('da-DK')} DKK</td>
    `;
    tableBody.appendChild(row);
  });
});
