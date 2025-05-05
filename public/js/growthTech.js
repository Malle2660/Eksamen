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
  });
  