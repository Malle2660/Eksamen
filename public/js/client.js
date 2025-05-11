// public/client.js - klient-side JavaScript for at håndtere brugerinteraktioner og porteføljeopdateringer

// Base-URL til API som er tom, for vi bruger relative URL'er til at kommunikere med backend(auth.js)
const API_URL = ''; 

// Funktion til at vise beskeder til brugeren om fejl eller succes
function showMessage(selector, message, isError = false) {
  const container = document.querySelector(selector);
  if (!container) return;
  let existing = container.querySelector('.message'); // fjern tidligere besked hvis der er en
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = `message ${isError ? 'error' : 'success'}`; // tilføj Cklassen error eller success til div 
  div.textContent = message; // tilføj besked til div
  container.appendChild(div); // tilføj div til container
}
//
document.addEventListener('DOMContentLoaded', () => {
  // Registrering 
  const regForm = document.getElementById('register');
  if (regForm) {
    regForm.addEventListener('submit', async e => {
      e.preventDefault(); // forrhindrer form'en i at reloade siden

      // Henter værdierne fra inputfelterne
      const username = document.getElementById('reg-username').value;
      const email    = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      try {
        // sender en POST-forspørgsel til backend for at oprette bruger
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          showMessage('#register', 'Bruger oprettet succesfuldt! Du kan nu logge ind.');
          regForm.reset(); // nulstiller inputfelterne
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
        // sender en POST-forspørgsel til backend for at logge brugeren ind og modtage en session-cookie
        const res = await fetch('/auth/login', {
          method: 'POST',
          credentials: 'include', // inkluderer cookies i request
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
  const cpForm = document.getElementById('changePassword'); // henter formularen til adgangskodeændring
  if (cpForm) {
    cpForm.addEventListener('submit', async e => {
      e.preventDefault(); // forhindrer form'en i at reloade siden  

      // Henter den nurværende og nye adgangskode fra inputsfelterne
      const current = document.getElementById('current-password').value;
      const next    = document.getElementById('new-password').value;

      try {
        // sender en POST-forspørgsel til backend for at ændre adgangskoden
        const res = await fetch(`${API_URL}/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // inkluderer cookies i request
          body: JSON.stringify({ currentPassword: current, newPassword: next })
        });
        const data = await res.json(); // modtager svar fra backend
        if (res.ok) { 
          // vis besked om succesfuld adgangskodeændring
          showMessage('#changePassword', 'Adgangskode ændret succesfuldt!');
          cpForm.reset(); // nulstiller inputfelterne
        } else {
          // vis besked om fejl
          showMessage('#changePassword', data.message, true);
        }
      } catch {
        // vis besked om fejl ved adgangskodeændring
        showMessage('#changePassword', 'Der skete en fejl ved ændring af adgangskode', true);
      }
    });
  }

  // Porteføljevisning på dashboard
  const tableContainer = document.querySelector('.tables'); // henter containeren for porteføljetabellen
  if (tableContainer) {
    const userId = window.USER_ID; // Bruger_ID er synlig i browseren fordi vi har sat den som global variabel i auth.js
    if (!userId) {
      // vis besked om fejl hvis bruger ikke er logget ind 
      showMessage('.tables .table-header', 'Du er ikke logget ind – login igen', true);
      return;
    }

    // Kalder funktionen til at hente og vis porteføljer i tabellen 
    loadPortfolios(userId);

    // Bind "Opret ny"
    const createBtn = document.querySelector('.table-header button'); // henter knappen "oprette ny portefølje"
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        // Beder brugeren om at indtast navn og account ID for den nye portefølje 
        const name      = prompt('Navn på ny portefølje:');
        const accountId = prompt('Account ID:');
        // Hvis navn eller account ID ikke er udfyldt, vis besked om fejl
        if (!name || !accountId) {
          showMessage('.table-header', 'Navn og account ID skal udfyldes', true);
          return;
        }
        // Kalder funktionen til at oprette den nye portefølje og opdaterer porteføljetabellen  
        await createPortfolio(userId, name, accountId);
      });
    }
  }

  // henter og viser brugerens porteføljer i tabellen og opdaterer kortene på dashboardet 
  async function loadPortfolios(userId) {
    try {
      // Henter porteføljer fra backend for den aktuelle bruger
      const res  = await fetch(`/portfolios/user/${userId}`, { credentials: 'include' });
      // Hvis der opstår en fejl, vis besked om fejl 
      if (!res.ok) throw new Error('Kunne ikke hente porteføljer');
      const data = await res.json(); // læs JSON-svaret fra backend

      // Finder <tbody> i tabellen og nulstiller dens indhold, så ikke kan se gamle rækker igen
      const tbody = document.querySelector('table tbody');
      tbody.innerHTML = '';

      // Loop gennem alle porteføljerne og opretter en ny række i tabellen for hver portefølje
      data.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.name}</td> // viser navnet på porteføljen
          <td class="value">${p.value.toLocaleString()} DKK</td> // viser værdien af porteføljen i DKK
          <td><span class="percent ${p.change>=0?'positive':'negative'}"> // viser procentvis ændring i porteføljen
              ${p.change.toFixed(1)}%
            </span>
          </td>
          <td class="value">${p.realizedGain.toLocaleString()} DKK</td>`; // viser realiseret gevinst i DKK
        tbody.appendChild(tr); // tilføjer rækken til tabellen
      });

      // Opdater kortene på dashboardet med antal porteføljer og samlet værdi i DKK 
      document.querySelectorAll('.metrics .card .value')[0].textContent = data.length;
      const total = data.reduce((sum,p)=> sum+p.value,0);
      document.querySelectorAll('.metrics .card .value')[1].textContent = total.toLocaleString() + ' DKK';

      // vis besked om fejl hvis der opstår en fejl ved hentning af porteføljer
    } catch (err) {
      console.error(err);
      showMessage('.tables .table-header', 'Fejl ved hentning af porteføljer', true);
    }
  }

  // Opretter en ny portefølje via API-kald til backend
  async function createPortfolio(userId, name, accountId) {
    try {
      // sender en POST-forspørgsel til backend med oplysninger for at oprette en ny portefølje
      const res = await fetch('/portfolios/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // angiver at vi sender JSON-data
        credentials: 'include', // inkluderer session-cookie i request (for autentificering)
        body: JSON.stringify({ userId, name, accountId }) // konverterer data til en JSON-streng
      });
      const data = await res.json(); // modtager svar fra backend 
      if (!res.ok) throw new Error(data.message || 'Fejl ved oprettelse'); // hvis der opstår en fejl, vis besked om fejl

      // vis besked om succesfuld oprettelse og opdater porteføljetabellen
      showMessage('.table-header', 'Portefølje oprettet');
      loadPortfolios(userId); // opdaterer porteføljetabellen, så den nye vises
    } catch (err) {
      console.error(err); // vis besked om fejl
      showMessage('.tables .table-header', err.message, true); // vis besked om fejl  
    }
  }

});
