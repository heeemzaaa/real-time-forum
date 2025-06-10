package handlers

// var upgrader = websocket.Upgrader{
// 	ReadBufferSize:  1024,
// 	WriteBufferSize: 1024,
// 	CheckOrigin: func(r *http.Request) bool {
// 		return true // Allow all connections (you might want to restrict this in production)
// 	},
// }

// HandleWebSocket handles WebSocket connections
// func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
// 	// Get the user ID from the session
// 	cookie, err := r.Cookie("session_id")
// 	if err != nil {
// 		http.Error(w, "Not authenticated", http.StatusUnauthorized)
// 		return
// 	}

// 	var userID, username string
// 	err = g.DB.QueryRow("SELECT user_id, username FROM Session WHERE id = ?", cookie.Value).Scan(&userID, &username)
// 	if err != nil {
// 		http.Error(w, "Invalid session", http.StatusUnauthorized)
// 		return
// 	}

// 	// Upgrade the HTTP connection to a WebSocket connection
// 	conn, err := upgrader.Upgrade(w, r, nil)
// 	if err != nil {
// 		log.Println("Error upgrading to WebSocket:", err)
// 		return
// 	}

// 	// Create a connection object
// 	connection := &g.Connection{
// 		Conn:     conn,
// 		UserID:   userID,
// 		Username: username,
// 	}

// 	// Add the connection to the user's connections
// 	g.ActiveConnectionsMutex.Lock()
// 	if connections, exists := g.ActiveConnections[userID]; exists {
// 		// Add this connection to the existing slice
// 		g.ActiveConnections[userID] = append(connections, connection)
// 	} else {
// 		// Create a new slice with this connection
// 		g.ActiveConnections[userID] = []*g.Connection{connection}
// 	}
// 	g.ActiveConnectionsMutex.Unlock()

// 	// Broadcast to all clients about online status changes
// 	BroadcastUserStatus()

// 	// Critical fix: Properly handle disconnection with defer
// 	defer func() {
// 		log.Printf("Cleaning up connection for user %s", username)
// 		conn.Close()
// 		DeleteConnection(userID, conn)
// 		BroadcastUserStatus()
// 	}()

// 	// Set read deadline and handle messages
	
// }

// // BroadcastUserStatus sends the current online users list to all connected clients
// func BroadcastUserStatu() {
// 	type OnlineStatusUpdate struct {
// 		Type   string            `json:"type"`
// 		Online map[string]string `json:"online"` // Map of userID -> username
// 	}

// 	// Create list of online users
// 	g.ActiveConnectionsMutex.RLock()
// 	onlineUsers := make(map[string]string)
// 	for userID, connections := range g.ActiveConnections {
// 		if len(connections) > 0 {
// 			onlineUsers[userID] = connections[0].Username
// 		}
// 	}
// 	g.ActiveConnectionsMutex.RUnlock()

// 	// log.Printf("Broadcasting user status: %d users online", len(onlineUsers))
// 	for _, username := range onlineUsers {
// 		log.Printf("User online: %s", username)
// 	}

// 	update := OnlineStatusUpdate{
// 		Type:   "status_update",
// 		Online: onlineUsers,
// 	}

// 	message, err := json.Marshal(update)
// 	if err != nil {
// 		log.Println("Error marshalling status update:", err)
// 		return
// 	}

// 	// Broadcast to all connected clients
// 	g.ActiveConnectionsMutex.RLock()
// 	for _, connections := range g.ActiveConnections {
// 		for _, conn := range connections {
// 			conn.WriteMu.Lock()
// 			err := conn.Conn.WriteMessage(websocket.TextMessage, message)
// 			conn.WriteMu.Unlock()
// 			if err != nil {
// 				log.Printf("Error sending status update to %s: %v", conn.Username, err)
// 			}
// 		}
// 	}
// 	g.ActiveConnectionsMutex.RUnlock()
// }

// // DeleteConnection removes a specific connection from the active connections map
// func DeleteConnectionn(userID string, conn *websocket.Conn) {
// 	g.ActiveConnectionsMutex.Lock()
// 	defer g.ActiveConnectionsMutex.Unlock()

// 	connections, exists := g.ActiveConnections[userID]
// 	if !exists {
// 		return
// 	}

// 	// Find and remove the specific connection
// 	foundIndex := -1
// 	for i, c := range connections {
// 		if c.Conn == conn {
// 			foundIndex = i
// 			break
// 		}
// 	}

// 	// If found, remove it
// 	if foundIndex >= 0 {
// 		// Fix: Properly remove from slice without leaving nil elements
// 		// Use the more explicit approach to avoid bugs
// 		newConnections := make([]*g.Connection, 0, len(connections)-1)
// 		for i, c := range connections {
// 			if i != foundIndex {
// 				newConnections = append(newConnections, c)
// 			}
// 		}
// 		connections = newConnections
// 	}

// 	// Update the map with the modified slice or delete the entry if empty
// 	if len(connections) == 0 {
// 		delete(g.ActiveConnections, userID)
// 		// log.Printf("User %s is now offline (no active connections)", userID)
// 	} else {
// 		g.ActiveConnections[userID] = connections
// 		// log.Printf("User %s still has %d active connections", userID, len(connections))
// 	}
// }


