// public/js/portfolio.js

const API_BASE = ''; // relative calls to your own server

// Show a message in the table‐header area
function showTableMessage(message, isError = false) {
  let el = document.querySelector('.table-header .message');
  if (el) el.remove();
  el = document.createElement('div');
  el.className = `message ${isError ? 'error' : 'success'}`;
  el.textContent = message;
  document.querySelector('.table-header').appendChild(el);
}

// Central fetch + JSON parser with credentials
async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    let err = 'Ukendt fejl';
    try { const body = await res.json(); if (body.message) err = body.message; }
    catch {}
    throw new Error(err);
  }
  return res.json();
}

// Fill the <tbody> with portfolio rows
function populateTable(portfolios) {
  const tbody = document.querySelector('table tbody');
  tbody.innerHTML = portfolios.map(p => `
    <tr>
      <td>${p.name}</td>
      <td class="value">${p.value.toLocaleString()} DKK</td>
      <td>
        <span class="percent ${p.change >= 0 ? 'positive' : 'negative'}">
          ${p.change.toFixed(1)}%
        </span>
      </td>
      <td class="value">${p.realizedGain.toLocaleString()} DKK</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const userId = window.USER_ID;
  if (!userId) {
    showTableMessage('Ingen bruger fundet. Log ind igen.', true);
    return;
  }

  // Load & render portfolios
  async function loadPortfolios() {
    try {
      const portfolios = await fetchJSON(`/portfolios/user/${userId}`);
      populateTable(portfolios);
      // Update count card
      const countEl = document.querySelector('.metrics .card .value');
      if (countEl) countEl.textContent = portfolios.length;
      showTableMessage(''); // clear any previous message
    } catch (err) {
      console.error(err);
      showTableMessage(`Fejl ved hentning af porteføljer: ${err.message}`, true);
    }
  }

  await loadPortfolios();

  // “Opret ny portefølje” button
  const createBtn = document.querySelector('.table-header button');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const name      = prompt('Navn på ny portefølje:');
      const accountId = prompt('Account ID:');
      if (!name || !accountId) {
        showTableMessage('Du skal indtaste både navn og account ID.', true);
        return;
      }
      try {
        await fetchJSON('/portfolios/create', {
          method: 'POST',
          body: JSON.stringify({ userId, name, accountId })
        });
        showTableMessage('Portefølje oprettet!');
        await loadPortfolios();
      } catch (err) {
        console.error(err);
        showTableMessage(`Fejl ved oprettelse: ${err.message}`, true);
      }
    });
  }
});
