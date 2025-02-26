document.addEventListener('DOMContentLoaded', function() {
    const modeTags = document.querySelectorAll('.settings-mode-tag');
    const providerInput = document.querySelector('.settings-input[placeholder*="OpenAI"]');
    const apiKeyInput = document.querySelector('.settings-input[type="password"]');
    const saveButton = document.querySelector('.settings-save-button');
    
    // Track selected modes
    let selectedModes = new Set();
    
    modeTags.forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('active');
            const mode = tag.dataset.mode;
            if (tag.classList.contains('active')) {
                selectedModes.add(mode);
            } else {
                selectedModes.delete(mode);
            }
        });
    });
    
    saveButton.addEventListener('click', async () => {
        const providerName = providerInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        
        if (!providerName || !apiKey || selectedModes.size === 0) {
            alert('Please fill in all fields and select at least one mode');
            return;
        }
        
        const configData = {
            provider: providerName,
            apiKey: apiKey,
            modes: Array.from(selectedModes)
        };
        
        try {
            const response = await fetch('/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(configData)
            });
            
            if (response.ok) {
                // Refresh the provider list
                location.reload();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save configuration');
            }
        } catch (error) {
            alert('Error saving configuration: ' + error.message);
        }
    });

    renderModeCards();
});

function createProviderItem(providerName, providerData, modeName) {
    const providerItem = document.createElement('div');
    providerItem.className = 'settings-provider-item';
    providerItem.innerHTML = `
        <div class="provider-main">
            <div class="provider-name">${providerName}</div>
            <div class="provider-actions">
                <button class="action-btn edit-btn" title="Edit API Key">✏️</button>
                <button class="action-btn delete-btn" title="Delete Provider">🗑️</button>
                <div class="action-overlay delete-confirm">
                    <span>Delete?</span>
                    <button class="confirm-btn">Yes</button>
                    <button class="cancel-btn">No</button>
                </div>
                <div class="action-overlay edit-overlay">
                    <input type="password" 
                           class="settings-input api-key-input" 
                           value="${providerData.api_key}"
                           placeholder="Enter new API key">
                    <button class="update-key-btn">Update</button>
                </div>
            </div>
        </div>
    `;

    const editBtn = providerItem.querySelector('.edit-btn');
    const deleteBtn = providerItem.querySelector('.delete-btn');
    const editOverlay = providerItem.querySelector('.edit-overlay');
    const deleteOverlay = providerItem.querySelector('.delete-confirm');
    
    function closeAllOverlays() {
        editOverlay.classList.remove('active');
        deleteOverlay.classList.remove('active');
    }

    function positionOverlay(button, overlay, isEdit = false) {
        const rect = button.getBoundingClientRect();
        if (isEdit) {
            overlay.style.top = `${rect.bottom + 8}px`;
            overlay.style.left = `${rect.left}px`;
        } else {
            overlay.style.top = `${rect.top}px`;
            overlay.style.left = `${rect.right + 8}px`;
        }
    }

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = editOverlay.classList.contains('active');
        closeAllOverlays();
        if (!isActive) {
            positionOverlay(editBtn, editOverlay, true);
            editOverlay.classList.add('active');
        }
    });

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = deleteOverlay.classList.contains('active');
        closeAllOverlays();
        if (!isActive) {
            positionOverlay(deleteBtn, deleteOverlay);
            deleteOverlay.classList.add('active');
        }
    });

    // Handle update
    const updateBtn = providerItem.querySelector('.update-key-btn');
    updateBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newKey = editOverlay.querySelector('.api-key-input').value;
        await updateApiKey(modeName, providerName, newKey);
        closeAllOverlays();
    });

    // Handle delete
    const confirmBtn = providerItem.querySelector('.confirm-btn');
    const cancelBtn = providerItem.querySelector('.cancel-btn');

    confirmBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteProvider(modeName, providerName);
        renderModeCards();
    });

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllOverlays();
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!editOverlay.contains(e.target) && 
            !deleteOverlay.contains(e.target) && 
            !editBtn.contains(e.target) && 
            !deleteBtn.contains(e.target)) {
            closeAllOverlays();
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (editOverlay.classList.contains('active')) {
            positionOverlay(editBtn, editOverlay, true);
        }
        if (deleteOverlay.classList.contains('active')) {
            positionOverlay(deleteBtn, deleteOverlay);
        }
    });

    return providerItem;
}

// Update the renderModeCards function to use createProviderItem
async function renderModeCards() {
    const modesContainer = document.querySelector('.settings-modes-container');
    
    try {
        const response = await fetch('/get-configs');
        const data = await response.json();
        
        modesContainer.innerHTML = '';
        
        for (const [modeName, modeData] of Object.entries(data.modes)) {
            const card = document.createElement('div');
            card.className = 'settings-mode-card';
            
            const title = document.createElement('div');
            title.className = 'settings-mode-title';
            title.textContent = formatModeName(modeName); // Changed from innerHTML to textContent
            
            const providersList = document.createElement('div');
            providersList.className = 'settings-providers-list';
            
            for (const [providerName, providerData] of Object.entries(modeData.providers)) {
                const providerItem = createProviderItem(providerName, providerData, modeName);
                providersList.appendChild(providerItem);
            }
            
            card.appendChild(title);
            card.appendChild(providersList);
            modesContainer.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading configurations:', error);
    }
}

async function deleteProvider(mode, provider) {
    try {
        const response = await fetch('/delete-provider', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mode, provider })
        });
        if (!response.ok) throw new Error('Failed to delete provider');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete provider');
    }
}

async function updateApiKey(mode, provider, newKey) {
    try {
        const response = await fetch('/update-api-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mode, provider, apiKey: newKey })
        });
        if (!response.ok) throw new Error('Failed to update API key');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update API key');
    }
}

function formatModeName(name) {
    return name.split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
}