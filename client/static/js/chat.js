const userList = document.getElementById('homePageUsersList')
// let currentChatUserId = null;
// let messagesLoaded = 0;
// let isLoadingMoreMessages = false;
// let hasMoreMessages = true;
// let reconnectAttempts = 0;
// let isConnecting = false; // Flag to prevent multiple connection attempts
// let maxReconnectAttempts = 5; // Maximum number of reconnection attempts
// let reconnectTimer = null;


function connectWebSocket() {
    const socket = new WebSocket("ws://localhost:8080/api/ws")

    socket.onmessage = (event) => {
        try {
            document.getElementById('logout').addEventListener('click', () => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.close(1000, "User logged out");
                }
            })

            let data = JSON.parse(event.data)
            let onlineUsers = data.onlineUsers
            let allUsers = data.allUsers
            console.log(data.you)
            fetch('/api/check-session', {
                credentials: 'include',
            })
                .then(response => response.json())
                .then(result => {
                    if (result.message === "ok") {
                        loadUsers(allUsers, onlineUsers, result.userID)
                    }
                }).catch((e) => {
                    console.error(e)
                });

        } catch (e) {
            console.error(e)
        }
    }

    socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event)
    }

    socket.onerror = (error) => {
        console.error('WebSocket error:', error)
    }
}

function loadUsers(users, onlineUsers, currentUserId) {
    userList.innerHTML = ''

    for (let userID in users) {
        if (userID == currentUserId) {
            continue
        }
        let userStatus = document.createElement('div')
        userStatus.classList.add('user-item');
        userStatus.setAttribute('data-user-id', userID)


        if (onlineUsers[userID] && userID != currentUserId) {
            userStatus.classList.add('online');
            userStatus.innerHTML = `
                <div class="user-status online-indicator"></div>
                <div class="user-name">${users[userID]}</div>
            `
        } else {
            userStatus.classList.add('offline');
            userStatus.innerHTML = `
                <div class="user-status offline-indicator"></div>
                <div class="user-name">${users[userID]}</div>
            `
        }
        userList.appendChild(userStatus)
    }
}



// // Update the UI to reflect online status
// function updateOnlineStatus() {
//     const userItems = document.querySelectorAll('.user-item');
//     userItems.forEach(item => {
//         const userId = item.getAttribute('data-user-id');
//         if (userId in onlineUsers) {
//             item.classList.add('online');
//             const statusIndicator = item.querySelector('.user-status');
//             if (statusIndicator) {
//                 statusIndicator.classList.remove('offline-indicator');
//                 statusIndicator.classList.add('online-indicator');
//             }
//         } else {
//             item.classList.remove('online');
//             const statusIndicator = item.querySelector('.user-status');
//             if (statusIndicator) {
//                 statusIndicator.classList.remove('online-indicator');
//                 statusIndicator.classList.add('offline-indicator');
//             }
//         }
//     });
// }

// // Load online users
// function loadOnlineUsers() {
//     fetch('/api/get-online-users', {
//         credentials: 'include'
//     })
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error ${response.status}`);
//             }
//             return response.json();
//         })
//         .then(users => {
//             // Sort users by most recent message first, then by username
//             users.sort((a, b) => {
//                 const timeA = new Date(a.last_message || 0).getTime();
//                 const timeB = new Date(b.last_message || 0).getTime();
//                 if (timeA === 0 && timeB === 0) {
//                     // Both have no messages, sort alphabetically
//                     return a.username.localeCompare(b.username);
//                 } else if (timeA === 0) {
//                     // A has no messages, B has, so B comes first
//                     return 1;
//                 } else if (timeB === 0) {
//                     // B has no messages, A has, so A comes first
//                     return -1;
//                 } else {
//                     // Both have messages, sort by most recent
//                     return timeB - timeA;
//                 }
//             });

//             // Update our local online status cache
//             const newOnlineUsers = {};
//             users.forEach(user => {
//                 if (user.is_online) {
//                     newOnlineUsers[user.id] = user.username;
//                 }
//             });
//             onlineUsers = newOnlineUsers;

//             // Update the user lists
//             const usersList = document.getElementById('usersList');
//             if (usersList) {
//                 usersList.innerHTML = '';

//                 users.forEach(user => {
//                     const userItem = document.createElement('div');
//                     userItem.classList.add('user-item');
//                     userItem.setAttribute('data-user-id', user.id);

//                     if (user.is_online) {
//                         userItem.classList.add('online');
//                     }

//                     // Add an indicator for the active chat
//                     // if (user.id === currentChatUserId) {
//                     //     userItem.classList.add('active');
//                     // }

//                     userItem.innerHTML = `
//                     <div class="user-status ${user.is_online ? 'online-indicator' : 'offline-indicator'}"></div>
//                     <div class="user-name">${user.username}</div>
//                     `;

//                     // userItem.addEventListener('click', () => {
//                     //     // Clear any active chat indicators
//                     //     document.querySelectorAll('.user-item.active').forEach(el => {
//                     //         el.classList.remove('active');
//                     //     });

//                     //     // Mark this chat as active
//                     //     // userItem.classList.add('active');

//                     //     // openChatWithUser(user.id, user.username);
//                     // });
//                     usersList.appendChild(userItem);
//                 });
//             }

//             updateHomePageUsersList(users);
//         })
//         .catch(error => {
//             console.error('Failed to load online users:', error);
//         });
// }

// // Update the users list on the home page
// function updateHomePageUsersList(users) {
//     const homePageUsersList = document.getElementById('homePageUsersList');
//     if (!homePageUsersList) return;

//     homePageUsersList.innerHTML = '';

//     const onlineUsers = users.filter(user => user.is_online);
//     const offlineUsers = users.filter(user => !user.is_online);

//     if (onlineUsers.length > 0) {
//         const onlineSection = document.createElement('div');
//         onlineSection.className = 'users-section';
//         onlineSection.innerHTML = '<h3>Online Users</h3>';
//         homePageUsersList.appendChild(onlineSection);

//         onlineUsers.forEach(user => createUserItem(user, true, homePageUsersList));
//     }

//     if (offlineUsers.length > 0) {
//         const offlineSection = document.createElement('div');
//         offlineSection.className = 'users-section';
//         offlineSection.innerHTML = '<h3>Offline Users</h3>';
//         homePageUsersList.appendChild(offlineSection);

//         offlineUsers.forEach(user => createUserItem(user, false, homePageUsersList));
//     }
// }

// function createUserItem(user, isOnline, container) {
//     const userItem = document.createElement('div');
//     userItem.className = `home-user-item ${isOnline ? 'online' : ''}`;
//     userItem.setAttribute('data-user-id', user.id);

//     userItem.innerHTML = `
//         <div class="user-status ${isOnline ? 'online-indicator' : 'offline-indicator'}"></div>
//         <div class="user-name">${user.username}</div>
//     `;

//     // Add click event to open chat with this user
//     userItem.addEventListener('click', () => {
//         showPage('chat-page');
//         setTimeout(() => {
//             openChatWithUser(user.id, user.username);
//         }, 100);
//     });

//     container.appendChild(userItem);
// }

// // Open chat with a specific user
// function openChatWithUser(userId, username) {
//     currentChatUserId = userId;
//     messagesLoaded = 0;
//     hasMoreMessages = true;

//     const chatHeader = document.getElementById('chatHeader');
//     if (chatHeader) {
//         chatHeader.textContent = username;
//     }

//     const messagesList = document.getElementById('messagesList');
//     if (messagesList) {
//         messagesList.innerHTML = '';
//     }

//     // loadMessages(0, 10);

//     // Show the chat area
//     const emptyChat = document.getElementById('emptyChat');
//     const chatArea = document.getElementById('chatArea');

//     if (emptyChat && chatArea) {
//         emptyChat.style.display = 'none';
//         chatArea.style.display = 'flex';
//     }

//     // Focus on message input
//     // setTimeout(() => {
//     //     const messageInput = document.getElementById('messageInput');
//     //     if (messageInput) {
//     //         messageInput.focus();
//     //     }
//     // }, 300);
// }


// Connect to the WebSocket server
// function connectWebSocket() {
//     // Clear any existing reconnect timer
//     if (reconnectTimer) {
//         clearTimeout(reconnectTimer);
//         reconnectTimer = null;
//     }

//     // If already connecting, don't try again
//     if (isConnecting) {
//         console.log('Already attempting to connect, skipping duplicate attempt');
//         return;
//     }

//     // If already connected and open, don't reconnect
//     if (socket !== null && socket.readyState === WebSocket.OPEN) {
//         console.log('WebSocket already connected');
//         return;
//     }

//     // If we've exceeded max reconnect attempts, stop trying
//     if (reconnectAttempts >= maxReconnectAttempts) {
//         console.log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Please reload the page to try again.`);
//         return;
//     }

//     isConnecting = true;

//     // Close existing connection if there is one
//     if (socket !== null) {
//         try {
//             // Only attempt to close if not already closed
//             if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
//                 socket.close();
//             }
//             socket = null;
//         } catch (e) {
//             console.log('Error closing previous connection:', e);
//         }
//     }

//     try {
//         // Create WebSocket connection
//         const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//         const wsUrl = `${protocol}//${window.location.host}/api/ws`;

//         console.log('Attempting to connect to WebSocket at:', wsUrl);
//         socket = new WebSocket(wsUrl);

//         // Set a connection timeout
//         const connectionTimeout = setTimeout(() => {
//             if (socket && socket.readyState !== WebSocket.OPEN) {
//                 console.log('WebSocket connection timed out');
//                 try {
//                     if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
//                         socket.close();
//                     }
//                 } catch (e) {
//                     console.log('Error closing timed-out socket:', e);
//                 }
//                 isConnecting = false;
//                 scheduleReconnect();
//             }
//         }, 10000); // 10 second timeout

//         socket.onopen = function () {
//             console.log('WebSocket connection established');
//             clearTimeout(connectionTimeout);
//             reconnectAttempts = 0; // Reset reconnect attempts on successful connection
//             isConnecting = false;

//             // Send a connection test message
//             try {
//                 socket.send(JSON.stringify({ type: 'connection_test' }));
//             } catch (e) {
//                 console.log('Error sending test message:', e);
//             }

//             // Fetch online users after successful connection
//             loadOnlineUsers();
//         };

//         // WebSocket message handling
//         socket.onmessage = function (event) {
//             try {
//                 const data = JSON.parse(event.data);

//                 // Handle status update message
//                 if (data.type === 'status_update') {
//                     // Update our local cache of online users
//                     onlineUsers = data.online;
//                     loadOnlineUsers();
//                     // Update UI to reflect new online status
//                     updateOnlineStatus();
//                     return;
//                 }

//                 // Handle chat message
//                 const message = data;
//                 console.log(message);


//                 // Only process if related to current chat
//                 if (currentChatUserId && (message.sender_id === currentChatUserId || message.receiver_id === currentChatUserId)) {
//                     addMessageToChat(message);
//                     scrollToBottom();
//                 }

//                 // Refresh the users list to keep it updated with latest messages
//                 loadOnlineUsers();
//             } catch (e) {
//                 console.error('Error processing message:', e);
//             }
//         };

//         socket.onclose = function (event) {
//             console.log('WebSocket connection closed. Code:', event.code, 'Reason:', event.reason);
//             clearTimeout(connectionTimeout);
//             isConnecting = false;

//             // Most WebSocket close events should trigger a reconnection attempt
//             if (event.code !== 1000) { // 1000 is normal closure
//                 scheduleReconnect();
//             }
//         };

//         socket.onerror = function (error) {
//             console.error('WebSocket error:', error);
//             clearTimeout(connectionTimeout);
//             isConnecting = false;
//             // Always try to reconnect on error
//             scheduleReconnect();
//         };
//     } catch (e) {
//         console.error('Error creating WebSocket:', e);
//         isConnecting = false;
//         scheduleReconnect();
//     }
// }




// // Check if the user's session is still valid
// function checkSession(callback) {
//     fetch('/api/check-session', {
//         credentials: 'include'
//     })
//         .then(response => {
//             if (response.ok) {
//                 return response.json().then(data => {
//                     console.log('Session is valid');
//                     callback(true);
//                 });
//             } else {
//                 console.log('Session is invalid');
//                 callback(false);
//             }
//         })
//         .catch(error => {
//             console.error('Error checking session:', error);
//             callback(false);
//         });
// }

// // Schedule a reconnection attempt with exponential backoff
// function scheduleReconnect() {
//     reconnectAttempts++;

//     if (reconnectAttempts > maxReconnectAttempts) {
//         console.log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Please reload the page.`);
//         return;
//     }

//     const baseDelay = 1000; // 1 second
//     const maxDelay = 30000; // 30 seconds

//     // Calculate delay with exponential backoff and a bit of randomness
//     const delay = Math.min(maxDelay, baseDelay * Math.pow(1.5, reconnectAttempts)) +
//         (Math.random() * 1000);

//     console.log(`Scheduling reconnection attempt ${reconnectAttempts} in ${Math.round(delay)}ms`);

//     // Clear any existing timer
//     if (reconnectTimer) {
//         clearTimeout(reconnectTimer);
//     }

//     reconnectTimer = setTimeout(function () {
//         console.log(`Executing reconnection attempt ${reconnectAttempts}`);
//         connectWebSocket();
//     }, delay);
// }



//     // Update the home page user list
//     const homeUserItems = document.querySelectorAll('.home-user-item');
//     homeUserItems.forEach(item => {
//         const userId = item.getAttribute('data-user-id');
//         if (userId in onlineUsers) {
//             item.classList.add('online');
//             const statusIndicator = item.querySelector('.user-status');
//             if (statusIndicator) {
//                 statusIndicator.classList.remove('offline-indicator');
//                 statusIndicator.classList.add('online-indicator');
//             }
//         } else {
//             item.classList.remove('online');
//             const statusIndicator = item.querySelector('.user-status');
//             if (statusIndicator) {
//                 statusIndicator.classList.remove('online-indicator');
//                 statusIndicator.classList.add('offline-indicator');
//             }
//         }
//     });
// }




// /**
//  * Creates a user item element and appends it to the container
//  * @param {Object} user - User object
//  * @param {boolean} isOnline - Whether the user is online
//  * @param {HTMLElement} container - Container to append the user item to
//  */


// // Load messages for the current chat
// function loadMessages(offset, limit) {
//     if (!currentChatUserId || isLoadingMoreMessages || !hasMoreMessages) return;

//     const messagesList = document.getElementById('messagesList');

//     console.log(oldHeight);
//     console.log(messagesList.scrollHeight);
//     isLoadingMoreMessages = true;

//     // Note: We're no longer adding the loading indicator here since it's now handled in handleMessagesScroll

//     fetch('/api/get-messages', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             user_id: currentChatUserId,
//             offset: offset,
//             limit: limit
//         }),
//         credentials: 'include'
//     })
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error ${response.status}`);
//             }
//             return response.json();
//         })
//         .then(messages => {
//             // Remove loading indicator if it exists
//             const loadingIndicator = document.querySelector('.loading-indicator');
//             if (loadingIndicator) {
//                 loadingIndicator.remove();
//             }

//             if (messages.length === 0) {
//                 hasMoreMessages = false;
//                 isLoadingMoreMessages = false;

//                 // Show a "no more messages" indicator briefly
//                 const messagesList = document.getElementById('messagesList');
//                 if (messagesList) {
//                     const noMoreMessages = document.createElement('div');
//                     noMoreMessages.className = 'no-more-messages';
//                     noMoreMessages.textContent = 'No more messages';
//                     if (messagesList.firstChild) {
//                         messagesList.insertBefore(noMoreMessages, messagesList.firstChild);
//                     } else {
//                         messagesList.appendChild(noMoreMessages);
//                     }

//                     // Remove after 2 seconds
//                     setTimeout(() => {
//                         if (noMoreMessages.parentNode) {
//                             noMoreMessages.remove();
//                         }
//                     }, 2000);
//                 }
//                 return;
//             }

//             if (!messagesList) {
//                 isLoadingMoreMessages = false;
//                 return;
//             }

//             // When loading older messages (offset > 0), we need to:
//             // 1. Measure the current height of the content
//             // 2. Add the new messages
//             // 3. Calculate how much the height changed
//             // 4. Adjust scroll position to compensate for the added content

//             let firstVisibleElement = null;

//             // If we're loading older messages, find the first currently visible element
//             // so we can keep it in view after adding new messages
//             if (offset > 0) {
//                 const elements = messagesList.querySelectorAll('.message-item');
//                 const containerRect = messagesList.getBoundingClientRect();

//                 for (let i = 0; i < elements.length; i++) {
//                     const elementRect = elements[i].getBoundingClientRect();
//                     if (elementRect.top >= containerRect.top) {
//                         firstVisibleElement = elements[i];
//                         break;
//                     }
//                 }
//             }

//             // Add messages to the chat
//             if (offset > 0) {
//                 // For older messages, reverse them to get chronological order
//                 messages.reverse().forEach(message => {
//                     prependMessageToChat(message);
//                 });
//                 // Otherwise use the height difference approach
//                 messagesList.scrollTop = messagesList.scrollHeight - oldHeight
//             } else {
//                 // Initial load - add messages and scroll to bottom
//                 messages.forEach(message => {
//                     addMessageToChat(message);
//                 });
//                 scrollToBottom();
//             }

//             messagesLoaded += messages.length;
//             isLoadingMoreMessages = false;
//         })
//         .catch(error => {
//             console.error('Failed to load messages:', error);
//             isLoadingMoreMessages = false;

//             // Remove loading indicator if it exists
//             const loadingIndicator = document.querySelector('.loading-indicator');
//             if (loadingIndicator) {
//                 loadingIndicator.remove();
//             }

//             // Show error message
//             const messagesList = document.getElementById('messagesList');
//             if (messagesList) {
//                 const errorMessage = document.createElement('div');
//                 errorMessage.className = 'system-message error';
//                 errorMessage.textContent = 'Failed to load messages. Please try again.';
//                 if (messagesList.firstChild) {
//                     messagesList.insertBefore(errorMessage, messagesList.firstChild);
//                 } else {
//                     messagesList.appendChild(errorMessage);
//                 }

//                 // Remove the error message after 3 seconds
//                 setTimeout(() => {
//                     if (errorMessage.parentNode) {
//                         errorMessage.remove();
//                     }
//                 }, 3000);
//             }
//         });
// }

// // Add a message to the chat
// function addMessageToChat(message) {
//     const messagesList = document.getElementById('messagesList');
//     if (!messagesList) return;

//     const messageItem = createMessageElement(message);
//     messagesList.appendChild(messageItem);
// }

// // Prepend a message to the chat (for loading older messages)
// function prependMessageToChat(message) {
//     const messagesList = document.getElementById('messagesList');
//     if (!messagesList) return;

//     const messageItem = createMessageElement(message);
//     if (messagesList.firstChild) {
//         messagesList.insertBefore(messageItem, messagesList.firstChild);
//     } else {
//         messagesList.appendChild(messageItem);
//     }
// }

// // Create a message element
// function createMessageElement(message) {
//     const messageItem = document.createElement('div');
//     messageItem.classList.add('message-item');

//     // Generate a unique ID for this message element for reference
//     messageItem.id = 'msg-' + (message.id || Date.now() + '-' + Math.random().toString(36).substr(2, 5));

//     // Check if we sent this message or received it
//     const isSentByMe = message.sender_id !== currentChatUserId;
//     messageItem.classList.add(isSentByMe ? 'sent' : 'received');

//     // Format the timestamp
//     const timestamp = new Date(message.timestamp);
//     const formattedTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

//     messageItem.innerHTML = `
//     <div class="message-content">${message.content}</div>
//     <div class="message-meta">
//       <span class="message-sender">${message.username || message.sender_name}</span>
//       <span class="message-time">${formattedTime}</span>
//     </div>
//   `;
//     return messageItem;
// }

// // Send a message
// function sendMessage() {
//     if (!currentChatUserId) return;

//     // Check WebSocket is connected
//     if (!socket || socket.readyState !== WebSocket.OPEN) {
//         console.log("WebSocket not connected, attempting to reconnect...");
//         connectWebSocket();

//         // Let the user know we're trying to reconnect
//         const messagesList = document.getElementById('messagesList');
//         if (messagesList) {
//             const reconnectingMessage = document.createElement('div');
//             reconnectingMessage.className = 'system-message';
//             reconnectingMessage.textContent = 'Connection lost. Reconnecting...';
//             messagesList.appendChild(reconnectingMessage);
//             scrollToBottom();
//         }

//         return;
//     }

//     const messageInput = document.getElementById('messageInput');
//     if (!messageInput) return;

//     const content = messageInput.value.trim();
//     if (!content) return;

//     const message = {
//         receiver_id: currentChatUserId,
//         content: content
//     };

//     try {
//         // Send to server
//         socket.send(JSON.stringify(message));

//         // Clear the input
//         messageInput.value = '';
//     } catch (e) {
//         console.error("Error sending message:", e);

//         // Show error message to user
//         const messagesList = document.getElementById('messagesList');
//         if (messagesList) {
//             const errorMessage = document.createElement('div');
//             errorMessage.className = 'system-message error';
//             errorMessage.textContent = 'Failed to send message. Please try again.';
//             messagesList.appendChild(errorMessage);
//             scrollToBottom();
//         }

//         // Try to reconnect
//         connectWebSocket();
//     }
// }

// let oldHeight = 0

// // Handle scroll event to load more messages
// function handleMessagesScroll() {
//     const messagesList = document.getElementById('messagesList');
//     if (!messagesList) return;

//     // Check if we're close enough to the top to load more messages
//     // Use a more generous threshold to trigger loading before hitting the absolute top
//     if (messagesList.scrollTop == 0 && hasMoreMessages && !isLoadingMoreMessages) {
//         // Show a loading indicator immediately to give feedback
//         const loadingIndicator = document.createElement('div');
//         loadingIndicator.className = 'loading-indicator';
//         loadingIndicator.textContent = 'Loading older messages...';

//         console.log(messagesList.scrollHeight);
//         oldHeight = messagesList.scrollHeight;
//         if (messagesList.firstChild) {
//             messagesList.insertBefore(loadingIndicator, messagesList.firstChild);
//         } else {
//             messagesList.appendChild(loadingIndicator);
//         }

//         // Load more messages
//         loadMessages(messagesLoaded, 10);
//     }
// }

// // Scroll the messages list to the bottom
// function scrollToBottom() {
//     const messagesList = document.getElementById('messagesList');
//     if (!messagesList) return;

//     messagesList.scrollTop = messagesList.scrollHeight;
// }

// // Throttle function to prevent excessive scroll event handling
// function scrollChatDebounce(func, timeout = 300) {
//     let timer;
//     return (...args) => {
//         clearTimeout(timer);
//         timer = setTimeout(() => func(...args), timeout);
//     };
// }

// // Set up chat page when it's shown
// function setupChatPage() {
//     // Reset reconnection attempts
//     reconnectAttempts = 0;

//     // Connect to WebSocket first
//     connectWebSocket();

//     // Then load online users 
//     setTimeout(function () {
//         loadOnlineUsers();
//     }, 500);

//     // Set up message loading on scroll using the throttled handler
//     const messagesList = document.getElementById('messagesList');
//     if (messagesList) {
//         // Remove any existing listeners first to avoid duplicates
//         messagesList.removeEventListener('scroll', throttledScrollHandler);
//         // Add the event listener with the throttled function to prevent too many events
//         messagesList.addEventListener('scroll', throttledScrollHandler);
//     }
// }

// // Create a throttled scroll handler that doesn't fire too frequently
// const throttledScrollHandler = scrollChatDebounce(handleMessagesScroll, 400);

// // Initialize WebSocket when user is logged in
// function initializeChat() {
//     // Reset reconnection attempts
//     reconnectAttempts = 0;

//     // Try to connect to websocket
//     connectWebSocket();

//     // Load online users for the home page sidebar after a delay
//     setTimeout(function () {
//         loadOnlineUsers();
//     }, 1000);
// }

// // Set a flag to track initialization (prevent duplicate event handlers)
// if (typeof window.chatInitialized === 'undefined') {
//     window.chatInitialized = true;

//     // Clean up any existing handlers
//     function setupEventListeners() {
//         // Handle send button click
//         const sendButton = document.getElementById('sendButton');
//         if (sendButton) {
//             sendButton.removeEventListener('click', sendMessage);
//             sendButton.addEventListener('click', sendMessage);
//         }

//         // Handle send icon click
//         const sendIcon = document.getElementById('sendIcon');
//         if (sendIcon) {
//             sendIcon.removeEventListener('click', sendMessage);
//             sendIcon.addEventListener('click', sendMessage);
//         }

//         // Handle enter key in message input
//         const messageInput = document.getElementById('messageInput');
//         if (messageInput) {
//             messageInput.removeEventListener('keypress', handleKeyPress);
//             messageInput.addEventListener('keypress', handleKeyPress);
//         }

//         // Register navigation event handlers
//         const toMessages = document.getElementById('to-messages');
//         if (toMessages) {
//             toMessages.removeEventListener('click', handleToMessages);
//             toMessages.addEventListener('click', handleToMessages);
//         }

//         const toHome = document.getElementById('to-home');
//         if (toHome) {
//             toHome.removeEventListener('click', handleToHome);
//             toHome.addEventListener('click', handleToHome);
//         }
//     }

//     // Key press handler for message input
//     function handleKeyPress(e) {
//         if (e.key === 'Enter' && !e.shiftKey) {
//             e.preventDefault();
//             sendMessage();
//         }
//     }

//     // Handle click on messages icon
//     function handleToMessages() {
//         setupChatPage();
//     }

//     // Handle click on home icon
//     function handleToHome() {
//         // Connect to websocket if not already connected
//         connectWebSocket();

//         // Load online users for the sidebar
//         setTimeout(function () {
//             loadOnlineUsers();
//         }, 1000);
//     }

//     // Set up event listeners when DOM is loaded
//     if (document.readyState === 'loading') {
//         document.addEventListener('DOMContentLoaded', setupEventListeners);
//     } else {
//         setupEventListeners();
//     }

//     // Override showPage to initialize chat when needed
//     window.addEventListener('load', function () {
//         // Store the original function
//         const originalShowPage = window.showPage;

//         // Override it with our custom version
//         window.showPage = function (pageId) {
//             // Call the original showPage function
//             originalShowPage(pageId);

//             // If showing home page, initialize chat
//             if (pageId === 'home-page') {
//                 // Reset reconnection attempts when actively changing pages
//                 reconnectAttempts = 0;

//                 // Delay to ensure DOM is fully loaded
//                 setTimeout(function () {
//                     initializeChat();
//                 }, 1000);
//             }

//             // If showing chat page, set it up
//             if (pageId === 'chat-page') {
//                 // Reset reconnection attempts when actively changing pages
//                 reconnectAttempts = 0;

//                 // Delay to ensure DOM is fully loaded
//                 setTimeout(function () {
//                     setupChatPage();
//                 }, 1000);
//             }
//         };
//     });

//     // Check connection when page becomes visible again
//     document.addEventListener('visibilitychange', function () {
//         if (document.visibilityState === 'visible') {
//             // When page becomes visible again, check if we need to reconnect
//             if (!socket || socket.readyState !== WebSocket.OPEN) {
//                 reconnectAttempts = 0; // Reset counter
//                 connectWebSocket();
//             }
//         }
//     });
// }