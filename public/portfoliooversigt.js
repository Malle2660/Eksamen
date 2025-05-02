/*
const API_URL = 'http://localhost:3000'
// Helper til at vise beskeder (f.eks. fejl) under tabellen
function showTableMessage(message, isError = false) {
  let el = document.querySelector('.table-header .message');
  if (el) el.remove();

  el = document.createElement('div');
  el.className = `message ${isError ? 'error' : 'success'}`;
  el.textContent = message;
  document.querySelector('.table-header').appendChild(el);
}

document.addEventListener('DOMContentLoaded', () => {
  const userId = window.USER_ID;
  if (!userId) {
    showTableMessage('Ingen bruger fundet. Log ind igen.', true);
    return;
  }

  // 1) Hent og vis alle porteføljer
  loadPortfolios(userId);

  // 2) Sæt knap til “Opret ny” til at kalde createPortfolio
  const createBtn = document.querySelector('.table-header button');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const name      = prompt('Navn på ny portefølje:');
      const accountId = prompt('Account ID:');
      if (!name || !accountId) {
        showTableMessage('Du skal indtaste både navn og account ID.', true);
        return;
      }
      await createPortfolio(userId, name, accountId);
    });
  }
});

async function loadPortfolios(userId) {
  try {
    const res = await fetch(`/portfolios/user/${userId}`);
    if (!res.ok) throw new Error('Kunne ikke hente data');
    const portfolios = await res.json();

    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';  // ryd eksisterende

    portfolios.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.name}</td>
        <td class="value">${p.value.toLocaleString()} DKK</td>
        <td>
          <span class="percent ${p.change >= 0 ? 'positive' : 'negative'}">
            ${p.change.toFixed(1)}%
          </span>
        </td>
        <td class="value">${p.realizedGain.toLocaleString()} DKK</td>
      `;
      tbody.appendChild(tr);
    });

    // Opdater “Antal porteføljer”‐kort
    document.querySelector('.metrics .card .value').textContent = portfolios.length;
  } catch (err) {
    console.error(err);
    showTableMessage('Fejl ved hentning af porteføljer', true);
  }
}

async function createPortfolio(userId, name, accountId) {
  try {
    const res = await fetch('/portfolios/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, accountId })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Ukendt fejl ved oprettelse');
    }

    showTableMessage('Portefølje oprettet!');
    // genindlæs listen
    loadPortfolios(userId);
  } catch (err) {
    console.error(err);
    showTableMessage(err.message, true);
  }
}
/*