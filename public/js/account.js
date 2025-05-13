// Når hele DOM er indlæst, hentes alle elementer, modealer og event listeners

document.addEventListener('DOMContentLoaded', () => { // Venter til at HTML er indlæst
    const countEl      = document.getElementById('account-count'); // Elementer til antal konti
    const totalBalEl   = document.getElementById('total-balance'); // Elementer til samlet balance
    const currencyEl   = document.getElementById('currency-dist'); // Elementer til valutafordeling
    const tbody        = document.getElementById('accounts-table-body');
    const newBtn       = document.getElementById('new-account-btn');
  
    // Modale felter og formularer
    const createAccountModal = document.getElementById('create-account-modal'); // Modal til at oprette en ny konto
    const createAccountForm = document.getElementById('create-account-form'); // Formular til at oprette en ny konto
    const createAccountError = document.getElementById('create-account-error'); // Fejlmeddelelse til at oprette en ny konto
    const cancelCreateAccount = document.getElementById('cancel-create-account'); // Knap til at annullere oprettelse af en ny konto
    const newAccountName = document.getElementById('new-account-name'); // Inputfelt til at indsætte et navn til en ny konto
    const newAccountCurrency = document.getElementById('new-account-currency'); // Inputfelt til at indsætte en valuta til en ny konto
    const newAccountBank = document.getElementById('new-account-bank'); // Inputfelt til at indsætte en bank til en ny konto
    const depositModal = document.getElementById('deposit-modal'); // Modal til at indsætte penge på en konto
    const depositForm = document.getElementById('deposit-form'); // Formular til at indsætte penge på en konto
    const depositAmount = document.getElementById('deposit-amount'); // Inputfelt til at indsætte et beløb til en konto
    const depositCurrency = document.getElementById('deposit-currency'); // Inputfelt til at indsætte en valuta til en konto
    const depositError = document.getElementById('deposit-error'); // Fejlmeddelelse til at indsætte penge på en konto
    const cancelDeposit = document.getElementById('cancel-deposit'); // Knap til at annullere indsættelse af penge på en konto
    const withdrawModal = document.getElementById('withdraw-modal'); // Modal til at udbetale penge fra en konto
    const withdrawForm = document.getElementById('withdraw-form'); // Formular til at udbetale penge fra en konto
    const withdrawAmount = document.getElementById('withdraw-amount'); // Inputfelt til at indsætte et beløb til en konto
    const withdrawCurrency = document.getElementById('withdraw-currency'); // Inputfelt til at indsætte en valuta til en konto
    const withdrawError = document.getElementById('withdraw-error'); // Fejlmeddelelse til at udbetale penge fra en konto
    const cancelWithdraw = document.getElementById('cancel-withdraw'); // Anuller-knap til at udbetale penge fra en konto
    const closeAccountModal = document.getElementById('close-account-modal');
    const closeAccountForm = document.getElementById('close-account-form'); // Formular til at lukke en konto
    const closeAccountError = document.getElementById('close-account-error'); // Fejlmeddelelse til at lukke en konto
    const cancelCloseAccount = document.getElementById('cancel-close-account'); // Anuller-knap til at lukke en konto

    let currentDepositAccountId = null; // ID for den konto der indsættes penge på
    let currentWithdrawAccountId = null; // ID for den konto der udbetales penge fra
    let currentCloseAccountId = null; // ID for den konto der lukkes
  
    async function loadAccounts() { // Henter og viser alle konti
      try {
        const res  = await fetch('/accounts/api'); // API-kald til at hente alle konti fra serveren
        if (!res.ok) throw new Error(`HTTP ${res.status}`); // Hvis der ikke er en ok status, kastes en fejl
        const data = await res.json(); // JSON data fra serveren
        renderMetrics(data); // Opdaterer metrics
        renderTable(data); // Opdaterer kontotabel
      } catch (err) {
        console.error('Kunne ikke indlæse konti:', err);
      }
    }
  
    function renderMetrics(accounts) { // Beregner og viser samlet balance, antal konti og valutafordeling
      const activeAccounts = accounts.filter(acc => acc.closedAccount === 0 || acc.closedAccount === false); // Filtrer konti der er aktive
      let total        = 0; // Sum variable
      const byCurrency = {}; // Object til at gemme valutafordelingen
      activeAccounts.forEach(acc => { // Loop igennem alle aktive konti
        total += acc.balance; // Tilføj balance til total
        byCurrency[acc.currency] = (byCurrency[acc.currency] || 0) + acc.balance; // Tilføj balance til valutafordelingen
      });
      countEl.textContent    = activeAccounts.length; // Sæt antal konti til antal aktive konti
      const totalUSD = accounts.reduce((sum, acc) => sum + (acc.balanceUSD || 0), 0); // Beregn total USD
      totalBalEl.textContent = `${totalUSD.toFixed(2)} USD`;
      const grandTotal = Object.values(byCurrency).reduce((a,b) => a + b, 0);
      const parts      = Object.entries(byCurrency) // 
        .map(([cur,bal]) => `${cur} ${((bal/grandTotal)*100).toFixed(0)}%`); // procentdel af de forskellige valutaer
      currencyEl.textContent = parts.join(', '); // viser valutafordelingen i procent
    }
  
    function renderTable(accounts) { // Generer kontotabelrækker og tilføjer events til knapper
      tbody.innerHTML = ''; // fjerner alle eksisterende rækker
      accounts.forEach(acc => { // Loop igennem alle konti
        const tr = document.createElement('tr'); // Opret en ny række
        // sætter en celle-HTML kode til at vise konti-data
        tr.innerHTML = `
          <td>${acc.accountID}</td>
          <td>${acc.name}</td>
          <td>${acc.bank}</td>
          <td>${acc.currency}</td>
          <td class="value">${acc.balance.toFixed(2)} ${acc.currency}</td>
          <td class="value">${acc.balanceUSD.toFixed(2)} USD</td>
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
        tbody.appendChild(tr); // Tilføj rækken til tabellen
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
  
    if (newBtn && createAccountModal && createAccountForm && newAccountName && newAccountCurrency && newAccountBank) {
      newBtn.addEventListener('click', () => { // Åbner modalen til at oprette en ny konto
        createAccountError.textContent = '';
        newAccountName.value = '';
        newAccountCurrency.value = '';
        newAccountBank.value = '';
        createAccountModal.style.display = 'flex';
        newAccountName.focus();
      });
    }
  
    // lukker opret konto modal
    if (cancelCreateAccount && createAccountModal) {
      cancelCreateAccount.addEventListener('click', () => {
        createAccountModal.style.display = 'none';
      });
    }
  
    if (createAccountForm) { 
      createAccountForm.addEventListener('submit', async (e) => { // Håndtere opret konto formular
        e.preventDefault(); // forhindrer default handling/reload
        createAccountError.textContent = ''; // Fjerner fejlmeddelelse
        const name = newAccountName.value.trim(); // Henter navnet fra inputfeltet
        const currency = newAccountCurrency.value.trim();
        const bank = newAccountBank.value.trim();
        if (!name || !currency || !bank) {
          createAccountError.textContent = 'Alle felter skal udfyldes!';
          return; // Tjekker alle inputfelterne
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
  
    if (depositForm) {
      depositForm.addEventListener('submit', async (e) => { // Håndtere deposit formular
        e.preventDefault();
        depositError.textContent = ''; // Fjerner fejlmeddelelse
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
  