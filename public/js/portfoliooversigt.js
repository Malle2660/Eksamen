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
  let currentPrice = 0;

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
            <a href="/portfolios/${p.portfolioID}" class="portfolio-link" data-id="${p.portfolioID}" style="color:#a48cff;font-weight:600;cursor:pointer;">
              ${p.name || '-'}
            </a>
          </td>
          <td>${(typeof p.value === 'number' ? p.value.toFixed(2) : '0.00')} DKK</td>
          <td>${(typeof p.dailyChange === 'number' ? p.dailyChange.toFixed(2) : '0.00')} DKK</td>
          <td>${(typeof p.realizedGain === 'number' ? p.realizedGain.toFixed(2) : '0.00')} DKK</td>
          <td>${(typeof p.unrealizedGain === 'number' ? p.unrealizedGain.toFixed(2) : '-')}</td>
          <td>${(typeof p.expectedValue === 'number' ? p.expectedValue.toFixed(2) : '-')}</td>
          <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</td>
          <td>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary tilfoj-aktie-btn" data-id="${p.portfolioID}">Tilføj aktie</button>
              <button class="btn btn-secondary vis-aktier-btn" data-id="${p.portfolioID}">Vis aktier</button>
            </div>
          </td>
          <td>
            <button class="btn btn-danger slet-portfolio-btn" data-id="${p.portfolioID}">Slet</button>
          </td>
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
      const res = await fetch(`/portfolios/${portfolioId}/holdings`);
      const holdings = await res.json();
      if (!Array.isArray(holdings) || holdings.length === 0) {
        showNotification('Ingen aktier i denne portefølje.', 'info');
        return;
      }
      // Byg rækker med beregninger (samme som GrowthTech)
      const rows = holdings.map(s => `
        <tr>
          <td>${s.symbol}</td>
          <td>${s.amount}</td>
          <td>${s.price ? s.price.toFixed(2) : '-'} DKK</td>
          <td>${s.value ? s.value.toFixed(2) : '-'} DKK</td>
        </tr>
      `);
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
              <th>Symbol</th><th>Antal</th><th>Markedspris</th><th>Værdi</th>
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

  // Åbn modal
  async function showAddStockForm(portfolioId) {
    currentPortfolioId = portfolioId;
    document.getElementById('addStockForm').style.display = 'flex';

    // Hent konti og fyld dropdown
    const res = await fetch('/accounts/api');
    const accounts = await res.json();
    const select = document.getElementById('accountSelect');
    select.innerHTML = accounts
      .filter(acc => !acc.closedAccount)
      .map(acc => `<option value="${acc.accountID}">${acc.name} (${acc.balance.toFixed(2)} DKK)</option>`)
      .join('');
    // Sæt default aktie og hent pris
    document.getElementById('stockSelect').dispatchEvent(new Event('change'));
  }

  // Luk modal
  document.getElementById('cancelStockBtn').addEventListener('click', () => {
    document.getElementById('addStockForm').style.display = 'none';
  });

  // Når aktie vælges, hent markedspris
  document.getElementById('stockSelect').addEventListener('change', async function() {
    const symbol = this.value;
    const unitPriceInput = document.getElementById('unitPrice');
    unitPriceInput.value = 'Henter…';
    try {
      const res = await fetch(`/portfolios/api/stock-price/${symbol}`);
      const data = await res.json();
      if (data && typeof data.price === 'number' && data.price > 0) {
        currentPrice = data.price;
        updatePriceFields();
      } else {
        currentPrice = 0;
        unitPriceInput.value = '-';
        document.getElementById('stockPrice').value = '-';
        showNotification('Kunne ikke hente aktiepris fra API.', 'error');
      }
    } catch (err) {
      currentPrice = 0;
      unitPriceInput.value = '-';
      document.getElementById('stockPrice').value = '-';
      showNotification('Fejl ved hentning af aktiepris.', 'error');
    }
  });

  // Når antal ændres, opdater totalprisen
  document.getElementById('stockAmount').addEventListener('input', updatePriceFields);

  function updatePriceFields() {
    const amount = parseInt(document.getElementById('stockAmount').value) || 0;
    const unitPriceInput = document.getElementById('unitPrice');
    if (currentPrice > 0) {
      unitPriceInput.value = currentPrice.toFixed(2);
      const total = currentPrice * amount;
      document.getElementById('stockPrice').value = total > 0 ? total.toFixed(2) : '';
    } else {
      unitPriceInput.value = '-';
      document.getElementById('stockPrice').value = '-';
    }
  }

  // Håndter køb af aktie
  document.getElementById('buyStockForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const symbol = document.getElementById('stockSelect').value;
    const amount = document.getElementById('stockAmount').value;
    const boughtAt = document.getElementById('stockPrice').value;
    const accountId = document.getElementById('accountSelect').value;

    if (!symbol || !amount || !boughtAt || boughtAt === '-' || !accountId) {
      showNotification('Alle felter skal udfyldes og pris skal være tilgængelig.', 'error');
      return;
    }

    try {
      const res = await fetch(`/portfolios/${currentPortfolioId}/add-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, amount, boughtAt, accountId })
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.message || 'Noget gik galt', 'error');
        return;
      }
      showNotification('✅ Aktie købt!', 'success');
      document.getElementById('addStockForm').style.display = 'none';
      document.getElementById('stockAmount').value = '';
      document.getElementById('stockPrice').value = '';
      loadPortfolios();
    } catch (err) {
      showNotification('Kunne ikke købe aktien: ' + err.message, 'error');
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
