package main

import (
	"database/sql"
	"log"
	"net/http"

	g "real-time-forum/server/globalVar"
	h "real-time-forum/server/handlers"
	m "real-time-forum/server/migration"

	_ "github.com/mattn/go-sqlite3"
)

func init() {
	var err error
	g.DB, err = sql.Open("sqlite3", "file=../../server/database/database.db?_busy_timeout=2000&_journal_mode=WAL")
	if err != nil {
		log.Fatal(err)
	}
	m.Migrate()
}

func main() {
	var err error
	g.Tpl, err = g.Tpl.ParseFiles("client/templates/index.html")
	if err != nil {
		log.Fatal("Error in the parsing!")
	}
	// Serve static files (css, js)
	http.HandleFunc("/static/", h.HandleStatic)

	// API endpoint
	http.HandleFunc("/api/check-session", h.CheckSession)
	http.HandleFunc("/api/signup", h.HandleSignUp)
	http.HandleFunc("/api/login", h.HandleLogin)
	http.HandleFunc("/api/logout", h.HandleLogout)
	http.HandleFunc("/api/get-categories", h.HandleCategories)
	http.HandleFunc("/api/newpost", h.PostHandler)
	http.HandleFunc("/api/get-posts", h.HandleGetPosts)
	http.HandleFunc("/api/get-comments", h.HandleGetComments)
	http.HandleFunc("/api/get-post", h.HandleGetSinglePost)
	http.HandleFunc("/api/add-comment", h.HandleAddComment)

	// New Chat API endpoints
	http.HandleFunc("/api/ws", h.HandleWebSocket)
	http.HandleFunc("/api/get-messages", h.HandleGetMessages)

	// Catch-all: Serve index.html for all frontend routes
	http.HandleFunc("/", h.HandleTemplate)

	log.Println("Server running on http://localhost:8080/")
	http.ListenAndServe(":8080", nil)
}
