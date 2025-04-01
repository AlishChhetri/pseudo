document.addEventListener('DOMContentLoaded', function () {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Drag and drop state
    let draggedItem = null;
    let draggedModelItem = null;
    let draggedList = null;
    let reorderTimeout = null;
    
    // Create the reorder indicator
    const reorderIndicator = document.createElement('div');
    reorderIndicator.className = 'reorder-indicator';
    reorderIndicator.innerHTML = '<span class="reorder-indicator-icon">📝</span> Order updated';
    document.body.appendChild(reorderIndicator);

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
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
        btn.addEventListener('click', function () {
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
            modal.style.display = 'flex';
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
        modal.style.display = 'none';

        // Reset form
        document.getElementById('add-provider-form').reset();
    }

    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Form submission
    const addProviderForm = document.getElementById('add-provider-form');
    addProviderForm.addEventListener('submit', function (e) {
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
                    
                    // Initialize drag and drop after loading providers
                    initDragAndDrop();
                } else {
                    console.error('Failed to load providers:', data.error);
                }
            })
            .catch(error => {
                console.error('Error loading providers:', error);
            });
    }

    // Initialize drag and drop functionality
    function initDragAndDrop() {
        // Initialize provider drag and drop
        initProviderDragAndDrop();
        
        // Initialize model drag and drop if models are visible
        const modelLists = document.querySelectorAll('.models-list');
        if (modelLists.length > 0) {
            initModelDragAndDrop();
        }
    }
    
    // Initialize provider drag and drop
    function initProviderDragAndDrop() {
        const providerItems = document.querySelectorAll('.provider-item');
        const providerLists = document.querySelectorAll('.provider-list');
        
        // Add drag handles to provider items if they don't have them
        providerItems.forEach(item => {
            if (!item.querySelector('.drag-handle')) {
                const dragHandle = document.createElement('div');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="8" y1="6" x2="16" y2="6"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                        <line x1="8" y1="18" x2="16" y2="18"></line>
                    </svg>
                `;
                item.insertBefore(dragHandle, item.firstChild);
                item.classList.add('has-drag-handle');
                
                // Setup drag events on handle
                dragHandle.addEventListener('mousedown', handleProviderDragStart.bind(null, item));
            }
        });
        
        // Set up drop zones
        providerLists.forEach(list => {
            list.addEventListener('dragover', handleProviderDragOver);
            list.addEventListener('drop', handleProviderDrop);
        });
    }
    
    // Handle provider drag start
    function handleProviderDragStart(item, e) {
        e.preventDefault();
        
        // Set dragged item
        draggedItem = item;
        draggedList = item.parentElement;
        
        // Add dragging class to item
        item.classList.add('dragging');
        
        // Create a placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        item.parentElement.insertBefore(placeholder, item.nextSibling);
        
        // Setup document mouse move and up events
        document.addEventListener('mousemove', handleProviderDragMove);
        document.addEventListener('mouseup', handleProviderDragEnd);
        
        // Initial position
        handleProviderDragMove(e);
    }
    
    // Handle provider drag move
    function handleProviderDragMove(e) {
        if (!draggedItem) return;
        
        // Position the dragged item at the mouse cursor
        const x = e.clientX;
        const y = e.clientY;
        
        draggedItem.style.position = 'fixed';
        draggedItem.style.top = y - draggedItem.offsetHeight / 2 + 'px';
        draggedItem.style.left = x - draggedItem.offsetWidth / 2 + 'px';
        
        // Find the list that the mouse is over
        const lists = document.querySelectorAll('.provider-list');
        let currentList = null;
        
        lists.forEach(list => {
            const rect = list.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                currentList = list;
                list.classList.add('drag-over');
            } else {
                list.classList.remove('drag-over');
            }
        });
        
        // If over a list, find the closest item
        if (currentList) {
            const items = Array.from(currentList.querySelectorAll('.provider-item:not(.dragging)'));
            
            // Find closest item by Y position
            let closestItem = null;
            let closestDistance = Number.POSITIVE_INFINITY;
            
            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const itemMiddle = rect.top + rect.height / 2;
                const distance = Math.abs(y - itemMiddle);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestItem = item;
                }
            });
            
            // Move placeholder to new position
            const placeholder = document.querySelector('.drag-placeholder');
            
            if (closestItem) {
                const rect = closestItem.getBoundingClientRect();
                if (y < rect.top + rect.height / 2) {
                    currentList.insertBefore(placeholder, closestItem);
                } else {
                    currentList.insertBefore(placeholder, closestItem.nextSibling);
                }
            } else if (items.length === 0) {
                // If list is empty
                currentList.appendChild(placeholder);
            }
        }
    }
    
    // Handle provider drag end
    function handleProviderDragEnd() {
        if (!draggedItem) return;
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleProviderDragMove);
        document.removeEventListener('mouseup', handleProviderDragEnd);
        
        // Get the placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        
        if (placeholder) {
            // Reset item styles
            draggedItem.style.position = '';
            draggedItem.style.top = '';
            draggedItem.style.left = '';
            draggedItem.classList.remove('dragging');
            
            // Move item to new position
            placeholder.parentElement.insertBefore(draggedItem, placeholder);
            placeholder.remove();
            
            // Remove drag-over from lists
            document.querySelectorAll('.provider-list').forEach(list => {
                list.classList.remove('drag-over');
            });
            
            // Save new order if the order changed
            if (draggedList !== draggedItem.parentElement || getItemIndex(draggedItem) !== draggedIndex) {
                saveProviderOrder(draggedItem.parentElement.dataset.mode);
            }
        }
        
        // Reset state
        draggedItem = null;
        draggedList = null;
    }
    
    // Handle provider drag over (prevent default to allow drop)
    function handleProviderDragOver(e) {
        e.preventDefault();
    }
    
    // Handle provider drop
    function handleProviderDrop(e) {
        e.preventDefault();
    }
    
    // Get index of item in its parent
    function getItemIndex(item) {
        return Array.from(item.parentElement.children).indexOf(item);
    }
    
    // Save provider order
    function saveProviderOrder(mode) {
        const providerList = document.getElementById(`${mode}-providers`);
        const providers = Array.from(providerList.querySelectorAll('.provider-item'));
        
        // Get ordered list of providers and their API keys
        const orderedProviders = providers.map(item => {
            return {
                provider: item.dataset.provider,
                api_key: item.dataset.apiKey
            };
        });
        
        // Show reorder indicator
        showReorderIndicator();
        
        // Send to server
        fetch('/api/update_provider_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: mode,
                providers: orderedProviders
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Provider order updated successfully');
            } else {
                console.error('Failed to update provider order:', data.error);
            }
        })
        .catch(error => {
            console.error('Error updating provider order:', error);
        });
    }

    // Add provider to the appropriate list
    function addProviderToList(provider, apiKey, mode) {
        const providerList = document.getElementById(`${mode}-providers`);

        const providerItem = document.createElement('div');
        providerItem.className = 'provider-item';
        providerItem.dataset.provider = provider;
        providerItem.dataset.apiKey = apiKey;
        providerItem.dataset.mode = mode;

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
        editAction.addEventListener('click', function () {
            editProvider(provider, apiKey, mode);
        });

        deleteAction.addEventListener('click', function () {
            deleteProvider(provider, mode);
        });

        // Event listener for models action
        modelsAction.addEventListener('click', function () {
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

    // Show models modal
    function showModelsModal(provider, mode, currentModels) {
        const modelsModal = document.getElementById('models-modal');
        
        // Clear existing content
        modelsModal.innerHTML = '';
        
        // Create modal content
        modelsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Manage Models</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <form id="models-form">
                    <input type="hidden" id="models-provider-name" value="${provider}">
                    <input type="hidden" id="models-provider-mode" value="${mode}">
                    <div class="form-group">
                        <label>Available Models</label>
                        <div id="models-list" class="models-list" data-provider="${provider}" data-mode="${mode}">
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
        
        // Show the modal
        modelsModal.style.display = 'flex';
        
        // Get models list element
        const modelsList = document.getElementById('models-list');
        
        // Add existing models
        if (currentModels && currentModels.length > 0) {
            currentModels.forEach(model => {
                addModelItem(modelsList, model);
            });
        } else {
            // Add an empty model input if no models are present
            addModelItem(modelsList, '');
        }
        
        // Add model button
        const addModelBtn = modelsModal.querySelector('.add-model-btn');
        addModelBtn.addEventListener('click', function() {
            addModelItem(modelsList, '');
        });
        
        // Save button
        const modelsForm = document.getElementById('models-form');
        modelsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get provider and mode
            const providerName = document.getElementById('models-provider-name').value;
            const providerMode = document.getElementById('models-provider-mode').value;
            
            // Get all model inputs
            const modelInputs = modelsList.querySelectorAll('.model-content input');
            const models = Array.from(modelInputs).map(input => input.value.trim()).filter(value => value !== '');
            
            // Update provider models
            updateProviderModels(providerName, providerMode, models);
            
            // Close modal
            closeModal();
        });
        
        // Close button
        const closeBtn = modelsModal.querySelector('.close-modal');
        closeBtn.addEventListener('click', closeModal);
        
        // Cancel button
        const cancelBtn = modelsModal.querySelector('.cancel-btn');
        cancelBtn.addEventListener('click', closeModal);
        
        // Close modal when clicking outside
        modelsModal.addEventListener('click', function(e) {
            if (e.target === modelsModal) {
                closeModal();
            }
        });
        
        // Initialize drag and drop for models
        initModelDragAndDrop();
        
        // Close modal function
        function closeModal() {
            modelsModal.style.display = 'none';
        }
    }
    
    // Add model item to the list
    function addModelItem(modelsList, value) {
        // Create model item
        const modelItem = document.createElement('div');
        modelItem.className = 'model-item';
        modelItem.dataset.model = value;
        
        // Create drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'model-drag-handle';
        dragHandle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                <line x1="8" y1="18" x2="16" y2="18"></line>
            </svg>
        `;
        
        // Create model content
        const modelContent = document.createElement('div');
        modelContent.className = 'model-content';
        
        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.value = value;
        input.placeholder = 'Enter model name';
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-model-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', function() {
            modelsList.removeChild(modelItem);
        });
        
        // Add input to model content
        modelContent.appendChild(input);
        
        // Add everything to model item
        modelItem.appendChild(dragHandle);
        modelItem.appendChild(modelContent);
        modelItem.appendChild(removeBtn);
        
        // Add to models list
        modelsList.appendChild(modelItem);
        
        // Setup drag event
        dragHandle.addEventListener('mousedown', handleModelDragStart.bind(null, modelItem));
        
        return modelItem;
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

    // Initialize model drag and drop
    function initModelDragAndDrop() {
        const modelItems = document.querySelectorAll('.model-item');
        const modelLists = document.querySelectorAll('.models-list');
        
        // Add drag handles to model items if they don't have them
        modelItems.forEach(item => {
            if (!item.querySelector('.model-drag-handle')) {
                const dragHandle = document.createElement('div');
                dragHandle.className = 'model-drag-handle';
                dragHandle.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="8" y1="6" x2="16" y2="6"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                        <line x1="8" y1="18" x2="16" y2="18"></line>
                    </svg>
                `;
                item.insertBefore(dragHandle, item.firstChild);
                
                // Setup drag events on handle
                dragHandle.addEventListener('mousedown', handleModelDragStart.bind(null, item));
            }
        });
        
        // Set up drop zones
        modelLists.forEach(list => {
            list.addEventListener('dragover', handleModelDragOver);
            list.addEventListener('drop', handleModelDrop);
        });
    }
    
    // Handle model drag start
    function handleModelDragStart(item, e) {
        e.preventDefault();
        
        // Set dragged item
        draggedModelItem = item;
        
        // Add dragging class to item
        item.classList.add('dragging');
        
        // Create a placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        placeholder.style.height = item.offsetHeight + 'px';
        item.parentElement.insertBefore(placeholder, item.nextSibling);
        
        // Setup document mouse move and up events
        document.addEventListener('mousemove', handleModelDragMove);
        document.addEventListener('mouseup', handleModelDragEnd);
        
        // Initial position
        handleModelDragMove(e);
    }
    
    // Handle model drag move
    function handleModelDragMove(e) {
        if (!draggedModelItem) return;
        
        // Position the dragged item at the mouse cursor
        const x = e.clientX;
        const y = e.clientY;
        
        draggedModelItem.style.position = 'fixed';
        draggedModelItem.style.top = y - draggedModelItem.offsetHeight / 2 + 'px';
        draggedModelItem.style.left = x - draggedModelItem.offsetWidth / 2 + 'px';
        
        // Find the list that the mouse is over (should be models-list)
        const list = draggedModelItem.parentElement;
        
        // Find the closest item
        const items = Array.from(list.querySelectorAll('.model-item:not(.dragging)'));
        
        // Find closest item by Y position
        let closestItem = null;
        let closestDistance = Number.POSITIVE_INFINITY;
        
        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            const itemMiddle = rect.top + rect.height / 2;
            const distance = Math.abs(y - itemMiddle);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestItem = item;
            }
        });
        
        // Move placeholder to new position
        const placeholder = document.querySelector('.drag-placeholder');
        
        if (closestItem) {
            const rect = closestItem.getBoundingClientRect();
            if (y < rect.top + rect.height / 2) {
                list.insertBefore(placeholder, closestItem);
            } else {
                list.insertBefore(placeholder, closestItem.nextSibling);
            }
        } else if (items.length === 0) {
            // If list is empty
            list.appendChild(placeholder);
        }
    }
    
    // Handle model drag end
    function handleModelDragEnd() {
        if (!draggedModelItem) return;
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleModelDragMove);
        document.removeEventListener('mouseup', handleModelDragEnd);
        
        // Get the placeholder
        const placeholder = document.querySelector('.drag-placeholder');
        
        if (placeholder) {
            // Reset item styles
            draggedModelItem.style.position = '';
            draggedModelItem.style.top = '';
            draggedModelItem.style.left = '';
            draggedModelItem.classList.remove('dragging');
            
            // Move item to new position
            placeholder.parentElement.insertBefore(draggedModelItem, placeholder);
            placeholder.remove();
            
            // Save new order
            saveModelOrder(draggedModelItem);
        }
        
        // Reset state
        draggedModelItem = null;
    }
    
    // Handle model drag over (prevent default to allow drop)
    function handleModelDragOver(e) {
        e.preventDefault();
    }
    
    // Handle model drop
    function handleModelDrop(e) {
        e.preventDefault();
    }
    
    // Save model order
    function saveModelOrder(modelItem) {
        // Find the provider and mode from the data attributes
        const provider = modelItem.closest('.models-list').dataset.provider;
        const mode = modelItem.closest('.models-list').dataset.mode;
        
        // Get all models in the list
        const modelItems = Array.from(modelItem.parentElement.querySelectorAll('.model-item'));
        const models = modelItems.map(item => item.dataset.model);
        
        // Show reorder indicator
        showReorderIndicator();
        
        // Send to server
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
                console.log('Model order updated successfully');
            } else {
                console.error('Failed to update model order:', data.error);
            }
        })
        .catch(error => {
            console.error('Error updating model order:', error);
        });
    }

    // Show reorder indicator
    function showReorderIndicator() {
        // Clear any existing timeout
        if (reorderTimeout) {
            clearTimeout(reorderTimeout);
        }
        
        // Show indicator
        reorderIndicator.classList.add('visible');
        
        // Hide after 3 seconds
        reorderTimeout = setTimeout(() => {
            reorderIndicator.classList.remove('visible');
        }, 3000);
    }

    // Load providers on page load
    loadProviders();
}); 