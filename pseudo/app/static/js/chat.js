document.addEventListener('DOMContentLoaded', function () {
    // Chat elements
    const chatContainer = document.querySelector('.chat-container');
    const inputField = document.querySelector('.input-field');
    const sendButton = document.querySelector('.send-button');
    const welcomeScreen = document.querySelector('.welcome-screen');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    const chatHistoryContainer = document.querySelector('.chat-history');

    // Sidebar elements
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const inputContainer = document.querySelector('.input-container');

    // State variables
    let currentChatId = null;
    let chatMessages = [];

    // Initialize
    setupEventListeners();
    setupMobileSidebar();
    
    // When the page loads, the sidebar.js will automatically load the most recent chat
    // so we don't need to explicitly create a new chat here unless there are no chats

    // Auto-focus input field when page loads
    if (inputField) {
        setTimeout(() => {
            inputField.focus();
        }, 100);
    }

    // Scroll to bottom when page loads
    setTimeout(scrollToBottom, 100);

    /**
     * Scroll chat container to bottom
     */
    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
            // Also scroll the window to ensure the input container is visible
            window.scrollTo(0, document.body.scrollHeight);
        }
    }

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Send button click
        if (sendButton) {
        sendButton.addEventListener('click', handleSendMessage);
        }

        // Enter key press in input field
        if (inputField) {
            inputField.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        // Auto-resize input field
            inputField.addEventListener('input', function () {
            inputField.style.height = 'auto';
            inputField.style.height = (inputField.scrollHeight > 150 ? 150 : inputField.scrollHeight) + 'px';
        });
        }

        // Suggestion chips
        suggestionChips?.forEach(chip => {
            chip.addEventListener('click', function () {
                if (inputField) {
                inputField.value = chip.textContent;
                inputField.focus();
                }
            });
        });

        // New chat button
        document.querySelector('.new-chat-btn')?.addEventListener('click', function () {
            createNewChat(true);
            // Close sidebar on mobile after creating a new chat
            if (window.innerWidth <= 768) {
                toggleSidebar(false);
            }
        });

        // Listen for chat loaded events from sidebar
        document.addEventListener('chatLoaded', function(e) {
            console.log('Chat loaded event received:', e.detail);
            loadChat(e.detail.chatId, e.detail.chatData);
        });
        
        // Listen for chat deleted events from sidebar
        document.addEventListener('chatDeleted', function(e) {
            console.log('Chat deleted event received:', e.detail);
            createNewChat(false);
        });
    }

    /**
     * Set up mobile sidebar functionality
     */
    function setupMobileSidebar() {
        // Close sidebar when window is resized to desktop size
        window.addEventListener('resize', function () {
            if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('visible')) {
                sidebar.classList.remove('visible');
            }
        });
    }

    /**
     * Create a new chat
     */
    function createNewChat(saveImmediately = false) {
        // Clear UI
        if (chatContainer) {
            chatContainer.innerHTML = '';
        }

        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
        }

        if (chatContainer) {
            chatContainer.style.display = 'none';
        }

        chatMessages = [];
        
        // We'll create a chat ID in memory but won't save it to the server until a message is sent
        // This prevents empty chats from being saved
        currentChatId = null;
        
        // Remove any existing temporary chat first
        if (window.sidebarFunctions && typeof window.sidebarFunctions.removeExistingTempChat === 'function') {
            window.sidebarFunctions.removeExistingTempChat();
        }
        
        // Create a new temporary chat
        if (window.sidebarFunctions && typeof window.sidebarFunctions.addChatHistoryItem === 'function') {
            const tempId = 'temp-' + Date.now(); // Temporary ID for UI only
            
            // Add the temporary chat to the sidebar - it will be automatically
            // inserted at the top and marked as active by the addChatHistoryItem function
            window.sidebarFunctions.addChatHistoryItem('New Chat', tempId, new Date().toLocaleDateString());
            
            // When user focuses on input, we'll prepare for them to type
            if (inputField) {
                setTimeout(() => {
                    inputField.focus();
                }, 100);
            }
        }
    }

    /**
     * Handle sending a message
     */
    function handleSendMessage() {
        if (!inputField) return;
        
        const message = inputField.value.trim();
        if (!message) return;

        // Hide welcome screen, show chat container
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }

        if (chatContainer) {
            chatContainer.style.display = 'flex';
        }

        // Get the currently active temp chat if it exists
        const activeTempChat = document.querySelector('.chat-history-item.active[data-id^="temp-"]');
        const tempChatId = activeTempChat ? activeTempChat.dataset.id : null;

        // Check if we need to create a new chat first
        if (!currentChatId) {
            // Create a new chat on the server and then send the message
            fetch('/api/chats/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.chat_id) {
                    currentChatId = data.chat_id;
                    
                    // If we had a temp chat in the UI, update it with the real ID
                    if (tempChatId && activeTempChat) {
                        activeTempChat.dataset.id = currentChatId;
                    }
                    
                    // Now send the message
                    sendMessage(message);
                }
            })
            .catch(error => {
                console.error('Error creating new chat:', error);
            });
        } else {
            // Just send the message
            sendMessage(message);
        }
    }
    
    /**
     * Send a message to the API
     */
    function sendMessage(message) {
        // Add user message to UI
        appendMessage('user', message);

        // Clear input field
        inputField.value = '';
        inputField.style.height = 'auto';

        // Show thinking indicator
        const thinkingIndicator = appendThinkingIndicator();

        // Send the message to the API endpoint
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                chat_id: currentChatId
            })
        })
        .then(response => response.json())
        .then(data => {
            // Remove thinking indicator
            if (thinkingIndicator && chatContainer.contains(thinkingIndicator)) {
                chatContainer.removeChild(thinkingIndicator);
            }

            // Save the chat ID if it was created
            if (data.chat_id) {
                currentChatId = data.chat_id;
            }

            // Handle different types of responses
            if (data.type === 'image') {
                // For image responses, create an image element
                const imageElement = document.createElement('img');
                imageElement.src = data.url;
                imageElement.alt = 'Generated image';
                imageElement.style.maxWidth = '100%';
                imageElement.style.borderRadius = 'var(--radius-md)';
                
                // Create content div
                const contentDiv = document.createElement('div');
                contentDiv.className = 'content';
                contentDiv.appendChild(imageElement);
                
                // Add model attribution
                const attributionDiv = document.createElement('div');
                attributionDiv.className = 'model-attribution';
                
                // Create attribution text
                const attributionTextSpan = document.createElement('span');
                attributionTextSpan.className = 'model-attribution-text';
                
                let providerModel = '';
                if (data.provider && data.model) {
                    providerModel = `${data.provider} - ${data.model}`;
                } else if (data.model) {
                    providerModel = data.model;
                } else {
                    providerModel = 'Unknown';
                }
                
                attributionTextSpan.textContent = `Image | ${providerModel}`;
                
                attributionDiv.appendChild(attributionTextSpan);
                
                // Create action buttons for image
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-actions';
                
                // Download button
                const downloadButton = document.createElement('button');
                downloadButton.className = 'message-action-button download-button';
                downloadButton.setAttribute('aria-label', 'Download image');
                downloadButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                `;
                
                // Add download functionality
                downloadButton.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = data.url;
                    a.download = `image-${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    createToastNotification('Image download started');
                });
                
                actionsDiv.appendChild(downloadButton);
                attributionDiv.appendChild(actionsDiv);
                contentDiv.appendChild(attributionDiv);
                
                // Create message div
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message assistant-message';
                
                messageDiv.appendChild(contentDiv);
                
                chatContainer.appendChild(messageDiv);
                
            } else if (data.type === 'audio') {
                // For audio responses, create an audio element
                const audioElement = document.createElement('audio');
                audioElement.src = data.url;
                audioElement.controls = true;
                
                // Create content div
                const contentDiv = document.createElement('div');
                contentDiv.className = 'content';
                contentDiv.appendChild(audioElement);
                
                // Add model attribution
                const attributionDiv = document.createElement('div');
                attributionDiv.className = 'model-attribution';
                
                // Create attribution text
                const attributionTextSpan = document.createElement('span');
                attributionTextSpan.className = 'model-attribution-text';
                
                let providerModel = '';
                if (data.provider && data.model) {
                    providerModel = `${data.provider} - ${data.model}`;
                } else if (data.model) {
                    providerModel = data.model;
                } else {
                    providerModel = 'Unknown';
                }
                
                attributionTextSpan.textContent = `Audio | ${providerModel}`;
                
                attributionDiv.appendChild(attributionTextSpan);
                
                // Create action buttons for audio
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-actions';
                
                // Download button
                const downloadButton = document.createElement('button');
                downloadButton.className = 'message-action-button download-button';
                downloadButton.setAttribute('aria-label', 'Download audio');
                downloadButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                `;
                
                // Add download functionality
                downloadButton.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = data.url;
                    a.download = `audio-${Date.now()}.mp3`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    createToastNotification('Audio download started');
                });
                
                actionsDiv.appendChild(downloadButton);
                attributionDiv.appendChild(actionsDiv);
                contentDiv.appendChild(attributionDiv);
                
                // Create message div
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message assistant-message';
                
                messageDiv.appendChild(contentDiv);
                
                chatContainer.appendChild(messageDiv);
                
            } else {
                // Regular text response with metadata
                const metadata = {
                    mode: data.selected_mode || 'text',
                    model: data.model || 'Unknown',
                    provider: data.provider || null
                };
                appendMessage('assistant', data.response, metadata);
            }
            
            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            // Update chat in sidebar
            // Get the title from either the first user message or the default
            const chatTitle = message || 'New Chat';
            
            // Update the chat in the sidebar to reflect its new position as most recent
            if (window.sidebarFunctions && typeof window.sidebarFunctions.updateChatInSidebar === 'function') {
                window.sidebarFunctions.updateChatInSidebar(currentChatId, chatTitle);
            }
        })
        .catch(error => {
            // Remove thinking indicator
            if (thinkingIndicator && chatContainer.contains(thinkingIndicator)) {
                chatContainer.removeChild(thinkingIndicator);
            }
            
            // Show error message
            console.error('Error sending message:', error);
            createToastNotification('Error sending message. Please try again.', 5000);
        });
    }

    /**
     * Append a message to the chat container
     * @param {string} role - 'user' or 'assistant'
     * @param {string} content - The message content
     * @param {object} metadata - Optional metadata including model and mode
     */
    function appendMessage(role, content, metadata = {}) {
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        
        // Add the message content
        if (typeof content === 'string') {
            contentDiv.textContent = content;
        } else if (content instanceof HTMLElement) {
            contentDiv.appendChild(content);
        }

        // Add model attribution if available
        if (metadata.provider && metadata.model) {
            const attributionDiv = document.createElement('div');
            attributionDiv.className = 'model-attribution';
            
            const attributionText = document.createElement('span');
            attributionText.className = 'model-attribution-text';
            attributionText.textContent = `${metadata.provider} | ${metadata.model}`;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            
            // Copy button
            const copyButton = document.createElement('button');
            copyButton.className = 'message-action-button';
            copyButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
            copyButton.title = 'Copy text';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(content);
                createToastNotification('Text copied to clipboard');
            };
            
            // Download button for media
            if (metadata.type === 'image' || metadata.type === 'audio') {
                const downloadButton = document.createElement('button');
                downloadButton.className = 'message-action-button';
                downloadButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';
                downloadButton.title = 'Download';
                downloadButton.onclick = () => {
                    window.open(metadata.url, '_blank');
                };
                actionsDiv.appendChild(downloadButton);
            }
            
            actionsDiv.appendChild(copyButton);
            attributionDiv.appendChild(attributionText);
            attributionDiv.appendChild(actionsDiv);
            contentDiv.appendChild(attributionDiv);
        }

        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
        
        // Scroll to bottom after adding message
        setTimeout(scrollToBottom, 100);
    }

    /**
     * Append a thinking indicator to the chat container
     */
    function appendThinkingIndicator() {
        if (!chatContainer) return document.createElement('div');

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message thinking';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';

        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-indicator';
        thinkingDiv.innerHTML = '<span></span><span></span><span></span>';

        contentDiv.appendChild(thinkingDiv);
        messageDiv.appendChild(contentDiv);

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        return messageDiv;
    }

    /**
     * Create a toast notification
     */
    function createToastNotification(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300); // Allow time for fade-out animation
        }, duration);
        
        return toast;
    }

    /**
     * Load an existing chat
     */
    function loadChat(chatId, chatData) {
        // Set the current chat ID
        currentChatId = chatId;
        
        // Clear UI
        if (chatContainer) {
            chatContainer.innerHTML = '';
        }
        
        // Hide welcome screen, show chat container
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
        
        if (chatContainer) {
            chatContainer.style.display = 'flex';
        }
        
        // Load messages
        if (chatData.messages && Array.isArray(chatData.messages)) {
            chatMessages = chatData.messages;
            
            // Add messages to UI
            chatMessages.forEach(message => {
                if (message.role === 'user') {
                    appendMessage('user', message.content);
                } else if (message.role === 'assistant') {
                    // Handle different types of assistant messages
                    if (message.mode === 'image' && message.media_path) {
                        // Create image element
                        const imageElement = document.createElement('img');
                        imageElement.src = `/chat_history/${chatId}/media/${message.media_path.split('/').pop()}`;
                        imageElement.alt = 'Generated image';
                        imageElement.style.maxWidth = '100%';
                        imageElement.style.borderRadius = 'var(--radius-md)';
                        
                        // Create content div
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'content';
                        contentDiv.appendChild(imageElement);
                        
                        // Add model attribution
                        const attributionDiv = document.createElement('div');
                        attributionDiv.className = 'model-attribution';
                        
                        // Create attribution text
                        const attributionTextSpan = document.createElement('span');
                        attributionTextSpan.className = 'model-attribution-text';
                        
                        let providerModel = '';
                        if (message.provider && message.model) {
                            providerModel = `${message.provider} - ${message.model}`;
                        } else if (message.model) {
                            providerModel = message.model;
                        } else {
                            providerModel = 'Unknown';
                        }
                        
                        attributionTextSpan.textContent = `Image | ${providerModel}`;
                        
                        attributionDiv.appendChild(attributionTextSpan);
                        
                        // Create action buttons
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'message-actions';
                        
                        // Download button
                        const downloadButton = document.createElement('button');
                        downloadButton.className = 'message-action-button download-button';
                        downloadButton.setAttribute('aria-label', 'Download image');
                        downloadButton.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        `;
                        
                        // Add download functionality
                        downloadButton.addEventListener('click', () => {
                            const a = document.createElement('a');
                            a.href = `/chat_history/${chatId}/media/${message.media_path.split('/').pop()}`;
                            a.download = `image-${Date.now()}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            createToastNotification('Image download started');
                        });
                        
                        actionsDiv.appendChild(downloadButton);
                        attributionDiv.appendChild(actionsDiv);
                        contentDiv.appendChild(attributionDiv);
                        
                        // Create message div
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'message assistant-message';
                        
                        messageDiv.appendChild(contentDiv);
                        
                        chatContainer.appendChild(messageDiv);
                    } else if (message.mode === 'audio' && message.media_path) {
                        // Create audio element
                        const audioElement = document.createElement('audio');
                        audioElement.src = `/chat_history/${chatId}/media/${message.media_path.split('/').pop()}`;
                        audioElement.controls = true;
                        
                        // Create content div
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'content';
                        contentDiv.appendChild(audioElement);
                        
                        // Add model attribution
                        const attributionDiv = document.createElement('div');
                        attributionDiv.className = 'model-attribution';
                        
                        // Create attribution text
                        const attributionTextSpan = document.createElement('span');
                        attributionTextSpan.className = 'model-attribution-text';
                        
                        let providerModel = '';
                        if (message.provider && message.model) {
                            providerModel = `${message.provider} - ${message.model}`;
                        } else if (message.model) {
                            providerModel = message.model;
                        } else {
                            providerModel = 'Unknown';
                        }
                        
                        attributionTextSpan.textContent = `Audio | ${providerModel}`;
                        
                        attributionDiv.appendChild(attributionTextSpan);
                        
                        // Create action buttons
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'message-actions';
                        
                        // Download button
                        const downloadButton = document.createElement('button');
                        downloadButton.className = 'message-action-button download-button';
                        downloadButton.setAttribute('aria-label', 'Download audio');
                        downloadButton.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        `;
                        
                        // Add download functionality
                        downloadButton.addEventListener('click', () => {
                            const a = document.createElement('a');
                            a.href = `/chat_history/${chatId}/media/${message.media_path.split('/').pop()}`;
                            a.download = `audio-${Date.now()}.mp3`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            createToastNotification('Audio download started');
                        });
                        
                        actionsDiv.appendChild(downloadButton);
                        attributionDiv.appendChild(actionsDiv);
                        contentDiv.appendChild(attributionDiv);
                        
                        // Create message div
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'message assistant-message';
                        
                        messageDiv.appendChild(contentDiv);
                        
                        chatContainer.appendChild(messageDiv);
                    } else {
                        // Regular text message with metadata
                        const metadata = {
                            mode: message.mode || 'text',
                            model: message.model || 'Unknown',
                            provider: message.provider || null
                        };
                        appendMessage('assistant', message.content, metadata);
                    }
                }
            });
            
            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
});

/**
 * Create and display a toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds
 */
function createToastNotification(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300); // Allow time for fade-out animation
    }, duration);
    
    return toast;
} 