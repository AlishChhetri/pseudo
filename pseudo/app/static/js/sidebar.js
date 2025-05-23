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
                // Check if we already have a temporary chat that should remain at the top
                const existingTempChats = document.querySelectorAll('.chat-history-item[data-id^="temp-"]');
                let tempChatActive = false;
                let tempChatData = null;
                
                // Save details of the most recently active temp chat if exists
                if (existingTempChats.length > 0) {
                    // Keep only the most recent (or active) temp chat
                    existingTempChats.forEach((tempChat, index) => {
                        if (tempChat.classList.contains('active') || index === 0) {
                            tempChatActive = tempChat.classList.contains('active');
                            tempChatData = {
                                id: tempChat.dataset.id,
                                title: tempChat.querySelector('.chat-item-title').title || 'New Chat',
                                date: tempChat.querySelector('.chat-item-date').textContent || new Date().toLocaleDateString()
                            };
                        }
                    });
                }
                
                // Clear existing chat history
                const chatHistory = document.querySelector('.chat-history');
                chatHistory.innerHTML = '';
                
                // Add each chat to the sidebar in the order received
                // The chats are already sorted by updated_at on the server side (newest first)
                data.chats.forEach(chat => {
                    // Use title from chat data or default to "Untitled Chat"
                    const chatTitle = chat.title || 'Untitled Chat';
                    const chatId = chat.id;
                    const chatDate = new Date(chat.updated_at).toLocaleDateString();
                    addChatHistoryItem(chatTitle, chatId, chatDate);
                });
                
                // If we had a temporary chat, re-add it at the top
                if (tempChatData) {
                    const newTempChat = addChatHistoryItem(tempChatData.title, tempChatData.id, tempChatData.date);
                    
                    // If the temp chat was active, switch back to it
                    if (tempChatActive) {
                        switchToChat(tempChatData.id);
                        return; // Skip loading other chats
                    }
                }
                
                // If there are chats and no temp chat was active, load the most recent one
                if (data.chats.length > 0 && !tempChatActive) {
                    switchToChat(data.chats[0].id);
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
     * @param {string} date - Formatted date string
     */
    function addChatHistoryItem(title, id, date) {
        const chatHistory = document.querySelector('.chat-history');

        // Create chat history item
        const item = document.createElement('div');
        item.className = 'chat-history-item';
        item.dataset.id = id;

        const itemContent = document.createElement('div');
        itemContent.className = 'chat-item-content';

        // Create truncated title element
        const itemTitle = document.createElement('div');
        itemTitle.className = 'chat-item-title';
        // Truncate title if too long (30 chars)
        itemTitle.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title;
        
        // Set title attribute for tooltip on hover
        itemTitle.title = title;

        const itemDate = document.createElement('div');
        itemDate.className = 'chat-item-date';
        itemDate.textContent = date || new Date().toLocaleDateString();

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

        // Always insert temporary or new chats at the top of the list
        if (id.startsWith('temp-') || chatHistory.childNodes.length === 0) {
            // Insert at the beginning (top) of the chat history
            if (chatHistory.firstChild) {
                chatHistory.insertBefore(item, chatHistory.firstChild);
            } else {
                chatHistory.appendChild(item);
            }
        } else {
            // For existing chats being loaded from server history, 
            // they're already in the correct order (server sorts by updated_at)
            chatHistory.appendChild(item);
        }

        // If this is a temporary chat, automatically select it
        if (id.startsWith('temp-')) {
            // Set this as the active chat
            document.querySelectorAll('.chat-history-item').forEach(item => {
                item.classList.remove('active');
            });
            item.classList.add('active');
        }
        
        return item;
    }

    /**
     * Switch to a specific chat
     * @param {string} chatId - ID of chat to switch to
     */
    function switchToChat(chatId) {
        // Map chatId if it's in our mapping table
        if (window.chatIdMap && window.chatIdMap[chatId]) {
            const mappedId = window.chatIdMap[chatId];
            console.log(`Using mapped ID: ${mappedId} instead of ${chatId}`);
            chatId = mappedId;
        }
        
        // If this is a temporary chat ID, just highlight it and don't try to load from server
        if (chatId.startsWith('temp-')) {
            // Highlight the selected chat in the sidebar
            document.querySelectorAll('.chat-history-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.id === chatId) {
                    item.classList.add('active');
                }
            });
            
            // Show welcome screen for new chat
            const chatContainer = document.querySelector('.chat-container');
            const welcomeScreen = document.querySelector('.welcome-screen');
            
            if (chatContainer && welcomeScreen) {
                chatContainer.style.display = 'none';
                welcomeScreen.style.display = 'flex';
            }
            
            // Notify chat.js that we've switched to an empty chat
            document.dispatchEvent(new CustomEvent('chatLoaded', {
                detail: { 
                    chatId: chatId,
                    chatData: {
                        id: chatId,
                        title: "New Chat",
                        messages: []
                    }
                }
            }));
            
            // Focus the input field
            const inputField = document.querySelector('.input-field');
            if (inputField) {
                setTimeout(() => {
                    inputField.focus();
                }, 100);
            }
            
            return;
        }
        
        // For real chat IDs, load chat data from the server
        fetch(`/api/chats/${chatId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
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
                // If the chat doesn't exist anymore, create a new one
                if (chatData.error === "Chat not found") {
                    if (window.sidebarFunctions && typeof window.sidebarFunctions.createNewChat === 'function') {
                        window.sidebarFunctions.createNewChat();
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error loading chat:', error);
            
            // Try to handle common errors like chat not found
            // Check if the chat item still exists in the UI
            const chatItem = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
            if (chatItem) {
                chatItem.classList.add('error');
                
                // Add error tooltip
                const errorTooltip = document.createElement('div');
                errorTooltip.className = 'chat-error-tooltip';
                errorTooltip.textContent = 'Failed to load chat';
                chatItem.appendChild(errorTooltip);
                
                // Remove after a few seconds
                setTimeout(() => {
                    chatItem.classList.remove('error');
                    if (errorTooltip.parentNode === chatItem) {
                        chatItem.removeChild(errorTooltip);
                    }
                }, 3000);
            }
            
            // Switch to a new chat as fallback
            if (window.sidebarFunctions && typeof window.sidebarFunctions.createNewChat === 'function') {
                window.sidebarFunctions.createNewChat();
            }
        });
    }

    /**
     * Delete a chat history item
     * @param {string} chatId - ID of chat to delete
     */
    function deleteChat(chatId) {
        // If this is a temporary chat, just remove it from the UI
        if (chatId.startsWith('temp-')) {
            const item = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
            if (item) {
                item.remove();
            }
            
            // Show welcome screen
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
            
            // Check if we have any other chats to switch to
            const remainingChats = document.querySelectorAll('.chat-history-item:not([data-id^="temp-"])');
            if (remainingChats.length > 0) {
                // Load the most recent chat
                switchToChat(remainingChats[0].dataset.id);
            }
            
            return;
        }
        
        // Visual feedback - dim the chat item being deleted 
        const itemToDelete = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
        if (itemToDelete) {
            itemToDelete.classList.add('deleting');
            
            // Remove the item immediately from UI for better perceived performance
            // We'll add it back only on error
            const chatHistory = document.querySelector('.chat-history');
            const itemPosition = Array.from(chatHistory.children).indexOf(itemToDelete);
            const itemData = {
                id: itemToDelete.dataset.id,
                title: itemToDelete.querySelector('.chat-item-title').textContent,
                fullTitle: itemToDelete.querySelector('.chat-item-title').title,
                date: itemToDelete.querySelector('.chat-item-date').textContent,
                isActive: itemToDelete.classList.contains('active')
            };
            
            // Remove from UI immediately
            itemToDelete.remove();
            
            // Check if we need to switch to another chat if the active one was deleted
            if (itemData.isActive) {
                // If no chats left, show welcome screen
                const remainingChats = document.querySelectorAll('.chat-history-item:not([data-id^="temp-"])');
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
                } else {
                    // Load the next available chat
                    const nextChat = remainingChats[0];
                    if (nextChat) {
                        switchToChat(nextChat.dataset.id);
                    }
                }
            }
        }
        
        // For real chats, delete on the server
        fetch(`/api/chats/${chatId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            // Check if the response is ok (status in 200-299 range)
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('Chat deleted successfully:', chatId);
                // No need to remove from UI again, as we already did it for better UX
            } else {
                console.error('Failed to delete chat:', data.error);
                // Add the item back to the UI since deletion failed
                restoreDeletedChat(itemData, itemPosition);
            }
        })
        .catch(error => {
            console.error('Error deleting chat:', error);
            
            // Add the item back to the UI
            if (itemData && itemPosition !== undefined) {
                restoreDeletedChat(itemData, itemPosition);
            } else {
                // If we couldn't restore the specific item, refresh all chats
                loadChats();
            }
        });
    }
    
    /**
     * Restore a deleted chat if the deletion fails
     * @param {Object} itemData - Data about the chat item
     * @param {number} position - Original position in the list
     */
    function restoreDeletedChat(itemData, position) {
        const chatHistory = document.querySelector('.chat-history');
        
        // Re-create the chat history item
        const item = document.createElement('div');
        item.className = 'chat-history-item delete-error';
        item.dataset.id = itemData.id;
        
        const itemContent = document.createElement('div');
        itemContent.className = 'chat-item-content';
        
        const itemTitle = document.createElement('div');
        itemTitle.className = 'chat-item-title';
        itemTitle.textContent = itemData.title;
        itemTitle.title = itemData.fullTitle;
        
        const itemDate = document.createElement('div');
        itemDate.className = 'chat-item-date';
        itemDate.textContent = itemData.date;
        
        itemContent.appendChild(itemTitle);
        itemContent.appendChild(itemDate);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = 'Delete chat';
        
        // Handle click to switch to this chat
        item.addEventListener('click', function (e) {
            if (!e.target.closest('.delete-chat-btn')) {
                switchToChat(itemData.id);
            }
        });
        
        // Handle delete button
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            deleteChat(itemData.id);
        });
        
        item.appendChild(itemContent);
        item.appendChild(deleteBtn);
        
        // Re-add the item at the original position if possible
        if (position >= 0 && position < chatHistory.children.length) {
            chatHistory.insertBefore(item, chatHistory.children[position]);
        } else {
            chatHistory.appendChild(item);
        }
        
        // If it was active, make it active again
        if (itemData.isActive) {
            item.classList.add('active');
            switchToChat(itemData.id);
        }
        
        // Show error state temporarily
        setTimeout(() => {
            item.classList.remove('delete-error');
        }, 2000);
    }

    /**
     * Remove any existing temporary chat
     * Used when creating a new chat to ensure only one temp chat exists
     */
    function removeExistingTempChat() {
        const tempChats = document.querySelectorAll('.chat-history-item[data-id^="temp-"]');
        tempChats.forEach(tempChat => {
            tempChat.remove();
        });
    }

    /**
     * Update chat history with a real-time update
     * Used when a new message is sent in the current chat
     * @param {string} chatId - ID of the chat to update
     * @param {string} title - Updated title
     */
    function updateChatInSidebar(chatId, title) {
        // Handle case where we need to update a temp chat
        const tempChatItem = document.querySelector('.chat-history-item[data-id^="temp-"].active');
        
        // If we have an active temp chat and a real chat ID, update the temp chat
        if (tempChatItem && chatId && !chatId.startsWith('temp-')) {
            // Update the temp chat with the real ID
            tempChatItem.dataset.id = chatId;
            
            // Update the title
            const titleElement = tempChatItem.querySelector('.chat-item-title');
            if (titleElement) {
                // Truncate title if too long (30 chars)
                titleElement.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title;
                titleElement.title = title;
            }
            
            // Update date
            const dateElement = tempChatItem.querySelector('.chat-item-date');
            if (dateElement) {
                dateElement.textContent = new Date().toLocaleDateString();
            }
            
            // Ensure it's at the top of the list
            const chatHistory = document.querySelector('.chat-history');
            if (chatHistory.firstChild !== tempChatItem) {
                chatHistory.removeChild(tempChatItem);
                chatHistory.insertBefore(tempChatItem, chatHistory.firstChild);
            }
            
            return; // We've handled the temp chat case
        }
        
        // Find existing chat item with the real ID
        const existingItem = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
        
        if (existingItem) {
            // Update the title
            const titleElement = existingItem.querySelector('.chat-item-title');
            if (titleElement) {
                // Truncate title if too long (30 chars)
                titleElement.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title;
                titleElement.title = title;
            }
            
            // Update date
            const dateElement = existingItem.querySelector('.chat-item-date');
            if (dateElement) {
                dateElement.textContent = new Date().toLocaleDateString();
            }
            
            // Move to top of list (most recent first)
            const chatHistory = document.querySelector('.chat-history');
            if (chatHistory.firstChild !== existingItem) {
                chatHistory.removeChild(existingItem);
                chatHistory.insertBefore(existingItem, chatHistory.firstChild);
            }
        } else {
            // If the item doesn't exist, add it
            addChatHistoryItem(title, chatId, new Date().toLocaleDateString());
        }
    }

    // Expose functions for external use
    window.sidebarFunctions = {
        addChatHistoryItem,
        switchToChat,
        deleteChat,
        updateChatInSidebar,
        refreshChats: loadChats,
        removeExistingTempChat,
        createNewChat: function() {
            // This is a bridge function to allow chat.js to create a new chat from sidebar.js
            // First, get the createNewChat function from chat.js
            if (window.chatFunctions && typeof window.chatFunctions.createNewChat === 'function') {
                window.chatFunctions.createNewChat(true);
            } else {
                // Fallback implementation if chat.js function is not available
                const tempId = 'temp-' + Date.now();
                addChatHistoryItem('New Chat', tempId, new Date().toLocaleDateString());
                switchToChat(tempId);
            }
        }
    };
}); 