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
	g.DB, err = sql.Open("sqlite3", "./server/database/database.db")
	if err != nil {
		log.Fatal(err)
	}
	m.Migrate()
}

func main() {
	http.HandleFunc("/static/", h.HandleStatic)
	http.HandleFunc("/api/signUp", h.HandleSignUp)
	log.Println("server start: http://localhost:8080/")
	http.ListenAndServe(":8080", nil)
}
