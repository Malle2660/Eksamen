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
    const valueBtn = document.querySelector('.table-container:nth-of-type(1) button');
    if (valueBtn) {
      valueBtn.addEventListener('click', () => {
        populateTable('tableByValue', topValue, 'value', topValue.length);
      });
    }

    const profitBtn = document.querySelector('.table-container:nth-of-type(2) button');
    if (profitBtn) {
      profitBtn.addEventListener('click', () => {
        populateTable('tableByProfit', topProfit, 'profit', topProfit.length);
      });
    }

  } catch (err) {
    handleError(`❌ Fejl ved indlæsning af dashboard: ${err.message}`);
  }
});
