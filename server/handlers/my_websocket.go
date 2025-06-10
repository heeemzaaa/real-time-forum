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

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func MyHandleWebSocket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	cookie, err := r.Cookie("session_id")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"Error": "Error in the session !"})
		log.Println("Error in the session:", err)
		return
	}

	var userID string
	var userName string
	err = g.DB.QueryRow("SELECT user_id,username FROM session WHERE id = ?", cookie.Value).Scan(&userID, &userName)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"Error": "Error in the server"})
		log.Println("Error fetching the userId and username from the database:", err)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"Error": "Error upgrading the websocket connection"})
		log.Println("Error upgrading the connection:", err)
		return
	}

	connection := &g.Connection{
		Conn:     conn,
		UserID:   userID,
		Username: userName,
	}

	g.ActiveConnectionsMutex.Lock()
	connections, exist := g.ActiveConnections[userID]
	if exist {
		g.ActiveConnections[userID] = append(connections, connection)
	} else {
		g.ActiveConnections[userID] = []*g.Connection{connection}
	}
	g.ActiveConnectionsMutex.Unlock()

	BroadcastUserStatus(userID)

	defer func() {
		log.Printf("Cleaning up connection for user %s", userName)
		conn.Close()
		DeleteConnection(userID, conn)
		BroadcastUserStatus(userID)
	}()

	for {
		conn.SetReadDeadline(time.Now().Add(180 * time.Second))
		var message g.ChatMessage
		err = conn.ReadJSON(&message)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Printf("WebSocket error for user %s: %v", userName, err)
			} else {
				log.Printf("WebSocket closed for user %s: %v", userName, err)
			}
			return
		}

		message.SenderID = userID
		message.SenderName = userName
		message.Timestamp = time.Now()
		message.Content = html.EscapeString(message.Content)
		messageID := uuid.New().String()

		var conversationID string
		err = g.DB.QueryRow(`
            SELECT id FROM Conversations
            WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        `, message.SenderID, message.ReceiverID, message.ReceiverID, message.SenderID).Scan(&conversationID)
		if err != nil {
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

		_, err = g.DB.Exec(`
            INSERT INTO Messages (id, conversation_id, sender_id, content)
            VALUES (?, ?, ?, ?)
        `, messageID, conversationID, message.SenderID, message.Content)
		if err != nil {
			log.Println("Error saving message:", err)
			continue
		}

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

func GetOnlineUsers(userID string) (map[string]bool, map[string]string) {
	var OnlineUsers = make(map[string]bool)
	var AllUsers = make(map[string]string)

	rows, err := g.DB.Query("SELECT id,username FROM users")
	if err != nil {
		log.Println("Error selecting the users", err)
		return nil, nil
	}
	var users []g.User
	for rows.Next() {
		var user g.User
		err = rows.Scan(&user.ID, &user.Username)
		if err != nil {
			log.Println("Error scanning the users:", err)
			return nil, nil
		}
		users = append(users, user)
	}

	for _, u := range users {
		OnlineUsers[u.ID] = false
		AllUsers[u.ID] = u.Username
	}

	g.ActiveConnectionsMutex.Lock()
	for id, connections := range g.ActiveConnections {
		if len(connections) > 0 {
			OnlineUsers[id] = true
		}
	}
	g.ActiveConnectionsMutex.Unlock()
	return OnlineUsers, AllUsers
}

// this function broadcast all the informations to all users
func BroadcastUserStatus(userID string) {
	onlineUsers, allUsers := GetOnlineUsers(userID)
	if onlineUsers == nil || allUsers == nil {
		log.Println("Error: failed to get online/all users")
		return
	}

	update := struct {
		Type         string            `json:"type"`
		OnlineUsers  map[string]bool   `json:"onlineUsers"`
		AllUsers     map[string]string `json:"allUsers"`
	}{
		Type:         "new_connection",
		OnlineUsers:  onlineUsers,
		AllUsers:     allUsers,
	}

	status, err := json.Marshal(update)
	if err != nil {
		log.Println("Error marshaling status:", err)
		return
	}

	g.ActiveConnectionsMutex.Lock()
	for _, connections := range g.ActiveConnections {
		for _, conn := range connections {
			conn.WriteMu.Lock()
			err := conn.Conn.WriteMessage(websocket.TextMessage, status)
			conn.WriteMu.Unlock()
			if err != nil {
				log.Println("Error writing WebSocket message:", err)
			}
		}
	}
	g.ActiveConnectionsMutex.Unlock()
}

func DeleteConnection(userID string, conn *websocket.Conn) {
	g.ActiveConnectionsMutex.Lock()
	defer g.ActiveConnectionsMutex.Unlock()

	connections, exist := g.ActiveConnections[userID]
	if !exist {
		return
	}

	index := -1
	for i, c := range connections {
		if c.Conn == conn {
			index = i
			break
		}
	}

	if index >= 0 {
		newConnections := make([]*g.Connection, 0, len(connections)-1)
		for i, c := range connections {
			if i != index {
				newConnections = append(newConnections, c)
			}
		}
		connections = newConnections
	}

	if len(connections) == 0 {
		delete(g.ActiveConnections, userID)
	} else {
		g.ActiveConnections[userID] = connections
	}
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
			rows.Close()
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

	rows.Close()

	// Reverse for chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}
