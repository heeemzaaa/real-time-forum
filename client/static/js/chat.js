const userList = document.getElementById('homePageUsersList')
const chatUserList = document.getElementById('usersList')
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
    chatUserList.innerHTML = ''

    let userEntries = Object.entries(users).filter(([id]) => id !== currentUserId)

    userEntries.sort((a, b) => {
        let aTime = lastMessages[a[0]]
        let bTime = lastMessages[b[0]]

        if (aTime && bTime) {
            return new Date(bTime) - new Date(aTime) // recent first
        } else if (aTime) {
            return -1
        } else if (bTime) {
            return 1
        } else {
            return a[1].localeCompare(b[1]) // alphabetical
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

        // to understand later
        let clone = userStatus.cloneNode(true)
        chatUserList.appendChild(clone)
    }
}

function openBox() {
    // up up 
    let hamza = 24
}

