const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');

sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('expanded');
    const isExpanded = sidebar.classList.contains('expanded');
    sidebarToggle.setAttribute('aria-expanded', isExpanded);
});

document.querySelector('.settings-btn').addEventListener('click', () => {
    // Add your settings logic here
    console.log('Settings clicked');
});

const textarea = document.querySelector('.input-field');
const sendButton = document.querySelector('.send-button');

textarea.addEventListener('input', () => {
    if (textarea.value.trim()) {
        sendButton.classList.add('active');
    } else {
        sendButton.classList.remove('active');
    }
});

// Handle suggestion chips
document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        textarea.value = chip.textContent;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        sendButton.classList.add('active');
        textarea.focus();
    });
});


// Update the model option click handler

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

document.querySelector('.model-dropdown-btn').addEventListener('click', function() {
    const dropdownContent = document.querySelector('.model-dropdown-content');
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    
    this.setAttribute('aria-expanded', !isExpanded);
    dropdownContent.style.display = isExpanded ? 'none' : 'block';
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.model-dropdown')) {
        const dropdownBtn = document.querySelector('.model-dropdown-btn');
        const dropdownContent = document.querySelector('.model-dropdown-content');
        
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownContent.style.display = 'none';
    }
});