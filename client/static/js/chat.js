const userList = document.getElementById('homePageUsersList')
let currentChatUserId = ""
let hasMoreMessages = false
let isLoadingMoreMessages = false
let messagesLoaded = 0

function connectWebSocket() {
    const socket = new WebSocket("ws://localhost:8080/api/ws")

    socket.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data)
            let onlineUsers = data.onlineUsers
            let allUsers = data.allUsers
            let lastMessages = data.lastMessages || {}
            currentChatUserId = data.you
            fetch('/api/check-session', {
                credentials: 'include',
            })
                .then(response => response.json())
                .then(result => {
                    if (result.message === "ok") {
                        loadUsers(allUsers, onlineUsers, result.userID, lastMessages)
                    }
                }).catch((e) => {
                    console.error(e)
                });

        } catch (e) {
            console.error(e)
        }
    }

    document.getElementById('logout').addEventListener('click', () => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.close(1000, "User logged out");
        }
    })

    socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event)
    }

    socket.onerror = (error) => {
        console.error('WebSocket error:', error)
    }
}

function loadUsers(users, onlineUsers, currentUserId, lastMessages) {
    userList.innerHTML = ''

    let userEntries = Object.entries(users).filter(([id]) => id !== currentUserId)

    userEntries.sort((a, b) => {
        let aTime = lastMessages[a[0]]
        let bTime = lastMessages[b[0]]

        if (aTime && bTime) {
            return new Date(bTime) - new Date(aTime)
        } else if (aTime) {
            return -1
        } else if (bTime) {
            return 1
        } else {
            return a[1].localeCompare(b[1])
        }
    })

    for (let [userID, username] of userEntries) {
        let userStatus = document.createElement('div')
        userStatus.classList.add('user-item')
        userStatus.setAttribute('data-user-id', userID)

        if (onlineUsers[userID]) {
            userStatus.classList.add('online')
            userStatus.innerHTML = `
                <div class="user-status online-indicator"></div>
                <div class="user-name">${username}</div>
            `
        } else {
            userStatus.classList.add('offline')
            userStatus.innerHTML = `
                <div class="user-status offline-indicator"></div>
                <div class="user-name">${username}</div>
            `
        }
        userList.appendChild(userStatus)
    }
}

document.addEventListener('click', function (e) {
    if (e.target.closest('.user-item')) {
        const userEl = e.target.closest('.user-item')
        const userId = userEl.getAttribute('data-user-id')
        const username = userEl.querySelector('.user-name').innerText
        openChatPopup(userId, username)
    }
})

function openChatPopup(userId, username) {
    const existingPopup = document.querySelector('.chat-popup')
    if (existingPopup) {
        existingPopup.remove()
    }

    const popup = document.createElement('div')
    popup.className = 'chat-popup'
    popup.id = `chat-popup-${userId}`

    popup.innerHTML = `
        <div class="chat-popup-header">
            <span>${username}</span>
            <span class="close-chat" title="Close">&times;</span>
        </div>
        <div class="chat-popup-body">
            <!-- Future messages will go here -->
        </div>
        <div class="chat-popup-footer">
            <textarea placeholder="Type a message..."></textarea>
            <i class="fa-solid fa-paper-plane send-popup-icon"></i>
        </div>
    `
    document.body.appendChild(popup)

    popup.querySelector('.close-chat').addEventListener('click', () => {
        popup.remove()
    })
}


