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

func HandleSignUp(w http.ResponseWriter, r *http.Request) {

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var user g.User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the parsing of the data!"})
		return
	}
	if user.Username == "" || user.Email == "" || user.PasswordHash == "" || user.FirstName == "" || user.LastName == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Please fill in all required fields"})
		fmt.Println(12)
		return
	}

	exist := 0
	err = g.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ? OR email = ?", user.Username, user.Email).Scan(&exist)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Database error!"})
		return
	}

	if exist > 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"message": "Email or username already used!"})
		return
	}
	var userId string
	userId , err = RegisterClient(user)
	if err != nil {
		fmt.Println(14)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error registring the client!"})
		return
	}

	err = CreateSession(w, userId, user.Username)
	if err != nil {
		log.Println("Failed to create session:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to create session !"})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User created"})
	fmt.Println("ok")
}

func RegisterClient(user g.User) (string,error) {
	id := uuid.New().String()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), 12)
	if err != nil {
		fmt.Println(15, err)
		return "",fmt.Errorf("hash error: %v", err)
	}

	query := `INSERT INTO users (id, username, email, age, gender, firstName, lastName, password_hash)
			  VALUES (?,?,?,?,?,?,?,?,?)`

	_, err = g.DB.Exec(query, id, user.Username, user.Email, user.Age, user.Gender, user.FirstName, user.LastName, string(hashedPassword))
	if err != nil {
		fmt.Println(16, err)
		return "",fmt.Errorf("db error: %v", err)
	}
	return id,nil
}
