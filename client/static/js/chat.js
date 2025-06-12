const userList = document.getElementById('homePageUsersList')
let currentChatUserId = ""
let socket = null

function connectWebSocket() {
    socket = new WebSocket("ws://localhost:8080/api/ws")

    socket.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data)

            if (data.type === "new_connection") {
                let onlineUsers = data.onlineUsers
                let allUsers = data.allUsers
                let lastMessages = data.lastMessages || {}
                console.log(lastMessages)
                fetch('/api/check-session', {
                    credentials: 'include',
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.message === "ok") {
                            currentChatUserId = result.userID
                            loadUsers(allUsers, onlineUsers, result.userID, lastMessages)
                        } else if (result.message === "Error in the cookie" || result.message === "try to login again") {
                            showPage('register-login-page')
                        }
                    }).catch((e) => {
                        console.error(e)
                    });
                return
            }

            if (data.sender_id && data.receiver_id && data.content) {
                // console.log(data)
                appendMessageToPopup(data)
            }

        } catch (e) {
            console.error(e)
        }
    }

    document.getElementById('logout').addEventListener('click', () => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.close(1000, "User logged out");
        }

        const existingPopup = document.querySelector('.chat-popup')
        if (existingPopup) {
            existingPopup.remove()
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
        let aTime = lastMessages[a[0]] || ""
        let bTime = lastMessages[b[0]] || ""

        console.log("atime: ", aTime)
        console.log("btime: ", bTime)

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

        userStatus.classList.add(onlineUsers[userID] ? 'online' : 'offline')
        userStatus.innerHTML = `
            <div class="user-status ${onlineUsers[userID] ? 'online-indicator' : 'offline-indicator'}"></div>
            <div class="user-name">${username}</div>
        `
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
    if (existingPopup) existingPopup.remove()

    const popup = document.createElement('div')
    popup.className = 'chat-popup'
    popup.id = `chat-popup-${userId}`

    popup.innerHTML = `
        <div class="chat-popup-header">
            <span>${username}</span>
            <span class="close-chat" title="Close">&times;</span>
        </div>
        <div class="chat-popup-body"></div>
        <div class="chat-popup-footer">
            <textarea placeholder="Type a message..."></textarea>
            <i class="fa-solid fa-paper-plane send-popup-icon"></i>
        </div>
    `
    document.body.appendChild(popup)

    popup.querySelector('.close-chat').addEventListener('click', () => popup.remove())

    popup.querySelector('.send-popup-icon').addEventListener('click', () => {
        const textarea = popup.querySelector('textarea')
        const content = textarea.value.trim()
        if (!content || !socket || socket.readyState !== WebSocket.OPEN) return

        const messageObj = {
            content: content,
            receiver_id: userId,
            sender_id: currentChatUserId,
            timestamp: new Date().toISOString()
        }

        socket.send(JSON.stringify(messageObj))
        textarea.value = ""
    })
    popup.querySelector('.chat-popup-body').dataset.offset = '10'
    loadMessages(userId, popup.querySelector('.chat-popup-body'), 0, 10)
    const chatBody = popup.querySelector('.chat-popup-body')
    chatBody.addEventListener('scroll', debounce(() => {
        if (chatBody.scrollTop === 0) {
            loadMoreMessages(userId, chatBody)
        }
    }, 300)) // adjust delay as needed

}

function debounce(func, delay) {
    let timer
    return function (...args) {
        clearTimeout(timer)
        timer = setTimeout(() => func.apply(this, args), delay)
    }
}

function loadMoreMessages(userId, container) {
    let offset = parseInt(container.dataset.offset || '0')

    fetch('/api/get-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            user_id: userId,
            offset: offset,
            limit: 10
        })
    })
        .then(res => res.json())
        .then(messages => {
            const scrollHeightBefore = container.scrollHeight
            const oldScrollTop = container.scrollTop

            messages.reverse().forEach(msg => {
                const firstChild = container.firstChild
                const div = document.createElement('div')
                const isSender = msg.sender_id === currentChatUserId
                div.classList.add('message-item')
                div.classList.add(isSender ? 'sent' : 'received')

                const timestamp = new Date(msg.timestamp || Date.now()).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                })

                div.innerHTML = `
                    <div class="message-content">${msg.content}</div>
                    <div class="message-meta">
                        <span>by: ${msg.username}</span>
                        <span>${timestamp}</span>
                    </div>
                `
                container.insertBefore(div, firstChild)
            })

            // Update scroll so user doesn't jump
            const newHeight = container.scrollHeight
            container.scrollTop = newHeight - scrollHeightBefore + oldScrollTop

            // Update offset for next load
            container.dataset.offset = offset + 10
        })
        .catch(err => {
            console.error("Error loading more messages:", err)
        })
}


function loadMessages(userId, container, offset = 0, limit = 10) {
    console.log("ofsset:", offset)
    console.log("limit:", limit)

    fetch('/api/get-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            user_id: userId,
            offset: offset,
            limit: limit
        })
    })
        .then(res => res.json())
        .then(messages => {
            messages.forEach(msg => appendMessagesFromLoading(container, msg))
            container.scrollTop = container.scrollHeight
        })
        .catch(err => {
            console.error('Error fetching messages:', err)
        })
}

function appendMessageToPopup(msg) {
    const popup = document.getElementById(`chat-popup-${msg.sender_id}`) || document.getElementById(`chat-popup-${msg.receiver_id}`)
    if (!popup) return

    const container = popup.querySelector('.chat-popup-body')
    appendMessageToContainer(container, msg)
    container.scrollTop = container.scrollHeight
}

function appendMessageToContainer(container, msg) {
    const isSender = msg.sender_id === currentChatUserId

    const div = document.createElement('div')
    div.classList.add('message-item')
    div.classList.add(isSender ? 'sent' : 'received')

    const timestamp = new Date(msg.timestamp || Date.now()).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })

    div.innerHTML = `
        <div class="message-content">${msg.content}</div>
        <div class="message-meta">
            <span>by: ${msg.sender_name}</span>
            <span>${timestamp}</span>
        </div>
    `
    container.appendChild(div)
}

function appendMessagesFromLoading(container, msg) {
    const isSender = msg.sender_id === currentChatUserId

    const div = document.createElement('div')
    div.classList.add('message-item')
    div.classList.add(isSender ? 'sent' : 'received')

    const timestamp = new Date(msg.timestamp || Date.now()).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })

    div.innerHTML = `
        <div class="message-content">${msg.content}</div>
        <div class="message-meta">
            <span>by: ${msg.username}</span>
            <span>${timestamp}</span>
        </div>
    `
    container.appendChild(div)
}
