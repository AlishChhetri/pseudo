document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('api-credentials-form');
    const apiList = document.getElementById('api-list');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const apiName = document.getElementById('api-name').value;
        const apiKey = document.getElementById('api-key').value;

        const response = await fetch('/api/credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: apiName, key: apiKey }),
        });

        if (response.ok) {
            loadApiCredentials();
            form.reset();
        }
    });

    async function loadApiCredentials() {
        const response = await fetch('/api/credentials');
        const credentials = await response.json();
        apiList.innerHTML = '';
        credentials.forEach((credential) => {
            const li = document.createElement('li');
            li.textContent = `${credential.name}: ${credential.key}`;
            apiList.appendChild(li);
        });
    }

    loadApiCredentials();
});