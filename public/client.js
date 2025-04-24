// API endpoint
const API_URL = 'http://localhost:3000/api';

// Helper til at vise fejl/success beskeder
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

// Register handling
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

// Login handling
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
            // Gem token og brugerdata
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
        
            // Redirect til portfolio-siden
            window.location.href = '/portfolio';
        }
        
// Change password handling
document.getElementById('changePassword').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hent password information
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    // Tjek om bruger er logget ind
    if (!token || !userId) {
        showMessage('changePassword', 'Du skal være logget ind for at ændre adgangskode', true);
        return;
    }

    try {
        // Send password ændrings request
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Send token med for at bevise login
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
    