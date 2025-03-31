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
        
        // Close any open submenus
        document.querySelectorAll('.submenu').forEach(submenu => {
            submenu.style.display = 'none';
        });
        
        // Remove event listener for clicking outside
        document.removeEventListener('click', handleClickOutside);
    }
    
    // Handle click outside function
    function handleClickOutside(e) {
        if (!modelDropdownBtn.contains(e.target) && 
            !modelDropdownContent.contains(e.target) &&
            !e.target.closest('.submenu')) {
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
            
            // Position the dropdown properly
            positionDropdown();
            
            // Add event listener for clicking outside
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 0);
        }
    }
    
    // Position dropdown function
    function positionDropdown() {
        const btnRect = modelDropdownBtn.getBoundingClientRect();
        const dropdownRect = modelDropdownContent.getBoundingClientRect();
        
        // Ensure the dropdown doesn't go off-screen
        const spaceBelow = window.innerHeight - btnRect.bottom;
        if (spaceBelow < dropdownRect.height) {
            modelDropdownContent.style.top = 'auto';
            modelDropdownContent.style.bottom = '100%';
            modelDropdownContent.style.marginTop = '0';
            modelDropdownContent.style.marginBottom = '4px';
        } else {
            modelDropdownContent.style.top = '100%';
            modelDropdownContent.style.bottom = 'auto';
            modelDropdownContent.style.marginTop = '4px';
            modelDropdownContent.style.marginBottom = '0';
        }
    }
    
    // Position submenu function
    function positionSubmenu(submenu, parentRect) {
        // Reset any previous positioning
        submenu.style.top = '';
        submenu.style.left = '';
        submenu.style.right = '';
        submenu.style.bottom = '';
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Check if there's enough space to the right
        if (parentRect.right + 280 > viewportWidth) {
            // Not enough space right, display to the left
            submenu.style.right = `${viewportWidth - parentRect.left + 5}px`;
        } else {
            // Enough space right, display to the right
            submenu.style.left = `${parentRect.right + 5}px`;
        }
        
        // Check vertical positioning
        if (parentRect.top + submenu.offsetHeight > viewportHeight) {
            // Not enough space below, align bottom with viewport
            submenu.style.bottom = '10px';
        } else {
            // Enough space below, align with parent top
            submenu.style.top = `${parentRect.top}px`;
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
        
        // Handle submenu visibility and positioning
        const submenuParents = document.querySelectorAll('.has-submenu');
        submenuParents.forEach(parent => {
            parent.addEventListener('mouseenter', function(e) {
                const submenu = this.querySelector('.submenu');
                if (submenu) {
                    const rect = this.getBoundingClientRect();
                    positionSubmenu(submenu, rect);
                    submenu.style.display = 'block';
                }
            });
            
            parent.addEventListener('mouseleave', function(e) {
                // Check if we're moving to the submenu
                const submenu = this.querySelector('.submenu');
                const relatedTarget = e.relatedTarget;
                
                if (submenu && !submenu.contains(relatedTarget)) {
                    submenu.style.display = 'none';
                }
            });
        });
        
        // Handle window resize for dropdown positioning
        window.addEventListener('resize', function() {
            if (isDropdownOpen) {
                positionDropdown();
                
                // Reposition any visible submenus
                document.querySelectorAll('.has-submenu').forEach(parent => {
                    const submenu = parent.querySelector('.submenu');
                    if (submenu && submenu.style.display === 'block') {
                        positionSubmenu(submenu, parent.getBoundingClientRect());
                    }
                });
            }
        });
    }
    
    // Run initialization
    init();
}); 