
// 1) Funktion til at hente og opdatere KPI'er på dashboardet
async function updateMetrics() {
  try {
    // Send GET-forespørgsel til metrics-endpointet for at hente porteføljens nøgletal
    const res = await fetch('/dashboard/metrics');
    if (!res.ok) throw new Error(res.statusText); // Tjek for HTTP-fejl

    // Parse JSON-svaret. Feltnavne skal matche serverens JSON:
    const { totalValue, realized, unrealized } = await res.json();
    // totalValue = samlet værdi i USD
    // realized = realiseret gevinst i USD
    // unrealized = urealiseret (uoptjent) gevinst i USD

    // Opdater visningen i dashboardets <div>-elementer med to decimaler
    document.getElementById('totalValue').textContent    = totalValue.toFixed(2) + ' USD';
    document.getElementById('realizedProfit').textContent = realized.toFixed(2) + ' USD';
    document.getElementById('unrealizedProfit').textContent = unrealized.toFixed(2) + ' USD';
  } catch (err) {
    console.error('Failed to update metrics:', err); // Log netværks- eller parse-fejl
  }
}

// 2) Funktion til at hente historik-data (serie af {date, value}) fra servers history-endpoint
// days-param bestemmer antallet af dage tilbage (standard 10)
async function fetchHistory(days = 10) {
  try {
    // Byg URL med query-parameter for antal dage
    const res = await fetch(`/dashboard/history?days=${days}`);
    if (!res.ok) throw new Error(res.statusText);

    // Returner array af objekter med form { date: 'YYYY-MM-DD', value: tal }
    const history = await res.json();
    return history;
  } catch (err) {
    console.error('Failed to fetch history:', err);
    return []; // Ved fejl returner tom liste for at undgå programnedbrud
  }
}

// 3) Funktion til at opdatere en eksisterende Chart.js-graf med nye historikdata
async function updateChartData() {
  if (!window.dashboardChart) return; // Spring, hvis grafen ikke er oprettet endnu
  try {
    const history = await fetchHistory(); // Hent ny historik
    // Opdater grafens akser og datapunkter
    window.dashboardChart.data.labels   = history.map(h => h.date);
    window.dashboardChart.data.datasets[0].data = history.map(h => h.value);
    window.dashboardChart.update(); // Rerender grafen
  } catch (err) {
    console.error('Failed to update chart:', err);
  }
}

// 4) Initialisering: kør når DOM'en er færdigindlæst
// Dette afsnit opretter grafen og starter auto-opdatering
// Derudover starter updateMetrics med det samme og hver 60. sekund
document.addEventListener('DOMContentLoaded', async () => {
  // 4a) Opdater KPI'er straks og sæt interval til at køre hver 60.000 ms
  updateMetrics();
  setInterval(updateMetrics, 60_000);

  // 4b) Find grafens <canvas>-element. Hvis det ikke findes, stopper vi her
  const canvas = document.getElementById('totalValueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'); // 2D-tegnekontekst for Chart.js

  // 4c) Hent initial historik og forbered labels/data
  const history = await fetchHistory();
  const labels = history.map(h => h.date); // Datoer på X-aksen
  const data   = history.map(h => h.value);  // Værdier på Y-aksen

  // 4d) Opret Chart.js-linje-graf og gem i global variabel for senere opdatering
  window.dashboardChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{
      label: 'Samlet værdi (USD)',
      data,
      borderColor: '#4e79a7',
      backgroundColor: 'rgba(78,121,167,0.1)',
      tension: 0.4,
      pointRadius: 3,
      fill: true
    }]},
    options: {
      plugins: { legend: { labels: { color: '#fff' } } },
      scales: {
        x: { ticks: { color: '#C3C3C1' } },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#C3C3C1',
            callback(value) {
              // Hvis tallet er >= 1000, vises det som f.eks. '1,5k' for overskuelighed
              return value >= 1000
                ? (value/1000).toLocaleString('da-DK',{minimumFractionDigits:1}) + 'k'
                : value.toLocaleString('da-DK');
            }
          }
        }
      }
    }
  });

  // 4e) Start auto-opdatering af grafen hvert 60. sekund
  setInterval(updateChartData, 60_000);
});
