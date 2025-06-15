package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// this function handles all the logic of the new users who wants to sign up
func HandleSignUp(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusMethodNotAllowed, "message": "Method not allowed !"})
		return
	}

	var user g.User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		log.Println("Error sending the json:", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Invalid request format"})
		return
	}
	if user.Username == "" || user.Email == "" || user.PasswordHash == "" || user.FirstName == "" || user.LastName == "" || user.Gender == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest , "message": "Please fill in all required fields"})
		return
	}

	exist := 0
	err = g.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ? OR email = ?", user.Username, user.Email).Scan(&exist)
	if err != nil {
		log.Println("Error in the database:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error in the server, please try again !"})
		return
	}

	if exist > 0 {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusConflict, "message": "Email or username already used!"})
		return
	}
	var userId string
	userId, err = RegisterClient(user)
	if err != nil {
		log.Println("error in the server:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error registring the client!"})
		return
	}

	err = CreateSession(w, userId, user.Username)
	if err != nil {
		log.Println("Failed to create session:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to create session !"})
	}
	
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "User created"})
}



// this function insert a new client into the database
func RegisterClient(user g.User) (string, error) {
	id := uuid.New().String()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), 12)
	if err != nil {
		log.Println("Error in generating the password:", err)
		return "", fmt.Errorf("hash error: %v", err)
	}

	query := `INSERT INTO users (id, username, email, age, gender, firstName, lastName, password_hash)
			  VALUES (?,?,?,?,?,?,?,?)`

	_, err = g.DB.Exec(query, id, user.Username, user.Email, user.Age, user.Gender, user.FirstName, user.LastName, string(hashedPassword))
	if err != nil {
		log.Println("Error in the database", err)
		return "", fmt.Errorf("db error: %v", err)
	}
	return id, nil
}
