package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	g "real-time-forum/server/globalVar"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var ()

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

	// GetOnlineUsers(userID)
	BroadcastUserStatus(userID)

	defer func() {
		log.Printf("Cleaning up connection for user %s", userName)
		conn.Close()
		DeleteConnection(userID, conn)
		// GetOnlineUsers(userID)
		BroadcastUserStatus(userID)
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Connection closed for user %s: %v", userName, err)
			break
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

// this function broadcast all the news to the front
func BroadcastUserStatus(userID string) {
	onlineUsers, allUsers := GetOnlineUsers(userID)

	if onlineUsers == nil || allUsers == nil {
		log.Println("Error: failed to get online/all users")
		return
	}

	update := struct {
		Type        string            `json:"type"`
		OnlineUsers map[string]bool   `json:"onlineUsers"`
		AllUsers    map[string]string `json:"allUsers"`
	}{
		Type:        "new_connection",
		OnlineUsers: onlineUsers,
		AllUsers:    allUsers,
	}

	status, err := json.Marshal(update)
	if err != nil {
		log.Println("Error marshaling status:", err)
		return
	}

	fmt.Println(string(status))

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

// // GetOnlineUsers returns a list of online users
// func HandleGetOnlineUsers(w http.ResponseWriter, r *http.Request) {
// 	cookie, err := r.Cookie("session_id")
// 	if err != nil {
// 		http.Error(w, "Not authenticated", http.StatusUnauthorized)
// 		return
// 	}

// 	var currentUserID string
// 	err = g.DB.QueryRow("SELECT user_id FROM Session WHERE id = ?", cookie.Value).Scan(&currentUserID)
// 	if err != nil {
// 		http.Error(w, "Invalid session", http.StatusUnauthorized)
// 		return
// 	}

// 	rows, err := g.DB.Query(`
//         SELECT id, username FROM users WHERE id != ? ORDER BY username
//     `, currentUserID)
// 	if err != nil {
// 		log.Println("Error getting users:", err)
// 		http.Error(w, "Error getting users", http.StatusInternalServerError)
// 		return
// 	}
// 	defer rows.Close()

// 	type UserWithStatus struct {
// 		ID          string    `json:"id"`
// 		Username    string    `json:"username"`
// 		IsOnline    bool      `json:"is_online"`
// 		LastMessage time.Time `json:"last_message"`
// 	}

// 	var users []UserWithStatus
// 	var lastMsgStr string

// 	for rows.Next() {
// 		var user UserWithStatus
// 		err := rows.Scan(&user.ID, &user.Username)
// 		if err != nil {
// 			log.Println("Error scanning user:", err)
// 			http.Error(w, "Error reading users", http.StatusInternalServerError)
// 			return
// 		}

// 		g.ActiveConnectionsMutex.RLock()
// 		connections, exists := g.ActiveConnections[user.ID]
// 		user.IsOnline = exists && len(connections) > 0
// 		g.ActiveConnectionsMutex.RUnlock()

// 		err = g.DB.QueryRow(`
//             SELECT MAX(sent_at) FROM Messages m
//             JOIN Conversations c ON m.conversation_id = c.id
//             WHERE (c.user1_id = ? AND c.user2_id = ?) OR (c.user1_id = ? AND c.user2_id = ?)
//         `, currentUserID, user.ID, user.ID, currentUserID).Scan(&lastMsgStr)
// 		if err == nil && lastMsgStr != "" {
// 			user.LastMessage, err = time.Parse("2006-01-02 15:04:05", lastMsgStr)
// 			if err != nil {
// 				log.Println("Failed to parse time:", err)
// 				user.LastMessage = time.Time{}
// 			}
// 		} else {
// 			user.LastMessage = time.Time{}
// 		}

// 		users = append(users, user)
// 	}

// 	if err := rows.Err(); err != nil {
// 		log.Println("Row iteration error:", err)
// 		http.Error(w, "Error reading user list", http.StatusInternalServerError)
// 		return
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(users)
// }
