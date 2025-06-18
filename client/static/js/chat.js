const userList = document.getElementById('homePageUsersList')
let currentChatUserId = ""
let socket = null
let isOpen = false
let denyConnection = false

// this function connects handles the connection between the frontend and the backend
function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("✅ WebSocket already connected, skipping.")
        return
    }

    if (denyConnection) return
    denyConnection = true

    socket = new WebSocket("ws://localhost:8080/api/ws")

    socket.onopen = () => {
        console.log("✅ WebSocket connected.")
        denyConnection = false
    }

    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data)

            if (data.type === "new_connection") {
                const { onlineUsers, allUsers } = data
                const lastMessages = data.lastMessages || {}
                const lastMessageSeen = data.lastMessageSeen || {}

                try {
                    const response = await fetch('/api/check-session', { credentials: 'include' })
                    const result = await response.json()

                    if (result.message === "ok") {
                        currentChatUserId = result.userID
                        loadUsers(allUsers, onlineUsers, currentChatUserId, lastMessages, lastMessageSeen)
                    } else if (result.status === 401) {
                        handleUnauthorized()
                    }
                } catch {
                    handleUnauthorized()
                }

                return
            }

            if (
                (typeof data.sender_id === "string" && data.sender_id.trim() !== "" &&
                    typeof data.receiver_id === "string" && data.receiver_id.trim() !== "" &&
                    typeof data.content === "string" && data.content.trim() !== "")
            ) {

                appendMessageToPopup(data)

                const isForMe = data.receiver_id === currentChatUserId
                const popupOpen = document.getElementById(`chat-popup-${data.sender_id}`)

                if (isForMe && popupOpen && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "seen-update",
                        sender_id: data.sender_id,
                        receiver_id: currentChatUserId,
                        seen: true
                    }))
                }
            }

        } catch (err) {
            console.error("❌ Error handling WebSocket message:", err)
            errorPage(500, "Failed to connect to the server. Please try again later.")
            showPage('ErrorPage')
        }
    }

    socket.onclose = (event) => {
        console.warn("⚠️ WebSocket closed:", event)
        denyConnection = false
    }

    socket.onerror = (error) => {
        console.error("❌ WebSocket error:", error)
        denyConnection = false
    }

    document.getElementById('logout').addEventListener('click', () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close(1000, "User logged out")
            showPage('register-login-page')
        }
        socket.send(JSON.stringify({ type: "offline" }))
        closePopup()
        return
    })
}

// this function closes the popup
function closePopup() {
    const existingPopup = document.querySelector('.chat-popup')
    if (existingPopup) {
        existingPopup.remove()
    }
}

// this function handles the cases of unauthorized people
function handleUnauthorized() {
    closePopup()
    showPage('register-login-page')
    Toast('You must login')
}


// this function serves the list of users with their status, if online or offline
function loadUsers(users, onlineUsers, currentUserId, lastMessages, lastMessageSeen) {
    userList.innerHTML = ''

    let userEntries = Object.entries(users).filter(([id]) => id !== currentUserId)
    userEntries.sort((a, b) => {

        let aTime = lastMessages[a[0]] || ""
        let bTime = lastMessages[b[0]] || ""

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
        <div class="messages">${(lastMessageSeen[userID] == false) ? '<i class="fa-solid fa-message" id="newMessage"></i>' : ''}
        `
        userList.appendChild(userStatus)
    }
}

// an event listener on each user to open the chat popup between them
document.addEventListener('click', (e) => {
    if (e.target.closest('.user-item')) {
        const userEl = e.target.closest('.user-item')
        const userId = userEl.getAttribute('data-user-id')
        const username = userEl.querySelector('.user-name').innerText
        openChatPopup(userId, username)
    }
})


// this function handles the logic of the chat popup , opens it , add messages in its body
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

    const seenUpdate = {
        type: "seen-update",
        sender_id: userId,
        receiver_id: currentChatUserId,
        seen: true
    }
    socket.send(JSON.stringify(seenUpdate))


    popup.querySelector('.send-popup-icon').addEventListener('click', async () => {
        let permission = false
        await fetch('/api/check-session', {
            credentials: 'include',
        })
            .then(response => response.json())
            .then(result => {
                if (result.status == 401) {
                    permission = false
                    showPage('register-login-page')
                    closePopup()
                    Toast('You must login to send a message')
                    return
                } else {
                    permission = true
                    return
                }
            })
        if (permission === false) {
            return
        }
        const textarea = popup.querySelector('textarea')
        const content = textarea.value.trim()
        if (!content || !socket || socket.readyState !== WebSocket.OPEN) return

        const messageObj = {
            type: "new-message",
            content: content,
            receiver_id: userId,
            sender_id: currentChatUserId,
            seen: false
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
    }, 500))

}


// this function does the debounce logic
function debounce(func, delay) {
    let timer
    return function (...args) {
        clearTimeout(timer)
        timer = setTimeout(() => func.apply(this, args), delay)
    }
}


// this function load messages after the first scroll up
function loadMoreMessages(userId, container) {
    let offset = parseInt(container.dataset.offset || '0')
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            user_id: userId,
            offset: offset,
            limit: 10
        })
    }

    fetch('/api/get-messages', options)
        .then(res => res.json())
        .then(data => {
            if (data.status === 401) {
                closePopup()
                showPage('register-login-page')
                Toast('You have to login to see messages')
            } else if (data.status === 400) {
                Toast(data.message || 'Invalid request')
            } else if (data.status === 500) {
                errorPage(data.status, data.message || 'Server error while loading messages.')
                showPage('ErrorPage')
            } else if (data.status == 200 && !(Array.isArray(data))) {
                Toast('There is no messages left to fetch')
            } else if (Array.isArray(data)) {
                const scrollHeightBefore = container.scrollHeight
                const oldScrollTop = container.scrollTop

                data.reverse().forEach(msg => {
                    const firstChild = container.firstChild
                    const div = document.createElement('div')
                    const isSender = msg.sender_id === currentChatUserId
                    div.classList.add('message-item', isSender ? 'sent' : 'received')

                    const timestamp = new Date(msg.timestamp || Date.now()).toLocaleTimeString('ar-MA', {
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

                const newHeight = container.scrollHeight
                container.scrollTop = newHeight - scrollHeightBefore + oldScrollTop
                container.dataset.offset = offset + 10
            } else {
                Toast('Unexpected error loading more messages.')
            }
        })
        .catch(err => {
            console.error("Error loading more messages:", err)
            errorPage(500, 'Failed to load more messages. Try again later.')
            showPage('ErrorPage')
        })
}


// this function handles the logic of the first ten messages
function loadMessages(userId, container, offset = 0, limit = 10) {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            user_id: userId,
            offset: offset,
            limit: limit
        })
    }

    fetch('/api/get-messages', options)
        .then(res => res.json())
        .then(data => {
            if (data.status === 401) {
                closePopup()
                showPage('register-login-page')
                Toast('You have to login to see messages')
            } else if (data.status === 400) {
                Toast(data.message || 'Invalid request')
            } else if (data.status === 500) {
                errorPage(data.status, data.message || 'Server error while loading messages.')
                showPage('ErrorPage')
            } else if (Array.isArray(data)) {
                data.forEach(msg => appendMessageToContainer(container, msg))
                container.scrollTop = container.scrollHeight
            } else if (data.status == 200 && !(Array.isArray(data))) {
                Toast('There is no messages to fetch')
            } else {
                Toast('Unexpected error loading messages.')
            }
        })
        .catch(err => {
            console.error('Error fetching messages:', err)
            errorPage(500, 'Failed to fetch messages. Try again later.')
            showPage('ErrorPage')
        })
}


// this function handles the logic of adding messages to a the popup body
function appendMessageToPopup(msg) {
    const popup = document.getElementById(`chat-popup-${msg.sender_id}`) || document.getElementById(`chat-popup-${msg.receiver_id}`)
    if (!popup) return

    const container = popup.querySelector('.chat-popup-body')
    appendMessageToContainer(container, msg)
    container.scrollTop = container.scrollHeight
}


// append the new messages , whenever they are sent
function appendMessageToContainer(container, msg) {
    const isSender = msg.sender_id === currentChatUserId

    const div = document.createElement('div')
    div.classList.add('message-item')
    div.classList.add(isSender ? 'sent' : 'received')

    const timestamp = new Date(msg.timestamp || Date.now()).toLocaleTimeString('ar-MA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })

    div.innerHTML = `
        <div class="message-content">${msg.content}</div>
        <div class="message-meta">
            <span>by: ${msg.sender_name || msg.username}</span>
            <span>${timestamp}</span>
        </div>
    `
    container.appendChild(div)
}