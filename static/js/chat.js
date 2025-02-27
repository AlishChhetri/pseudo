// Chat functionality
const chatContainer = document.querySelector('.chat-container');
const welcomeScreen = document.querySelector('.welcome-screen');
const textarea = document.querySelector('.input-field');
const sendButton = document.querySelector('.send-button');

let chatHistory = [];
let currentVariationIndexes = {};  // Track variation indexes by message ID

// Generate unique ID for messages
function generateUniqueId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Send Button Activation
textarea.addEventListener('input', () => {
    if (textarea.value.trim()) {
        sendButton.classList.add('active');
    } else {
        sendButton.classList.remove('active');
    }
});

// Handle message sending
async function handleSendMessage() {
    const message = textarea.value.trim();
    if (!message) return;

    // Hide welcome screen and show chat
    welcomeScreen.style.display = 'none';
    chatContainer.style.display = 'flex';

    // Add user message
    const userMessageId = addMessageToChat('user', message);

    // Clear input
    textarea.value = '';
    textarea.style.height = 'auto';
    sendButton.classList.remove('active');

    // Show typing indicator
    addTypingIndicator();

    try {
        // Get selected model
        const selectedModel = document.querySelector('.selected-model').textContent;
        
        // Send to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                model: selectedModel
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response');
        }

        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add assistant response
        addMessageToChat('assistant', data.response, userMessageId);

    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addErrorMessage();
    }
}

// Add message to chat
function addMessageToChat(role, content, previousMessageId = null) {
    const messageId = generateUniqueId();
    const message = {
        id: messageId,
        role,
        content,
        timestamp: new Date().toISOString(),
        previousMessageId
    };
    
    // If regenerating, remove all messages after the previous message
    if (previousMessageId) {
        removeMessagesAfter(previousMessageId);
    }
    
    chatHistory.push(message);
    
    const messageElement = createMessageElement(message);
    chatContainer.appendChild(messageElement);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return messageId;
}

// Remove messages after a specific message ID
function removeMessagesAfter(messageId) {
    // Find the index of the message in chatHistory
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
        // Get the next message (if any)
        const nextMessage = chatHistory[messageIndex + 1];
        
        if (nextMessage) {
            // Remove all messages after this one from the DOM
            let currentNode = document.getElementById(nextMessage.id);
            while (currentNode) {
                const nextNode = currentNode.nextElementSibling;
                currentNode.remove();
                currentNode = nextNode;
            }
            
            // Remove from chatHistory
            chatHistory = chatHistory.slice(0, messageIndex + 1);
        }
    }
}

// Create message element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;
    messageDiv.id = message.id;

    // Create message bubble
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // For assistant messages, prepare for possible variations
    if (message.role === 'assistant') {
        // Initialize variation index for this message
        currentVariationIndexes[message.id] = 0;
        
        // Create variations container instead of simple content
        const variationsContainer = document.createElement('div');
        variationsContainer.className = 'message-variations';
        
        const container = document.createElement('div');
        container.className = 'variations-container';
        
        // Add initial variation
        const variation = document.createElement('div');
        variation.className = 'variation active';
        variation.innerHTML = message.content;
        container.appendChild(variation);
        
        variationsContainer.appendChild(container);
        
        // Add variation controls
        const controls = document.createElement('div');
        controls.className = 'variation-controls';
        controls.innerHTML = `
            <div class="variation-indicator">
                <span class="current-variation">1</span>
                <span>/</span>
                <span class="total-variations">1</span>
            </div>
            <div class="variation-nav">
                <button class="variation-nav-btn prev" disabled title="Previous version">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                </button>
                <button class="variation-nav-btn next" disabled title="Next version">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                </button>
            </div>
        `;
        variationsContainer.appendChild(controls);
        
        // Setup variation navigation
        setupVariationNavigation(variationsContainer, message.id);
        
        bubble.appendChild(variationsContainer);
    } else {
        // Regular content for user messages
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = message.content;
        bubble.appendChild(content);
    }
    
    messageDiv.appendChild(bubble);

    // Only add info bar for assistant messages
    if (message.role === 'assistant') {
        const info = document.createElement('div');
        info.className = 'message-info';
        
        const currentModel = document.querySelector('.model-dropdown .selected-model').textContent;
        
        info.innerHTML = `
            <div class="message-model">
                <span class="selected-model">${currentModel}</span>
            </div>
            <div class="message-actions">
                <button class="message-action-btn copy-btn" title="Copy message">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </button>
                <button class="message-action-btn regenerate" title="Regenerate response">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                </button>
                <div class="model-switch">
                    <button class="message-action-btn model-switch-btn" title="Change model">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                            <path d="M7 12h2v5H7zm8-5h2v10h-2zm-4 7h2v3h-2zm0-4h2v2h-2z"/>
                        </svg>
                    </button>
                    <div class="model-dropdown-content">
                        ${document.querySelector('.model-dropdown-content').innerHTML}
                    </div>
                </div>
            </div>
        `;
        messageDiv.appendChild(info);

        // Add copy functionality
        const copyBtn = info.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                // Get active variation content
                const activeVariation = messageDiv.querySelector('.variation.active');
                const contentToCopy = activeVariation ? activeVariation.textContent : '';
                
                navigator.clipboard.writeText(contentToCopy);
                copyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                `;
                setTimeout(() => {
                    copyBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    `;
                }, 2000);
            });
        }

        // Add regeneration handling
        const regenerateBtn = info.querySelector('.regenerate');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => handleRegenerate(messageDiv, message));
        }

        // Add model switch functionality
        const modelSwitchBtn = info.querySelector('.model-switch-btn');
        const modelDropdownContent = info.querySelector('.model-dropdown-content');
        
        if (modelSwitchBtn && modelDropdownContent) {
            modelSwitchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other dropdowns first
                document.querySelectorAll('.model-dropdown-content.active').forEach(dropdown => {
                    if (dropdown !== modelDropdownContent) {
                        dropdown.classList.remove('active');
                    }
                });
                modelDropdownContent.classList.toggle('active');
            });
            
            // Setup model options
            modelDropdownContent.querySelectorAll('.model-option').forEach(option => {
                if (!option.classList.contains('has-submenu')) {
                    option.addEventListener('click', () => {
                        const modelTitle = option.querySelector('.model-title').innerText;
                        const parentMenu = option.closest('.submenu');
                        const newModel = parentMenu ? 
                            `${parentMenu.closest('.model-option').querySelector('.model-title').innerText} - ${modelTitle}` : 
                            modelTitle;
                        
                        handleModelSwitch(messageDiv, message, newModel);
                        modelDropdownContent.classList.remove('active');
                    });
                }
            });
        }
    }

    return messageDiv;
}

// Add typing indicator
function addTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'message assistant typing-indicator';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `
        <div class="typing-animation">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    bubble.appendChild(content);
    indicatorDiv.appendChild(bubble);
    chatContainer.appendChild(indicatorDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = chatContainer.querySelector('.typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Add error message
function addErrorMessage() {
    addMessageToChat('assistant', 'Sorry, there was an error processing your request. Please try again.');
}

// Setup variation navigation
function setupVariationNavigation(variationsEl, messageId) {
    const prevBtn = variationsEl.querySelector('.variation-nav-btn.prev');
    const nextBtn = variationsEl.querySelector('.variation-nav-btn.next');
    const currentIndicator = variationsEl.querySelector('.current-variation');
    const totalIndicator = variationsEl.querySelector('.total-variations');
    
    prevBtn.addEventListener('click', () => {
        const container = variationsEl.querySelector('.variations-container');
        const variations = container.querySelectorAll('.variation');
        const currentIndex = currentVariationIndexes[messageId];
        
        if (currentIndex > 0) {
            // Update current index
            currentVariationIndexes[messageId] = currentIndex - 1;
            
            // Update active variation
            variations.forEach((v, i) => {
                if (i === currentIndex - 1) {
                    v.classList.add('active');
                } else {
                    v.classList.remove('active');
                }
            });
            
            // Update indicator
            currentIndicator.textContent = currentIndex;
            
            // Update button states
            nextBtn.disabled = false;
            prevBtn.disabled = currentIndex - 1 === 0;
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const container = variationsEl.querySelector('.variations-container');
        const variations = container.querySelectorAll('.variation');
        const currentIndex = currentVariationIndexes[messageId];
        
        if (currentIndex < variations.length - 1) {
            // Update current index
            currentVariationIndexes[messageId] = currentIndex + 1;
            
            // Update active variation
            variations.forEach((v, i) => {
                if (i === currentIndex + 1) {
                    v.classList.add('active');
                } else {
                    v.classList.remove('active');
                }
            });
            
            // Update indicator
            currentIndicator.textContent = currentIndex + 2;
            
            // Update button states
            prevBtn.disabled = false;
            nextBtn.disabled = currentIndex + 1 === variations.length - 1;
        }
    });
}

// Add a new variation to an existing message
function addVariation(messageId, content) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;
    
    const variationsContainer = messageDiv.querySelector('.variations-container');
    const variationsEl = messageDiv.querySelector('.message-variations');
    const prevBtn = variationsEl.querySelector('.variation-nav-btn.prev');
    const nextBtn = variationsEl.querySelector('.variation-nav-btn.next');
    const currentIndicator = variationsEl.querySelector('.current-variation');
    const totalIndicator = variationsEl.querySelector('.total-variations');
    
    // Create new variation
    const newVariation = document.createElement('div');
    newVariation.className = 'variation';
    newVariation.innerHTML = content;
    variationsContainer.appendChild(newVariation);
    
    // Update total count
    const totalVariations = variationsContainer.querySelectorAll('.variation').length;
    totalIndicator.textContent = totalVariations;
    
    // Enable navigation buttons if more than one variation
    if (totalVariations > 1) {
        prevBtn.disabled = false;
        nextBtn.disabled = false;
    }
    
    // Show new variation
    setTimeout(() => {
        // Deactivate current variation
        variationsContainer.querySelector('.variation.active').classList.remove('active');
        
        // Activate new variation
        newVariation.classList.add('active');
        
        // Update index
        currentVariationIndexes[messageId] = totalVariations - 1;
        
        // Update current indicator
        currentIndicator.textContent = totalVariations;
        
        // Update button states
        prevBtn.disabled = false;
        nextBtn.disabled = true;
    }, 50);
}

// Handle message regeneration
async function handleRegenerate(messageDiv, message) {
    const userMessage = findUserMessageForAssistant(message.id);
    if (!userMessage) return;
    
    // Get currently selected model
    const selectedModel = document.querySelector('.selected-model').textContent;
    
    try {
        // Send regeneration request to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage.content,
                model: selectedModel,
                regenerate: true
            })
        });

        if (!response.ok) throw new Error('Failed to regenerate response');
        
        const data = await response.json();
        
        // Add variation to message
        addVariation(message.id, data.response);
        
        // Remove all messages after this one
        removeMessagesAfter(message.id);
        
    } catch (error) {
        console.error('Error:', error);
        // Add error variation
        addVariation(message.id, `
            <div class="error-message">
                Failed to generate response. Please try again.
            </div>
        `);
    }
}

// Handle model switch
async function handleModelSwitch(messageDiv, message, newModel) {
    try {
        // Update the model displays first
        const globalSelectedModel = document.querySelector('.model-dropdown .selected-model');
        const messageSelectedModel = messageDiv.querySelector('.selected-model');
        
        globalSelectedModel.textContent = newModel;
        messageSelectedModel.textContent = newModel;

        // Get the original user message that prompted this response
        const userMessage = findUserMessageForAssistant(message.id);
        if (!userMessage) return;
        
        // Send regeneration request to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage.content, // Use original user message
                model: newModel,
                regenerate: true
            })
        });

        if (!response.ok) throw new Error('Failed to generate response with new model');
        
        const data = await response.json();
        
        // Add variation to message
        addVariation(message.id, data.response);
        
        // Remove all messages after this one
        removeMessagesAfter(message.id);
        
    } catch (error) {
        console.error('Error:', error);
        const errorVariation = `
            <div class="error-message">
                Failed to generate response with new model. Please try again.
            </div>
        `;
        addVariation(messageDiv, errorVariation);
    }
}

// Find the user message that prompted an assistant response
function findUserMessageForAssistant(assistantMessageId) {
    const assistantMessage = chatHistory.find(msg => msg.id === assistantMessageId);
    if (!assistantMessage || !assistantMessage.previousMessageId) return null;
    
    return chatHistory.find(msg => msg.id === assistantMessage.previousMessageId);
}

// Handle send button click
sendButton.addEventListener('click', handleSendMessage);

// Handle enter key (with shift+enter for new line)
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Close all model dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.model-switch-dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
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