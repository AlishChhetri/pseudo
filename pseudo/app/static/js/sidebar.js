document.addEventListener('DOMContentLoaded', function () {
    // Sidebar elements
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Always keep sidebar expanded
    sidebar.classList.add('expanded');
    
    // Load existing chats from the server
    loadChats();

    /**
     * Load existing chats from the server
     */
    function loadChats() {
        fetch('/api/chats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.chats && Array.isArray(data.chats)) {
                // Clear existing chat history
                const chatHistory = document.querySelector('.chat-history');
                chatHistory.innerHTML = '';
                
                // Sort chats by timestamp (newest first)
                const sortedChats = data.chats.sort((a, b) => {
                    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
                });
                
                // Add each chat to the sidebar
                sortedChats.forEach(chat => {
                    const chatTitle = chat.title || 'Untitled Chat';
                    const chatId = chat.id;
                    addChatHistoryItem(chatTitle, chatId);
                });
                
                // If there are chats, load the first one
                if (sortedChats.length > 0) {
                    switchToChat(sortedChats[0].id);
                }
            }
        })
        .catch(error => {
            console.error('Error loading chats:', error);
        });
    }

    /**
     * Add a chat history item
     * @param {string} title - Chat title
     * @param {string} id - Unique identifier
     */
    function addChatHistoryItem(title, id) {
        const chatHistory = document.querySelector('.chat-history');

        const item = document.createElement('div');
        item.className = 'chat-history-item';
        item.dataset.id = id;

        const itemContent = document.createElement('div');
        itemContent.className = 'chat-item-content';

        const itemTitle = document.createElement('div');
        itemTitle.className = 'chat-item-title';
        itemTitle.textContent = title;

        const itemDate = document.createElement('div');
        itemDate.className = 'chat-item-date';
        itemDate.textContent = new Date().toLocaleDateString();

        itemContent.appendChild(itemTitle);
        itemContent.appendChild(itemDate);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = 'Delete chat';

        // Handle click to switch to this chat
        item.addEventListener('click', function (e) {
            if (!e.target.closest('.delete-chat-btn')) {
                switchToChat(id);
            }
        });

        // Handle delete button
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            deleteChat(id);
        });

        item.appendChild(itemContent);
        item.appendChild(deleteBtn);

        chatHistory.appendChild(item);
        return item;
    }

    /**
     * Switch to a specific chat
     * @param {string} chatId - ID of chat to switch to
     */
    function switchToChat(chatId) {
        // Load chat data from the server
        fetch(`/api/chats/${chatId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(chatData => {
            if (!chatData.error) {
                console.log('Loaded chat data:', chatData);
                
                // Highlight the selected chat in the sidebar
                document.querySelectorAll('.chat-history-item').forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.id === chatId) {
                        item.classList.add('active');
                    }
                });
                
                // Show chat container, hide welcome screen
                const chatContainer = document.querySelector('.chat-container');
                const welcomeScreen = document.querySelector('.welcome-screen');
                
                if (chatContainer && welcomeScreen) {
                    chatContainer.style.display = 'flex';
                    welcomeScreen.style.display = 'none';
                }
                
                // Dispatch event to notify chat.js about the loaded chat
                document.dispatchEvent(new CustomEvent('chatLoaded', {
                    detail: { 
                        chatId: chatId,
                        chatData: chatData
                    }
                }));
            } else {
                console.error('Failed to load chat:', chatData.error);
            }
        })
        .catch(error => {
            console.error('Error loading chat:', error);
        });
    }

    /**
     * Delete a chat history item
     * @param {string} chatId - ID of chat to delete
     */
    function deleteChat(chatId) {
        // Delete chat on the server
        fetch(`/api/chats/${chatId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Chat deleted successfully:', chatId);
                
                // Remove the element from the sidebar
                const item = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
                if (item) {
                    item.remove();
                }
                
                // If no chats left, show welcome screen
                const remainingChats = document.querySelectorAll('.chat-history-item');
                if (remainingChats.length === 0) {
                    const chatContainer = document.querySelector('.chat-container');
                    const welcomeScreen = document.querySelector('.welcome-screen');
                    
                    if (chatContainer && welcomeScreen) {
                        chatContainer.style.display = 'none';
                        welcomeScreen.style.display = 'flex';
                        
                        // Notify chat.js that we've switched to a new/empty chat
                        document.dispatchEvent(new CustomEvent('chatDeleted', {
                            detail: { chatId: chatId }
                        }));
                    }
                }
            } else {
                console.error('Failed to delete chat:', data.error);
            }
        })
        .catch(error => {
            console.error('Error deleting chat:', error);
        });
    }

    // Expose functions for external use
    window.sidebarFunctions = {
        addChatHistoryItem,
        switchToChat,
        deleteChat
    };
}); 