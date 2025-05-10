// Når hele DOM'en er indlæst, starter vi logikken
// Funktionaliteten styrer alt fra visning af konti, modaler og formularer
// til handlinger som opret, luk, hæv og indsæt på en konto

document.addEventListener('DOMContentLoaded', () => {
  // Henter elementer til brug i dashboard og modaler
    const countEl      = document.getElementById('account-count');
    const totalBalEl   = document.getElementById('total-balance');
    const currencyEl   = document.getElementById('currency-dist');
    const tbody        = document.getElementById('accounts-table-body');
    const newBtn       = document.getElementById('new-account-btn');
  
    // Modale felter og formularer
    const createAccountModal = document.getElementById('create-account-modal');
    const createAccountForm = document.getElementById('create-account-form');
    const createAccountError = document.getElementById('create-account-error');
    const cancelCreateAccount = document.getElementById('cancel-create-account');
    const newAccountName = document.getElementById('new-account-name');
    const newAccountCurrency = document.getElementById('new-account-currency');
    const newAccountBank = document.getElementById('new-account-bank');
    const depositModal = document.getElementById('deposit-modal');
    const depositForm = document.getElementById('deposit-form');
    const depositAmount = document.getElementById('deposit-amount');
    const depositCurrency = document.getElementById('deposit-currency');
    const depositError = document.getElementById('deposit-error');
    const cancelDeposit = document.getElementById('cancel-deposit');
    const withdrawModal = document.getElementById('withdraw-modal');
    const withdrawForm = document.getElementById('withdraw-form');
    const withdrawAmount = document.getElementById('withdraw-amount');
    const withdrawCurrency = document.getElementById('withdraw-currency');
    const withdrawError = document.getElementById('withdraw-error');
    const cancelWithdraw = document.getElementById('cancel-withdraw');
    const closeAccountModal = document.getElementById('close-account-modal');
    const closeAccountForm = document.getElementById('close-account-form');
    const closeAccountError = document.getElementById('close-account-error');
    const cancelCloseAccount = document.getElementById('cancel-close-account');

    // Aktuel konto-id ved interaktion
    let currentDepositAccountId = null;
    let currentWithdrawAccountId = null;
    let currentCloseAccountId = null;
  
    // Henter kontodata fra serveren og opdaterer UI
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
  
    // Beregner og viser samlet saldo, antal og valutafordeling
    function renderMetrics(accounts) {
      // Kun aktive konti (closedAccount === 0)
      const activeAccounts = accounts.filter(acc => acc.closedAccount === 0 || acc.closedAccount === false);
  
      let total        = 0;
      const byCurrency = {};
  
      activeAccounts.forEach(acc => {
        total += acc.balance;
        byCurrency[acc.currency] = (byCurrency[acc.currency] || 0) + acc.balance;
      });
  
      countEl.textContent    = activeAccounts.length;
      totalBalEl.textContent = `${total.toFixed(2)} DKK`;
  
      const grandTotal = Object.values(byCurrency).reduce((a,b) => a + b, 0);
      const parts      = Object.entries(byCurrency)
        .map(([cur,bal]) => `${cur} ${((bal/grandTotal)*100).toFixed(0)}%`);
      currencyEl.textContent = parts.join(', ');
    }
  
    // Renders kontotabel og tilføjer events til knapper
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

      // Tilføj events til hver af handlingerne (deposit, withdraw, luk osv.)
      document.querySelectorAll('.deposit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          // Find kontoens valuta
          const tr = btn.closest('tr');
          const currency = tr.querySelector('td:nth-child(4)').textContent;
          currentDepositAccountId = btn.dataset.id;
          depositAmount.value = '';
          depositCurrency.value = currency;
          depositError.textContent = '';
          depositModal.style.display = 'flex';
          depositAmount.focus();
        });
      });

      // Tilføj event listeners til luk/åbn knapper
      document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentCloseAccountId = btn.dataset.id;
          if (closeAccountError) closeAccountError.textContent = '';
          if (closeAccountModal) closeAccountModal.style.display = 'flex';
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
        btn.addEventListener('click', () => {
          const tr = btn.closest('tr');
          const currency = tr.querySelector('td:nth-child(4)').textContent;
          currentWithdrawAccountId = btn.dataset.id;
          if (withdrawAmount) withdrawAmount.value = '';
          if (withdrawCurrency) withdrawCurrency.value = currency;
          if (withdrawError) withdrawError.textContent = '';
          if (withdrawModal) {
            withdrawModal.style.display = 'flex';
            withdrawAmount && withdrawAmount.focus();
          }
        });
      });

      document.querySelectorAll('.history-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          showTransactions(btn.dataset.id);
        });
      });
    }
  
    // Åbn modal når der trykkes på "Opret konto"
    if (newBtn && createAccountModal && createAccountForm && newAccountName && newAccountCurrency && newAccountBank) {
      newBtn.addEventListener('click', () => {
        createAccountError.textContent = '';
        newAccountName.value = '';
        newAccountCurrency.value = '';
        newAccountBank.value = '';
        createAccountModal.style.display = 'flex';
        newAccountName.focus();
      });
    }
  
    // Luk modal
    if (cancelCreateAccount && createAccountModal) {
      cancelCreateAccount.addEventListener('click', () => {
        createAccountModal.style.display = 'none';
      });
    }
  
    // Formularhåndtering for opret, indbetal, udbetal, luk konto
    if (createAccountForm) {
      createAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        createAccountError.textContent = '';
        const name = newAccountName.value.trim();
        const currency = newAccountCurrency.value.trim();
        const bank = newAccountBank.value.trim();
        if (!name || !currency || !bank) {
          createAccountError.textContent = 'Alle felter skal udfyldes!';
          return;
        }
        try {
          const res = await fetch('/accounts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, currency, bank })
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || res.statusText);
          }
          createAccountModal.style.display = 'none';
          loadAccounts();
        } catch (err) {
          createAccountError.textContent = 'Fejl: ' + err.message;
        }
      });
    }
  
    // Håndter indbetalings-formularen
    if (depositForm) {
      depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        depositError.textContent = '';
        const amount = depositAmount.value.trim();
        if (!amount || isNaN(amount) || amount <= 0) {
          depositError.textContent = 'Indtast venligst et gyldigt beløb større end 0';
          return;
        }
        try {
          const res = await fetch('/accounts/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              accountId: currentDepositAccountId,
              amount: parseFloat(amount)
            })
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Fejl ved indsættelse af beløb');
        }
          depositModal.style.display = 'none';
          loadAccounts();
          // Opdater evt. historik hvis den vises
          if (currentHistoryAccountId === currentDepositAccountId) {
            showTransactions(currentDepositAccountId);
          }
        } catch (err) {
          depositError.textContent = 'Fejl: ' + err.message;
        }
      });
    }
  
    // Luk modal på "Annuller"
    if (cancelDeposit && depositModal) {
      cancelDeposit.addEventListener('click', () => {
        depositModal.style.display = 'none';
      });
    }
  
    // Håndter udbetalings-formularen
    if (withdrawForm) {
      withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        withdrawError.textContent = '';
        const amount = withdrawAmount.value.trim();
        if (!amount || isNaN(amount) || amount <= 0) {
          withdrawError.textContent = 'Indtast venligst et gyldigt beløb større end 0';
          return;
        }
        try {
          const res = await fetch('/accounts/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              accountId: currentWithdrawAccountId,
              amount: parseFloat(amount)
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Fejl ved udbetaling');
          withdrawModal.style.display = 'none';
          loadAccounts();
          if (currentHistoryAccountId === currentWithdrawAccountId) {
            showTransactions(currentWithdrawAccountId);
          }
        } catch (err) {
          withdrawError.textContent = 'Fejl: ' + err.message;
        }
      });
    }
  
    // Tilføj lyttere til "annuller" knapper for at lukke modaler
    if (cancelWithdraw && withdrawModal) {
      cancelWithdraw.addEventListener('click', () => {
        withdrawModal.style.display = 'none';
      });
    }
  
    // Håndter luk konto-formularen
    if (closeAccountForm) {
      closeAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        closeAccountError.textContent = '';
        try {
          const res = await fetch('/accounts/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: currentCloseAccountId })
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Fejl ved lukning af konto');
          }
          closeAccountModal.style.display = 'none';
          loadAccounts();
          if (currentHistoryAccountId === currentCloseAccountId) {
            showTransactions(currentCloseAccountId);
          }
        } catch (err) {
          closeAccountError.textContent = 'Fejl: ' + err.message;
        }
      });
    }
    if (cancelCloseAccount && closeAccountModal) {
      cancelCloseAccount.addEventListener('click', () => {
        closeAccountModal.style.display = 'none';
      });
    }
  
    // Initial indlæsning
    loadAccounts();

    // Eksempel: knap eller link til at vise transaktioner
    document.querySelectorAll('.show-transactions-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showTransactions(btn.dataset.id);
      });
    });

    // Tilføj dette i din DOMContentLoaded callback i public/js/account.js
    const backBtn = document.getElementById('back-to-dashboard-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = '/dashboard';
      });
    }
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
  
  // Funktion til at opdatere den samlede saldo
  async function updateTotalBalance() {
    try {
        const response = await fetch('/accounts');
        const data = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        const newTotalBalance = doc.querySelector('.total-balance .balance-amount').textContent;
        document.querySelector('.total-balance .balance-amount').textContent = newTotalBalance;
    } catch (error) {
        console.error('Fejl ved opdatering af samlet saldo:', error);
    }
  }

  // Opdater samlet saldo når en konto ændres
  document.addEventListener('DOMContentLoaded', () => {
    const accountForms = document.querySelectorAll('form[data-account-form]');
    accountForms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Eksisterende form handling...
            await updateTotalBalance();
        });
    });
  });
  