const API_BASE = '/api/dashboard';

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
  document.getElementById('totalValue').textContent =
    `${totalValue.toLocaleString('da-DK', { minimumFractionDigits: 2 })} DKK`;
  document.getElementById('realizedProfit').textContent =
    `${realized.toLocaleString('da-DK', { minimumFractionDigits: 2 })} DKK`;
  document.getElementById('unrealizedProfit').textContent =
    `${unrealized.toLocaleString('da-DK', { minimumFractionDigits: 2 })} DKK`;
}

function populateTable(tbodyId, data, key, limit = 5) {
  const tbody = document.getElementById(tbodyId);
  const showData = data.slice(0, limit);
  tbody.innerHTML = showData.map(item => `
    <tr>
      <td>${item.name || item.symbol || 'Ukendt'}</td>
      <td>${(item[key] || 0).toLocaleString('da-DK', { minimumFractionDigits: 2 })} DKK</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const metrics = await fetchJSON('/metrics');
    updateMetrics(metrics);

    const [topValue, topProfit] = await Promise.all([
      fetchJSON('/top/value'),
      fetchJSON('/top/profit')
    ]);

    populateTable('tableByValue', topValue, 'value');
    populateTable('tableByProfit', topProfit, 'profit');

    // "Se alle" knapper – viser hele listen
    document.querySelector('.table-container:nth-of-type(1) button').addEventListener('click', () => {
      populateTable('tableByValue', topValue, 'value', topValue.length);
    });

    document.querySelector('.table-container:nth-of-type(2) button').addEventListener('click', () => {
      populateTable('tableByProfit', topProfit, 'profit', topProfit.length);
    });

  } catch (err) {
    handleError(`❌ Fejl ved indlæsning af dashboard: ${err.message}`);
  }
});
