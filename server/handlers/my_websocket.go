package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

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
	BroadcastUserStatus()

	defer func() {
		log.Printf("Cleaning up connection for user %s", userName)
		conn.Close()
		DeleteConnection(userID, conn)
		GetOnlineUsers(userID)
		BroadcastUserStatus()
	}()
	
	time.Sleep(10 * time.Second)
}

func GetOnlineUsers(userID string) {
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
	fmt.Println(OnlineUsers)
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
		delete(OnlineUsers, userID)
	} else {
		g.ActiveConnections[userID] = connections
	}
}
