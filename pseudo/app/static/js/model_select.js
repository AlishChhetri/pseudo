document.addEventListener('DOMContentLoaded', function() {
    // Model selection elements
    const modelDropdownBtn = document.querySelector('.model-dropdown-btn');
    const modelDropdownContent = document.querySelector('.model-dropdown-content');
    const modelOptions = document.querySelectorAll('.model-option');
    const selectedModelSpan = document.querySelector('.selected-model');
    
    // State
    let isDropdownOpen = false;
    
    // Close dropdown function
    function closeDropdown() {
        modelDropdownContent.style.display = 'none';
        modelDropdownBtn.setAttribute('aria-expanded', 'false');
        isDropdownOpen = false;
        
        // Remove event listener for clicking outside
        document.removeEventListener('click', handleClickOutside);
    }
    
    // Handle click outside function
    function handleClickOutside(e) {
        if (!modelDropdownBtn.contains(e.target) && !modelDropdownContent.contains(e.target)) {
            closeDropdown();
        }
    }
    
    // Toggle dropdown function
    function toggleDropdown() {
        if (isDropdownOpen) {
            closeDropdown();
        } else {
            modelDropdownContent.style.display = 'block';
            modelDropdownBtn.setAttribute('aria-expanded', 'true');
            isDropdownOpen = true;
            
            // Add event listener for clicking outside
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 0);
        }
    }
    
    // Select model function
    function selectModel(model, displayName) {
        // Update selected model text
        selectedModelSpan.textContent = displayName || model;
        
        // Remove selected class from all options
        modelOptions.forEach(option => {
            option.classList.remove('selected');
            
            // If this is the selected option, add selected class
            if (option.dataset.model === model) {
                option.classList.add('selected');
            }
        });
        
        // Close the dropdown
        closeDropdown();
        
        // Dispatch event to notify other components
        document.dispatchEvent(new CustomEvent('modelSelected', { 
            detail: { model }
        }));
    }
    
    // Initialize
    function init() {
        // Toggle dropdown when button is clicked
        modelDropdownBtn.addEventListener('click', toggleDropdown);
        
        // Handle model selection
        modelOptions.forEach(option => {
            if (!option.classList.contains('has-submenu')) {
                option.addEventListener('click', function() {
                    const model = this.dataset.model;
                    const displayName = this.querySelector('.model-title')?.textContent;
                    selectModel(model, displayName);
                });
            }
        });
        
        // Handle submenu visibility
        const submenuParents = document.querySelectorAll('.has-submenu');
        submenuParents.forEach(parent => {
            parent.addEventListener('mouseenter', function() {
                const submenu = this.querySelector('.submenu');
                if (submenu) {
                    const rect = this.getBoundingClientRect();
                    submenu.style.top = '0';
                    submenu.style.left = `${rect.width}px`;
                    submenu.style.display = 'block';
                }
            });
            
            parent.addEventListener('mouseleave', function() {
                const submenu = this.querySelector('.submenu');
                if (submenu) {
                    submenu.style.display = 'none';
                }
            });
        });
    }
    
    // Run initialization
    init();
}); 