document.addEventListener('DOMContentLoaded', function() {
    const modelDropdownBtn = document.querySelector('.model-dropdown-btn');
    const modelDropdownContent = document.getElementById('model-dropdown-content');
    const selectedModelSpan = document.getElementById('selected-model');
    
    // Initialize dropdown state
    if (modelDropdownContent) {
        modelDropdownContent.style.display = 'none';
    }
    
    // Toggle dropdown when button is clicked
    if (modelDropdownBtn && modelDropdownContent) {
        modelDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (modelDropdownContent.style.display === 'block') {
                modelDropdownContent.style.display = 'none';
            } else {
                modelDropdownContent.style.display = 'block';
            }
        });
    }
    
    // Handle model selection
    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(option => {
        if (!option.closest('.has-submenu') || option.closest('.submenu')) {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const model = this.getAttribute('data-model');
                // Only proceed if this is not a parent menu with submenu
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
                    
                    console.log('Selected model:', model);
                }
            });
        }
    });
    
    // Prevent dropdown from closing when interacting with submenus
    const submenus = document.querySelectorAll('.submenu');
    submenus.forEach(submenu => {
        submenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        if (modelDropdownContent) {
            modelDropdownContent.style.display = 'none';
        }
    });
}); 