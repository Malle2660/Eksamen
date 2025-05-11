// common.js
(function(){
    // VIS NOTIFIKATION: viser midlertidig besked øverst i UI
    // message: den tekst, der skal vises
    // type: 'success' eller 'error' afgør farven
    // timeout: hvor lang tid (ms) notifikationen skal være synlig
    window.showNotification = function(message, type = 'success', timeout = 3000) {
      const notif = document.getElementById('notification');      // find containeren
      if (!notif) return;                                         // stop, hvis ikke fundet
      notif.textContent = message;                                // sæt besked-teksten
      notif.className = `notification ${type}`;                   // tilføj CSS-klasse
      notif.style.display = 'block';                              // vis elementet
      setTimeout(() => {                                          // skjul efter timeout
        notif.style.display = 'none';
      }, timeout);
    };
  
    // ÅBN MODAL: viser et modal-vindue baseret på dets ID
    window.openModal = function(modalId) {
      const el = document.getElementById(modalId);               // find modal-elementet
      if (el) el.style.display = 'flex';                          // vis modal som flex for centreret indhold
    };
  
    // LUK MODAL: skjul modal-vindue baseret på ID
    window.closeModal = function(modalId) {
      const el = document.getElementById(modalId);               // find samme element
      if (el) el.style.display = 'none';                          // skjul det
    };
  
    // LOAD ACCOUNTS: henter alle brugerens konti og fylder en <select>
    // selectId: ID på dropdown-menuen, btnSelector: CSS-selector for knapper som skal aktiveres/deaktiveres
    window.loadAccounts = async function(selectId, btnSelector) {
      try {
        // 1) Hent konti fra backend med credentials for session
        const res = await fetch('/accounts/api', { credentials: 'include' });
        if (!res.ok) throw new Error('Kunne ikke hente konti');  // fejl, hvis server svarer forkert
  
        // 2) Konverter svar til JSON-array af konti
        const accounts = await res.json();
        const select = document.getElementById(selectId);       // find dropdown
        if (!select) return;                                    // stop, hvis ikke findes
  
        // 3) Hvis ingen konti, vis en option og deaktiver dropdown + knapper
        if (accounts.length === 0) {
          select.innerHTML = '<option>Ingen konti tilgængelige</option>';
          select.disabled = true;                                // deaktiver dropdown
          if (btnSelector)                                      // deaktiver tilknyttede knapper
            document.querySelectorAll(btnSelector).forEach(b => b.disabled = true);
        } else {
          // 4) Ellers aktiver dropdown og eventuelt knapper
          select.disabled = false;
          if (btnSelector)
            document.querySelectorAll(btnSelector).forEach(b => b.disabled = false);
  
          // 5) Fyld dropdown med <option> for hver konto
          select.innerHTML = accounts
            .map(acc =>
              `<option value="${acc.accountID}">
                 ${acc.name} (${acc.balance.toFixed(2)} USD)
               </option>`
            ).join('');
        }
      } catch (err) {
        // 6) Hvis noget fejler undervejs, vis en error-notifikation
        window.showNotification(err.message, 'error');
      }
    };
  
    // TEGN DOUGHNUT-CHART: pie-chart  og Chart.js
    // canvasId: ID på <canvas>, legendId: ID på container til legend (valgfrit)
    // labels: array af navne, data: array af tal
    window.drawPieChart = function(canvasId, legendId, labels, data) { // skal tegne en pie-chart
      const ctx = document.getElementById(canvasId);              // find canvas
      if (!ctx) return;                                           // stop hvis ikke  fundet
      // 1) Foruddefiner et sæt farver
      const colors = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab'];
      if (window._pieChart) window._pieChart.destroy();           // ryd evt. tidligere chart
  
      // 2) Opret nyt Chart.js doughnut-diagram
      window._pieChart = new Chart(ctx, {
        type: 'doughnut', // skal tegne en pie-chart
        data: {
          labels,                                                  // slice-navne
          datasets: [{ data, backgroundColor: colors }]            // slice-værdier og farver
        },
        options: {
          cutout: '70%',                                           // hul i midten
          responsive: false,
          plugins: {
            legend: {
              display: !legendId,                                  // default legend, hvis ingen custom
              position: 'right',
              labels: {
                generateLabels: chart =>                           // custom legend-text
                  chart.data.labels.map((lab,i) => ({
                    text: `${lab}: ${chart.data.datasets[0].data[i].toLocaleString('en-US',{minimumFractionDigits:2})} USD`,
                    fillStyle: chart.data.datasets[0].backgroundColor[i],
                    strokeStyle: '#fff',                           // kantfarve
                    lineWidth: 1
                  }))
              }
            }
          }
        }
      });
  
      // 3) Hvis et legend-container-ID er angivet, lav en skræddersyet legend-HTML
      if (legendId) {
        const legendEl = document.getElementById(legendId);
        if (!legendEl) return;
        const total = data.reduce((a,b) => a + b, 0);              // beregn samlet sum
        legendEl.innerHTML = labels.map((lab,i) => `
          <li>
            <span style="
              display:inline-block;
              width:12px;height:12px;
              background:${colors[i % colors.length]};
              margin-right:8px;
              border-radius:2px;
            "></span>
            ${lab} (${((data[i] / total) * 100 || 0).toFixed(0)}%)
          </li>
        `).join('');                                               // samlede legend-items
      }
    };
  
    // TEGN LINJE-GRAF: generisk line-chart med Chart.js
    // canvasId: ID på <canvas>, labels: x-akse, data: y-akse, options: ekstra props
    window.drawLineChart = function(canvasId, labels, data, options = {}) {
      const el = document.getElementById(canvasId);               // find canvas
      if (!el) return;                                            // stop hvis ikke fundet
      const ctx = el.getContext('2d');
      if (window._lineChart) window._lineChart.destroy();         // ryd tidligere
  
      // Opret nyt Chart.js line-diagram
      window._lineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,                                                 // x-akse-etiketter
          datasets: [{
            data,                                                 // y-akse-værdier
            ...(options.datasetProps || {})                       // farver, tension osv.
          }]
        },
        options: options.chartProps || {}                         // axes, legend osv.
      });
    };
  })();
  