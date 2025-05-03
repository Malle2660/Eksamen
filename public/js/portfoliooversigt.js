// public/js/portfolio.js

const API_BASE = ''; // relative calls

// Vis en besked i .table-header
function showTableMessage(message, isError = false) {
  let el = document.querySelector('.table-header .message');
  if (el) el.remove();
  el = document.createElement('div');
  el.className = `message ${isError ? 'error' : 'success'}`;
  el.textContent = message;
  document.querySelector('.table-header').appendChild(el);
}

// Central fetch + JSON parser med credentials
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

// Fyld <tbody> med porteføljer
function populateTable(portfolios) {
  const tbody = document.querySelector('table tbody');
  tbody.innerHTML = portfolios.map(p => `
    <tr>
      <td>${p.name}</td>
      <td class="value">${p.value.toLocaleString('da-DK')} DKK</td>
      <td>
        <span class="percent ${p.change >= 0 ? 'positive' : 'negative'}">
          ${p.change.toFixed(1)}%
        </span>
      </td>
      <td class="value">${p.realizedGain.toLocaleString('da-DK')} DKK</td>
    </tr>
  `).join('');
}

// ─── Ny: hent portefølje‑oversigt ────────────────────────────────────────────
async function loadPortfolioOverview(portfolioId) {
  try {
    // Kald endpoint i growthRoutes: /growth/portfolio/:id/overview
    const data = await fetchJSON(`/growth/portfolio/${portfolioId}/overview`);
    // Vis oversigt i UI (sørg for at du har disse elementer i din EJS)
    document.getElementById('overviewTotal').textContent     =
      `${data.totalExpected.toLocaleString('da-DK')} DKK`;
    document.getElementById('overviewRealized').textContent  =
      `${data.totalPurchase.toLocaleString('da-DK')} DKK`;
    document.getElementById('overviewUnrealized').textContent=
      `${data.totalUnrealized.toLocaleString('da-DK')} DKK`;
  } catch (err) {
    showTableMessage(`Kunne ikke hente portefølje‑oversigt: ${err.message}`, true);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const userId      = window.USER_ID;
  const portfolioId = window.PORTFOLIO_ID;

  if (!userId) {
    showTableMessage('Ingen bruger fundet. Log ind igen.', true);
    return;
  }
  if (!portfolioId) {
    showTableMessage('Manglende portefølje‑ID', true);
    return;
  }

  // 0) Hent og vis portefølje‑oversigt
  await loadPortfolioOverview(portfolioId);

  // 1) Load & render portfolios (din eksisterende kode)
  async function loadPortfolios() {
    try {
      const portfolios = await fetchJSON(`/portfolios/user/${userId}`);
      populateTable(portfolios);
      // Update count‑kort (hvis du bruger et sådan)
      const countEl = document.querySelector('.metrics .card .value');
      if (countEl) countEl.textContent = portfolios.length;
      showTableMessage(''); // fjern eventuelle fejlbeskeder
    } catch (err) {
      console.error(err);
      showTableMessage(`Fejl ved hentning af porteføljer: ${err.message}`, true);
    }
  }
  await loadPortfolios();

  // 2) “Opret ny portefølje” knap (samme som før)
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
