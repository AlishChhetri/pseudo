document.addEventListener('DOMContentLoaded', function() {
    // Chat elements
    const chatContainer = document.querySelector('.chat-container');
    const inputField = document.querySelector('.input-field');
    const sendButton = document.querySelector('.send-button');
    const welcomeScreen = document.querySelector('.welcome-screen');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    const chatHistoryContainer = document.querySelector('.chat-history');
    
    // State variables
    let selectedModel = 'Auto';
    let currentChatId = null;
    let chatMessages = [];
    
    // Initialize
    setupEventListeners();
    loadChatHistory();
    createNewChat(false);
    
    // Auto-focus input field when page loads
    if (inputField) {
        setTimeout(() => {
            inputField.focus();
        }, 100);
    }
    
    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Send button click
        sendButton.addEventListener('click', handleSendMessage);
        
        // Enter key press in input field
        inputField.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        // Auto-resize input field
        inputField.addEventListener('input', function() {
            inputField.style.height = 'auto';
            inputField.style.height = (inputField.scrollHeight > 150 ? 150 : inputField.scrollHeight) + 'px';
        });
        
        // Suggestion chips
        suggestionChips?.forEach(chip => {
            chip.addEventListener('click', function() {
                inputField.value = chip.textContent;
                inputField.focus();
            });
        });
        
        // New chat button
        document.querySelector('.new-chat-btn')?.addEventListener('click', function() {
            createNewChat(true);
        });
        
        // Update selected model when changed
        document.addEventListener('modelSelected', function(e) {
            selectedModel = e.detail.model;
            console.log('Model selected:', selectedModel);
        });

        // Global click for input focus
        document.addEventListener('click', function(e) {
            // If not clicking in textarea and not a button
            if (!e.target.closest('textarea') && !e.target.closest('button')) {
                inputField?.focus();
            }
        });
    }
    
    /**
     * Load chat history from the server
     */
    function loadChatHistory() {
        fetch('/api/chats')
            .then(response => response.json())
            .then(data => {
                if (data.chats && Array.isArray(data.chats)) {
                    displayChatHistory(data.chats);
                }
            })
            .catch(error => {
                console.error('Error loading chat history:', error);
            });
    }
    
    /**
     * Display chat history in the sidebar
     */
    function displayChatHistory(chats) {
        // Clear existing history
        if (chatHistoryContainer) {
            chatHistoryContainer.innerHTML = '';
            
            // Add each chat to history
            chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-history-item';
                chatItem.dataset.chatId = chat.id;
                
                // Set active class if this is the current chat
                if (chat.id === currentChatId) {
                    chatItem.classList.add('active');
                }
                
                // Format date
                const date = new Date(chat.updated_at);
                const formattedDate = date.toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric' 
                });
                
                chatItem.innerHTML = `
                    <div class="chat-item-content">
                        <div class="chat-item-title">${chat.title}</div>
                        <div class="chat-item-date">${formattedDate}</div>
                    </div>
                    <button class="delete-chat-btn" aria-label="Delete chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                `;
                
                // Add event listener for loading this chat
                chatItem.addEventListener('click', function(e) {
                    // Don't trigger if delete button was clicked
                    if (e.target.closest('.delete-chat-btn')) {
                        return;
                    }
                    
                    loadChat(chat.id);
                });
                
                // Add event listener for delete button
                const deleteBtn = chatItem.querySelector('.delete-chat-btn');
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    deleteChat(chat.id);
                });
                
                chatHistoryContainer.appendChild(chatItem);
            });
        }
    }
    
    /**
     * Create a new chat
     */
    function createNewChat(saveImmediately = true) {
        // Clear UI
        if (chatContainer) {
            chatContainer.innerHTML = '';
        }
        
        if (welcomeScreen) {
            welcomeScreen.style.display = 'block';
        }
        
        if (chatContainer) {
            chatContainer.style.display = 'none';
        }
        
        chatMessages = [];
        
        if (saveImmediately) {
            // Create new chat via API
            fetch('/api/chats/new', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                currentChatId = data.chat_id;
                // Update chat history display
                loadChatHistory();
            })
            .catch(error => {
                console.error('Error creating new chat:', error);
            });
        } else {
            // Just reset UI without creating permanently
            currentChatId = null;
        }
    }
    
    /**
     * Load a specific chat
     */
    function loadChat(chatId) {
        fetch(`/api/chats/${chatId}`)
            .then(response => response.json())
            .then(chat => {
                // Set as current chat
                currentChatId = chatId;
                
                // Clear UI
                if (chatContainer) {
                    chatContainer.innerHTML = '';
                }
                
                if (welcomeScreen) {
                    welcomeScreen.style.display = 'none';
                }
                
                if (chatContainer) {
                    chatContainer.style.display = 'block';
                }
                
                // Store messages for future reference
                chatMessages = chat.messages;
                
                // Display messages
                chat.messages.forEach(message => {
                    if (message.role === 'user') {
                        appendMessage('user', message.content);
                    } else if (message.role === 'assistant') {
                        // Parse content if it's a JSON string
                        let content = message.content;
                        let mediaPath = message.media_path;
                        
                        if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
                            try {
                                content = JSON.parse(content);
                            } catch (e) {
                                // Keep as string if parsing fails
                            }
                        }
                        
                        // Handle different content types
                        if (message.mode === 'image') {
                            if (mediaPath) {
                                appendImageMessage(`/chat_history/${chatId}/${mediaPath}`, true);
                            } else if (content && content.path) {
                                appendImageMessage(content.path);
                            } else {
                                appendMessage('assistant', 'Image unavailable');
                            }
                        } else if (message.mode === 'audio') {
                            if (mediaPath) {
                                appendAudioMessage(`/chat_history/${chatId}/${mediaPath}`, true);
                            } else if (content && content.path) {
                                appendAudioMessage(content.path);
                            } else {
                                appendMessage('assistant', 'Audio unavailable');
                            }
                        } else {
                            // Text content
                            if (typeof content === 'object') {
                                appendMessage('assistant', JSON.stringify(content));
                            } else {
                                appendMessage('assistant', content);
                            }
                        }
                    }
                });
                
                // Highlight this chat in the history
                document.querySelectorAll('.chat-history-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.chatId === chatId);
                });
            })
            .catch(error => {
                console.error(`Error loading chat ${chatId}:`, error);
            });
    }
    
    /**
     * Delete a chat
     */
    function deleteChat(chatId) {
        if (!confirm('Are you sure you want to delete this chat?')) {
            return;
        }
        
        fetch(`/api/chats/${chatId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            // If the deleted chat was the current one, create a new chat
            if (chatId === currentChatId) {
                createNewChat(false);
            }
            
            // Refresh chat history
            loadChatHistory();
        })
        .catch(error => {
            console.error(`Error deleting chat ${chatId}:`, error);
        });
    }
    
    /**
     * Handle sending a message
     */
    function handleSendMessage() {
        const message = inputField.value.trim();
        if (!message) return;
        
        // Hide welcome screen, show chat container
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
        
        if (chatContainer) {
            chatContainer.style.display = 'block';
        }
        
        // Add user message to UI
        appendMessage('user', message);
        
        // Clear input field
        inputField.value = '';
        inputField.style.height = 'auto';
        
        // Show thinking indicator
        const thinkingIndicator = appendThinkingIndicator();
        
        // Send message to backend
        sendMessageToBackend(message)
            .then(response => {
                // Remove thinking indicator
                if (thinkingIndicator && chatContainer.contains(thinkingIndicator)) {
                    chatContainer.removeChild(thinkingIndicator);
                }
                
                // Process and display response
                processResponse(response);
                
                // Update chat history display
                loadChatHistory();
            })
            .catch(error => {
                // Remove thinking indicator
                if (thinkingIndicator && chatContainer.contains(thinkingIndicator)) {
                    chatContainer.removeChild(thinkingIndicator);
                }
                
                // Show error message
                appendMessage('assistant', `Error: ${error.message}`);
            });
    }
    
    /**
     * Send message to backend API
     */
    function sendMessageToBackend(message) {
        return fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                model: selectedModel,
                chat_id: currentChatId,
                use_chat_folder: true // Ensure media is saved to chat folder
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Unknown error occurred');
                });
            }
            return response.json();
        });
    }
    
    /**
     * Process the response from the backend
     */
    function processResponse(response) {
        const content = response.response;
        const mode = response.selected_mode;
        
        // Update current chat ID if needed
        if (response.chat_id && !currentChatId) {
            currentChatId = response.chat_id;
        }
        
        // Display message based on content type
        if (mode === 'image' && response.url) {
            appendImageMessage(response.url);
        } else if (mode === 'audio' && response.url) {
            appendAudioMessage(response.url);
        } else {
            appendMessage('assistant', content);
        }
    }
    
    /**
     * Append a message to the chat container
     */
    function appendMessage(role, content) {
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';

        // Process content for code blocks
        if (typeof content === 'string' && content.includes('```')) {
            const parts = content.split(/(```(?:\w+)?\n[\s\S]*?\n```)/g);
            
            parts.forEach(part => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    // Handle code block
                    const codeBlock = document.createElement('pre');
                    codeBlock.className = 'code-block';
                    
                    // Get language if specified
                    const langMatch = part.match(/```(\w+)?\n/);
                    const language = langMatch && langMatch[1] ? langMatch[1] : '';
                    
                    // Get code content
                    const codeContent = part
                        .replace(/```(?:\w+)?\n/, '')
                        .replace(/\n```$/, '');
                    
                    codeBlock.innerHTML = `<code class="language-${language}">${escapeHtml(codeContent)}</code>`;
                    contentDiv.appendChild(codeBlock);
                } else if (part.trim()) {
                    // Handle regular text
                    const textNode = document.createElement('p');
                    textNode.textContent = part;
                    contentDiv.appendChild(textNode);
                }
            });
        } else {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        return messageDiv;
    }

    // Helper function to escape HTML for code blocks
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Append an image message to the chat container
     */
    function appendImageMessage(imagePath, isFromChatHistory = false) {
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content image-content';
        
        // Image wrapper (contains image and actions)
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'media-wrapper';
        
        // Image element
        const image = document.createElement('img');
        image.src = imagePath;
        image.alt = 'Generated image';
        image.className = 'generated-image';
        image.loading = 'lazy'; // Improve performance
        
        // Enlarge image on click
        image.addEventListener('click', function() {
            const modal = document.createElement('div');
            modal.className = 'media-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'media-modal-content';
            
            const modalImage = document.createElement('img');
            modalImage.src = imagePath;
            modalImage.alt = 'Enlarged image';
            
            const closeButton = document.createElement('button');
            closeButton.className = 'modal-close-btn';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            modalContent.appendChild(modalImage);
            modalContent.appendChild(closeButton);
            modal.appendChild(modalContent);
            
            document.body.appendChild(modal);
            
            // Close modal when clicking outside of image
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        });
        
        // Media actions (download button)
        const mediaActions = document.createElement('div');
        mediaActions.className = 'media-actions';
        
        const downloadButton = document.createElement('button');
        downloadButton.className = 'media-action-btn download-btn';
        downloadButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span>Download</span>
        `;
        
        // Set download link based on source
        downloadButton.addEventListener('click', function() {
            let downloadPath;
            if (isFromChatHistory) {
                // Extract the base filename
                const filename = imagePath.split('/').pop();
                downloadPath = `/download/chat_history/${currentChatId}/media/${filename}`;
            } else {
                // Extract the base filename
                const filename = imagePath.split('/').pop();
                downloadPath = `/download/${filename}`;
            }
            
            // Create a temporary link and trigger download
            const a = document.createElement('a');
            a.href = downloadPath;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        
        mediaActions.appendChild(downloadButton);
        imageWrapper.appendChild(image);
        imageWrapper.appendChild(mediaActions);
        
        contentDiv.appendChild(imageWrapper);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        return messageDiv;
    }
    
    /**
     * Append an audio message to the chat container
     */
    function appendAudioMessage(audioPath, isFromChatHistory = false) {
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content audio-content';
        
        // Audio wrapper
        const audioWrapper = document.createElement('div');
        audioWrapper.className = 'media-wrapper';
        
        // Audio player
        const audio = document.createElement('audio');
        audio.controls = true;
        
        const source = document.createElement('source');
        source.src = audioPath;
        source.type = 'audio/mpeg';
        
        audio.appendChild(source);
        
        // Media actions (download button)
        const mediaActions = document.createElement('div');
        mediaActions.className = 'media-actions';
        
        const downloadButton = document.createElement('button');
        downloadButton.className = 'media-action-btn download-btn';
        downloadButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span>Download</span>
        `;
        
        // Set download link based on source
        downloadButton.addEventListener('click', function() {
            let downloadPath;
            if (isFromChatHistory) {
                // Extract the base filename
                const filename = audioPath.split('/').pop();
                downloadPath = `/download/chat_history/${currentChatId}/media/${filename}`;
            } else {
                // Extract the base filename
                const filename = audioPath.split('/').pop();
                downloadPath = `/download/${filename}`;
            }
            
            // Create a temporary link and trigger download
            const a = document.createElement('a');
            a.href = downloadPath;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        
        mediaActions.appendChild(downloadButton);
        audioWrapper.appendChild(audio);
        audioWrapper.appendChild(mediaActions);
        
        contentDiv.appendChild(audioWrapper);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        return messageDiv;
    }
    
    /**
     * Append a thinking indicator to the chat container
     */
    function appendThinkingIndicator() {
        if (!chatContainer) return document.createElement('div');

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message thinking';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-indicator';
        thinkingDiv.innerHTML = '<span></span><span></span><span></span>';
        
        contentDiv.appendChild(thinkingDiv);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        return messageDiv;
    }
}); 