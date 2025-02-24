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

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.querySelector('.toggle-sidebar-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width');
    const collapsedWidth = getComputedStyle(document.documentElement).getPropertyValue('--collapsed-width');

    // Set initial state
    sidebar.classList.remove('expanded');
    mainContent.classList.remove('sidebar-expanded');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('expanded');
        mainContent.classList.toggle('sidebar-expanded');
    });
});

document.querySelectorAll('.model-option').forEach(option => {
    option.addEventListener('click', function () {
        const selectedText = this.querySelector('.model-title').innerText;
        document.querySelector('.selected-model').innerText = selectedText;
    });
});