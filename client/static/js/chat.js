// Global variables for chat functionality
let socket = null;
let currentChatUserId = null;
let messagesLoaded = 0;
let isLoadingMoreMessages = false;
let hasMoreMessages = true;
let onlineUsers = {}; // Stores online user IDs

// Set up the chat page when it's shown
function setupChatPage() {
    // Load online users
    loadOnlineUsers();

    // Connect to WebSocket
    connectWebSocket();

    // Set up message loading on scroll
    const messagesList = document.getElementById('messagesList');
    messagesList.addEventListener('scroll', throttle(handleMessagesScroll, 500));
}

// Connect to the WebSocket server
function connectWebSocket() {
    if (socket !== null) {
        // Close existing connection if there is one
        socket.close();
    }

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    socket = new WebSocket(wsUrl);

    socket.onopen = function () {
        console.log('WebSocket connection established');
    };

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);

        // Check if this is a status update message
        if (data.type === 'status_update') {
            // Update our local cache of online users
            onlineUsers = data.online;

            // Update UI to reflect new online status
            updateOnlineStatus();
            return;
        }

        // Otherwise it's a regular chat message
        const message = data;

        // If this message is for the current chat, add it to the messages list
        if (currentChatUserId && (message.sender_id === currentChatUserId || message.receiver_id === currentChatUserId)) {
            addMessageToChat(message);
            scrollToBottom();
        }

        // Always refresh the user list when receiving a message to update the order
        loadOnlineUsers();
    };

    socket.onclose = function () {
        console.log('WebSocket connection closed');
        // Try to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    };

    socket.onerror = function (error) {
        console.error('WebSocket error:', error);
    };
}

// Update the UI to reflect online status
function updateOnlineStatus() {
    const userItems = document.querySelectorAll('.user-item');
    userItems.forEach(item => {
        const userId = item.getAttribute('data-user-id');
        if (userId in onlineUsers) {
            item.classList.add('online');
            item.querySelector('.user-status').classList.remove('offline-indicator');
            item.querySelector('.user-status').classList.add('online-indicator');
        } else {
            item.classList.remove('online');
            item.querySelector('.user-status').classList.remove('online-indicator');
            item.querySelector('.user-status').classList.add('offline-indicator');
        }
    });
}

// Load online users
function loadOnlineUsers() {
    fetch('/api/get-online-users', {
        credentials: 'include'
    })
        .then(response => response.json())
        .then(users => {
            // Sort users by last message time (newest first)
            // For users with no messages, sort alphabetically
            users.sort((a, b) => {
                const timeA = new Date(a.last_message).getTime();
                const timeB = new Date(b.last_message).getTime();

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
    const homePageUsersList = document.getElementById('homePageUsersList');
    if (!homePageUsersList) return;

    homePageUsersList.innerHTML = '';

    const onlineUsers = users.filter(user => user.is_online);
    const offlineUsers = users.filter(user => !user.is_online);

    // Add section for online users
    if (onlineUsers.length > 0) {
        const onlineSection = document.createElement('div');
        onlineSection.className = 'users-section';
        onlineSection.innerHTML = '<h3>Online Users</h3>';
        homePageUsersList.appendChild(onlineSection);

        onlineUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'home-user-item online';
            userItem.innerHTML = `
        <div class="user-status online-indicator"></div>
        <div class="user-name">${user.username}</div>
      `;
            userItem.addEventListener('click', () => {
                showPage('chat-page');
                setTimeout(() => {
                    openChatWithUser(user.id, user.username);
                }, 100);
            });
            homePageUsersList.appendChild(userItem);
        });
    }

    // Add section for offline users
    if (offlineUsers.length > 0) {
        const offlineSection = document.createElement('div');
        offlineSection.className = 'users-section';
        offlineSection.innerHTML = '<h3>Offline Users</h3>';
        homePageUsersList.appendChild(offlineSection);

        offlineUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'home-user-item';
            userItem.innerHTML = `
        <div class="user-status offline-indicator"></div>
        <div class="user-name">${user.username}</div>
      `;
            userItem.addEventListener('click', () => {
                showPage('chat-page');
                setTimeout(() => {
                    openChatWithUser(user.id, user.username);
                }, 100);
            });
            homePageUsersList.appendChild(userItem);
        });
    }
}

// Open chat with a specific user
function openChatWithUser(userId, username) {
    currentChatUserId = userId;
    messagesLoaded = 0;
    hasMoreMessages = true;

    // Update chat header
    document.getElementById('chatHeader').textContent = username;

    // Clear existing messages
    document.getElementById('messagesList').innerHTML = '';

    // Load initial messages
    loadMessages(0, 10);

    // Show the chat area
    document.getElementById('emptyChat').style.display = 'none';
    document.getElementById('chatArea').style.display = 'flex';
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
        .then(response => response.json())
        .then(messages => {
            console.log(messages)
            if (messages.length === 0) {
                hasMoreMessages = false;
                isLoadingMoreMessages = false;
                return;
            }

            const messagesList = document.getElementById('messagesList');
            const scrollPos = messagesList.scrollHeight;
            let temp = []

            // Add messages to the chat
            messages.forEach(message => {
                temp.push(message.id)
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
    const messageItem = createMessageElement(message);
    messagesList.appendChild(messageItem);
}

// Prepend a message to the chat (for loading older messages)
function prependMessageToChat(message) {
    const messagesList = document.getElementById('messagesList');
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
    if (!currentChatUserId || !socket || socket.readyState !== WebSocket.OPEN) return;

    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();

    if (!content) return;

    const message = {
        receiver_id: currentChatUserId,
        content: content
    };

    // Send to server
    socket.send(JSON.stringify(message));

    // // Also display message in our own chat (immediately, don't wait for server)
    // const currentUsername = document.getElementById('usernameDisplay').textContent;
    // const selfMessage = {
    //     content: content,
    //     username: currentUsername,
    //     sender_name: currentUsername,
    //     timestamp: new Date(),
    //     sender_id: "self" // This will be replaced by the server response
    // };
    // // Add to own chat
    // addMessageToChat(selfMessage);
    // scrollToBottom();

    // // Clear the input
    messageInput.value = '';
}

// Handle scroll event to load more messages
function handleMessagesScroll() {
    const messagesList = document.getElementById('messagesList');

    // If we're near the top and have more messages to load
    if (messagesList.scrollTop < 50 && hasMoreMessages && !isLoadingMoreMessages) {
        loadMessages(messagesLoaded, 10);
    }
}

// Scroll the messages list to the bottom
function scrollToBottom() {
    const messagesList = document.getElementById('messagesList');
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

// Set up event listeners
// Update showPage function to initialize chat when needed
window.addEventListener('DOMContentLoaded', function () {
    // Get original showPage function
    const originalShowPage = window.showPage;

    // Override showPage function to also initialize chat when needed
    window.showPage = function (pageId) {
        // Call original function
        originalShowPage(pageId);

        // Initialize chat when showing home page for the first time
        if (pageId === 'home-page') {
            initializeChat();
        }
    };
});

// Set up event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Handle send button click (keep for backward compatibility)
    document.getElementById('sendButton').addEventListener('click', sendMessage);

    document.getElementById('sendIcon').addEventListener('click', sendMessage);


    // Handle send icon click
    document.getElementById('sendIcon').addEventListener('click', sendMessage);

    // Handle enter key in message input
    document.getElementById('messageInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Show setup chat page when chat page is displayed
    document.getElementById('to-messages').addEventListener('click', function () {
        setupChatPage();
    });

    // Check if we should initialize when showing home page
    document.getElementById('to-home').addEventListener('click', function () {
        // Connect to websocket if not already connected
        if (socket === null || socket.readyState !== WebSocket.OPEN) {
            connectWebSocket();
        }

        // Load online users for the sidebar
        loadOnlineUsers();
    });
});