// public/js/growthPortfolio.js

document.addEventListener('DOMContentLoaded', async () => {
    const portfolioId = window.PORTFOLIO_ID;
    if (!portfolioId) {
      return alert('Portfolio ID mangler – kan ikke indlæse data.');
    }
  
    // 1) Hent holdings fra din egen backend
    let holdings;
    try {
      const res = await fetch(`/portfolios/${portfolioId}/holdings`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Holdings ikke fundet');
      holdings = await res.json();
    } catch (err) {
      return alert(`Fejl ved hentning af holdings: ${err.message}`);
    }
  
    // 2) Du behøver IKKE hente quotes igen – price og value er allerede i holdings!
  
    // 3) Beregn totalværdi og evt. gennemsnitlig ændring (hvis du har changePct)
    let totalValue = 0;
    holdings.forEach(h => {
      totalValue += h.value || 0;
    });
  
    // 4) Opdater "kortene"
    document.querySelector('.value-card .value').textContent =
      totalValue.toLocaleString() + ' DKK';
  
    // 5) Fyld tabellen
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = holdings.map(r => `
      <tr>
        <td>${r.symbol}</td>
        <td>${r.amount} stk.</td>
        <td>
          <span class="percent">
            -
          </span>
        </td>
        <td>${r.price ? r.price.toFixed(2) : '-'} USD</td>
        <td class="value">${r.value ? r.value.toFixed(2) : '-'} USD</td>
        <td>
          <button class="buy-btn" data-symbol="${r.symbol}">Køb</button>
          <button class="sell-btn" data-symbol="${r.symbol}">Sælg</button>
        </td>
      </tr>
    `).join('');
  
    // 6) Bind knapper
    document.getElementById('btnHistory')
      .addEventListener('click', () => alert('Vis handels‐historik (TODO)'));
    document.getElementById('btnNewTrade')
      .addEventListener('click', () => alert('Åbn formular til ny handel (TODO)'));
  
    document.querySelectorAll('.portfolio-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const portfolioId = this.dataset.id;
        window.location.href = `/portfolios/${portfolioId}`;
      });
    });
  
    // 1. Beregn fordeling (brug symbol som label)
    const sortedHoldings = [...holdings].sort((a, b) => (b.value || 0) - (a.value || 0));
    const topHoldings = sortedHoldings.slice(0, 5);
    const distribution = topHoldings.map(r => ({
      label: r.symbol,
      value: r.value
    }));
  
    // 2. Tegn donut/pie chart (kun top 5)
    const pieCtx = document.querySelector('.pie-chart-placeholder');
    pieCtx.innerHTML = '<canvas id="pieChart"></canvas>';
    new Chart(document.getElementById('pieChart'), {
      type: 'pie',
      data: {
        labels: distribution.map(d => d.label),
        datasets: [{
          data: distribution.map(d => d.value),
          backgroundColor: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f']
        }]
      }
    });
  
    // 3. Opdater legend (kun top 5)
    const legend = document.querySelector('.pie-card .legend');
    legend.innerHTML = distribution.map((d,i) => `
      <li>
        <span class="legend-color" style="background:${['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f'][i]}"></span>
        ${d.label}: ${d.value ? d.value.toLocaleString() : 0} DKK
      </li>
    `).join('');
  
    document.addEventListener('DOMContentLoaded', function() {
      var backBtn = document.getElementById('back-to-portfolios-btn');
      if (backBtn) {
        backBtn.addEventListener('click', function() {
          window.location.href = '/portfolios';
        });
      }
    });

    // Modal handling
    const modal = document.getElementById('buyStockModal');
    const btnNewTrade = document.getElementById('btnNewTrade');
    const closeBtn = document.querySelector('.close');
    const buyStockForm = document.getElementById('buyStockForm');

    // Åbn modal
    btnNewTrade.onclick = () => {
        loadAccounts(); // Indlæs konti først
        modal.style.display = "block";
    }

    // Luk modal
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = "none";
    }

    // Indlæs konti til dropdown
    async function loadAccounts() {
      try {
        const res = await fetch('/accounts/api', {
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Kunne ikke hente konti');
        const accounts = await res.json();
        const select = document.getElementById('accountId');
        if (accounts.length === 0) {
          select.innerHTML = '<option>Ingen konti tilgængelige</option>';
          select.disabled = true;
          document.querySelectorAll('.buy-btn').forEach(btn => btn.disabled = true);
        } else {
          select.disabled = false;
          document.querySelectorAll('.buy-btn').forEach(btn => btn.disabled = false);
          select.innerHTML = accounts.map(acc =>
            `<option value="${acc.accountID}">${acc.name} (${acc.balance} DKK)</option>`
          ).join('');
        }
      } catch (err) {
        alert('Fejl ved indlæsning af konti: ' + err.message);
      }
    }

    // Håndter køb af aktie
    buyStockForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = {
            portfolioId,
            accountId: document.getElementById('accountId').value,
            symbol: document.getElementById('stockSymbol').value,
            quantity: parseInt(document.getElementById('quantity').value),
            pricePerUnit: parseFloat(document.getElementById('price').value),
            fee: parseFloat(document.getElementById('fee').value)
        };

        try {
            const res = await fetch('/api/stocks/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Kunne ikke købe aktie');
            }

            const result = await res.json();
            alert(`Aktie købt! Ny saldo: ${result.newBalance} DKK`);
            modal.style.display = "none";
            loadPortfolios(); // Genindlæs portefølje
        } catch (err) {
            alert('Fejl ved køb af aktie: ' + err.message);
        }
    };

    // --- SÆLG AKTIE MODAL ---
    const sellModal = document.getElementById('sellStockModal');
    const sellForm = document.getElementById('sellStockForm');
    const sellCloseBtn = sellModal.querySelector('.close');
    const sellStockSymbolInput = document.getElementById('sellStockSymbol');
    const sellQuantityInput = document.getElementById('sellQuantity');
    const sellPriceInput = document.getElementById('sellPrice');
    const sellFeeInput = document.getElementById('sellFee');
    const sellAccountSelect = document.getElementById('sellAccountId');

    // Åbn modal når der klikkes på en sælg-knap
    document.querySelectorAll('.sell-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const symbol = this.dataset.symbol;
        sellStockSymbolInput.value = symbol;
        sellQuantityInput.value = '';
        sellPriceInput.value = '';
        sellFeeInput.value = 0;
        // Indlæs konti til dropdown
        await loadSellAccounts();
        sellModal.style.display = 'block';
      });
    });

    // Luk modal
    sellCloseBtn.onclick = () => sellModal.style.display = 'none';
    window.addEventListener('click', (e) => {
      if (e.target == sellModal) sellModal.style.display = 'none';
    });

    // Indlæs konti til dropdown (genbrug loadAccounts, men til andet select)
    async function loadSellAccounts() {
      try {
        const res = await fetch('/accounts/api', { credentials: 'include' });
        if (!res.ok) throw new Error('Kunne ikke hente konti');
        const accounts = await res.json();
        if (accounts.length === 0) {
          sellAccountSelect.innerHTML = '<option>Ingen konti tilgængelige</option>';
          sellAccountSelect.disabled = true;
          document.querySelectorAll('.sell-btn').forEach(btn => btn.disabled = true);
        } else {
          sellAccountSelect.disabled = false;
          document.querySelectorAll('.sell-btn').forEach(btn => btn.disabled = false);
          sellAccountSelect.innerHTML = accounts.map(acc =>
            `<option value="${acc.accountID}">${acc.name} (${acc.balance} DKK)</option>`
          ).join('');
        }
      } catch (err) {
        alert('Fejl ved indlæsning af konti: ' + err.message);
      }
    }

    // Håndter salg af aktie
    sellForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = {
        portfolioId,
        accountId: sellAccountSelect.value,
        symbol: sellStockSymbolInput.value,
        quantity: parseInt(sellQuantityInput.value),
        pricePerUnit: parseFloat(sellPriceInput.value),
        fee: parseFloat(sellFeeInput.value)
      };
      try {
        const res = await fetch('/api/stocks/sell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'include'
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Kunne ikke sælge aktie');
        }
        const result = await res.json();
        alert(`Aktie solgt! Ny saldo: ${result.newBalance} DKK`);
        sellModal.style.display = 'none';
        // Genindlæs portefølje eller holdings hvis ønsket
        location.reload();
      } catch (err) {
        alert('Fejl ved salg af aktie: ' + err.message);
      }
    };

    // Åbn køb-modal fra tabel-knap
    document.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const symbol = this.dataset.symbol;
        document.getElementById('stockSymbol').value = symbol;
        document.getElementById('quantity').value = '';
        document.getElementById('price').value = '';
        document.getElementById('fee').value = 0;
        await loadAccounts();
        modal.style.display = "block";
      });
    });

    console.log(holdings);
  });
  