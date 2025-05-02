// public/client.js

const API_URL = ''; // Tom, så vi bruger relative URL’er: "/auth/..."

function showMessage(selector, message, isError = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  let existing = container.querySelector('.message');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = `message ${isError ? 'error' : 'success'}`;
  div.textContent = message;
  container.appendChild(div);
}

document.addEventListener('DOMContentLoaded', () => {
  // — Registrering —
  const regForm = document.getElementById('register');
  if (regForm) {
    regForm.addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value;
      const email    = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          showMessage('#register', 'Bruger oprettet succesfuldt! Du kan nu logge ind.');
          regForm.reset();
        } else {
          showMessage('#register', data.message, true);
        }
      } catch {
        showMessage('#register', 'Der skete en fejl ved oprettelse af bruger', true);
      }
    });
  }

  // — Login —
  const loginForm = document.getElementById('login');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
          // Session‐cookie er sat, redirect til porteføljer
          window.location.href = '/portfolios';
        } else {
          showMessage('#login', data.message, true);
        }
      } catch {
        showMessage('#login', 'Fejl ved login', true);
      }
    });
  }

  // — Skift adgangskode —
  const cpForm = document.getElementById('changePassword');
  if (cpForm) {
    cpForm.addEventListener('submit', async e => {
      e.preventDefault();
      const current = document.getElementById('current-password').value;
      const next    = document.getElementById('new-password').value;

      try {
        const res = await fetch(`${API_URL}/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword: current, newPassword: next })
        });
        const data = await res.json();
        if (res.ok) {
          showMessage('#changePassword', 'Adgangskode ændret succesfuldt!');
          cpForm.reset();
        } else {
          showMessage('#changePassword', data.message, true);
        }
      } catch {
        showMessage('#changePassword', 'Der skete en fejl ved ændring af adgangskode', true);
      }
    });
  }
//window.location.href = '/portfolios';
  // — Portefølje‐side logik — 
  const tableContainer = document.querySelector('.tables');
  if (tableContainer) {
    const userId = window.USER_ID;
    if (!userId) {
      showMessage('.tables .table-header', 'Du er ikke logget ind – login igen', true);
      return;
    }

    // Hent og vis porteføljer
    loadPortfolios(userId);

    // Bind “Opret ny”
    const createBtn = document.querySelector('.table-header button');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        const name      = prompt('Navn på ny portefølje:');
        const accountId = prompt('Account ID:');
        if (!name || !accountId) {
          showMessage('.table-header', 'Navn og account ID skal udfyldes', true);
          return;
        }
        await createPortfolio(userId, name, accountId);
      });
    }
  }
});

async function loadPortfolios(userId) {
  try {
    const res  = await fetch(`/portfolios/user/${userId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Kunne ikke hente porteføljer');
    const data = await res.json();

    // Rens og fyld tabel
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';
    data.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.name}</td>
        <td class="value">${p.value.toLocaleString()} DKK</td>
        <td><span class="percent ${p.change>=0?'positive':'negative'}">
            ${p.change.toFixed(1)}%
          </span>
        </td>
        <td class="value">${p.realizedGain.toLocaleString()} DKK</td>`;
      tbody.appendChild(tr);
    });

    // Opdater kortene
    document.querySelectorAll('.metrics .card .value')[0].textContent = data.length;
    const total = data.reduce((sum,p)=> sum+p.value,0);
    document.querySelectorAll('.metrics .card .value')[1].textContent = total.toLocaleString() + ' DKK';
  } catch (err) {
    console.error(err);
    showMessage('.tables .table-header', 'Fejl ved hentning af porteføljer', true);
  }
}

async function createPortfolio(userId, name, accountId) {
  try {
    const res = await fetch('/portfolios/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, name, accountId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Fejl ved oprettelse');

    showMessage('.table-header', 'Portefølje oprettet');
    loadPortfolios(userId);
  } catch (err) {
    console.error(err);
    showMessage('.table-header', err.message, true);
  }
}
