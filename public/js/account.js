// public/js/account/account.js
document.addEventListener('DOMContentLoaded', () => {
    const countEl      = document.getElementById('account-count');
    const totalBalEl   = document.getElementById('total-balance');
    const currencyEl   = document.getElementById('currency-dist');
    const tbody        = document.getElementById('accounts-table-body');
    const newBtn       = document.getElementById('new-account-btn');
  
    // Hent konti og opdater UI
    async function loadAccounts() {
      try {
        const res  = await fetch('/accounts/api');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderMetrics(data);
        renderTable(data);
      } catch (err) {
        console.error('Kunne ikke indlæse konti:', err);
      }
    }
  
    // Render antal, samlet balance og valutafordeling
    function renderMetrics(accounts) {
      let total        = 0;
      const byCurrency = {};
  
      accounts.forEach(acc => {
        total += acc.balance;
        byCurrency[acc.currency] = (byCurrency[acc.currency] || 0) + acc.balance;
      });
  
      countEl.textContent    = accounts.length;
      totalBalEl.textContent = `${total.toFixed(2)} DKK`;
  
      const grandTotal = Object.values(byCurrency).reduce((a,b) => a + b, 0);
      const parts      = Object.entries(byCurrency)
        .map(([cur,bal]) => `${cur} ${((bal/grandTotal)*100).toFixed(0)}%`);
      currencyEl.textContent = parts.join(', ');
    }
  
    // Fyld tabellen
    function renderTable(accounts) {
      tbody.innerHTML = '';
      accounts.forEach(acc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${acc.accountID}</td>
          <td>${acc.name}</td>
          <td>${acc.bank}</td>
          <td>${acc.currency}</td>
          <td class="value">${acc.balance.toFixed(2)} ${acc.currency}</td>
          <td>${new Date(acc.registrationsDate).toLocaleDateString('da-DK')}</td>
          <td>${acc.closedAccount ? 'Lukket' : 'Aktiv'}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  
    // Opret konto-knap
    newBtn.addEventListener('click', async () => {
      const currency = prompt('Indtast valuta (f.eks. DKK):');
      if (!currency) return;
      const bank = prompt('Indtast banknavn:');
      if (!bank) return;
  
      try {
        // TODO: udskift 1 med rigtig userId fra session
        const res = await fetch('/accounts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 1, currency, bank })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || res.statusText);
        }
        alert('Konto oprettet!');
        loadAccounts();
      } catch (err) {
        alert('Fejl: ' + err.message);
        console.error(err);
      }
    });
  
    // Initial indlæsning
    loadAccounts();
  });
  