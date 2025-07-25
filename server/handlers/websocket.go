package handlers

import (
	"database/sql"
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
var typingUser = make(map[string]bool)
var receivingUser string

// this function handles the websocket logic from connecting to deconnecting
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	var typeReceived string

	w.Header().Set("Content-Type", "application/json")
	userID, err := GetSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusUnauthorized, "message": "You must be logged in"})
		return
	}

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusMethodNotAllowed, "message": "Method not allowed"})
		return
	}

	var userName string
	err = g.DB.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&userName)
	if err != nil {
		log.Println("Error fetching the username from the database:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "Error": "Error in the server"})
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "Error": "Error upgrading the websocket connection"})
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
		if typeReceived == "offline" {
			DeleteConnection(userID, conn, "offline")
		} else {
			DeleteConnection(userID, conn, "tab closed")
		}
		BroadcastUserStatus(userID)
	}()

	for {
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
		if message.Type == "typing" {
			typingUser[userID] = message.Typing
			receivingUser = message.ReceiverID
			BroadcastUserStatus(userID)
			continue
		}

		if message.Type == "offline" {
			typeReceived = message.Type
			return
		}

		if message.Type == "seen-update" {
			_, err = g.DB.Exec(`UPDATE Messages SET seen = 1 WHERE sender_id = ? AND receiver_id = ? AND seen = 0`, message.SenderID, message.ReceiverID)
			if err != nil {
				log.Println("Failed to update seen messages:", err)
			}
			BroadcastUserStatus(userID)
			continue
		}

		message.SenderID = userID
		messageID := uuid.New().String()
		message.SenderName = userName
		message.Timestamp = time.Now()
		message.Content = html.EscapeString(message.Content)

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
            INSERT INTO Messages (id, conversation_id, sender_id, receiver_id, content, seen)
            VALUES (?, ?, ?, ?, ?, ?)
        `, messageID, conversationID, message.SenderID, message.ReceiverID, message.Content, message.Seen)
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
		BroadcastUserStatus(userID)
	}
}

// this function returns both online users and all users
func GetOnlineUsers(userID string) (map[string]bool, map[string]string) {
	OnlineUsers := make(map[string]bool)
	AllUsers := make(map[string]string)

	rows, err := g.DB.Query("SELECT id,username FROM users")
	if err != nil {
		log.Println("Error selecting users:", err)
		return nil, nil
	}
	defer rows.Close()

	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			log.Println("Error scanning user:", err)
			continue
		}
		OnlineUsers[id] = false
		AllUsers[id] = name
	}

	g.ActiveConnectionsMutex.RLock()
	for id := range g.ActiveConnections {
		OnlineUsers[id] = true
	}
	g.ActiveConnectionsMutex.RUnlock()

	return OnlineUsers, AllUsers
}

// this function broadcast all the informations to all users
func BroadcastUserStatus(initiatorID string) {
	onlineUsers, allUsers := GetOnlineUsers(initiatorID)
	if onlineUsers == nil || allUsers == nil {
		log.Println("Error: failed to get online/all users")
		return
	}

	g.ActiveConnectionsMutex.Lock()
	defer g.ActiveConnectionsMutex.Unlock()

	for userID, connections := range g.ActiveConnections {
		lastMessages := make(map[string]string)

		rows, err := g.DB.Query(`
			SELECT 
				CASE 
					WHEN user1_id = ? THEN user2_id 
					ELSE user1_id 
				END as other_user,
				MAX(m.sent_at) as last_msg_time
			FROM Conversations c
			JOIN Messages m ON m.conversation_id = c.id
			WHERE user1_id = ? OR user2_id = ?
			GROUP BY other_user
		`, userID, userID, userID)
		if err != nil {
			log.Println("Error building lastMessages for user", userID, ":", err)
			continue
		}

		for rows.Next() {
			var otherUserID, lastTime string
			err = rows.Scan(&otherUserID, &lastTime)
			if err != nil {
				log.Println("Error scanning lastMessages row for", userID, ":", err)
				continue
			}
			lastMessages[otherUserID] = lastTime
		}
		rows.Close()

		lastMessageSeen := make(map[string]bool)

		for otherUserID := range lastMessages {
			var lastMessageID string
			var senderID string
			var seen bool

			err := g.DB.QueryRow(`
				SELECT id, sender_id, seen FROM Messages
				WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
				ORDER BY sent_at DESC
				LIMIT 1
				`, userID, otherUserID, otherUserID, userID).Scan(&lastMessageID, &senderID, &seen)
			if err != nil {
				log.Println("Error querying last message between", userID, "and", otherUserID, ":", err)
				continue
			}
			if senderID != userID {
				lastMessageSeen[senderID] = seen
			}
		}

		update := struct {
			Type            string            `json:"type"`
			OnlineUsers     map[string]bool   `json:"onlineUsers"`
			AllUsers        map[string]string `json:"allUsers"`
			LastMessages    map[string]string `json:"lastMessages"`
			LastMessageSeen map[string]bool   `json:"lastMessageSeen"`
			TypingUser      map[string]bool   `json:"typingUser"`
			ReceivingUser   string            `json:"received"`
		}{
			Type:            "new_connection",
			OnlineUsers:     onlineUsers,
			AllUsers:        allUsers,
			LastMessages:    lastMessages,
			LastMessageSeen: lastMessageSeen,
			TypingUser:      typingUser,
			ReceivingUser:   receivingUser,
		}

		jsonUpdate, err := json.Marshal(update)
		if err != nil {
			log.Println("Error marshaling user status update:", err)
			continue
		}

		for _, conn := range connections {
			conn.WriteMu.Lock()
			err = conn.Conn.WriteMessage(websocket.TextMessage, jsonUpdate)
			conn.WriteMu.Unlock()
			if err != nil {
				log.Println("Error writing user status update to", userID, ":", err)
			}
		}
	}
}

// this function deletes the connections
func DeleteConnection(userID string, conn *websocket.Conn, typeReceived string) {
	g.ActiveConnectionsMutex.Lock()
	defer g.ActiveConnectionsMutex.Unlock()

	if typeReceived == "offline" {
		log.Println("hnaaaaa")
		delete(g.ActiveConnections, userID)
		return
	}

	connections, exist := g.ActiveConnections[userID]
	if !exist {
		log.Printf("No active connections found for user %s", userID)
		return
	}

	index := -1
	for i, c := range connections {
		if c.Conn == conn {
			index = i
			break
		}
	}

	if index == -1 {
		log.Printf("Connection not found for user %s", userID)
		return
	}

	connections = append(connections[:index], connections[index+1:]...)

	if len(connections) == 0 {
		delete(g.ActiveConnections, userID)
	} else {
		g.ActiveConnections[userID] = connections
	}
}

// Get messages between current user and the specified user
func HandleGetMessages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUserID, err := GetSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusUnauthorized, "message": "You must be logged in"})
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusMethodNotAllowed, "message": "Method not allowed !"})
		return
	}

	var requestBody struct {
		UserID string `json:"user_id"`
		Offset int    `json:"offset"`
		Limit  int    `json:"limit"`
	}

	err = json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Invalid request format"})
		return
	}

	if requestBody.UserID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "UserId is required"})
		return
	}

	if requestBody.Limit == 0 {
		requestBody.Limit = 10
	}

	var conversationID string
	err = g.DB.QueryRow(`
		SELECT id FROM Conversations
		WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
	`, currentUserID, requestBody.UserID, requestBody.UserID, currentUserID).Scan(&conversationID)
	if err != nil {
		if err == sql.ErrNoRows {
			json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "There's no messages to fetch , you've reached the max messages"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error fetching the conversation"})
		return
	}

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
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error fetching the messages"})
		return
	}

	var messages []g.Message

	for rows.Next() {
		var message g.Message
		err := rows.Scan(&message.ID, &message.SenderID, &message.Username, &message.Content, &message.Timestamp)
		if err != nil {
			log.Println("Error scanning message:", err)
			rows.Close()
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error scanning the messages"})
			return
		}
		messages = append(messages, message)
	}

	err = rows.Err()
	if err != nil {
		log.Println("Row iteration error:", err)
		rows.Close()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error scanning the messages"})
		return
	}

	rows.Close()

	if len(messages) == 0 {
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "There's no messages to fetch , you've reached the max messages"})
		return
	}

	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	json.NewEncoder(w).Encode(messages)
}
