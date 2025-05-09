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
  
    // 2) Hent kurser for alle tickers
    const symbols = holdings.map(h => h.ticker).join(',');
    let quotesData;
    try {
      const res = await fetch(`/portfolios/${portfolioId}/quotes?symbols=${symbols}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Kurser ikke fundet');
      quotesData = await res.json();
    } catch (err) {
      return alert(`Fejl ved hentning af kurser: ${err.message}`);
    }
  
    // 3) Slå sammen og beregn totalværdi + change
    let totalValue = 0, totalChangePct = 0;
    const quotes = quotesData['Stock Quotes'] || [];
    const rows = holdings.map(h => {
      const q = quotes.find(q => q['1. symbol'] === h.ticker) || {};
      const price     = parseFloat(q['2. price']      || 0);
      const changePct = parseFloat((q['4. price change percent'] || '0%').replace('%',''));
      const value     = h.volume * price;
  
      totalValue     += value;
      totalChangePct += changePct;
      return { ...h, price, changePct, value };
    });
    const avgChangePct = rows.length ? (totalChangePct/rows.length) : 0;
  
    // 4) Opdater "kortene"
    document.querySelector('.value-card .value').textContent =
      totalValue.toLocaleString() + ' DKK';
  
    const pctEl = document.querySelector('.overview .change');
    pctEl.textContent = (avgChangePct>=0?'+':'') + avgChangePct.toFixed(1) + '%';
    pctEl.classList.toggle('positive', avgChangePct>=0);
    pctEl.classList.toggle('negative', avgChangePct<0);
  
    // 5) Fyld tabellen
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.name}<br><span class="ticker">${r.ticker}</span></td>
        <td>${r.volume} stk.</td>
        <td>
          <span class="percent ${r.changePct>=0 ? 'positive' : 'negative'}">
            ${(r.changePct>=0?'+':'')+r.changePct.toFixed(2)}%
          </span>
        </td>
        <td>${r.price.toFixed(2)} USD</td>
        <td class="value">${r.value.toFixed(2)} USD</td>
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
  
    // 1. Beregn fordeling
    const distribution = rows.map(r => ({
      label: r.name,
      value: r.value
    }));
  
    // 2. Tegn donut/pie chart (fx med Chart.js eller bare med SVG/Canvas)
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
  
    // 3. Opdater legend
    const legend = document.querySelector('.pie-card .legend');
    legend.innerHTML = distribution.map((d,i) => `
      <li>
        <span class="legend-color" style="background:${['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f'][i]}"></span>
        ${d.label}: ${d.value.toLocaleString()} DKK
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
            const res = await fetch('/api/accounts', {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Kunne ikke hente konti');
            const accounts = await res.json();
            
            const select = document.getElementById('accountId');
            select.innerHTML = accounts.map(acc => 
                `<option value="${acc.accountID}">${acc.name} (${acc.balance} DKK)</option>`
            ).join('');
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
  });
  