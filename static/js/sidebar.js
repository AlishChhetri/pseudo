// Sidebar Toggle
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');

sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('expanded');
    const isExpanded = sidebar.classList.contains('expanded');
    sidebarToggle.setAttribute('aria-expanded', isExpanded);
});

// Settings Button
document.querySelector('.settings-btn').addEventListener('click', () => {
    // Add your settings logic here
    console.log('Settings clicked');
});
