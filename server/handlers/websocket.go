package handlers

import (
	"encoding/json"
	"html"
	"log"
	"net/http"
	"time"

	g "real-time-forum/server/globalVar"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

	// var upgrader = websocket.Upgrader{
	// 	ReadBufferSize:  1024,
	// 	WriteBufferSize: 1024,
	// 	CheckOrigin: func(r *http.Request) bool {
	// 		return true // Allow all connections (you might want to restrict this in production)
	// 	},
	// }

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

	// Critical fix: Properly handle disconnection with defer
	defer func() {
		log.Printf("Cleaning up connection for user %s", username)
		conn.Close()
		DeleteConnection(userID, conn)
		BroadcastUserStatus()
	}()

	// Set read deadline and handle messages
	for {
		// Set a read deadline to detect disconnections
		// This is simpler than ping/pong and works well
		conn.SetReadDeadline(time.Now().Add(180 * time.Second))

		// Read the next message
		var message g.ChatMessage

		// Handle ReadJSON errors properly to detect disconnections
		err = conn.ReadJSON(&message)
		if err != nil {
			// Connection closed or error - no need to continue
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseNormalClosure,
				websocket.CloseGoingAway) {
				log.Printf("WebSocket error for user %s: %v", username, err)
			} else {
				log.Printf("WebSocket closed for user %s: %v", username, err)
			}
			return // Exit the loop and trigger the deferred cleanup
		}

		// Process the message normally
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
		message.Content = html.EscapeString(message.Content)
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
func BroadcastUserStatu() {
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

	// log.Printf("Broadcasting user status: %d users online", len(onlineUsers))
	for _, username := range onlineUsers {
		log.Printf("User online: %s", username)
	}

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
func DeleteConnectionn(userID string, conn *websocket.Conn) {
	g.ActiveConnectionsMutex.Lock()
	defer g.ActiveConnectionsMutex.Unlock()

	connections, exists := g.ActiveConnections[userID]
	if !exists {
		return
	}

	// Find and remove the specific connection
	foundIndex := -1
	for i, c := range connections {
		if c.Conn == conn {
			foundIndex = i
			break
		}
	}

	// If found, remove it
	if foundIndex >= 0 {
		// Fix: Properly remove from slice without leaving nil elements
		// Use the more explicit approach to avoid bugs
		newConnections := make([]*g.Connection, 0, len(connections)-1)
		for i, c := range connections {
			if i != foundIndex {
				newConnections = append(newConnections, c)
			}
		}
		connections = newConnections
	}

	// Update the map with the modified slice or delete the entry if empty
	if len(connections) == 0 {
		delete(g.ActiveConnections, userID)
		// log.Printf("User %s is now offline (no active connections)", userID)
	} else {
		g.ActiveConnections[userID] = connections
		// log.Printf("User %s still has %d active connections", userID, len(connections))
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

	// fetch all the users , excluding you , bach t afficher l online fihom
	rows, err := g.DB.Query(`
        SELECT id, username FROM users WHERE id != ? ORDER BY username
    `, currentUserID)
	if err != nil {
		log.Println("Error getting users:", err)
		http.Error(w, "Error getting users", http.StatusInternalServerError)
		return
	}
	defer rows.Close() // Ensure rows are closed

	type UserWithStatus struct {
		ID          string    `json:"id"`
		Username    string    `json:"username"`
		IsOnline    bool      `json:"is_online"`
		LastMessage time.Time `json:"last_message"`
	}

	var users []UserWithStatus
	var lastMsgStr string

	for rows.Next() {
		var user UserWithStatus
		err := rows.Scan(&user.ID, &user.Username)
		if err != nil {
			log.Println("Error scanning user:", err)
			http.Error(w, "Error reading users", http.StatusInternalServerError)
			return
		}

		// Check if user is online
		g.ActiveConnectionsMutex.RLock()
		connections, exists := g.ActiveConnections[user.ID]
		user.IsOnline = exists && len(connections) > 0
		g.ActiveConnectionsMutex.RUnlock()

		// Get last message timestamp
		err = g.DB.QueryRow(`
            SELECT MAX(sent_at) FROM Messages m
            JOIN Conversations c ON m.conversation_id = c.id
            WHERE (c.user1_id = ? AND c.user2_id = ?) OR (c.user1_id = ? AND c.user2_id = ?)
        `, currentUserID, user.ID, user.ID, currentUserID).Scan(&lastMsgStr)
		if err == nil && lastMsgStr != "" {
			user.LastMessage, err = time.Parse("2006-01-02 15:04:05", lastMsgStr)
			if err != nil {
				log.Println("Failed to parse time:", err)
				user.LastMessage = time.Time{}
			}
		} else {
			user.LastMessage = time.Time{}
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		log.Println("Row iteration error:", err)
		http.Error(w, "Error reading user list", http.StatusInternalServerError)
		return
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
		requestBody.Limit = 10
	}

	// Get conversation ID
	var conversationID string
	err = g.DB.QueryRow(`
		SELECT id FROM Conversations 
		WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
	`, currentUserID, requestBody.UserID, requestBody.UserID, currentUserID).Scan(&conversationID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error fetching the conversation"})
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

	var messages []g.Message

	for rows.Next() {
		var message g.Message
		err := rows.Scan(&message.ID, &message.SenderID, &message.Username, &message.Content, &message.Timestamp)
		if err != nil {
			log.Println("Error scanning message:", err)
			rows.Close() // close before return
			http.Error(w, "Error reading messages", http.StatusInternalServerError)
			return
		}
		messages = append(messages, message)
	}

	if err := rows.Err(); err != nil {
		log.Println("Row iteration error:", err)
		rows.Close()
		http.Error(w, "Error reading message list", http.StatusInternalServerError)
		return
	}

	rows.Close() // Final close after success

	// Reverse for chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}
