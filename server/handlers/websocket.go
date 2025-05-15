package handlers

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	g "real-time-forum/server/globalVar"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections (you might want to restrict this in production)
	},
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Get the user ID from the session
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	var userID, username string
	err = g.DB.QueryRow("SELECT user_id, username FROM Session WHERE id = ?", cookie.Value).Scan(&userID, &username)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading to WebSocket:", err)
		return
	}

	// Create a connection object
	connection := &g.Connection{
		Conn:     conn,
		UserID:   userID,
		Username: username,
	}

	// Add the connection to the user's connections
	g.ActiveConnectionsMutex.Lock()
	if connections, exists := g.ActiveConnections[userID]; exists {
		// Add this connection to the existing slice
		g.ActiveConnections[userID] = append(connections, connection)
	} else {
		// Create a new slice with this connection
		g.ActiveConnections[userID] = []*g.Connection{connection}
	}
	g.ActiveConnectionsMutex.Unlock()

	// Broadcast to all clients about online status changes
	BroadcastUserStatus()

	// Handle disconnection
	defer func() {
		conn.Close()
		DeleteConnection(userID, conn)
		BroadcastUserStatus()
	}()

	// Set up ping timing
	lastPing := time.Now()
	pingInterval := 30 * time.Second

	// Set read deadline to handle timeouts
	conn.SetReadDeadline(time.Now().Add(pingInterval + 10*time.Second))

	// Listen for messages
	for {
		// Check if it's time to send a ping
		if time.Since(lastPing) >= pingInterval {
			connection.WriteMu.Lock()
			err := conn.WriteMessage(websocket.PingMessage, []byte{})
			connection.WriteMu.Unlock()
			if err != nil {
				log.Println("Error sending ping:", err)
				return
			}
			lastPing = time.Now()
		}

		// Read the next message with a deadline
		var message g.ChatMessage

		// Set a short deadline so we can regularly check for ping intervals
		conn.SetReadDeadline(time.Now().Add(time.Second))
		err := conn.ReadJSON(&message)

		if err != nil {
			// Check if it's a timeout error (which is expected)
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseNormalClosure,
				websocket.CloseGoingAway,
				websocket.CloseNoStatusReceived) {

				// Only log if it's not a timeout error
				netErr, ok := err.(net.Error)
				if !ok || !netErr.Timeout() {
					log.Printf("Unexpected error reading WebSocket message: %v", err)
					return
				}

				// If it's a timeout, just continue the loop to check for pings
				continue
			} else {
				// Connection closed normally
				return
			}
		}

		// Reset the read deadline since we got a message
		conn.SetReadDeadline(time.Now().Add(pingInterval + 10*time.Second))

		// Set the sender ID and name from the session
		message.SenderID = userID
		message.SenderName = username
		message.Timestamp = time.Now()

		// Save the message to the database
		messageID := uuid.New().String()

		// Find or create conversation
		var conversationID string
		err = g.DB.QueryRow(`
			SELECT id FROM Conversations 
			WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
		`, message.SenderID, message.ReceiverID, message.ReceiverID, message.SenderID).Scan(&conversationID)

		if err != nil {
			// Create a new conversation
			conversationID = uuid.New().String()
			_, err = g.DB.Exec(`
				INSERT INTO Conversations (id, user1_id, user2_id) 
				VALUES (?, ?, ?)
			`, conversationID, message.SenderID, message.ReceiverID)
			if err != nil {
				log.Println("Error creating conversation:", err)
				continue
			}
		}

		// Insert message
		_, err = g.DB.Exec(`
			INSERT INTO Messages (id, conversation_id, sender_id, content) 
			VALUES (?, ?, ?, ?)
		`, messageID, conversationID, message.SenderID, message.Content)
		if err != nil {
			log.Println("Error saving message:", err)
			continue
		}

		// Send the message to the sender as confirmation
		g.ActiveConnectionsMutex.RLock()
		senderConnections, senderExists := g.ActiveConnections[message.SenderID]
		g.ActiveConnectionsMutex.RUnlock()

		if senderExists {
			for _, senderConn := range senderConnections {
				senderConn.WriteMu.Lock()
				err = senderConn.Conn.WriteJSON(message)
				senderConn.WriteMu.Unlock()
				if err != nil {
					log.Println("Error sending confirmation to sender:", err)
				}
			}
		}

		// Send the message to the receiver if they are online
		g.ActiveConnectionsMutex.RLock()
		receiverConnections, receiverExists := g.ActiveConnections[message.ReceiverID]
		g.ActiveConnectionsMutex.RUnlock()

		if receiverExists {
			for _, receiverConn := range receiverConnections {
				receiverConn.WriteMu.Lock()
				err = receiverConn.Conn.WriteJSON(message)
				receiverConn.WriteMu.Unlock()
				if err != nil {
					log.Println("Error sending message to receiver:", err)
				}
			}
		}
	}
}

// BroadcastUserStatus sends the current online users list to all connected clients
func BroadcastUserStatus() {
	type OnlineStatusUpdate struct {
		Type   string            `json:"type"`
		Online map[string]string `json:"online"` // Map of userID -> username
	}

	// Create list of online users
	g.ActiveConnectionsMutex.RLock()
	onlineUsers := make(map[string]string)
	for userID, connections := range g.ActiveConnections {
		if len(connections) > 0 {
			onlineUsers[userID] = connections[0].Username
		}
	}
	g.ActiveConnectionsMutex.RUnlock()

	update := OnlineStatusUpdate{
		Type:   "status_update",
		Online: onlineUsers,
	}

	message, err := json.Marshal(update)
	if err != nil {
		log.Println("Error marshalling status update:", err)
		return
	}

	// Broadcast to all connected clients
	g.ActiveConnectionsMutex.RLock()
	for _, connections := range g.ActiveConnections {
		for _, conn := range connections {
			conn.WriteMu.Lock()
			err := conn.Conn.WriteMessage(websocket.TextMessage, message)
			conn.WriteMu.Unlock()
			if err != nil {
				log.Printf("Error sending status update to %s: %v", conn.Username, err)
			}
		}
	}
	g.ActiveConnectionsMutex.RUnlock()
}

// DeleteConnection removes a specific connection from the active connections map
func DeleteConnection(userID string, conn *websocket.Conn) {
	g.ActiveConnectionsMutex.Lock()
	defer g.ActiveConnectionsMutex.Unlock()

	connections, exists := g.ActiveConnections[userID]
	if !exists {
		return
	}

	// Find and remove the specific connection
	for i, c := range connections {
		if c.Conn == conn {
			// Remove this connection from the slice
			if i == len(connections)-1 {
				connections = connections[:i]
			} else {
				connections = append(connections[:i], connections[i+1:]...)
			}
			break
		}
	}

	// Update the map with the modified slice or delete the entry if empty
	if len(connections) == 0 {
		delete(g.ActiveConnections, userID)
	} else {
		g.ActiveConnections[userID] = connections
	}
}

// GetOnlineUsers returns a list of online users
func HandleGetOnlineUsers(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	var currentUserID string
	err = g.DB.QueryRow("SELECT user_id FROM Session WHERE id = ?", cookie.Value).Scan(&currentUserID)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Get all users from the database
	rows, err := g.DB.Query(`
		SELECT id, username FROM users WHERE id != ? ORDER BY username
	`, currentUserID)
	if err != nil {
		log.Println("Error getting users:", err)
		http.Error(w, "Error getting users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type UserWithStatus struct {
		ID          string    `json:"id"`
		Username    string    `json:"username"`
		IsOnline    bool      `json:"is_online"`
		LastMessage time.Time `json:"last_message"`
	}

	var users []UserWithStatus

	for rows.Next() {
		var user UserWithStatus
		err := rows.Scan(&user.ID, &user.Username)
		if err != nil {
			log.Println("Error scanning user:", err)
			continue
		}

		// Check if user is online
		g.ActiveConnectionsMutex.RLock()
		connections, exists := g.ActiveConnections[user.ID]
		user.IsOnline = exists && len(connections) > 0
		g.ActiveConnectionsMutex.RUnlock()

		// Get the timestamp of the last message between these users
		err = g.DB.QueryRow(`
			SELECT MAX(sent_at) FROM Messages m
			JOIN Conversations c ON m.conversation_id = c.id
			WHERE (c.user1_id = ? AND c.user2_id = ?) OR (c.user1_id = ? AND c.user2_id = ?)
		`, currentUserID, user.ID, user.ID, currentUserID).Scan(&user.LastMessage)
		if err != nil {
			// If no messages, use zero time
			user.LastMessage = time.Time{}
		}

		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// Get messages between current user and the specified user
func HandleGetMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	var currentUserID string
	err = g.DB.QueryRow("SELECT user_id FROM Session WHERE id = ?", cookie.Value).Scan(&currentUserID)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	var requestBody struct {
		UserID string `json:"user_id"`
		Offset int    `json:"offset"`
		Limit  int    `json:"limit"`
	}

	err = json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if requestBody.Limit == 0 {
		requestBody.Limit = 10 // Default limit
	}

	// Get conversation ID
	var conversationID string
	err = g.DB.QueryRow(`
		SELECT id FROM Conversations 
		WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
	`, currentUserID, requestBody.UserID, requestBody.UserID, currentUserID).Scan(&conversationID)

	if err != nil {
		// No conversation yet
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	// Get messages
	rows, err := g.DB.Query(`
		SELECT m.id, m.sender_id, u.username, m.content, m.sent_at 
		FROM Messages m
		JOIN users u ON m.sender_id = u.id
		WHERE m.conversation_id = ?
		ORDER BY m.sent_at DESC
		LIMIT ? OFFSET ?
	`, conversationID, requestBody.Limit, requestBody.Offset)
	if err != nil {
		log.Println("Error getting messages:", err)
		http.Error(w, "Error getting messages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []g.Message

	for rows.Next() {
		var message g.Message
		err := rows.Scan(&message.ID, &message.SenderID, &message.Username, &message.Content, &message.Timestamp)
		if err != nil {
			log.Println("Error scanning message:", err)
			continue
		}
		messages = append(messages, message)
	}

	// Reverse the messages to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}
