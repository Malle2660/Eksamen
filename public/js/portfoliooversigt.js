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
  const valueEl = document.getElementById('totalValue');
  const percentEl = document.getElementById('overviewChangePercent');
  const dkkChangeEl = document.getElementById('overviewChangeValue');
  const pieChartEl = document.getElementById('portfolioPieChart');
  const pieLegendEl = document.getElementById('portfolioPieLegend');
  const userId = window.USER_ID;

  let pieChart;
  let currentPortfolioId = null;


  async function loadPortfolios() {
    try {
      const res = await fetch('/portfolios/user', { credentials: 'include' });
      const portfolios = await res.json();

      // Gem portefølje-id'er i sessionStorage
      const portfolioIds = portfolios.map(p => p.portfolioID);
      sessionStorage.setItem('portfolioIds', JSON.stringify(portfolioIds));

      if (!Array.isArray(portfolios) || portfolios.length === 0) {
        if (tableBody) {
          tableBody.innerHTML = `<tr><td colspan="11">Ingen porteføljer endnu</td></tr>`;
        }
        if (countEl) countEl.textContent = '0';
        if (valueEl) valueEl.textContent = '0.00 DKK';
        if (percentEl) percentEl.textContent = '0.00%';
        if (dkkChangeEl) dkkChangeEl.textContent = '0.00 DKK';
        return;
      }

      tableBody.innerHTML = '';

      for (const p of portfolios) {
        // Hent ekstra data for porteføljen
        const [totalPurchase, totalUnrealized] = await Promise.all([
          fetch(`/portfolios/${p.portfolioID}/total-purchase`).then(r => r.json()).then(d => d.totalPurchase),
          fetch(`/portfolios/${p.portfolioID}/total-unrealized`).then(r => r.json()).then(d => d.totalUnrealized)
        ]);

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <a href="/portfolios/${p.portfolioID}" class="portfolio-link" data-id="${p.portfolioID}">
              ${p.name || '-'}
            </a>
          </td>
          <td>${totalPurchase !== undefined ? totalPurchase.toFixed(2) + ' DKK' : '-'}</td>
          <td>${p.expectedValue !== undefined ? p.expectedValue.toFixed(2) + ' DKK' : '-'}</td>
          <td>${totalUnrealized !== undefined ? totalUnrealized.toFixed(2) + ' DKK' : '-'}</td>
          <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString('da-DK') : '-'}</td>
          <td><button class="tilfoj-aktie-btn" data-id="${p.portfolioID}">Tilføj aktie</button></td>
          <td><button class="vis-aktier-btn" data-id="${p.portfolioID}">Vis aktier</button></td>
          <td><button class="slet-portfolio-btn" data-id="${p.portfolioID}">Slet</button></td>
        `;
        tableBody.appendChild(row);
      }

      // Bind knapper EFTER tabellen er genereret!
      document.querySelectorAll('.tilfoj-aktie-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const portfolioId = btn.getAttribute('data-id');
          showAddStockForm(portfolioId);
        });
      });
      document.querySelectorAll('.vis-aktier-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const portfolioId = btn.getAttribute('data-id');
          await showStocksForPortfolio(portfolioId);
        });
      });
      document.querySelectorAll('.slet-portfolio-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const portfolioId = btn.getAttribute('data-id');
          if (confirm('Er du sikker på, at du vil slette denne portefølje?')) {
            try {
              const res = await fetch(`/portfolios/${portfolioId}`, { method: 'DELETE' });
              const data = await res.json();
              if (res.ok) {
                showNotification('Portefølje slettet!', 'success');
                loadPortfolios();
              } else {
                showNotification(data.message || 'Kunne ikke slette portefølje', 'error');
              }
            } catch (err) {
              showNotification('Fejl ved sletning', 'error');
            }
          }
        });
      });

      updateMetrics(portfolios);
      updatePieChart(portfolios);

      sessionStorage.setItem('portfolios', JSON.stringify(portfolios));
    } catch (err) {
      console.error('Kunne ikke hente porteføljer:', err);
      showNotification('Der opstod en fejl ved indlæsning af porteføljer.', 'error');
      if (countEl) countEl.textContent = 'Fejl';
      if (valueEl) valueEl.textContent = 'Fejl';
      if (percentEl) percentEl.textContent = 'Fejl';
      if (dkkChangeEl) dkkChangeEl.textContent = 'Fejl';
    }
  }

  async function showStocksForPortfolio(portfolioId) {
    try {
      const res = await fetch(`/portfolios/${portfolioId}/stocks`);
      const stocks = await res.json();
      if (!Array.isArray(stocks) || stocks.length === 0) {
        showNotification('Ingen aktier i denne portefølje.', 'info');
        return;
      }
      // Saml aktier med samme symbol
      const grouped = {};
      for (const s of stocks) {
        if (!grouped[s.symbol]) grouped[s.symbol] = { ...s, amount: 0, totalBuy: 0 };
        grouped[s.symbol].amount += s.amount;
        grouped[s.symbol].totalBuy += s.amount * s.bought_at;
      }
      // Byg rækker med beregninger
      const rows = await Promise.all(Object.values(grouped).map(async s => {
        // GAK
        const gak = s.amount ? s.totalBuy / s.amount : 0;
        // Forventet værdi
        let expectedValue = '-';
        let price = 0;
        try {
          const quoteRes = await fetch(`/api/alpha-vantage/${s.symbol}`);
          const quote = await quoteRes.json();
          if (quote && quote.price) {
            price = quote.price;
            expectedValue = (s.amount * price).toFixed(2) + ' DKK';
          }
        } catch (e) { expectedValue = '-'; }
        // Urealiseret gevinst/tab
        const unrealized = price ? (s.amount * (price - gak)) : 0;
        return `
          <tr>
            <td>${s.symbol}</td>
            <td>${s.amount}</td>
            <td>${s.totalBuy.toFixed(2)} DKK</td>
            <td>${gak.toFixed(2)} DKK</td>
            <td>${expectedValue}</td>
            <td style="color:${unrealized >= 0 ? 'green' : 'red'}">${unrealized.toFixed(2)} DKK</td>
          </tr>
        `;
      }));
      // Modal HTML
      let modal = document.getElementById('stocksModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'stocksModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.5)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        document.body.appendChild(modal);
      }
      modal.innerHTML = `
        <div style="background:#fff;padding:2rem;border-radius:8px;min-width:600px;max-width:90vw;max-height:80vh;overflow:auto;box-shadow:0 2px 16px #0002;">
          <h2>Aktier i portefølje</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f5f5f5">
              <th>Symbol</th><th>Antal</th><th>Købspris</th><th>GAK</th><th>Forventet værdi</th><th>Urealiseret gevinst/tab</th>
            </tr>
            ${rows.join('')}
          </table>
          <button id="closeStocksModal" style="margin-top:1rem;float:right;">Luk</button>
        </div>
      `;
      modal.style.display = 'flex';
      document.getElementById('closeStocksModal').onclick = () => {
        modal.style.display = 'none';
      };
    } catch (err) {
      showNotification('Kunne ikke hente aktier for porteføljen.', 'error');
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

    if (countEl) countEl.textContent = portfolios.length;
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
    document.getElementById('addStockForm').style.display = 'flex';
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
      // 1. Hent aktiekurs fra din Alpha Vantage API
      const stockRes = await fetch(`/api/alpha-vantage/${symbol}`);
      if (!stockRes.ok) throw new Error('Kunne ikke hente aktiekurs');
      const stockData = await stockRes.json();

      // 2. Hent valutakurs fra din Exchange Rate API (fx DKK)
      const currency = 'DKK'; // eller lad brugeren vælge
      let rate = 1;
      if (currency !== 'DKK') {
        const rateRes = await fetch(`/api/exchange-rate/${currency}`);
        const rateData = await rateRes.json();
        rate = rateData.rate || rateData[currency] || 'ukendt';
      }

      // 3. Brug dataene (fx vis dem, eller brug dem til at beregne noget)
      alert(
        `Aktuel kurs for ${symbol}: ${stockData.price || stockData.c || 'ukendt'}\n` +
        `Valutakurs (${currency}): ${rate}`
      );

      // 4. Tilføj aktien til porteføljen (POST til din egen backend)
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
      document.getElementById('stockSymbol').value = '';
      document.getElementById('stockAmount').value = '';
      document.getElementById('stockPrice').value = '';
      loadPortfolios();
    } catch (err) {
      showNotification('Kunne ikke tilføje aktien: ' + err.message, 'error');
    }
  });

  sessionStorage.setItem('userId', userId);

  loadPortfolios();

  const backBtn = document.getElementById('back-to-dashboard-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard';
    });
  }
});

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('portfolio-link')) {
    e.preventDefault();
    const portfolioId = e.target.dataset.id;
    window.location.href = `/portfolios/${portfolioId}`;
  }
});
