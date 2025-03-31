document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab content
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Show selected tab content
            const mode = this.dataset.mode;
            document.getElementById(`${mode}-content`).classList.add('active');
        });
    });
    
    // Modal functionality
    const modal = document.getElementById('add-provider-modal');
    const addProviderBtns = document.querySelectorAll('.add-provider-btn');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.cancel-btn');
    const providerModeInput = document.getElementById('provider-mode');
    const providerNameSelect = document.getElementById('provider-name');
    const apiKeyInput = document.getElementById('api-key');
    const modeCheckboxes = document.querySelectorAll('input[name="modes"]');
    
    // Open modal with appropriate mode
    addProviderBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.dataset.mode;
            
            // Set the hidden mode input
            providerModeInput.value = mode;
            
            // Filter provider select options based on mode
            filterProviderOptions(mode);
            
            // Pre-check the corresponding mode checkbox
            modeCheckboxes.forEach(checkbox => {
                checkbox.checked = checkbox.value === mode;
            });
            
            // Show modal
            modal.classList.add('active');
        });
    });
    
    // Filter provider options based on selected mode
    function filterProviderOptions(mode) {
        const options = providerNameSelect.options;
        
        // Reset options
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = 'block';
        }
        
        // Filter based on mode
        if (mode === 'text') {
            // Show all text providers (OpenAI, Anthropic, Ollama)
            // Hide non-text providers
            for (let i = 0; i < options.length; i++) {
                const value = options[i].value;
                if (value === 'stability' || value === 'elevenlabs') {
                    options[i].style.display = 'none';
                }
            }
            // Select OpenAI by default
            providerNameSelect.value = 'openai';
        } else if (mode === 'image') {
            // Show image providers (OpenAI, Stability)
            // Hide non-image providers
            for (let i = 0; i < options.length; i++) {
                const value = options[i].value;
                if (value === 'anthropic' || value === 'elevenlabs' || value === 'ollama') {
                    options[i].style.display = 'none';
                }
            }
            // Select Stability by default
            providerNameSelect.value = 'stability';
        } else if (mode === 'audio') {
            // Show audio providers (ElevenLabs)
            // Hide non-audio providers
            for (let i = 0; i < options.length; i++) {
                const value = options[i].value;
                if (value !== 'elevenlabs') {
                    options[i].style.display = 'none';
                }
            }
            // Select ElevenLabs by default
            providerNameSelect.value = 'elevenlabs';
        }
    }
    
    // Close modal
    function closeModal() {
        modal.classList.remove('active');
        
        // Reset form
        document.getElementById('add-provider-form').reset();
    }
    
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Form submission
    const addProviderForm = document.getElementById('add-provider-form');
    addProviderForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const mode = providerModeInput.value;
        const provider = providerNameSelect.value;
        const apiKey = apiKeyInput.value;
        
        // Get selected modes
        const selectedModes = [];
        modeCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedModes.push(checkbox.value);
            }
        });
        
        if (!apiKey) {
            alert('Please enter an API key');
            return;
        }
        
        if (selectedModes.length === 0) {
            alert('Please select at least one mode');
            return;
        }
        
        // Save provider
        saveProvider(provider, apiKey, selectedModes);
        
        // Close modal
                closeModal();
        
        // Refresh provider lists
        loadProviders();
    });
    
    // Save provider to credentials.json via API
    function saveProvider(provider, apiKey, modes) {
        fetch('/api/save_provider', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: provider,
                api_key: apiKey,
                modes: modes
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Provider saved successfully');
            } else {
                console.error('Failed to save provider:', data.error);
                alert('Failed to save provider: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error saving provider:', error);
            alert('Error saving provider');
        });
    }
    
    // Load providers from credentials.json
    function loadProviders() {
        fetch('/api/load_providers')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const providers = data.providers;
                
                // Clear provider lists
                document.getElementById('text-providers').innerHTML = '';
                document.getElementById('image-providers').innerHTML = '';
                document.getElementById('audio-providers').innerHTML = '';
                
                // Add providers to lists
                providers.forEach(provider => {
                    provider.modes.forEach(mode => {
                        addProviderToList(provider.provider, provider.api_key, mode);
                    });
                });
            } else {
                console.error('Failed to load providers:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading providers:', error);
        });
    }
    
    // Add provider to the appropriate list
    function addProviderToList(provider, apiKey, mode) {
        const providerList = document.getElementById(`${mode}-providers`);
        
        const providerItem = document.createElement('div');
        providerItem.className = 'provider-item';
        
        const providerHeader = document.createElement('div');
        providerHeader.className = 'provider-header';
        
        const providerName = document.createElement('div');
        providerName.className = 'provider-name';
        providerName.textContent = getProviderDisplayName(provider);
        
        // Add masked API key display
        const apiKeyDisplay = document.createElement('div');
        apiKeyDisplay.className = 'provider-key-display';
        apiKeyDisplay.textContent = maskApiKey(apiKey);
        apiKeyDisplay.style.fontSize = '0.8em';
        apiKeyDisplay.style.color = 'var(--text-secondary)';
        apiKeyDisplay.style.marginTop = '4px';
        
        // Add organization display if present
        const orgDisplay = document.createElement('div');
        orgDisplay.className = 'provider-org-display';
        orgDisplay.textContent = maskApiKey(apiKey); // We'll update this with actual org data
        orgDisplay.style.fontSize = '0.8em';
        orgDisplay.style.color = 'var(--text-secondary)';
        orgDisplay.style.marginTop = '4px';
        
        // Add models list
        const modelsDisplay = document.createElement('div');
        modelsDisplay.className = 'provider-models-display';
        modelsDisplay.style.fontSize = '0.8em';
        modelsDisplay.style.color = 'var(--text-secondary)';
        modelsDisplay.style.marginTop = '4px';
        
        // Fetch models for this provider and mode
        fetch(`/api/load_providers`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const providerData = data.providers.find(p => p.provider === provider);
                    if (providerData) {
                        // Update organization if present
                        if (providerData.organization) {
                            orgDisplay.textContent = `Organization: ${maskApiKey(providerData.organization)}`;
                        } else {
                            orgDisplay.style.display = 'none';
                        }
                        
                        // Update models list
                        if (providerData.models && providerData.models.length > 0) {
                            modelsDisplay.textContent = `Models: ${providerData.models.join(', ')}`;
                        } else {
                            modelsDisplay.textContent = 'No models configured';
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error loading provider details:', error);
                modelsDisplay.textContent = 'Error loading models';
            });
        
        const providerActions = document.createElement('div');
        providerActions.className = 'provider-actions';
        
        const editAction = document.createElement('button');
        editAction.className = 'provider-action';
        editAction.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
        editAction.title = 'Edit API key';
        
        const deleteAction = document.createElement('button');
        deleteAction.className = 'provider-action';
        deleteAction.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
        deleteAction.title = 'Delete provider';
        
        // Add models management button
        const modelsAction = document.createElement('button');
        modelsAction.className = 'provider-action';
        modelsAction.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>';
        modelsAction.title = 'Manage models';
        
        // Event listeners for actions
        editAction.addEventListener('click', function() {
            editProvider(provider, apiKey, mode);
        });
        
        deleteAction.addEventListener('click', function() {
            deleteProvider(provider, mode);
        });
        
        // Event listener for models action
        modelsAction.addEventListener('click', function() {
            fetch('/api/load_providers')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const providerData = data.providers.find(p => p.provider === provider);
                        if (providerData) {
                            showModelsModal(provider, mode, providerData.models || []);
                        }
                    }
                });
        });
        
        // Append elements
        providerActions.appendChild(editAction);
        providerActions.appendChild(deleteAction);
        providerActions.appendChild(modelsAction);
        
        providerHeader.appendChild(providerName);
        providerHeader.appendChild(providerActions);
        
        providerItem.appendChild(providerHeader);
        providerItem.appendChild(apiKeyDisplay);
        providerItem.appendChild(orgDisplay);
        providerItem.appendChild(modelsDisplay);
        
        providerList.appendChild(providerItem);
    }
    
    // Get display name for provider
    function getProviderDisplayName(provider) {
        const displayNames = {
            'openai': 'OpenAI',
            'anthropic': 'Anthropic',
            'stability': 'Stability AI',
            'elevenlabs': 'ElevenLabs',
            'ollama': 'Ollama (Local)'
        };
        
        return displayNames[provider] || provider;
    }
    
    // Create modal for editing provider
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    editModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Provider</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="edit-provider-form">
                <input type="hidden" id="edit-provider-name">
                <input type="hidden" id="edit-provider-mode">
                <div class="form-group">
                    <label for="edit-api-key">API Key</label>
                    <input type="password" id="edit-api-key" required>
                </div>
                <div class="form-group" id="edit-org-group" style="display: none;">
                    <label for="edit-org">Organization ID (Optional)</label>
                    <input type="text" id="edit-org">
                </div>
                <div class="form-group">
                    <label>Modes</label>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="edit-modes" value="text"> Text
                        </label>
                        <label>
                            <input type="checkbox" name="edit-modes" value="image"> Image
                        </label>
                        <label>
                            <input type="checkbox" name="edit-modes" value="audio"> Audio
                        </label>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn">Cancel</button>
                    <button type="submit" class="save-btn">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(editModal);

    // Create confirmation modal
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Confirm Action</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <p id="confirm-message"></p>
            </div>
            <div class="form-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="confirm-btn">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);

    // Function to show confirmation modal
    function showConfirmation(message, onConfirm) {
        const messageEl = document.getElementById('confirm-message');
        messageEl.textContent = message;
        confirmModal.classList.add('active');
        
        const confirmBtn = confirmModal.querySelector('.confirm-btn');
        const cancelBtn = confirmModal.querySelector('.cancel-btn');
        const closeBtn = confirmModal.querySelector('.close-modal');
        
        const closeModal = () => {
            confirmModal.classList.remove('active');
        };
        
        confirmBtn.onclick = () => {
            onConfirm();
            closeModal();
        };
        
        cancelBtn.onclick = closeModal;
        closeBtn.onclick = closeModal;
        
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) {
                closeModal();
            }
        };
    }

    // Update edit provider function to use modal
    function editProvider(provider, apiKey, mode) {
        const form = document.getElementById('edit-provider-form');
        const providerInput = document.getElementById('edit-provider-name');
        const modeInput = document.getElementById('edit-provider-mode');
        const apiKeyInput = document.getElementById('edit-api-key');
        const orgGroup = document.getElementById('edit-org-group');
        const orgInput = document.getElementById('edit-org');
        
        // Set form values
        providerInput.value = provider;
        modeInput.value = mode;
        apiKeyInput.value = apiKey;
        
        // Show/hide organization field based on provider
        if (provider === 'openai') {
            orgGroup.style.display = 'block';
            // Fetch current organization value
            fetch('/api/load_providers')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const providerData = data.providers.find(p => p.provider === provider);
                        if (providerData && providerData.organization) {
                            orgInput.value = providerData.organization;
                        }
                    }
                });
        } else {
            orgGroup.style.display = 'none';
        }
        
        // Set current mode as checked
        const modeCheckboxes = form.querySelectorAll('input[name="edit-modes"]');
        modeCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === mode;
        });
        
        // Show modal
        editModal.classList.add('active');
        
        // Handle form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            
            const newApiKey = apiKeyInput.value;
            const newOrg = orgInput.value;
            const selectedModes = Array.from(modeCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            
            if (selectedModes.length === 0) {
                alert('Please select at least one mode');
                return;
            }
            
            // Update provider
            updateProvider(provider, apiKey, newApiKey, mode, newOrg, selectedModes);
            
            // Close modal
            editModal.classList.remove('active');
            
            // Refresh provider lists
            loadProviders();
        };
        
        // Handle modal closing
        const closeBtn = editModal.querySelector('.close-modal');
        const cancelBtn = editModal.querySelector('.cancel-btn');
        
        const closeModal = () => {
            editModal.classList.remove('active');
        };
        
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        
        editModal.onclick = (e) => {
            if (e.target === editModal) {
                closeModal();
            }
        };
    }

    // Update delete provider function to use confirmation modal
    function deleteProvider(provider, mode) {
        showConfirmation(
            `Are you sure you want to delete ${getProviderDisplayName(provider)} from ${mode} providers?`,
            () => {
                fetch('/api/delete_provider', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: provider,
                        mode: mode
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                        console.log('Provider deleted successfully');
                        loadProviders();
            } else {
                        console.error('Failed to delete provider:', data.error);
                        alert('Failed to delete provider: ' + data.error);
            }
        })
        .catch(error => {
                    console.error('Error deleting provider:', error);
                    alert('Error deleting provider');
                });
            }
        );
    }

    // Update updateProvider function to handle organization and multiple modes
    function updateProvider(provider, oldApiKey, newApiKey, mode, organization, modes) {
        fetch('/api/update_provider', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: provider,
                old_api_key: oldApiKey,
                new_api_key: newApiKey,
                mode: mode,
                organization: organization,
                modes: modes
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Provider updated successfully');
                loadProviders();
            } else {
                console.error('Failed to update provider:', data.error);
                alert('Failed to update provider: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error updating provider:', error);
            alert('Error updating provider');
        });
    }
    
    // Mask API key for display purposes
    function maskApiKey(apiKey) {
        if (!apiKey) return 'No API Key';
        
        // For Ollama (Local), don't mask
        if (apiKey.toLowerCase() === 'local') return 'Local Model (No API Key Required)';
        
        const length = apiKey.length;
        if (length <= 8) return '••••••••';
        
        // Show first 4 and last 4 characters
        return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(length - 4);
    }
    
    // Create modal for managing models
    const modelsModal = document.createElement('div');
    modelsModal.className = 'modal';
    modelsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Manage Models</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="models-form">
                <input type="hidden" id="models-provider-name">
                <input type="hidden" id="models-provider-mode">
                <div class="form-group">
                    <label>Available Models</label>
                    <div id="models-list" class="models-list">
                        <!-- Models will be added here dynamically -->
                    </div>
                    <div class="form-actions" style="margin-top: 8px;">
                        <button type="button" class="add-model-btn">Add Model</button>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn">Cancel</button>
                    <button type="submit" class="save-btn">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modelsModal);

    // Function to show models modal
    function showModelsModal(provider, mode, currentModels) {
        const form = document.getElementById('models-form');
        const providerInput = document.getElementById('models-provider-name');
        const modeInput = document.getElementById('models-provider-mode');
        const modelsList = document.getElementById('models-list');
        
        // Set form values
        providerInput.value = provider;
        modeInput.value = mode;
        
        // Clear existing models
        modelsList.innerHTML = '';
        
        // Add current models
        currentModels.forEach(model => {
            addModelInput(model);
        });
        
        // Show modal
        modelsModal.classList.add('active');
        
        // Handle form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            
            const models = Array.from(modelsList.querySelectorAll('.model-input'))
                .map(input => input.value.trim())
                .filter(value => value !== '');
            
            // Update models
            updateProviderModels(provider, mode, models);
            
            // Close modal
            modelsModal.classList.remove('active');
            
            // Refresh provider lists
            loadProviders();
        };
        
        // Handle modal closing
        const closeBtn = modelsModal.querySelector('.close-modal');
        const cancelBtn = modelsModal.querySelector('.cancel-btn');
        
        const closeModal = () => {
            modelsModal.classList.remove('active');
        };
        
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        
        modelsModal.onclick = (e) => {
            if (e.target === modelsModal) {
                closeModal();
            }
        };
    }

    // Function to add a model input field
    function addModelInput(value = '') {
        const modelsList = document.getElementById('models-list');
        const modelDiv = document.createElement('div');
        modelDiv.className = 'model-input-group';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'model-input';
        input.value = value;
        input.placeholder = 'Enter model name';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-model-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => modelDiv.remove();
        
        modelDiv.appendChild(input);
        modelDiv.appendChild(removeBtn);
        modelsList.appendChild(modelDiv);
    }

    // Function to update provider models
    function updateProviderModels(provider, mode, models) {
        fetch('/api/update_provider_models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: provider,
                mode: mode,
                models: models
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Models updated successfully');
            } else {
                console.error('Failed to update models:', data.error);
                alert('Failed to update models: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error updating models:', error);
            alert('Error updating models');
        });
    }
    
    // Add event listener for add model button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('add-model-btn')) {
            addModelInput();
        }
    });
    
    // Initial load
    loadProviders();
}); 