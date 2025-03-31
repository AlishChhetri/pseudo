let currentChatId = null;
const chatContainer = document.getElementById('chat-container');

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-btn');
    
    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });
    
    // Handle send button click
    sendButton.addEventListener('click', () => sendMessage());
    
    // Handle enter key (shift+enter for new line)
    userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
            sendMessage();
        }
    });
    
    // Handle new chat button
    if (newChatButton) {
        newChatButton.addEventListener('click', createNewChat);
    }
    
    // Initialize a new chat if none is active
    initializeChat();
    
    // Load existing chats
    updateChatHistory();
});

async function initializeChat() {
    if (!currentChatId) {
        try {
            const response = await fetch('/api/chats/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.chat_id) {
                currentChatId = data.chat_id;
                console.log('New chat created:', currentChatId);
            } else {
                console.error('Failed to create new chat');
            }
        } catch (error) {
            console.error('Error creating new chat:', error);
        }
    } else {
        // Load existing chat
        loadChatHistory(currentChatId);
    }
}

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
        if (!message) return;
        
    // Add user message to chat
    addMessage(message, true);
    
    // Clear input and reset height
    userInput.value = '';
    userInput.style.height = 'auto';
        
        // Show thinking indicator
    const thinkingIndicator = showThinkingIndicator();
    
    // Ensure we have a current chat ID
    if (!currentChatId) {
        await initializeChat();
    }
    
    try {
        console.log('Sending message to chat:', currentChatId);
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                chat_id: currentChatId
            }),
        });
        
        const data = await response.json();
        console.log('Response received:', data);
        
        // Remove thinking indicator
        thinkingIndicator.remove();
        
        if (data.error) {
            addMessage(`Error: ${data.error}`, false);
            return;
        }
        
        // Handle different response types
        if (data.type === 'image') {
            addMessage({
                type: 'image',
                url: data.url
            }, false);
        } else if (data.type === 'audio') {
            addMessage({
                type: 'audio',
                url: data.url
            }, false);
        } else {
            // Text response
            addMessage(data.response, false);
        }
        
        // Update chat history
        updateChatHistory();
        
    } catch (error) {
        // Remove thinking indicator
        thinkingIndicator.remove();
        
        addMessage('Error: Failed to send message. Please try again.', false);
        console.error('Error:', error);
    }
}

async function loadChatHistory(chatId) {
    if (!chatId) {
        console.log('No chat ID provided for loading history');
        return;
    }
    
    try {
        console.log('Loading chat history for:', chatId);
        const response = await fetch(`/api/chats/${chatId}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Error loading chat history:', data.error);
            return;
        }
        
        // Clear existing messages
        chatContainer.innerHTML = '';
        
        // Add messages from history if available
        if (data.messages && Array.isArray(data.messages)) {
            data.messages.forEach(msg => {
                try {
                    const isUser = msg.role === 'user';
                    
                    // Check if content is JSON string
                    let content = msg.content;
                    if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
                        try {
                            content = JSON.parse(content);
                        } catch (e) {
                            // Not valid JSON, keep as string
                        }
                    }
                    
                    if (msg.mode === 'image') {
                        addMessage({
                            type: 'image',
                            url: msg.media_url || content.url || content.path
                        }, isUser);
                    } else if (msg.mode === 'audio') {
                        addMessage({
                            type: 'audio',
                            url: msg.media_url || content.url || content.path
                        }, isUser);
                    } else {
                        // Text message
                        if (typeof content === 'object' && content.response) {
                            addMessage(content.response, isUser);
                        } else {
                            addMessage(content, isUser);
                        }
                    }
                } catch (err) {
                    console.error('Error rendering message:', err, msg);
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

async function updateChatHistory() {
    try {
        const response = await fetch('/api/chats');
        const data = await response.json();
        
        if (data.error) {
            console.error('Error updating chat history:', data.error);
            return;
        }
        
        // Update sidebar chat list
        if (data.chats && Array.isArray(data.chats)) {
            updateSidebarChatList(data.chats);
        }
        
    } catch (error) {
        console.error('Error updating chat history:', error);
    }
}

function updateSidebarChatList(chats) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        console.warn('Sidebar element not found');
        return;
    }
    
    let chatList = sidebar.querySelector('.chat-list');
    if (!chatList) {
        // Create chat list if it doesn't exist
        chatList = document.createElement('div');
        chatList.className = 'chat-list';
        sidebar.appendChild(chatList);
    }
    
    // Clear existing chat list
    chatList.innerHTML = '';
    
    // Add chats to sidebar
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (chat.id === currentChatId) {
            chatItem.classList.add('active');
        }
        chatItem.setAttribute('data-id', chat.id);
        
        // Create chat title with fallback
        const title = chat.title || 'New Chat';
        
        chatItem.innerHTML = `
            <span class="chat-title">${title}</span>
            <div class="chat-actions">
                <button class="chat-action-btn" title="Delete chat" onclick="deleteChat('${chat.id}')">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        `;
        
        // Add click event to load this chat
        chatItem.addEventListener('click', (e) => {
            // Don't trigger if they clicked the delete button
            if (e.target.closest('.chat-action-btn')) return;
            
            // Load the selected chat
            currentChatId = chat.id;
            loadChatHistory(chat.id);
            
            // Update active state
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            chatItem.classList.add('active');
        });
        
        chatList.appendChild(chatItem);
    });
}

async function deleteChat(chatId) {
    showConfirmation('Are you sure you want to delete this chat?', async () => {
        try {
            const response = await fetch(`/api/chat/${chatId}`, {
                method: 'DELETE',
            });
            
            const data = await response.json();
            
            if (data.error) {
                console.error('Error deleting chat:', data.error);
                return;
            }
            
            // Remove chat from sidebar
            const chatItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
            if (chatItem) {
                chatItem.remove();
            }
            
            // Clear chat container if this was the current chat
            if (currentChatId === chatId) {
                chatContainer.innerHTML = '';
                currentChatId = null;
            }
            
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    });
}

function showConfirmation(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Confirm Action</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-actions">
                <button class="cancel-button">Cancel</button>
                <button class="confirm-button">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close button
    modal.querySelector('.close-button').onclick = () => modal.remove();
    
    // Handle cancel button
    modal.querySelector('.cancel-button').onclick = () => modal.remove();
    
    // Handle confirm button
    modal.querySelector('.confirm-button').onclick = () => {
        modal.remove();
        onConfirm();
    };
    
    // Handle clicking outside modal
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (typeof content === 'string') {
        messageContent.textContent = content;
    } else if (content.type === 'image') {
        const mediaWrapper = document.createElement('div');
        mediaWrapper.className = 'media-wrapper';
        
        const image = document.createElement('img');
        image.className = 'generated-image';
        image.src = content.url;
        image.alt = 'Generated image';
        
        const mediaActions = document.createElement('div');
        mediaActions.className = 'media-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'media-action-btn';
        downloadBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>Download';
        downloadBtn.onclick = () => window.open(content.url, '_blank');
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'media-action-btn';
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>Copy Link';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(content.url);
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>Copy Link';
            }, 2000);
        };
        
        mediaActions.appendChild(downloadBtn);
        mediaActions.appendChild(copyBtn);
        
        mediaWrapper.appendChild(image);
        mediaWrapper.appendChild(mediaActions);
        
        messageContent.appendChild(mediaWrapper);
    } else if (content.type === 'audio') {
        const mediaWrapper = document.createElement('div');
        mediaWrapper.className = 'media-wrapper';
        
        const audio = document.createElement('audio');
        audio.className = 'audio-content';
        audio.controls = true;
        audio.src = content.url;
        
        const mediaActions = document.createElement('div');
        mediaActions.className = 'media-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'media-action-btn';
        downloadBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>Download';
        downloadBtn.onclick = () => window.open(content.url, '_blank');
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'media-action-btn';
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>Copy Link';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(content.url);
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>Copy Link';
            }, 2000);
        };
        
        mediaActions.appendChild(downloadBtn);
        mediaActions.appendChild(copyBtn);
        
        mediaWrapper.appendChild(audio);
        mediaWrapper.appendChild(mediaActions);
        
        messageContent.appendChild(mediaWrapper);
    }
    
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    messageInfo.innerHTML = `<span>${new Date().toLocaleTimeString()}</span>`;
    
    messageBubble.appendChild(messageContent);
    messageBubble.appendChild(messageInfo);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageBubble);
    
    document.getElementById('chat-container').appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
}

function showThinkingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.className = 'thinking-indicator';
    thinkingIndicator.innerHTML = '<span></span><span></span><span></span>';
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(thinkingIndicator);
    
    document.getElementById('chat-container').appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
        
        return messageDiv;
    }
    
async function createNewChat() {
    try {
        const response = await fetch('/api/chats/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.chat_id) {
            // Set as current chat
            currentChatId = data.chat_id;
            
            // Clear chat container
        chatContainer.innerHTML = '';
            
            // Update sidebar
            updateChatHistory();
            
            // Focus input field
            document.getElementById('user-input').focus();
            
            console.log('New chat created:', currentChatId);
        } else {
            console.error('Failed to create new chat');
        }
    } catch (error) {
        console.error('Error creating new chat:', error);
    }
} 