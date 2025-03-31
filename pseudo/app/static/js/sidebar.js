document.addEventListener('DOMContentLoaded', function() {
    // Sidebar elements
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Check localStorage for saved sidebar state
    let isSidebarExpanded = localStorage.getItem('sidebarExpanded') === 'true';
    
    // Apply initial state
    updateSidebarState();
    
    // Toggle sidebar on button click
    sidebarToggle.addEventListener('click', function() {
        isSidebarExpanded = !isSidebarExpanded;
        updateSidebarState();
        
        // Save state to localStorage
        localStorage.setItem('sidebarExpanded', isSidebarExpanded);
    });
    
    /**
     * Update the sidebar and main content based on expanded state
     */
    function updateSidebarState() {
        if (isSidebarExpanded) {
            sidebar.classList.add('expanded');
        } else {
            sidebar.classList.remove('expanded');
        }
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
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
        deleteBtn.title = 'Delete chat';
        
        // Handle click to switch to this chat
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.delete-chat-btn')) {
                switchToChat(id);
            }
        });
        
        // Handle delete button
        deleteBtn.addEventListener('click', function(e) {
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
        // Implementation would load chat data by ID
        console.log('Switching to chat:', chatId);
        
        // For this demo, just highlight the selected chat
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
    }
    
    /**
     * Delete a chat history item
     * @param {string} chatId - ID of chat to delete
     */
    function deleteChat(chatId) {
        // Implementation would delete chat data by ID
        console.log('Deleting chat:', chatId);
        
        // Remove the element
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
            }
        }
    }
    
    // Expose functions for external use
    window.sidebarFunctions = {
        addChatHistoryItem,
        switchToChat,
        deleteChat
    };
}); 