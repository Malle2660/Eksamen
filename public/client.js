const API_URL = 'http://localhost:3000';

// Helper til at vise beskeder
function showMessage(formId, message, isError = false) {
    const form = document.getElementById(formId);
    const existingMessage = form.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.textContent = message;
    form.appendChild(messageDiv);
}

// Håndtering af brugerregistrering
document.getElementById('register').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('register', 'Bruger oprettet succesfuldt! Du kan nu logge ind.');
            document.getElementById('register').reset();
        } else {
            showMessage('register', data.message, true);
        }
    } catch (error) {
        showMessage('register', 'Der skete en fejl ved oprettelse af bruger', true);
    }
});

// Håndtering af login
document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            window.location.href = '/portfolio'; // Skift til portefølje-siden
        } else {
            showMessage('login', data.message, true);
        }
    } catch (error) {
        showMessage('login', 'Fejl ved login', true);
    }
});

// Håndtering af adgangskodeændring
document.getElementById('changePassword').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!token || !userId) {
        showMessage('changePassword', 'Du skal være logget ind for at ændre adgangskode', true);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId, currentPassword, newPassword })
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('changePassword', 'Adgangskode ændret succesfuldt!');
            document.getElementById('changePassword').reset();
        } else {
            showMessage('changePassword', data.message, true);
        }
    } catch (error) {
        showMessage('changePassword', 'Der skete en fejl ved ændring af adgangskode', true);
    }
});

// aktie og valuta ligger her for nu, men de skal kobles i forhold til datbabasen og porteføljesiden. 


