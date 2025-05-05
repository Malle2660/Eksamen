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
          <td>
            ${acc.closedAccount 
              ? `<button class="reopen-btn" data-id="${acc.accountID}">Genåbn</button>`
              : `<button class="deposit-btn" data-id="${acc.accountID}">Indbetaling</button>
                 <button class="withdraw-btn" data-id="${acc.accountID}">Udbetaling</button>
                 <button class="history-btn" data-id="${acc.accountID}">Historik</button>
                 <button class="close-btn" data-id="${acc.accountID}">Luk</button>`
            }
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Tilføj event listeners til indsæt knapper
      document.querySelectorAll('.deposit-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const amount = prompt('Indtast beløb der skal indsættes:');
          if (!amount || isNaN(amount) || amount <= 0) {
            alert('Indtast venligst et gyldigt beløb større end 0');
            return;
          }

          try {
            const res = await fetch('/accounts/deposit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                accountId: btn.dataset.id,
                amount: parseFloat(amount)
              })
            });
            
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message || 'Fejl ved indsættelse af beløb');
            }
            
            alert('Beløb indsat!');
            loadAccounts();
          } catch (err) {
            alert('Fejl: ' + err.message);
            console.error(err);
          }
        });
      });

      // Tilføj event listeners til luk/åbn knapper
      document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Er du sikker på, at du vil lukke denne konto?')) {
            try {
              const res = await fetch('/accounts/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: btn.dataset.id })
              });
              if (!res.ok) throw new Error('Fejl ved lukning af konto');
              alert('Konto lukket!');
              loadAccounts();
            } catch (err) {
              alert('Fejl: ' + err.message);
              console.error(err);
            }
          }
        });
      });

      document.querySelectorAll('.reopen-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Er du sikker på, at du vil genåbne denne konto?')) {
            try {
              const res = await fetch('/accounts/reopen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: btn.dataset.id })
              });
              if (!res.ok) throw new Error('Fejl ved genåbning af konto');
              alert('Konto genåbnet!');
              loadAccounts();
            } catch (err) {
              alert('Fejl: ' + err.message);
              console.error(err);
            }
          }
        });
      });

      document.querySelectorAll('.withdraw-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const amount = prompt('Indtast beløb der skal hæves:');
          if (!amount || isNaN(amount) || amount <= 0) {
            alert('Indtast venligst et gyldigt beløb større end 0');
            return;
          }
          try {
            const res = await fetch('/accounts/withdraw', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                accountId: btn.dataset.id,
                amount: parseFloat(amount)
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Fejl ved hævning');
            alert('Beløb hævet!');
            loadAccounts();
          } catch (err) {
            alert('Fejl: ' + err.message);
            console.error(err);
          }
        });
      });

      document.querySelectorAll('.history-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          showTransactions(btn.dataset.id);
        });
      });
    }
  
    // Opret konto-knap
    if (newBtn) {
      newBtn.addEventListener('click', async () => {
        const name = prompt('Indtast kontonavn:');
        if (!name) return;
        const currency = prompt('Indtast valuta (f.eks. DKK):');
        if (!currency) return;
        const bank = prompt('Indtast banknavn:');
        if (!bank) return;
  
        try {
          // TODO: udskift 1 med rigtig userId fra session
          const res = await fetch('/accounts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 1, name, currency, bank })
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
    } else {
      console.error('Knap med id="new-account-btn" blev ikke fundet i DOM\'en!');
    }
  
    // Initial indlæsning
    loadAccounts();

    // Eksempel: knap eller link til at vise transaktioner
    document.querySelectorAll('.show-transactions-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showTransactions(btn.dataset.id);
      });
    });
  });
  
  async function showTransactions(accountId) {
    try {
      const res = await fetch(`/accounts/transactions/${accountId}`);
      if (!res.ok) throw new Error('Kunne ikke hente transaktioner');
      const transactions = await res.json();

      const list = document.getElementById('transactions-list');
      list.innerHTML = '<h3>Transaktionshistorik</h3>';
      if (transactions.length === 0) {
        list.innerHTML += '<p>Ingen transaktioner fundet.</p>';
        return;
      }
      const table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th>Dato</th>
          <th>Type</th>
          <th>Beløb</th>
        </tr>
      `;
      transactions.forEach(tx => {
        table.innerHTML += `
          <tr>
            <td>${new Date(tx.date).toLocaleString('da-DK')}</td>
            <td>${tx.transactionType}</td>
            <td>${tx.amount}</td>
          </tr>
        `;
      });
      list.appendChild(table);
    } catch (err) {
      alert('Fejl: ' + err.message);
    }
  }
  