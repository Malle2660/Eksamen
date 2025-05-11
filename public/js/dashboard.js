// public/js/dashboard.js

// Henter historik-data fra backend
async function fetchHistory() {
  try {
    const res = await fetch('/dashboard/history');
    if (!res.ok) throw new Error(res.statusText);
    const history = await res.json();
    console.log('[dashboard] history data:', history);
    return history;
  } catch (err) {
    console.error('[dashboard] fetchHistory failed:', err);
    return [];
  }
}

// Tilføj nederst i filen, før init:
function groupByMonth(history) {
  // Sørg for stigende dato
  history.sort((a,b) => new Date(a.date) - new Date(b.date));
  const map = new Map();
  history.forEach(({ date, value }) => {
    const monthLabel = new Date(date).toLocaleString('default', { month: 'short' });
    map.set(monthLabel, value);
  });
  return map;
}

// Opdaterer grafens data
async function updateChartData() {
  try {
    const history = await fetchHistory();
    if (!dashboardChart) return;
    const monthMap = groupByMonth(history);
    const labels = Array.from(monthMap.keys());
    const data = Array.from(monthMap.values());
    dashboardChart.data.labels = labels;
    dashboardChart.data.datasets[0].data = data;
    dashboardChart.update();
  } catch (err) {
    console.error('[dashboard] updateChartData failed:', err);
  }
}

// Henter og opdaterer metrics
async function updateMetrics() {
  try {
    const res = await fetch('/dashboard/metrics');
    if (!res.ok) throw new Error(res.statusText);
    const m = await res.json();
    document.getElementById('totalValue').textContent    = m.totalValue.toFixed(2) + ' USD';
    document.getElementById('realizedProfit').textContent = m.realized.toFixed(2) + ' USD';
    document.getElementById('unrealizedProfit').textContent = m.unrealized.toFixed(2) + ' USD';
  } catch (err) {
    console.error('[dashboard] updateMetrics failed:', err);
  }
}

let dashboardChart;

// Initialiserer graf og metrics når siden er loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Metrics
  updateMetrics();
  setInterval(updateMetrics, 60_000);

  // Chart
  const canvas = document.getElementById('totalValueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  try {
    const history = await fetchHistory();
    const monthMap = groupByMonth(history);
    const labels = Array.from(monthMap.keys());
    const data = Array.from(monthMap.values());

    dashboardChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Samlet værdi (USD)',
          data,
          borderColor: '#4e79a7',
          backgroundColor: 'rgba(78,121,167,0.1)',
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#fff',
          fill: true
        }]
      },
      options: {
        plugins: {
          legend: {
            display: true,
            labels: { color: '#fff' }
          }
        },
        scales: {
          x: { ticks: { color: '#C3C3C1' } },
          y: {
            ticks: {
              color: '#C3C3C1',
              callback(value) {
                if (Math.abs(value) >= 1000) {
                  return (value/1000).toLocaleString('da-DK',{minimumFractionDigits:1,maximumFractionDigits:1}) + 'k';
                }
                return value.toLocaleString('da-DK');
              }
            },
            beginAtZero: true
          }
        }
      }
    });

    setInterval(updateChartData, 60_000);
  } catch (err) {
    console.error('[dashboard] chart init failed:', err);
  }
}); 