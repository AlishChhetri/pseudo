document.addEventListener('DOMContentLoaded', function() {
    const modelDropdownBtn = document.querySelector('.model-dropdown-btn');
    const modelDropdownContent = document.getElementById('model-dropdown-content');
    const selectedModelSpan = document.getElementById('selected-model');
    
    // Initialize dropdown state
    if (modelDropdownContent) {
        modelDropdownContent.style.display = 'none';
    }

    // Fetch models from credentials.json and build the dropdown
    fetchModelData();
    
    // Toggle dropdown when button is clicked
    if (modelDropdownBtn && modelDropdownContent) {
        modelDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (modelDropdownContent.style.display === 'block') {
                modelDropdownContent.style.display = 'none';
        } else {
                // Get position of button for better positioning
                const rect = modelDropdownBtn.getBoundingClientRect();
                modelDropdownContent.style.top = (rect.bottom + 10) + 'px';
                modelDropdownContent.style.left = rect.left + 'px';
                
                // Show dropdown
            modelDropdownContent.style.display = 'block';
                
                // Position the dropdown based on available space
                positionDropdown(modelDropdownContent);
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        if (modelDropdownContent) {
            modelDropdownContent.style.display = 'none';
        }
    });

    /**
     * Position the dropdown based on available screen space
     */
    function positionDropdown(dropdown) {
        if (!dropdown) return;
        
        const rect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Check if dropdown extends beyond the bottom of the viewport
        if (rect.bottom > viewportHeight) {
            const overflowY = rect.bottom - viewportHeight;
            dropdown.style.maxHeight = `${rect.height - overflowY - 20}px`;
        } else {
            dropdown.style.maxHeight = '';
        }
        
        // For mobile: check if the dropdown extends beyond the right edge
        if (viewportWidth <= 768 && rect.right > viewportWidth) {
            dropdown.style.left = 'auto';
            dropdown.style.right = '0';
        }
    }

    /**
     * Fetch model data from credentials.json and build the dropdown
     */
    function fetchModelData() {
        fetch('/api/models')
            .then(response => response.json())
            .then(data => {
                buildModelDropdown(data);
            })
            .catch(error => {
                console.error('Error fetching model data:', error);
                // Fall back to static dropdown content
            });
    }

    /**
     * Build the model dropdown from the provided data
     */
    function buildModelDropdown(data) {
        if (!modelDropdownContent || !data || !data.modes) return;

        // Clear existing content
        modelDropdownContent.innerHTML = '';

        // Add the Auto option first
        const autoOption = createModelOption('Auto', 'Automatically select best model', true);
        modelDropdownContent.appendChild(autoOption);

        // Get the modes and sort them alphabetically
        const modes = Object.keys(data.modes).sort();

        // Add each mode category
        modes.forEach(mode => {
            const modeData = data.modes[mode];
            if (!modeData.providers) return;

            // Create mode category
            const modeCategory = document.createElement('div');
            modeCategory.className = 'model-category';
            modeCategory.setAttribute('role', 'menuitem');

            // Format the mode name for display (capitalize first letter)
            const modeDisplayName = mode.charAt(0).toUpperCase() + mode.slice(1);
            
            // Set up category header
            const modeTitle = document.createElement('span');
            modeTitle.className = 'model-title';
            modeTitle.textContent = modeDisplayName;

            // Set up category subtitle
            const modeSubtitle = document.createElement('span');
            modeSubtitle.className = 'model-subtitle';
            
            // Set subtitle text based on mode
            switch(mode) {
                case 'text':
                    modeSubtitle.textContent = 'Language models for text generation';
                    break;
                case 'image':
                    modeSubtitle.textContent = 'Image generation models';
                    break;
                case 'audio':
                    modeSubtitle.textContent = 'Text-to-speech and audio models';
                    break;
                default:
                    modeSubtitle.textContent = `${modeDisplayName} generation models`;
            }

            // Create submenu for providers and their models
            const submenu = document.createElement('div');
            submenu.className = 'submenu';

            // Get all providers for this mode
            const providers = Object.keys(modeData.providers).sort();
            
            // Add options for each provider's models
            providers.forEach(provider => {
                const providerData = modeData.providers[provider];
                const providerDisplayName = provider.charAt(0).toUpperCase() + provider.slice(1);
                
                // Check if provider has models array
                if (providerData && providerData.models && Array.isArray(providerData.models) && providerData.models.length > 0) {
                    // Sort models alphabetically
                    const sortedModels = [...providerData.models].sort();
                    
                    // Create a model option for each model in the array
                    sortedModels.forEach(model => {
                        // Display exact model name or uppercase
                        const displayName = model.toUpperCase();
                        
                        // Create description based on model capabilities
                        const description = getModelDescription(model, provider);
                        
                        const modelOption = createModelOption(
                            displayName, 
                            description, 
                            false,
                            `${provider}/${model}`
                        );
                        submenu.appendChild(modelOption);
                    });
                } else {
                    // Fallback if no models array or empty array
                    const modelName = getModelNameForProvider(provider, mode);
                    const modelOption = createModelOption(
                        modelName, 
                        `${providerDisplayName} provider`, 
                        false,
                        `${provider}/${modelName.toLowerCase().replace(/\s+/g, '-')}`
                    );
                    submenu.appendChild(modelOption);
                }
            });

            // Assemble the category
            modeCategory.appendChild(modeTitle);
            modeCategory.appendChild(modeSubtitle);
            modeCategory.appendChild(submenu);

            // Add event listener to prevent closing when clicking on category
            modeCategory.addEventListener('click', function(e) {
                if (!e.target.closest('.model-option')) {
                    e.stopPropagation();
                }
            });

            // Add to dropdown
            modelDropdownContent.appendChild(modeCategory);
        });

        // Attach event listeners to the new options
        attachModelOptionListeners();
    }

    /**
     * Create a model option element
     */
    function createModelOption(title, subtitle, isSelected = false, modelId = null) {
        const option = document.createElement('div');
        option.className = 'model-option' + (isSelected ? ' selected' : '');
        option.setAttribute('role', 'menuitem');
        option.setAttribute('data-model', modelId || title);

        const titleSpan = document.createElement('span');
        titleSpan.className = 'model-title';
        titleSpan.textContent = title;

        const subtitleSpan = document.createElement('span');
        subtitleSpan.className = 'model-subtitle';
        subtitleSpan.textContent = subtitle;

        option.appendChild(titleSpan);
        option.appendChild(subtitleSpan);

        return option;
    }

    /**
     * Get a friendly model name for a provider and mode
     */
    function getModelNameForProvider(provider, mode) {
        // Map of provider and mode to model names
        // In a real implementation, this would come from the credentials.json
        const modelNames = {
            'text': {
                'openai': 'GPT-4',
                'anthropic': 'Claude 3',
                'ollama': 'Llama 2'
            },
            'image': {
                'openai': 'DALL-E 3',
                'stability': 'Stable Diffusion XL',
                'midjourney': 'Midjourney'
            },
            'audio': {
                'elevenlabs': 'ElevenLabs TTS',
                'openai': 'Whisper'
            }
        };

        return modelNames[mode]?.[provider] || `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${mode}`;
    }

    /**
     * Get a description for a model based on its name and provider
     */
    function getModelDescription(modelName, provider) {
        // Just return the provider name with first letter capitalized
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }

    /**
     * Attach event listeners to all model options
     */
    function attachModelOptionListeners() {
        const modelOptions = document.querySelectorAll('.model-option');
        
        modelOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const model = this.getAttribute('data-model');
                
                // Only proceed if this option has a model attribute
                if (model) {
                    const modelTitle = this.querySelector('.model-title').textContent;
                    
                    if (selectedModelSpan) {
                        selectedModelSpan.textContent = modelTitle;
                    }
                    
                    // Remove selected class from all options
                    modelOptions.forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    // Add selected class to this option
                    this.classList.add('selected');
                    
                    // Close dropdown
                    if (modelDropdownContent) {
                        modelDropdownContent.style.display = 'none';
                    }
                    
                    // Dispatch a custom event for model selection
                    document.dispatchEvent(new CustomEvent('modelSelected', {
                        detail: { model: model }
                    }));
                    
                    console.log('Selected model:', model);
                }
            });
        });
    }
}); 