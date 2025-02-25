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