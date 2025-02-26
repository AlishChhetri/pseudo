document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('/get-configs');
        const configs = await response.json();
        
        const dropdownContent = document.querySelector('.model-dropdown-content');
        if (!dropdownContent) return;
        
        // Clear existing content
        dropdownContent.innerHTML = '';
        
        // Add Auto option
        dropdownContent.innerHTML = `
            <div class="model-option selected" role="menuitem">
                <span class="model-title">Auto</span>
                <span class="model-subtitle">Automatically select best model</span>
            </div>
        `;
        
        // Create model groups from configs
        for (const [mode, modeData] of Object.entries(configs.modes)) {
            if (Object.keys(modeData.providers).length === 0) continue;
            
            const modeTitle = formatModeName(mode);
            const submenuHtml = createSubmenuHtml(modeData.providers);
            
            dropdownContent.innerHTML += `
                <div class="model-option has-submenu" role="menuitem">
                    <span class="model-title">${modeTitle}</span>
                    <span class="model-subtitle">${getSubtitleForMode(mode)}</span>
                    <div class="submenu">
                        ${submenuHtml}
                    </div>
                </div>
            `;
        }
        
        // Reinitialize event listeners
        initializeModelDropdown();
        
    } catch (error) {
        console.error('Error loading model configurations:', error);
    }
});

// Update formatModeName to ensure proper capitalization
function formatModeName(name) {
    return name.split('_')
        .map(word => word.toUpperCase())
        .join(' ');
}

// Update the getSubtitleForMode function with more descriptive subtitles
function getSubtitleForMode(mode) {
    const subtitles = {
        'llm': 'AI Language & Chat Models',
        'vision': 'Computer Vision & Image Analysis',
        'speech': 'Speech-to-Text & Voice Processing',
        'translation': 'Multi-Language Translation',
        'image': 'AI Image Generation & Editing'
    };
    return subtitles[mode.toLowerCase()] || mode;
}

// Simplify the createSubmenuHtml function to remove the API Provider text
function createSubmenuHtml(providers) {
    return Object.keys(providers)
        .map(provider => `
            <div class="model-option" data-model="${provider.toLowerCase()}">
                <span class="model-title">${provider}</span>
            </div>
        `).join('');
}

function initializeModelDropdown() {
    // Re-add click handlers for model options
    document.querySelectorAll('.model-option').forEach(option => {
        if (!option.classList.contains('has-submenu')) {
            option.addEventListener('click', function(e) {
                const modelTitle = this.querySelector('.model-title').innerText;
                
                const parentMenu = this.closest('.submenu');
                if (parentMenu) {
                    const parentTitle = parentMenu.closest('.model-option').querySelector('.model-title').innerText;
                    document.querySelector('.selected-model').innerText = `${parentTitle} - ${modelTitle}`;
                } else {
                    document.querySelector('.selected-model').innerText = modelTitle;
                }
                
                // Close dropdown
                const dropdown = document.querySelector('.model-dropdown-content');
                dropdown.style.display = 'none';
                setTimeout(() => dropdown.style.display = '', 100);
                
                e.stopPropagation();
            });
        }
    });
}

// Model Option Click Handler
document.querySelectorAll('.model-option').forEach(option => {
    option.addEventListener('click', function(e) {
        // Don't trigger if clicking on a parent menu item
        if (this.classList.contains('has-submenu')) {
            return;
        }
        
        // Get the model title
        const modelTitle = this.querySelector('.model-title').innerText;
        
        // Get the parent menu title if this is a submenu item
        const parentMenu = this.closest('.submenu');
        if (parentMenu) {
            const parentTitle = parentMenu.closest('.model-option').querySelector('.model-title').innerText;
            document.querySelector('.selected-model').innerText = `${parentTitle} - ${modelTitle}`;
        } else {
            document.querySelector('.selected-model').innerText = modelTitle;
        }
        
        // Close the dropdown
        const dropdown = document.querySelector('.model-dropdown-content');
        dropdown.style.display = 'none';
        setTimeout(() => {
            dropdown.style.display = '';
        }, 100);
        
        e.stopPropagation();
    });
});

// Model Dropdown Button
document.querySelector('.model-dropdown-btn').addEventListener('click', function() {
    const dropdownContent = document.querySelector('.model-dropdown-content');
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    
    this.setAttribute('aria-expanded', !isExpanded);
    dropdownContent.style.display = isExpanded ? 'none' : 'block';
});

// Close Dropdown When Clicking Outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.model-dropdown')) {
        const dropdownBtn = document.querySelector('.model-dropdown-btn');
        const dropdownContent = document.querySelector('.model-dropdown-content');
        
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownContent.style.display = 'none';
    }
});