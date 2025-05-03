// public/js/client-dashboard.js
const API_BASE = ''; // tom for relative calls

function handleError(msg) {
  console.error(msg);
  alert(msg);
}

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}/dashboard${path}`, {
    credentials: 'include'
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Fejl på ${path}`);
  }
  return res.json();
}

function updateMetrics({ totalValue, realized, unrealized }) {
  document.getElementById('totalValue').textContent       = `${totalValue.toLocaleString()} DKK`;
  document.getElementById('realizedProfit').textContent   = `${realized.toLocaleString()} DKK`;
  document.getElementById('unrealizedProfit').textContent = `${unrealized.toLocaleString()} DKK`;
}

function populateTable(tbodyId, data, key) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = data.map(item => `
    <tr>
      <td>${item.name || item.stockID}</td>
      <td>${item[key].toLocaleString()}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const userId = window.USER_ID;
  if (!userId) return handleError('Du er ikke logget ind');

  try {
    const metrics    = await fetchJSON(`/metrics/${userId}`);
    const [byValue, byProfit] = await Promise.all([
      fetchJSON(`/top/value/${userId}`),
      fetchJSON(`/top/profit/${userId}`)
    ]);

    updateMetrics(metrics);
    populateTable('tableByValue',  byValue,  'value');
    populateTable('tableByProfit', byProfit, 'profit');
  } catch (err) {
    handleError(`Fejl ved indlæsning af dashboard: ${err.message}`);
  }
});
