// Håndterer visning af portfolio, modaler og charts for Growth Tech-portefølje

document.addEventListener('DOMContentLoaded', async () => { // Venter til at DOM er loaded/klart
    const portfolioId = window.PORTFOLIO_ID; // Henter portfolio-ID fra global variabel
    if (!portfolioId) { // Tjekker om portfolio-ID er tilgængelig
      return alert('Portfolio ID mangler – kan ikke indlæse data.'); // tjekker om portfolio-ID er tilgængelig
    }
  
    // Variable til at gemme beholdningerne
    let holdings;
    try {
      const res = await fetch(`/portfolios/${portfolioId}/holdings`, {
        credentials: 'include'
      }); // Fetch holdings fra backend
      if (!res.ok) throw new Error('Holdings ikke fundet') // Tjekker respons
      holdings = await res.json(); // Læser JSON-respons fra backend
    } catch (err) {
      return alert(`Fejl ved hentning af holdings: ${err.message}`); // Fejlbesked hvis beholdninger ikke kan hentes
    }
  
    let totalValue = 0; // initialiserer totalværdi
    holdings.forEach(h => {
      totalValue += h.value || 0;
    }); // Beregner totalværdi af beholdningerne
  
    document.querySelector('.value-card .value').textContent = // Opdater "kortene"
      totalValue.toLocaleString() + ' USD';
  
    const tbody = document.querySelector('table tbody'); // Henter tabel-body elementet
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
          <button class="sell-btn" data-symbol="${r.symbol}" data-stockid="${r.id}">Sælg</button>
        </td>
      </tr>
    `).join(''); // Generer tabaelrækken 
  
    document.getElementById('trade-history-btn') // Henter handels historik-knap 
      .addEventListener('click', async function() { // Indlæser handlerne
        const portfolioId = window.PORTFOLIO_ID;
        const res = await fetch(`/portfolios/${portfolioId}/trades`); // Henter handlerne fra backend
        const trades = await res.json(); // Indlæser og omdanner handlerne til brugbart format
        showTradeHistoryModal(trades); // Viser handel modal 
      });
    const btnNewTrade = document.getElementById('register-trade-btn'); // Henter/registrerer en handle-knap
    if (btnNewTrade) {
      btnNewTrade.onclick = () => {
        loadAccounts();
        document.getElementById('buyStockModal').style.display = "block";
      }; // Åben køb-modal
    }
  
    document.querySelectorAll('.portfolio-link').forEach(link => { // Portfølje link
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const portfolioId = this.dataset.id;
        window.location.href = `/portfolios/${portfolioId}`;
      });
    });
  
    const sortedHoldings = [...holdings].sort((a, b) => (b.value || 0) - (a.value || 0)); // Sorterer beholdningerne efter værdi
    const topHoldings = sortedHoldings.slice(0, 5); // Slicer de 5 mest værdifulde beholdninger
    const distribution = topHoldings.map(r => ({ // Beregner fordelingen af beholdningerne
      label: r.symbol,
      value: r.value
    }));
  
    const pieCtx = document.querySelector('.pie-chart-placeholder'); // Henter pie-chart-placeholder elementet
    pieCtx.innerHTML = '<canvas id="pieChart"></canvas>'; // Indlæser canvas elementet
    new Chart(document.getElementById('pieChart'), { // Opretter/tegner pie-chart
      type: 'pie',
      data: {
        labels: distribution.map(d => d.label),
        datasets: [{
          data: distribution.map(d => d.value),
          backgroundColor: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f']
        }]
      }
    });
  
    const legend = document.querySelector('.pie-card .legend'); // Henter legend elementet
    legend.innerHTML = distribution.map((d,i) => `
      <li>
        <span class="legend-color" style="background:${['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f'][i]}"></span>
        ${d.label}: ${d.value ? d.value.toLocaleString() : 0} USD
      </li>
    `).join(''); // Generer legenden
  
    document.addEventListener('DOMContentLoaded', function() {
      var backBtn = document.getElementById('back-to-portfolios-btn');
      if (backBtn) {
        backBtn.addEventListener('click', function() {
          window.location.href = '/portfolios';
        });
      }
    }); // Opretter en tilbage-knap

    
    const modal = document.getElementById('buyStockModal'); // Henter køb-modal
    const closeBtn = document.querySelector('.close'); // Henter luk-knap
    const buyStockForm = document.getElementById('buyStockForm');

    // Luk modal
    closeBtn.onclick = () => modal.style.display = "none"; // Lukker modal
    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = "none"; // Hvis man klikker udenfor modal, lukker den
    }

  
    async function loadAccounts() { // Henter konti til dropdown
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
            `<option value="${acc.accountID}">${acc.name} (${acc.balance} USD)</option>`
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
            const res = await fetch('/growth/stocks/buy', {
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
            alert(`Aktie købt! Ny saldo: ${result.newBalance} USD`);
            modal.style.display = "none";
            loadPortfolios(); // Genindlæs portefølje
        } catch (err) {
            alert('Fejl ved køb af aktie: ' + err.message);
        }
    };

    const sellModal = document.getElementById('sellStockModal'); // Henter sælg-modal
    const sellForm = document.getElementById('sellStockForm'); // Henter sælg-formular 
    const sellCloseBtn = sellModal.querySelector('.close'); // Henter luk-knap
    const sellStockSymbolInput = document.getElementById('sellStockSymbol'); // Henter sælg-symbol input
    const sellQuantityInput = document.getElementById('sellQuantity'); // Henter sælg-antal input
    const sellPriceInput = document.getElementById('sellPrice'); // Henter sælg-pris input
    const sellFeeInput = document.getElementById('sellFee'); // Henter sælg-gebyr input
    const sellAccountSelect = document.getElementById('sellAccountId'); // Henter sælg-konto input

    // Åbn modal når der klikkes på en sælg-knap
    document.querySelectorAll('.sell-btn').forEach(btn => { // Åben sælg-modal
      btn.addEventListener('click', async function() { 
        const symbol = this.dataset.symbol; // Henter symbol fra knappen
        const stockID = this.dataset.stockid; // Henter stockID fra knappen
        sellStockSymbolInput.value = symbol; // Sætter symbol til input
        sellStockSymbolInput.dataset.stockid = stockID; // Sætter stockID til input
        const aktie = holdings.find(h => h.symbol === symbol); // Finder aktien i holdings-arrayet
        sellPriceInput.value = aktie ? aktie.price : ''; // Sætter pris til input
        sellQuantityInput.value = '';
        sellFeeInput.value = 0;
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
            `<option value="${acc.accountID}">${acc.name} (${acc.balance} USD)</option>`
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
        stockID: Number(sellStockSymbolInput.dataset.stockid),
        symbol: sellStockSymbolInput.value,
        quantity: parseInt(sellQuantityInput.value),
        pricePerUnit: parseFloat(sellPriceInput.value.toString().replace(',', '.')),
        fee: parseFloat(sellFeeInput.value)
      };
      try {
        const res = await fetch('/growth/stocks/sell', {
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
        alert(`Aktie solgt! Ny saldo: ${result.newBalance} USD`);
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
        // Find markedsprisen fra holdings-arrayet:
        const aktie = holdings.find(h => h.symbol === symbol);
        document.getElementById('price').value = aktie ? aktie.price : '';
        document.getElementById('quantity').value = '';
        document.getElementById('fee').value = 0;
        await loadAccounts();
        modal.style.display = "block";
      });
    });

    console.log(holdings);

    // Søg portefølje
    document.getElementById('search-portfolio').addEventListener('keydown', async function(e) {
      if (e.key === 'Enter') {
        const query = this.value.trim().toLowerCase();
        if (!query) return;
        const res = await fetch('/portfolios/user');
        const portfolios = await res.json();
        const match = portfolios.find(p => p.name.toLowerCase() === query);
        if (match) {
          window.location.href = `/portfolios/${match.portfolioID}`;
        } else {
          alert('Ingen portefølje fundet med det navn!');
        }
      }
    });

    function showTradeHistoryModal(trades) {
      const content = trades.map(t => `
        <div>
          <b>${t.type}</b> ${t.quantity} stk. ${t.symbol} á ${t.price} USD
          <br>Konto: ${t.accountID} | Dato: ${new Date(t.date).toLocaleString()}
        </div>
      `).join('<hr>');
      document.getElementById('tradeHistoryContent').innerHTML = content;
      document.getElementById('tradeHistoryModal').style.display = 'block';
    }

    // Hent historiske værdier for porteføljen
    async function loadPortfolioHistory() {
      try {
        const res = await fetch(`/growth/portfolios/${portfolioId}/history`);
        if (!res.ok) throw new Error('Kunne ikke hente historik');
        return await res.json(); // [{date: '2024-05-01', value: 12345}, ...]
      } catch (err) {
        return [];
      }
    }

    // TEGN LINE-CHART
    const history = await loadPortfolioHistory();
    console.log('History:', history); // Debug: se om der er data!
    if (history.length > 0 && document.getElementById('portfolioValueChart')) {
      const ctx = document.getElementById('portfolioValueChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(h => h.date),
          datasets: [{
            label: 'Portefølje værdi',
            data: history.map(h => h.value),
            borderColor: '#4e79a7',
            backgroundColor: 'rgba(78,121,167,0.1)',
            tension: 0.4,
            pointRadius: 0,
            fill: true
          }]
        },
        options: {
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#C3C3C1' } },
            y: { ticks: { color: '#C3C3C1' } }
          }
        }
      });
    }

    document.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const symbol = this.dataset.symbol;
        document.getElementById('stockSymbol').value = symbol;
        // Find markedsprisen fra holdings-arrayet:
        const aktie = holdings.find(h => h.symbol === symbol);
        document.getElementById('price').value = aktie ? aktie.price : '';
        document.getElementById('quantity').value = '';
        document.getElementById('fee').value = 0;
        await loadAccounts();
        modal.style.display = "block";
      });
    });

    document.querySelectorAll('.sell-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const symbol = this.dataset.symbol;
        const stockID = this.dataset.stockid;
        sellStockSymbolInput.value = symbol;
        sellStockSymbolInput.dataset.stockid = stockID;
        // Find markedsprisen fra holdings-arrayet:
        const aktie = holdings.find(h => h.symbol === symbol);
        sellPriceInput.value = aktie ? aktie.price : '';
        sellQuantityInput.value = '';
        sellFeeInput.value = 0;
        await loadSellAccounts();
        sellModal.style.display = 'block';
      });
    });
  });
  
// Fælles funktion til at håndtere modal visning
const showTradeModal = async (modal, symbol, stockId, price) => {
  const symbolInput = modal.querySelector('[id$="StockSymbol"]');
  const priceInput = modal.querySelector('[id$="Price"]');
  const quantityInput = modal.querySelector('[id$="Quantity"]');
  const feeInput = modal.querySelector('[id$="Fee"]');
  
  symbolInput.value = symbol;
  if (stockId) symbolInput.dataset.stockid = stockId;
  priceInput.value = price || '';
  quantityInput.value = '';
  feeInput.value = 0;
  
  await loadAccounts(modal.querySelector('[id$="AccountId"]'));
  modal.style.display = 'block';
};

const setupModal = (modalId) => {
  const modal = document.getElementById(modalId);
  const closeBtn = modal.querySelector('.close');
  
  closeBtn.onclick = () => modal.style.display = 'none';
  window.onclick = (e) => {
    if (e.target == modal) modal.style.display = 'none';
  };
  
  return modal;
};
  