// HÅNDTERING AF GROWTH TECH-PORTFØLJE: data, tabeller, modaler og diagrammer
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Hent portfolioId fra <body data-portfolio-id="...">
  const portfolioId = document.body.dataset.portfolioId;
  if (!portfolioId) {
    // Hvis ID mangler, vis fejl-notifikation og stop yderligere udførsel
    return showNotification('Portfolio ID mangler – kan ikke indlæse data.', 'error');
  }

  // 2) HENT HOLDINGS: købte aktier i porteføljen
    let holdings;
    try {
    // Send GET til /growth/portfolios/:id/holdings med cookies
    const res = await fetch(`/growth/portfolios/${portfolioId}/holdings`, { credentials: 'include' });
    if (!res.ok) throw new Error('Holdings ikke fundet');
    holdings = await res.json();  // parse JSON til array af { id, symbol, amount, price, value }
    } catch (err) {
    // Ved fejl vis message og stop
    return showNotification(`Fejl ved hentning af holdings: ${err.message}`, 'error');
  }

  // 3) VIS TOTALVÆRDI: summér alle holding.value
  const totalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);
  document.querySelector('.value-card .value')
    .textContent = `${totalValue.toLocaleString()} USD`;          // sæt opdateret beløb

  // 4) BYG TABELRÆKKER: oversigt med symbol, antal osv.
  const tbody = document.querySelector('table tbody');
    tbody.innerHTML = holdings.map(r => `
      <tr>
        <td>${r.symbol}</td>
        <td>${r.amount} stk.</td>
      <td><span class="percent">-</span></td>
        <td>${r.price ? r.price.toFixed(2) : '-'} USD</td>
        <td class="value">${r.value ? r.value.toFixed(2) : '-'} USD</td>
        <td>
          <button class="buy-btn" data-symbol="${r.symbol}">Køb</button>
          <button class="sell-btn" data-symbol="${r.symbol}" data-stockid="${r.id}">Sælg</button>
        </td>
      </tr>
  `).join('');

  // 5) EVENT-DELEGATION for køb/salg-knapper i tabellen
  tbody.addEventListener('click', async e => {
    // KØB-knap
    if (e.target.classList.contains('buy-btn')) {
      const symbol = e.target.dataset.symbol;                     // læs symbol fra data-attribute
      document.getElementById('stockSymbol').value = symbol;     // fyld formularfelt
      const akt = holdings.find(h => h.symbol === symbol);       // find aktie-objekt
      document.getElementById('price').value = akt ? akt.price : '';
      document.getElementById('quantity').value = '';            // tøm antal-felt
      document.getElementById('fee').value = 0;                  // start med 0 i gebyr
      await loadAccounts('accountId', '.buy-btn');               // indlæs konto-dropdown
      openModal('buyStockModal');                                // åbn modal
    }

    // SALG-knap
    if (e.target.classList.contains('sell-btn')) {
      const symbol  = e.target.dataset.symbol;
      const stockID = e.target.dataset.stockid;                  // læs intern stock-id
      const inp = document.getElementById('sellStockSymbol');
      inp.value = symbol;                                        // sæt symbol
      inp.dataset.stockid = stockID;                             // gem id
      const akt = holdings.find(h => h.symbol === symbol);
      document.getElementById('sellPrice').value    = akt ? akt.price : ''; // s
      document.getElementById('sellQuantity').value = ''; 
      document.getElementById('sellFee').value      = 0;
      await loadAccounts('sellAccountId', '.sell-btn');          // konto-dropdown
      openModal('sellStockModal');                               // åbn salg-modal
    }
  });

  // 6) VIS TRADE-HISTORIK: funk­tion der lægger handels-XML i modal
  function showTradeHistoryModal(trades) {
    const html = trades.map(t => `
      <div>
        <b>${t.type}</b> ${t.quantity} stk. ${t.symbol} á ${t.price} USD
        <br>Konto: ${t.accountID} | Dato: ${new Date(t.date).toLocaleString()}
      </div>
    `).join('<hr>');
    // Sæt modal-indhold til denne HTML
    document.getElementById('tradeHistoryContent').innerHTML = html;
  }
  // Fetch og vis historie ved klik på "History"-knap
  document.getElementById('trade-history-btn').addEventListener('click', async () => {
    try {
      const res = await fetch(`/growth/portfolios/${portfolioId}/trades`, { credentials: 'include' });
      if (!res.ok) throw new Error('Kunne ikke hente trade-historik');
      const trades = await res.json();
      showTradeHistoryModal(trades);                             // render indhold
      openModal('tradeHistoryModal');                            // vis modal
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // 7) PIE-CHART TIL TOP 5 POSITIONER
  // Aggregér holdings på symbol-niveau for at undgå dubletter
  const aggregatedMap = {};
  holdings.forEach(h => {
    if (aggregatedMap[h.symbol]) {
      aggregatedMap[h.symbol].amount += h.amount || 0;
      aggregatedMap[h.symbol].value  += h.value  || 0;
    } else {
      aggregatedMap[h.symbol] = { ...h };
    }
  });
  const aggregated = Object.values(aggregatedMap);

  // Sortér aggregérholdings efter værdi og tag de 5 største
  const sorted = aggregated.sort((a, b) => (b.value || 0) - (a.value || 0));
  const top5   = sorted.slice(0, 5);
  const labels = top5.map(r => r.symbol);
  const data   = top5.map(r => r.value);

  // Skift placeholder ud med nyt <canvas> og tegn chart
  document.querySelector('.pie-chart-placeholder').innerHTML = '<canvas id="pieChart"></canvas>';
  drawPieChart('pieChart', 'growthPieLegend', labels, data);

  // Egen legend under diagrammet
  const legendEl = document.querySelector('.pie-card .legend');
  legendEl.innerHTML = labels.map((lab,i)=>`
    <li>
      <span class="legend-color" style="background:${['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f'][i]}"></span>
      ${lab}: ${data[i].toLocaleString()} USD
      </li>
  `).join('');

  // 8) "Tilbage til porteføljer"-knap
  document.getElementById('back-to-portfolios-btn')?.addEventListener('click', () => {
          window.location.href = '/portfolios';
        });

  // 9) HÅNDTERING AF BUY-FORMULARENS SUBMIT
  document.getElementById('buyStockForm').addEventListener('submit', async e => { //  skal håndtere køb af aktier på vores mine aktier side
        e.preventDefault();
        const formData = {
            portfolioId,
      accountId:   document.getElementById('accountId').value, // henter kontoID fra dropdown
      symbol:      document.getElementById('stockSymbol').value, // man kan købe flere aktier fra samme symbol eksemplevis
      quantity:    parseInt(document.getElementById('quantity').value), // henter antal fra inputfelt (man kan købe de aktier man har råd til)
      pricePerUnit:parseFloat(document.getElementById('price').value), // henter pris fra inputfelt
      fee:         parseFloat(document.getElementById('fee').value) // henter gebyr fra inputfelt
    };
    try {
      // POST til server for at gennemføre køb
            const res = await fetch('/growth/stocks/buy', {
                method: 'POST',
        headers: {'Content-Type':'application/json'},
                body: JSON.stringify(formData),
                credentials: 'include'
            });
      if (!res.ok) throw new Error((await res.json()).message || 'Kunne ikke købe aktie');
            const result = await res.json();
      showNotification(`Aktie købt! Ny saldo: ${result.newBalance} USD`, 'success');
      closeModal('buyStockModal');                              // luk modal
      location.reload();                                        // genindlæs for at se ændringer
        } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // 10) HÅNDTERING AF SELL-FORMULARENS SUBMIT 
  document.getElementById('sellStockForm').addEventListener('submit', async e => {
      e.preventDefault();
    // Læs felter ud fra formular
      const formData = {
        portfolioId,
      accountId:   document.getElementById('sellAccountId').value,
      stockID:     Number(document.getElementById('sellStockSymbol').dataset.stockid),
      symbol:      document.getElementById('sellStockSymbol').value,
      quantity:    parseInt(document.getElementById('sellQuantity').value, 10),
      pricePerUnit:parseFloat(document.getElementById('sellPrice').value.replace(',', '.')),
      fee:         parseFloat(document.getElementById('sellFee').value)
      };
      try {
      // Send POST for at gennemføre salg
        const res = await fetch('/growth/stocks/sell', {
          method: 'POST',
        headers: {'Content-Type':'application/json'},
          body: JSON.stringify(formData),
          credentials: 'include'
        });
      if (!res.ok) throw new Error((await res.json()).message || 'Kunne ikke sælge aktie');
        const result = await res.json();
      // Vis success-notifikation, luk modal og genindlæs data
      showNotification(`Aktie solgt! Ny saldo: ${result.newBalance} USD`, 'success');
      closeModal('sellStockModal');
        location.reload();
      } catch (err) {
      // Ved fejl vis besked til bruger
      showNotification(err.message, 'error');
    }
  });

  // 11) HISTORIK & LINE-CHART: hent og vis udvikling over tid
    async function loadPortfolioHistory() {
      try {
      const res = await fetch(`/growth/portfolios/${portfolioId}/history`, { credentials: 'include' });
        if (!res.ok) throw new Error('Kunne ikke hente historik');
      return await res.json();                                 // array af {date,value}
    } catch {
      return [];                                                // ved fejl, returner tom liste
    }
  }
  const history = await loadPortfolioHistory(); // 
  if (history.length > 0) { 
    // Træk datoer og værdier ud
    const dates = history.map(h => h.date); // henter datoerne fra historikken
    const vals  = history.map(h => h.value); // henter værdierne fra historikken
    // Tegn line-chart
    drawLineChart('portfolioValueChart', dates, vals, {
      datasetProps: {
            label: 'Portefølje værdi',
            borderColor: '#4e79a7',
            backgroundColor: 'rgba(78,121,167,0.1)',
            tension: 0.4,
            pointRadius: 0,
            fill: true
      },
      chartProps: {
        plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#C3C3C1' } },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#C3C3C1',
              callback(value) {
                // formatter tal ≥1000 som '1,5k'
                return value >= 1000
                  ? (value/1000).toLocaleString('da-DK',{minimumFractionDigits:1}) + 'k'
                  : value.toLocaleString('da-DK');
              }
            }
          }
          }
        }
      });
    }

  // 12) GLOBAL DELEGATION FOR PORTFØLJE-LINKS
  document.querySelectorAll('.portfolio-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();                                        // forhindr standard-nav
      window.location.href = `/portfolios/${this.dataset.id}`;   // skift side
    });
  });
  
  // 13) SØG PORTFØLJE PÅ ENTER I SØGEBAR 
  // Vi havde lidt problemer med at få den til at virke virke i praksis:
  document.getElementById('search-portfolio').addEventListener('keydown', async function(e) { 
    if (e.key === 'Enter') {
      const q = this.value.trim().toLowerCase(); // henter værdien fra søgefeltet og konverterer til små bogstaver
      if (!q) return; // hvis der ikke er noget i søgefeltet, stop
      const res = await fetch('/portfolios/user'); // henter alle porteføljer fra brugeren
      const portfolios = await res.json(); // parserer svaret til en JSON-array
      const match = portfolios.find(p => p.name.toLowerCase() === q); //  skal finde et match i porteføljerne
      if (match) {
        window.location.href = `/portfolios/${match.portfolioID}`; // skifter til den portefølje der matcher søgefeltet
      } else {
        alert('Ingen portefølje fundet med det navn!'); // viser en besked hvis der ikke er en portefølje med det navn
      }
    }
  });
});
  