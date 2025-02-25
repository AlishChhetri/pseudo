
// Send Button Activation
const textarea = document.querySelector('.input-field');
const sendButton = document.querySelector('.send-button');

textarea.addEventListener('input', () => {
    if (textarea.value.trim()) {
        sendButton.classList.add('active');
    } else {
        sendButton.classList.remove('active');
    }
});

// Suggestion Chips
document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        textarea.value = chip.textContent;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        sendButton.classList.add('active');
        textarea.focus();
    });
});
