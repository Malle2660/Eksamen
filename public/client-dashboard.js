// public/js/client-dashboard.js

const API_BASE = '/api/dashboard'; // peger på dine dashboard-API’er

function handleError(msg) {
  console.error(msg);
  alert(msg);
}

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include'
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Fejl på ${path}`);
  }
  return res.json();
}

function updateMetrics({ totalValue, realized, unrealized }) {
  document.getElementById('totalValue').textContent       = `${totalValue.toLocaleString('da-DK')} DKK`;
  document.getElementById('realizedProfit').textContent   = `${realized.toLocaleString('da-DK')} DKK`;
  document.getElementById('unrealizedProfit').textContent = `${unrealized.toLocaleString('da-DK')} DKK`;
}

function populateTable(tbodyId, data, key) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = data.map(item => `
    <tr>
      <td>${item.name || item.stockID}</td>
      <td>${item[key].toLocaleString('da-DK')}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1) Hent metrikker
    const metrics = await fetchJSON('/metrics');
    updateMetrics(metrics);

    // 2) Hent top 5 efter værdi og profit
    const [byValue, byProfit] = await Promise.all([
      fetchJSON('/top/value'),
      fetchJSON('/top/profit')
    ]);

    populateTable('tableByValue',  byValue,  'value');
    populateTable('tableByProfit', byProfit, 'profit');
  } catch (err) {
    handleError(`Fejl ved indlæsning af dashboard: ${err.message}`);
  }
});
