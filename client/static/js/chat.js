let socket = null;
let currentChatUserId = null;
let messagesLoaded = 0;
let isLoadingMoreMessages = false;
let hasMoreMessages = true;
let onlineUsers = {}; // Stores online user IDs
let reconnectAttempts = 0;
let isConnecting = false; // Flag to prevent multiple connection attempts
let maxReconnectAttempts = 5; // Maximum number of reconnection attempts
let reconnectTimer = null;

// Connect to the WebSocket server
function connectWebSocket() {
    // Clear any existing reconnect timer
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    // If already connecting, don't try again
    if (isConnecting) {
        console.log('Already attempting to connect, skipping duplicate attempt');
        return;
    }

    // If already connected and open, don't reconnect
    if (socket !== null && socket.readyState === WebSocket.OPEN) {
        // console.log('WebSocket already connected');
        return;
    }

    // If we've exceeded max reconnect attempts, stop trying
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Please reload the page to try again.`);
        return;
    }

    isConnecting = true;

    // Close existing connection if there is one
    if (socket !== null) {
        try {
            // Only attempt to close if not already closed
            if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
                socket.close();
            }
            socket = null;
        } catch (e) {
            console.log('Error closing previous connection:', e);
        }
    }

    try {
        // Create WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;

        console.log('Attempting to connect to WebSocket at:', wsUrl);
        socket = new WebSocket(wsUrl);

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
            if (socket && socket.readyState !== WebSocket.OPEN) {
                console.log('WebSocket connection timed out');
                try {
                    if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
                        socket.close();
                    }
                } catch (e) {
                    console.log('Error closing timed-out socket:', e);
                }
                isConnecting = false;
                scheduleReconnect();
            }
        }, 10000); // 10 second timeout

        // Add explicit handling for pong messages
        socket.onping = function () {
            console.log('Received ping from server');
        };

        socket.onpong = function () {
            console.log('Received pong from server');
        };

        socket.onopen = function () {
            console.log('WebSocket connection established');
            clearTimeout(connectionTimeout);
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            isConnecting = false;

            // Send a test message to ensure connection is working
            try {
                socket.send(JSON.stringify({ type: 'connection_test' }));
            } catch (e) {
                console.log('Error sending test message:', e);
            }
        };

        // Improved WebSocket message handling
        socket.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);

                // Check if this is a status update message
                if (data.type === 'status_update') {
                    // Update our local cache of online users
                    onlineUsers = data.online;

                    // Update UI to reflect new online status
                    updateOnlineStatus();
                    return;
                }

                const message = data;

                if (currentChatUserId && (message.sender_id === currentChatUserId || message.receiver_id === currentChatUserId)) {
                    addMessageToChat(message);
                    scrollToBottom();
                }

                loadOnlineUsers();
            } catch (e) {
                console.error('Error processing message:', e);
            }
        };

        // Add explicit ping/pong handling
        socket.onping = function () {
            console.log("Received ping from server");
        };

        socket.onpong = function () {
            console.log("Received pong response");
        };

        socket.onclose = function (event) {
            console.log('WebSocket connection closed. Code:', event.code, 'Reason:', event.reason);
            clearTimeout(connectionTimeout);
            isConnecting = false;

            // Most WebSocket close events should trigger a reconnection attempt
            if (event.code !== 1000) { // 1000 is normal closure
                scheduleReconnect();
            }
        };

        socket.onerror = function (error) {
            console.error('WebSocket error:', error);
            clearTimeout(connectionTimeout);
            isConnecting = false;
            // Always try to reconnect on error
            scheduleReconnect();
        };
    } catch (e) {
        console.error('Error creating WebSocket:', e);
        isConnecting = false;
        scheduleReconnect();
    }
}


// Check if the user's session is still valid
function checkSession(callback) {
    fetch('/api/check-session', {
        credentials: 'include'
    })
        .then(response => {
            if (response.ok) {
                return response.json().then(data => {
                    console.log('Session is valid');
                    callback(true);
                });
            } else {
                console.log('Session is invalid');
                callback(false);
            }
        })
        .catch(error => {
            console.error('Error checking session:', error);
            callback(false);
        });
}

// Schedule a reconnection attempt with exponential backoff
function scheduleReconnect() {
    reconnectAttempts++;

    if (reconnectAttempts > maxReconnectAttempts) {
        console.log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Please reload the page.`);
        return;
    }

    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    // Calculate delay with exponential backoff and a bit of randomness
    const delay = Math.min(maxDelay, baseDelay * Math.pow(1.5, reconnectAttempts)) +
        (Math.random() * 1000);

    console.log(`Scheduling reconnection attempt ${reconnectAttempts} in ${Math.round(delay)}ms`);

    // Clear any existing timer
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }

    reconnectTimer = setTimeout(function () {
        console.log(`Executing reconnection attempt ${reconnectAttempts}`);
        connectWebSocket();
    }, delay);
}

// Update the UI to reflect online status
function updateOnlineStatus() {
    const userItems = document.querySelectorAll('.user-item');
    userItems.forEach(item => {
        const userId = item.getAttribute('data-user-id');
        if (userId in onlineUsers) {
            item.classList.add('online');
            const statusIndicator = item.querySelector('.user-status');
            if (statusIndicator) {
                statusIndicator.classList.remove('offline-indicator');
                statusIndicator.classList.add('online-indicator');
            }
        } else {
            item.classList.remove('online');
            const statusIndicator = item.querySelector('.user-status');
            if (statusIndicator) {
                statusIndicator.classList.remove('online-indicator');
                statusIndicator.classList.add('offline-indicator');
            }
        }
    });
}

// Load online users
function loadOnlineUsers() {
    fetch('/api/get-online-users', {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(users => {
            // console.log(users);

            users.sort((a, b) => {
                const timeA = new Date(a.last_message || 0).getTime();
                const timeB = new Date(b.last_message || 0).getTime();
                if (timeA === 0 && timeB === 0) {
                    // Both have no messages, sort alphabetically
                    return a.username.localeCompare(b.username);
                } else if (timeA === 0) {
                    // A has no messages, B has, so B comes first
                    return 1;
                } else if (timeB === 0) {
                    // B has no messages, A has, so A comes first
                    return -1;
                } else {
                    // Both have messages, sort by most recent
                    return timeB - timeA;
                }
            });

            const usersList = document.getElementById('usersList');
            if (!usersList) return;

            usersList.innerHTML = '';

            users.forEach(user => {

                const userItem = document.createElement('div');
                userItem.classList.add('user-item');
                userItem.setAttribute('data-user-id', user.id);

                if (user.is_online) {
                    userItem.classList.add('online');
                }

                // Add an indicator for the active chat
                if (user.id === currentChatUserId) {
                    userItem.classList.add('active');
                }

                userItem.innerHTML = `
        <div class="user-status ${user.is_online ? 'online-indicator' : 'offline-indicator'}"></div>
        <div class="user-name">${user.username}</div>
      `;

                userItem.addEventListener('click', () => {
                    // Clear any active chat indicators
                    document.querySelectorAll('.user-item.active').forEach(el => {
                        el.classList.remove('active');
                    });

                    // Mark this chat as active
                    userItem.classList.add('active');

                    // Open chat with this user
                    openChatWithUser(user.id, user.username);
                });
                usersList.appendChild(userItem);
            });

            // Update the homepage users list as well
            updateHomePageUsersList(users);
        })
        .catch(error => {
            console.error('Failed to load online users:', error);
        });
}

// Update the users list on the home page
function updateHomePageUsersList(users) {
    // Get reference to the users list container
    const homePageUsersList = document.getElementById('homePageUsersList');
    if (!homePageUsersList) return;

    // Clear current list
    homePageUsersList.innerHTML = '';

    // Split users into online and offline groups
    const onlineUsers = users.filter(user => user.is_online);
    const offlineUsers = users.filter(user => !user.is_online);

    // Add section for online users
    if (onlineUsers.length > 0) {
        // Create section header
        const onlineSection = document.createElement('div');
        onlineSection.className = 'users-section';
        onlineSection.innerHTML = '<h3>Online Users</h3>';
        homePageUsersList.appendChild(onlineSection);

        // Add each online user
        onlineUsers.forEach(user => createUserItem(user, true, homePageUsersList));
    }

    // Add section for offline users
    if (offlineUsers.length > 0) {
        // Create section header
        const offlineSection = document.createElement('div');
        offlineSection.className = 'users-section';
        offlineSection.innerHTML = '<h3>Offline Users</h3>';
        homePageUsersList.appendChild(offlineSection);

        // Add each offline user
        offlineUsers.forEach(user => createUserItem(user, false, homePageUsersList));
    }
}

/**
 * Creates a user item element and appends it to the container
 * @param {Object} user - User object
 * @param {boolean} isOnline - Whether the user is online
 * @param {HTMLElement} container - Container to append the user item to
 */
function createUserItem(user, isOnline, container) {
    const userItem = document.createElement('div');
    userItem.className = `home-user-item ${isOnline ? 'online' : ''}`;

    userItem.innerHTML = `
        <div class="user-status ${isOnline ? 'online-indicator' : 'offline-indicator'}"></div>
        <div class="user-name">${user.username}</div>
    `;

    // Add click event to open chat with this user
    userItem.addEventListener('click', () => {
        showPage('chat-page');
        setTimeout(() => {
            openChatWithUser(user.id, user.username);
        }, 100);
    });

    container.appendChild(userItem);
}


// Open chat with a specific user
function openChatWithUser(userId, username) {
    currentChatUserId = userId;
    messagesLoaded = 0;
    hasMoreMessages = true;

    // Update chat header
    const chatHeader = document.getElementById('chatHeader');
    if (chatHeader) {
        chatHeader.textContent = username;
    }

    // Clear existing messages
    const messagesList = document.getElementById('messagesList');
    if (messagesList) {
        messagesList.innerHTML = '';
    }

    // Load initial messages
    loadMessages(0, 10);

    // Show the chat area
    const emptyChat = document.getElementById('emptyChat');
    const chatArea = document.getElementById('chatArea');

    if (emptyChat && chatArea) {
        emptyChat.style.display = 'none';
        chatArea.style.display = 'flex';
    }
}

// Load messages for the current chat
function loadMessages(offset, limit) {
    if (!currentChatUserId || isLoadingMoreMessages || !hasMoreMessages) return;

    isLoadingMoreMessages = true;

    fetch('/api/get-messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: currentChatUserId,
            offset: offset,
            limit: limit
        }),
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(messages => {
            if (messages.length === 0) {
                hasMoreMessages = false;
                isLoadingMoreMessages = false;
                return;
            }

            const messagesList = document.getElementById('messagesList');
            if (!messagesList) {
                isLoadingMoreMessages = false;
                return;
            }

            const scrollPos = messagesList.scrollHeight;

            // Add messages to the chat
            messages.forEach(message => {
                if (offset > 0) {
                    // Prepend older messages
                    prependMessageToChat(message);
                } else {
                    // Append initial messages
                    addMessageToChat(message);
                }
            });

            messagesLoaded += messages.length;

            // If loading more messages (scrolling up), maintain scroll position
            if (offset > 0) {
                const newScrollPos = messagesList.scrollHeight - scrollPos;
                messagesList.scrollTop = newScrollPos;
            } else {
                // Otherwise scroll to bottom for initial load
                scrollToBottom();
            }

            isLoadingMoreMessages = false;
        })
        .catch(error => {
            console.error('Failed to load messages:', error);
            isLoadingMoreMessages = false;
        });
}

// Add a message to the chat
function addMessageToChat(message) {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    const messageItem = createMessageElement(message);
    messagesList.appendChild(messageItem);
}

// Prepend a message to the chat (for loading older messages)
function prependMessageToChat(message) {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    const messageItem = createMessageElement(message);
    if (messagesList.firstChild) {
        messagesList.insertBefore(messageItem, messagesList.firstChild);
    } else {
        messagesList.appendChild(messageItem);
    }
}

// Create a message element
function createMessageElement(message) {
    const messageItem = document.createElement('div');
    messageItem.classList.add('message-item');

    // Check if we sent this message or received it
    const isSentByMe = message.sender_id !== currentChatUserId;
    messageItem.classList.add(isSentByMe ? 'sent' : 'received');

    // Format the timestamp
    const timestamp = new Date(message.timestamp);
    const formattedTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    messageItem.innerHTML = `
    <div class="message-content">${message.content}</div>
    <div class="message-meta">
      <span class="message-sender">${message.username || message.sender_name}</span>
      <span class="message-time">${formattedTime}</span>
    </div>
  `;
    return messageItem;
}

// Send a message
function sendMessage() {
    if (!currentChatUserId) return;

    // Double-check WebSocket is connected
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log("WebSocket not connected, attempting to reconnect...");
        connectWebSocket();

        // Let the user know we're trying to reconnect
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            const reconnectingMessage = document.createElement('div');
            reconnectingMessage.className = 'system-message';
            reconnectingMessage.textContent = 'Connection lost. Reconnecting...';
            messagesList.appendChild(reconnectingMessage);
            scrollToBottom();
        }

        return;
    }

    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;

    const content = messageInput.value.trim();
    if (!content) return;

    const message = {
        receiver_id: currentChatUserId,
        content: content
    };

    try {
        // Send to server
        socket.send(JSON.stringify(message));

        // Clear the input
        messageInput.value = '';
    } catch (e) {
        console.error("Error sending message:", e);

        // Show error message to user
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'system-message error';
            errorMessage.textContent = 'Failed to send message. Please try again.';
            messagesList.appendChild(errorMessage);
            scrollToBottom();
        }

        // Try to reconnect
        connectWebSocket();
    }
}


// Handle scroll event to load more messages
function handleMessagesScroll() {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    // If we're near the top and have more messages to load
    if (messagesList.scrollTop < 50 && hasMoreMessages && !isLoadingMoreMessages) {
        loadMessages(messagesLoaded, 10);
    }
}

// Scroll the messages list to the bottom
function scrollToBottom() {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    messagesList.scrollTop = messagesList.scrollHeight;
}

// Throttle function to prevent excessive scroll event handling
function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = new Date().getTime();
        if (now - lastCall < delay) {
            return;
        }
        lastCall = now;
        return func(...args);
    };
}

// Set up chat page when it's shown
function setupChatPage() {
    // Reset reconnection attempts
    reconnectAttempts = 0;

    // Connect to WebSocket first
    connectWebSocket();

    // Then load online users 
    setTimeout(function () {
        loadOnlineUsers();
    }, 1000);

    // Set up message loading on scroll
    const messagesList = document.getElementById('messagesList');
    if (messagesList) {
        // Remove any existing listeners first to avoid duplicates
        messagesList.removeEventListener('scroll', throttle(handleMessagesScroll, 500));
        messagesList.addEventListener('scroll', throttle(handleMessagesScroll, 500));
    }
}

// Initialize WebSocket when user is logged in
function initializeChat() {
    // Reset reconnection attempts
    reconnectAttempts = 0;

    // Try to connect to websocket
    connectWebSocket();

    // Load online users for the home page sidebar after a delay
    setTimeout(function () {
        loadOnlineUsers();
    }, 1000);
}

// Set a flag to track initialization (prevent duplicate event handlers)
if (typeof window.chatInitialized === 'undefined') {
    window.chatInitialized = true;

    // Clean up any existing handlers
    function setupEventListeners() {
        // Handle send button click
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.removeEventListener('click', sendMessage);
            sendButton.addEventListener('click', sendMessage);
        }

        // Handle send icon click
        const sendIcon = document.getElementById('sendIcon');
        if (sendIcon) {
            sendIcon.removeEventListener('click', sendMessage);
            sendIcon.addEventListener('click', sendMessage);
        }

        // Handle enter key in message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.removeEventListener('keypress', handleKeyPress);
            messageInput.addEventListener('keypress', handleKeyPress);
        }

        // Register navigation event handlers
        const toMessages = document.getElementById('to-messages');
        if (toMessages) {
            toMessages.removeEventListener('click', handleToMessages);
            toMessages.addEventListener('click', handleToMessages);
        }

        const toHome = document.getElementById('to-home');
        if (toHome) {
            toHome.removeEventListener('click', handleToHome);
            toHome.addEventListener('click', handleToHome);
        }
    }

    // Key press handler for message input
    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    // Handle click on messages icon
    function handleToMessages() {
        setupChatPage();
    }

    // Handle click on home icon
    function handleToHome() {
        // Connect to websocket if not already connected
        connectWebSocket();

        // Load online users for the sidebar
        setTimeout(function () {
            loadOnlineUsers();
        }, 1000);
    }

    // Set up event listeners when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
        setupEventListeners();
    }

    // Override showPage to initialize chat when needed
    window.addEventListener('load', function () {
        // Store the original function
        const originalShowPage = window.showPage;

        // Override it with our custom version
        window.showPage = function (pageId) {
            // Call the original showPage function
            originalShowPage(pageId);

            // If showing home page, initialize chat
            if (pageId === 'home-page') {
                // Reset reconnection attempts when actively changing pages
                reconnectAttempts = 0;

                // Delay to ensure DOM is fully loaded
                setTimeout(function () {
                    initializeChat();
                }, 1000);
            }

            // If showing chat page, set it up
            if (pageId === 'chat-page') {
                // Reset reconnection attempts when actively changing pages
                reconnectAttempts = 0;

                // Delay to ensure DOM is fully loaded
                setTimeout(function () {
                    setupChatPage();
                }, 1000);
            }
        };
    });
}