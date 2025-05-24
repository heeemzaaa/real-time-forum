package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	g "real-time-forum/server/globalVar"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var OnlineUsers = make(map[string]string)

func MyHandleWebSocket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		// add an error page to show the error in this case
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

	GetOnlineUsers(userID)
}

func GetOnlineUsers(userID string) {
	var users []g.User
	rows, err := g.DB.Query("SELECT id,username FROM users WHERE id != ?", userID)
	if err != nil {
		log.Println("Error selecting all users:", err)
		return
	}

	for rows.Next() {
		var user g.User
		err = rows.Scan(&user.ID, &user.Username)
		if err != nil {
			log.Println("Error scaning the username:", err)
			rows.Close()
			return
		}
		users = append(users, user)
	}

	rows.Close()

	g.ActiveConnectionsMutex.Lock()
	for userID, connections := range g.ActiveConnections {
		if len(connections) > 0 {
			OnlineUsers[userID] = connections[0].Username
		}
	}
	g.ActiveConnectionsMutex.Unlock()
}

func BroadcastUserStatus() {
	type OnlineStatus struct {
		Type   string            `json:"type"`
		Online map[string]string `json:"online"`
	}

	update := OnlineStatus{
		Type:   "new_connection",
		Online: OnlineUsers,
	}

	status, err := json.Marshal(update)
	if err != nil {
		log.Println("Error marshling the data:", err)
	}

	g.ActiveConnectionsMutex.Lock()
	for _, connections := range g.ActiveConnections {
		for _, conn := range connections {
			conn.WriteMu.Lock()
			err := conn.Conn.WriteMessage(websocket.TextMessage, status)
			if err != nil {
				log.Println("Error writing the message:", err)
				return
			}
			conn.WriteMu.Unlock()
		}
	}
	g.ActiveConnectionsMutex.Unlock()
}

func DeleteConnection(userID string, conn *websocket.Conn) {
	
}
