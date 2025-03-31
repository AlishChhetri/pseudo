document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const addProviderBtns = document.querySelectorAll('.add-provider-btn');
    const modal = document.getElementById('add-provider-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.cancel-btn');
    const providerForm = document.getElementById('add-provider-form');
    const providerModeInput = document.getElementById('provider-mode');
    
    // Default providers selects
    const defaultTextProviderSelect = document.getElementById('default-text-provider');
    const defaultImageProviderSelect = document.getElementById('default-image-provider');
    const defaultAudioProviderSelect = document.getElementById('default-audio-provider');
    
    // Initialize
    init();
    
    /**
     * Initialize settings page
     */
    function init() {
        // Load provider data
        loadProviderData();
        
        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const mode = this.dataset.mode;
                switchTab(mode);
            });
        });
        
        // Add provider buttons
        addProviderBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const mode = this.dataset.mode;
                openAddProviderModal(mode);
            });
        });
        
        // Close modal buttons
        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Form submission
        providerForm.addEventListener('submit', handleFormSubmit);
        
        // Close modal on outside click
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    /**
     * Load provider data from API
     */
    function loadProviderData() {
        fetch('/api/configs')
            .then(response => response.json())
            .then(data => {
                // Populate the provider lists
                if (data.modes) {
                    for (const mode in data.modes) {
                        if (data.modes[mode].providers) {
                            populateProviderList(mode, data.modes[mode].providers);
                            populateDefaultProviderSelect(mode, data.modes[mode].providers);
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error loading provider data:', error);
            });
    }
    
    /**
     * Populate the provider list for a specific mode
     */
    function populateProviderList(mode, providers) {
        const providerList = document.getElementById(`${mode}-providers`);
        if (!providerList) return;
        
        // Clear existing providers
        providerList.innerHTML = '';
        
        // Add each provider
        for (const providerName in providers) {
            const providerData = providers[providerName];
            
            const providerCard = document.createElement('div');
            providerCard.className = 'provider-card';
            
            const header = document.createElement('div');
            header.className = 'provider-header';
            
            const title = document.createElement('h3');
            title.textContent = capitalizeFirstLetter(providerName);
            
            const actions = document.createElement('div');
            actions.className = 'provider-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-api-key';
            editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
            editBtn.title = 'Edit API key';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-provider';
            deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
            deleteBtn.title = 'Delete provider';
            
            // Mask API key
            let apiKey = providerData.api_key || '';
            let maskedKey = maskApiKey(apiKey);
            
            const apiKeyDiv = document.createElement('div');
            apiKeyDiv.className = 'api-key';
            apiKeyDiv.innerHTML = `<span>API Key:</span> <code>${maskedKey}</code>`;
            
            // Add models if available
            let modelsDiv = null;
            if (providerData.models && providerData.models.length > 0) {
                modelsDiv = document.createElement('div');
                modelsDiv.className = 'provider-models';
                modelsDiv.innerHTML = `<span>Models:</span> <code>${providerData.models.join(', ')}</code>`;
            }
            
            // Event listeners
            editBtn.addEventListener('click', function() {
                openEditApiKeyModal(mode, providerName, apiKey);
            });
            
            deleteBtn.addEventListener('click', function() {
                if (confirm(`Are you sure you want to delete the ${providerName} provider from ${mode} mode?`)) {
                    deleteProvider(mode, providerName);
                }
            });
            
            // Assemble the card
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            header.appendChild(title);
            header.appendChild(actions);
            providerCard.appendChild(header);
            providerCard.appendChild(apiKeyDiv);
            if (modelsDiv) {
                providerCard.appendChild(modelsDiv);
            }
            
            providerList.appendChild(providerCard);
        }
    }
    
    /**
     * Populate the default provider select dropdown for a specific mode
     */
    function populateDefaultProviderSelect(mode, providers) {
        const selectElement = document.getElementById(`default-${mode}-provider`);
        if (!selectElement) return;
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add an empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Select a provider --';
        selectElement.appendChild(emptyOption);
        
        // Add provider options
        for (const providerName in providers) {
            const option = document.createElement('option');
            option.value = providerName;
            option.textContent = capitalizeFirstLetter(providerName);
            selectElement.appendChild(option);
        }
        
        // Set current default
        const currentDefault = localStorage.getItem(`default_${mode}_provider`);
        if (currentDefault && selectElement.querySelector(`option[value="${currentDefault}"]`)) {
            selectElement.value = currentDefault;
        }
        
        // Add change listener
        selectElement.addEventListener('change', function() {
            localStorage.setItem(`default_${mode}_provider`, this.value);
        });
    }
    
    /**
     * Switch active tab
     */
    function switchTab(mode) {
        // Update tab buttons
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.mode === mode) {
                tab.classList.add('active');
            }
        });
        
        // Update tab content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${mode}-content`) {
                content.classList.add('active');
            }
        });
    }
    
    /**
     * Open the add provider modal
     */
    function openAddProviderModal(mode) {
        providerModeInput.value = mode;
        
        // Check the appropriate mode checkbox
        const modeCheckboxes = document.querySelectorAll('input[name="modes"]');
        modeCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === mode;
        });
        
        // Set provider dropdown based on mode
        const providerSelect = document.getElementById('provider-name');
        providerSelect.innerHTML = '';
        
        if (mode === 'text') {
            addOption(providerSelect, 'openai', 'OpenAI');
            addOption(providerSelect, 'anthropic', 'Anthropic');
            addOption(providerSelect, 'ollama', 'Ollama (Local)');
        } else if (mode === 'image') {
            addOption(providerSelect, 'openai', 'OpenAI');
            addOption(providerSelect, 'stability', 'Stability AI');
        } else if (mode === 'audio') {
            addOption(providerSelect, 'elevenlabs', 'ElevenLabs');
        }
        
        // Show modal
        modal.style.display = 'block';
    }
    
    /**
     * Open modal to edit API key
     */
    function openEditApiKeyModal(mode, provider, currentKey) {
        providerModeInput.value = mode;
        
        // Set provider name
        const providerSelect = document.getElementById('provider-name');
        providerSelect.innerHTML = '';
        addOption(providerSelect, provider, capitalizeFirstLetter(provider));
        providerSelect.disabled = true;
        
        // Set API key
        const apiKeyInput = document.getElementById('api-key');
        apiKeyInput.value = currentKey;
        
        // Check only the current mode
        const modeCheckboxes = document.querySelectorAll('input[name="modes"]');
        modeCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === mode;
            checkbox.disabled = true;
        });
        
        // Update modal title
        document.querySelector('.modal-header h3').textContent = 'Update API Key';
        
        // Show modal
        modal.style.display = 'block';
    }
    
    /**
     * Close the modal
     */
    function closeModal() {
        modal.style.display = 'none';
        providerForm.reset();
        
        // Reset form to default state
        document.getElementById('provider-name').disabled = false;
        document.querySelectorAll('input[name="modes"]').forEach(checkbox => {
            checkbox.disabled = false;
        });
        
        // Reset modal title
        document.querySelector('.modal-header h3').textContent = 'Add Provider';
    }
    
    /**
     * Handle form submission
     */
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const mode = providerModeInput.value;
        const provider = document.getElementById('provider-name').value;
        const apiKey = document.getElementById('api-key').value;
        
        // Get selected modes
        const selectedModes = [];
        document.querySelectorAll('input[name="modes"]:checked').forEach(checkbox => {
            selectedModes.push(checkbox.value);
        });
        
        if (!provider || !apiKey || selectedModes.length === 0) {
            alert('Please fill out all required fields');
            return;
        }
        
        // Check if updating or adding
        if (document.getElementById('provider-name').disabled) {
            // Update API key
            updateApiKey(mode, provider, apiKey);
        } else {
            // Add new provider
            addProvider(provider, apiKey, selectedModes);
        }
    }
    
    /**
     * Add a new provider
     */
    function addProvider(provider, apiKey, modes) {
        fetch('/api/save-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: provider,
                apiKey: apiKey,
                modes: modes
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeModal();
                loadProviderData();
            } else {
                alert(`Error: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('Error adding provider:', error);
            alert('Error adding provider. See console for details.');
        });
    }
    
    /**
     * Update an API key
     */
    function updateApiKey(mode, provider, apiKey) {
        fetch('/api/update-api-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: mode,
                provider: provider,
                apiKey: apiKey
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeModal();
                loadProviderData();
            } else {
                alert(`Error: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('Error updating API key:', error);
            alert('Error updating API key. See console for details.');
        });
    }
    
    /**
     * Delete a provider
     */
    function deleteProvider(mode, provider) {
        fetch('/api/delete-provider', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: mode,
                provider: provider
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadProviderData();
            } else {
                alert(`Error: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('Error deleting provider:', error);
            alert('Error deleting provider. See console for details.');
        });
    }
    
    /**
     * Helper function to mask API key
     */
    function maskApiKey(key) {
        if (!key) return '';
        if (key.length <= 8) return '••••••••';
        
        return key.substr(0, 4) + '••••••••' + key.substr(-4);
    }
    
    /**
     * Helper function to add an option to a select element
     */
    function addOption(select, value, text) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }
    
    /**
     * Helper function to capitalize the first letter of a string
     */
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}); 