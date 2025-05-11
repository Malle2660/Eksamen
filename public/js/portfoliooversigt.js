// portfoliooversigt.js  
// Giver et overblik over alle brugerens porteføljer: henter data, renderer tabeller, diagrammer og binder knapper

console.log("Portfoliooversigt.js loaded");  // Bekræft at scriptet er indlæst i konsollen

/**
 * VIS NOTIFIKATION: viser en midlertidig besked øverst i UI
 * message: teksten der vises
 * type: 'success' eller 'error' (ændrer styling)
 * timeout: tid i ms inden notifikation skjules automatisk
 */
function showNotification(message, type = 'success', timeout = 3000) {
  const notif = document.getElementById('notification');  // find notifikations-container
  if (!notif) return;                                      // stop hvis ingen container
  notif.textContent = message;                             // sæt besked
  notif.className = `notification ${type}`;                // tilføj CSS-klasse for farve
  notif.style.display = 'block';                           // vis elementet
  setTimeout(() => {                                       // skjul efter timeout
    notif.style.display = 'none';
  }, timeout);
}

// Når DOM'en er fuldt indlæst, kører vi resten
document.addEventListener('DOMContentLoaded', () => {
  // CACHE DOM-ELEMENTER for bedre ydeevne og enklere kode
  const tableBody     = document.getElementById('portfolioTableBody'); //viser porteføljer i tabellen
  const btnCreate     = document.getElementById('createPortfolioBtn'); // opret portefølje
  const nameInput     = document.getElementById('newPortfolioName'); // navn input
  const accountInput  = document.getElementById('newPortfolioAccount'); // konto input
  const countEl       = document.getElementById('overviewCount'); // antal porteføljer
  const valueEl       = document.getElementById('totalValue'); // samlet værdi
  const percentEl     = document.getElementById('overviewChangePercent'); // daglig change
  const dkkChangeEl   = document.getElementById('overviewChangeValue'); // DKK-change
  const pieChartEl    = document.getElementById('portfolioPieChart'); // pie-chart
  const pieLegendEl   = document.getElementById('portfolioPieLegend'); // pie-legend
  const userId        = window.USER_ID;                    // globalt sat tidligere

  let currentPortfolioId = null;                            // gemmer id ved køb
  let pieChart           = null;                           // referencer til chart hvis vi vil destroy

  /**
   * HENT OG VIS PORTFØLJER:
   *  - Henter alle porteføljer
   *  - Renderer tabellen
   *  - Binder events på knapper
   *  - Opdaterer metrics og pie-chart
   */
  async function loadPortfolios() {
    try {
      // 1) Hent porteføljer fra backend med cookies
      const res = await fetch('/portfolios/user', { credentials: 'include' });  
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 2) Konverter respons til JSON-array
      const portfolios = await res.json();

      // 3) Gem alle portfolioID'er i sessionStorage til genbrug
      const portfolioIds = portfolios.map(p => p.portfolioID);
      sessionStorage.setItem('portfolioIds', JSON.stringify(portfolioIds));

      // 4) Hvis ingen porteføljer, vis "Ingen" og nulstil metrics
      if (!Array.isArray(portfolios) || portfolios.length === 0) { //
        tableBody.innerHTML     = `<tr><td colspan="9">Ingen porteføljer endnu</td></tr>`;
        countEl.textContent     = '0';
        valueEl.textContent     = '0.00 USD';
        percentEl.textContent   = '0.00%';
        dkkChangeEl.textContent = '0.00 USD';
        return;
      }

      // 5) Ryd tabel inden opbygning
      tableBody.innerHTML = ''; 

      // 6) Loop hver portefølje og bygg <tr> inkl. knapper
      for (const p of portfolios) {
        // 6a) Hent ekstra tal parallelt: total purchase & unrealized
        const [totalPurchase, totalUnrealized] = await Promise.all([
          fetch(`/portfolios/${p.portfolioID}/total-purchase`, { credentials: 'include' })   // hent total purchase
            .then(r => r.json()).then(d => d.totalPurchase),
          fetch(`/portfolios/${p.portfolioID}/total-unrealized`, { credentials: 'include' })
            .then(r => r.json()).then(d => d.totalUnrealized)
        ]);

        // 6b) Opret en <tr> med celler for navn, værdi, change osv.
        const tr = document.createElement('tr'); // opret række til 
        tr.innerHTML = `
          <td>
            <a href="/portfolios/${p.portfolioID}"
               class="portfolio-link"
               data-id="${p.portfolioID}"
               style="color:#a48cff;font-weight:600;cursor:pointer;">
              ${p.name || '-'}
            </a>
          </td>
          <td>${p.expectedValue.toFixed(2)} USD</td> 
          <td>${p.dailyChange.toFixed(2)} USD</td>  
          <td>${p.realizedGain.toFixed(2)} USD</td>
          <td>${p.unrealizedGain.toFixed(2)} USD</td>
          <td>${totalPurchase.toFixed(2)} USD</td>
          <td>${totalUnrealized.toFixed(2)} USD</td>
          <td>${new Date(p.registrationDate).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-primary kob-aktie-btn" data-id="${p.portfolioID}">
              Køb aktie
            </button>
            <button class="btn btn-secondary vis-aktier-btn" data-id="${p.portfolioID}">
              Vis aktier
            </button>
          </td>
          <td>
            <button class="cancel-btn slet-portfolio-btn" data-id="${p.portfolioID}">
              Slet
            </button>
          </td>
        `;
        tableBody.appendChild(tr); // tilføj række til tabel
      }

      // 7) Bind "Køb aktie"-knapper
      document.querySelectorAll('.kob-aktie-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          currentPortfolioId = btn.dataset.id; // gemmer det valgte portfolioID til senere køb
          await loadAccounts('accountSelect');  // indlæser alle brugerens konti i dropdown
          document.getElementById('stockAmount').value = ''; // nulstiller antal-inputfeltet
          document.getElementById('unitPrice').value = '';   // nulstiller kurs-inputfeltet
          document.getElementById('stockPrice').value = '';  // nulstiller totalpris-inputfeltet
          const symbol = document.getElementById('stockSelect').value;         // henter det valgte aktiesymbol
          try {
            const res = await fetch(`/portfolios/api/stock-price/${symbol}`, { credentials: 'include' }); // henter aktiekurs fra API med session-cookie
            if (res.ok) {                                                       // kontrollerer om HTTP-svaret er OK (200)
              const { price } = await res.json();                              // parser JSON-responsen og trækker 'price' ud
              document.getElementById('unitPrice').value = price.toFixed(2);    // viser kursen med to decimaler i unitPrice-feltet
            }
          } catch (err) {                                                      // fanger netværks- eller JSON-fejl
            console.error('Fejl ved kurs-hentning:', err);                     // logger fejl til konsollen til fejlsøgning
          }
          document.getElementById('stockAmount').dispatchEvent(new Event('input')); // udløser genberegning af totalpris ved input-event
          openModal('addStockForm');                                            // åbner modal-vinduet til køb
        });
      });

      // Opdater kurs ved skift af aktie
      const stockSelectEl = document.getElementById('stockSelect');
      if (stockSelectEl) {
        stockSelectEl.addEventListener('change', async () => {
          const symbol = stockSelectEl.value;
          try {
            const res = await fetch(`/portfolios/api/stock-price/${symbol}`, { credentials: 'include' }); // skal være med til at hente kursen fra vores aktier og
            if (res.ok) {
              const { price } = await res.json();
              document.getElementById('unitPrice').value = price.toFixed(2);
              document.getElementById('stockAmount').dispatchEvent(new Event('input'));
            }
          } catch {}
        });
      }

      // Opdater totalpris ved ændring af antal
      const amountEl = document.getElementById('stockAmount');
      if (amountEl) {
        amountEl.addEventListener('input', () => {
          const amount = parseFloat(amountEl.value); // hente antal aktier
          const unit = parseFloat(document.getElementById('unitPrice').value); // hente prisen for aktien
          if (!isNaN(amount) && !isNaN(unit)) {
            document.getElementById('stockPrice').value = (amount * unit).toFixed(2);  //opdatere den samlet totalpris
          } else {
            document.getElementById('stockPrice').value = ''; //
          }
        });
      }

      // Bind køb-aktie formular
      const buyForm = document.getElementById('buyStockForm'); // henter vores køb aktie formular 
      if (buyForm) {
        buyForm.addEventListener('submit', async e => {
          e.preventDefault();
          const symbol = document.getElementById('stockSelect').value;
          const amount = parseInt(document.getElementById('stockAmount').value, 10); // skal hente hvor mange antal brugerne ønsker sig
          const boughtAt = parseFloat(document.getElementById('unitPrice').value); // hente prisen for aktien
          const accountId = parseInt(document.getElementById('accountSelect').value, 10); 
          if (!symbol || !amount || isNaN(boughtAt) || !accountId) {
            return showNotification('Udfyld alle felter', 'error'); //  skal slå fejl hvis der ikke er udfyldt
          }
          try {
            const res = await fetch(`/portfolios/${currentPortfolioId}/add-stock`, {
              method: 'POST',
              credentials: 'include',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ symbol, amount, boughtAt, accountId })
            });
            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.message || 'Fejl ved køb af aktie');
            }
            const { newBalance } = await res.json();
            showNotification(`Aktie købt! Ny saldo: ${newBalance} USD`, 'success');
            closeModal('addStockForm');
            loadPortfolios();
          } catch (err) {
            showNotification(err.message, 'error');
          }
        });
      }

      // 8) Bind "Vis aktier"-knapper
      document.querySelectorAll('.vis-aktier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          visAktieOversigt(btn.dataset.id);      // vis holdings i modal
        });
      });

      // 9) Bind "Slet"-knapper
      document.querySelectorAll('.slet-portfolio-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Vil du slette denne portefølje?')) return; // Sletning  skal kun gennemføres hvis brugeren bekræfter
          try {
            const res = await fetch(`/portfolios/${btn.dataset.id}`, {   // slet portefølje fra backend
              method: 'DELETE',
              credentials: 'include'
            });
            if (!res.ok) throw new Error('Sletning mislykkedes'); // fejl hvis sletning mislykkes
            showNotification('Portefølje slettet', 'success');
            loadPortfolios();                 // opdater tabel
          } catch (err) {
            showNotification(err.message, 'error'); // fejlbesked hvis sletning mislykkes
          }
        });
      });

      // 10) Opdater top-level metrics
      updateMetrics(portfolios);

      // 11) Tegn pie-chart med custom legend
      drawPieChart(
        'portfolioPieChart',              // canvas id
        'portfolioPieLegend',             // legend-list id
        portfolios.map(p => p.name),      // labels
        portfolios.map(p => p.expectedValue || 0) // data
      );

      // 12) Gem data i sessionStorage
      sessionStorage.setItem('portfolios', JSON.stringify(portfolios));   // gem porteføljer i sessionStorage

    } catch (err) {
      console.error('Fejl ved loadPortfolios:', err);
      showNotification('Kunne ikke hente porteføljer.', 'error');
    }
  }

  /**
   *  forneden har vi vores knap  og strukturen i  til vores knap  VIS AKTIEOVERSIGT: 
   *  - Henter holdings for én portefølje
   *  - Renderer dem i et modal med tabel, hvis de aktier der er i porteføljen
   */
  async function visAktieOversigt(portfolioId) {
    try {
      // 1) Hent holdings fra backend
      const res = await fetch(`/portfolios/${portfolioId}/holdings`, { credentials: 'include' });
      if (!res.ok) throw new Error('Holdings ikke fundet');
      const holdings = await res.json();

      // 2) Hvis ingen aktier, vis besked og stop
      if (!Array.isArray(holdings) || holdings.length === 0) {
        showNotification('Ingen aktier i porteføljen', 'info'); 
        return;
      }

      // 3) Byg en lille tabel med HTML-rækker for hver holding der viser symbol, antal, pris og værdi
      const rows = holdings.map(h => `
        <tr>
          <td>${h.symbol}</td>
          <td>${h.amount}</td>
          <td>${h.price.toFixed(2)} USD</td>
          <td>${h.value.toFixed(2)} USD</td>
        </tr>
      `).join('');

      // 4) Find eller opret modal-container
      let modal = document.getElementById('visAktieOversigt');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'visAktieOversigt';
        Object.assign(modal.style, {
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        });
        document.body.appendChild(modal);
      }

      // 5) Indsæt modal-HTML med tabel og luk-knap
      modal.innerHTML = `
        <div style="
          background:#fff; padding:2rem; border-radius:8px;
          min-width:600px; max-width:90vw; max-height:80vh;
          overflow:auto; box-shadow:0 2px 16px #0002;
        ">
          <h2>Aktier i portefølje</h2>
          <table style="width:100%; border-collapse:collapse;">
            <tr style="background:#f5f5f5">
              <th>Symbol</th><th>Antal</th><th>Pris</th><th>Værdi</th>
            </tr>
            ${rows}
          </table>
          <button id="lukVisAktieOversigt" style="margin-top:1rem; float:right;">
            Luk
          </button>
        </div>
      `;
      // 6) Vis modal
      modal.style.display = 'flex';

      // 7) Bind luk-knappen
      document.getElementById('lukVisAktieOversigt')
        .addEventListener('click', () => modal.style.display = 'none');

    } catch (err) {
      showNotification('Kunne ikke hente aktier.', 'error');
    }
  }

  /**
   * UPDATE METRICS:
   * Opdaterer oversigtens tal: antal portfolios, samlet værdi, daglig procentsats og DKK-change.
   */
  function updateMetrics(portfolios) {
    // Beregn total værdi
    const total      = portfolios.reduce((sum,p) => sum + (p.expectedValue || 0), 0);
    // Beregn gennemsnitlig daglig change
    const avgChange  = portfolios.length
      ? portfolios.reduce((sum,p) => sum + (p.dailyChange || 0), 0) / portfolios.length
      : 0;
    // Beregn total urealiseret change (DKK)
    const dkkChange  = portfolios.reduce((sum,p) => sum + (p.unrealizedGain || 0), 0);

    // Opdater DOM-elementer
    countEl.textContent     = portfolios.length;
    valueEl.textContent     = `${total.toFixed(2)} USD`;
    percentEl.textContent   = `${avgChange.toFixed(2)}%`;
    dkkChangeEl.textContent = `${dkkChange.toFixed(2)} USD`;
  }

  // BIND CLICK TIL CREATE-PORTFØLJE KNAP
  if (btnCreate) {
    btnCreate.addEventListener('click', () => openModal('addPortfolioModal'));
  }

  // BIND FORM SUBMIT TIL OPRET-PORTFØLJE
  const createForm = document.getElementById('createPortfolioForm'); //når vi ønsker at op
  if (createForm) {
    createForm.addEventListener('submit', async e => { 
      e.preventDefault();
      const name      = nameInput.value.trim(); //henter navn fra inputfeltet
      const accountId = parseInt(accountInput.value, 10);  //
      if (!name || !accountId) {
        return showNotification('Udfyld både navn og konto-id', 'error');
      }
      try {
        const res = await fetch('/portfolios/create', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          credentials: 'include',
          body: JSON.stringify({name, accountId})
        });
        if (!res.ok) throw new Error('Oprettelse fejlede'); // fejl hvis oprettelse fejler  
        showNotification('Portefølje oprettet', 'success'); // viser besked om at porteføljen er oprettet
        closeModal('addPortfolioModal'); // lukker modal
        loadPortfolios();    // genindlæs oversigten
      } catch (err) {
        showNotification(err.message, 'error');
      }
    });
  }

  // BIND CANCEL-KNOP til at lukke opret-modal
  const cancelBtn = document.getElementById('cancelPortfolioBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => closeModal('addPortfolioModal'));
  }

  // LOAD OG VIS PORTFØLJER FØRSTE GANG
  loadPortfolios();

  //  link til at se en portefølje
  document.addEventListener('click', e => {
    if (e.target.classList.contains('portfolio-link')) {
      e.preventDefault();
      window.location.href = `/portfolios/${e.target.dataset.id}`;
    }
  });
});
