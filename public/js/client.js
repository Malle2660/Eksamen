// public/client.js - Denne fil håndterer brugerinteraktioner og visning af porteføljeropdateringer

//Base URL for API som er tomt, for vi bruger relative URL'er til at kommunikere med backend (auth.js)
const API_URL = ''; 

// Funktion til at vise beskeder til brugeren om fejl eller succes
function showMessage(selector, message, isError = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  let existing = container.querySelector('.message'); // fjerner tidligere beskeder hvis der er nogen
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = `message ${isError ? 'error' : 'success'}`; // tilføjer en class til div elementet
  div.textContent = message; // tilføjer besked til div
  container.appendChild(div); // tilføjer div elementet til containeren
}

document.addEventListener('DOMContentLoaded', () => {
  // Registrering 
  const regForm = document.getElementById('register');
  if (regForm) {
    regForm.addEventListener('submit', async e => {
      e.preventDefault(); //Forhindrer form'en i at reloade siden 

      // Henter værdierne fra inputfelterne
      const username = document.getElementById('reg-username').value;
      const email    = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      try {
        // sender POST-forespørgsel til backend for at oprette bruger 
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          showMessage('#register', 'Bruger oprettet succesfuldt! Du kan nu logge ind.');
          regForm.reset(); // Nulstiller inputfelterne
        } else {
          showMessage('#register', data.message, true);
        }
      } catch {
        showMessage('#register', 'Der skete en fejl ved oprettelse af bruger', true);
      }
    });
  }

  // Login 
  const loginForm = document.getElementById('login');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      try {
        // sender POST-forespørgsel til backend for at logge brugeren ind og modtage en session-cookie
        const res = await fetch('/auth/login', {
          method: 'POST',
          credentials: 'include', // Inkluderer cookies i forespørgslen
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
          // Session-cookie er sat, redirect til dashboard
          window.location.href = '/dashboard'; // omdirigerer til dashboard ved succes
        } else {
          showMessage('#login', data.message, true);
        }
      } catch {
        showMessage('#login', 'Fejl ved login', true);
      }
    });
  }

  // Skift adgangskode
  const cpForm = document.getElementById('changePassword'); // Henter formularen til adgangskodeændring
  if (cpForm) {
    cpForm.addEventListener('submit', async e => {
      e.preventDefault(); // Forhindrer form'en i at reloade siden

      //Henter den nurværende og nye adgangskode fra inputfelterne
      const current = document.getElementById('current-password').value;
      const next    = document.getElementById('new-password').value;

      try {
        // sender POST-forespørgsel til backend for at ændre adgangskoden
        const res = await fetch(`${API_URL}/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Inkluderer cookies i forespørgslen
          body: JSON.stringify({ currentPassword: current, newPassword: next })
        });
        const data = await res.json(); // Henter svaret fra backend
        if (res.ok) {
          // Viser en besked til brugeren om at adgangskoden er ændret
          showMessage('#changePassword', 'Adgangskode ændret succesfuldt!');
          cpForm.reset(); // Nulstiller inputfelterne
        } else {
          // Viser en besked til brugeren om at adgangskoden er fejl
          showMessage('#changePassword', data.message, true);
        }
      } catch {
        // Viser en besked til brugeren om at adgangskoden er fejl
        showMessage('#changePassword', 'Der skete en fejl ved ændring af adgangskode', true);
      }
    });
  }

  // Porteføljevisning på dashboard
  const tableContainer = document.querySelector('.tables'); // Henter containeren for porteføljetabellen
  if (tableContainer) {
    const userId = window.USER_ID; // Bruger-iD er synligt i browseren, fordi vi har sat den som global variabel auth.js 
    if (!userId) {
      // Viser en besked til brugeren om at de ikke er logget ind
      showMessage('.tables .table-header', 'Du er ikke logget ind – login igen', true);
      return;
    }

    // Kalder funktionen til at hente og vise porteføljer i tabellen
    loadPortfolios(userId);

    // Bind "Opret ny"
    const createBtn = document.querySelector('.table-header button'); // Henter knappen til at oprette en ny portefølje
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        // Beder brugeren om at indsætte et navn og en konto-ID for at oprette en ny portefølje
        const name      = prompt('Navn på ny portefølje:');
        const accountId = prompt('Account ID:');
        // Hvis der ikke er indtastet et navn eller en konto-ID, vises en besked om fejl til brugeren
        if (!name || !accountId) {
          showMessage('.table-header', 'Navn og account ID skal udfyldes', true);
          return;
        }
        // Kalder funktionen til at oprette en ny portefølje og opdaterer porteføljetabellen
        await createPortfolio(userId, name, accountId);
      });
    }
  }

  // Henter og viser brugerens porteføljer i tabellen og opdaterer kortene på dashboardet
  async function loadPortfolios(userId) {
    try {
      // henter porteføljer fra backend for den pågældende bruger
      const res  = await fetch(`/portfolios/user/${userId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Kunne ikke hente porteføljer');
      const data = await res.json(); // Henter svaret fra backend

      // Rens og fyld tabel (Finder <tbody> i tabellen og sletter alle eksisterende rækker)
      const tbody = document.querySelector('table tbody');
      tbody.innerHTML = '';

      // Loop igennem hver portefølje og opretter en ny række i tabellen
      data.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.name}</td>
          <td class="value">${p.value.toLocaleString()} DKK</td>
          <td><span class="percent ${p.change>=0?'positive':'negative'}">
              ${p.change.toFixed(1)}%
            </span>
          </td>
          <td class="value">${p.realizedGain.toLocaleString()} DKK</td>`; // viser den realiseret gevinst i tabellen i DKK
        tbody.appendChild(tr); // Tilføjer rækken til tabellen
      });

      // Opdater kortene på dashboardet med antal porteføljer og samlet værdi i DKK
      document.querySelectorAll('.metrics .card .value')[0].textContent = data.length;
      const total = data.reduce((sum,p)=> sum+p.value,0);
      document.querySelectorAll('.metrics .card .value')[1].textContent = total.toLocaleString() + ' DKK';
      //vis besked om fejl hvis der opstår en fejl ved hentning af porteføljer 
    } catch (err) {
      console.error(err);
      showMessage('.tables .table-header', 'Fejl ved hentning af porteføljer', true);
    }
  }
  // Oprettelse af en ny portefølje via API-kald til backend
  async function createPortfolio(userId, name, accountId) {
    try {
      // sender POST-forespørgsel til backend for at oprette en ny portefølje
      const res = await fetch('/portfolios/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // angiver at vi sender JSON-data
        credentials: 'include', // Inkluderer cookies i forespørgslen
        body: JSON.stringify({ userId, name, accountId }) // sender data til backend
      });
      const data = await res.json(); // Henter svaret fra backend
      if (!res.ok) throw new Error(data.message || 'Fejl ved oprettelse'); // viser besked om fejl hvis der opstår en fejl ved oprettelse

      showMessage('.table-header', 'Portefølje oprettet'); // viser besked om at porteføljen er oprettet
      loadPortfolios(userId); // kalder funktionen til at opdatere porteføljetabellen
    } catch (err) {
      console.error(err); // viser besked om fejl hvis der opstår en fejl ved oprettelse
      showMessage('.tables .table-header', err.message, true);
    }
  }

});

