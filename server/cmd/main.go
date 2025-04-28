package main

import (
	"database/sql"
	"log"
	"net/http"
	"path/filepath"

	g "real-time-forum/server/globalVar"
	h "real-time-forum/server/handlers"
	m "real-time-forum/server/migration"

	_ "github.com/mattn/go-sqlite3"
)

func init() {
	var err error
	g.DB, err = sql.Open("sqlite3", "./server/database/database.db")
	if err != nil {
		log.Fatal(err)
	}
	m.Migrate()
}

func main() {
	var err error
	g.Tpl, err = g.Tpl.ParseFiles(filepath.Join("client", "templates", "index.html"))
	if err != nil {
		log.Fatal("Error in the parsing!")
	}
	// Serve static files (css, js)
	fs := http.FileServer(http.Dir(filepath.Join("client", "static")))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// API endpoint
	http.HandleFunc("/api/check-session", h.CheckSession)
	http.HandleFunc("/api/get-posts" , h.HandleGetPosts)
	http.HandleFunc("/api/get-categories" , h.HandleCategories)
	http.HandleFunc("/api/newpost", h.PostHandler)
	http.HandleFunc("/api/signup", h.HandleSignUp)
	http.HandleFunc("/api/login", h.HandleLogin)
	http.HandleFunc("/api/logout" , h.HandleLogout)

	// Catch-all: Serve index.html for all frontend routes
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("client", "templates", "index.html"))
	})

	log.Println("Server running on http://localhost:8080/")
	http.ListenAndServe(":8080", nil)
}
