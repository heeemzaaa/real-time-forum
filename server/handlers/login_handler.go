package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"

	"golang.org/x/crypto/bcrypt"
)
// this function handles all the logic of the login
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	

	type UserChecker struct {
		UsernameOrEmail string `json:"UsernameOrEmail"`
		Password        string `json:"Password"`
	}

	var checker UserChecker

	err := json.NewDecoder(r.Body).Decode(&checker)
	if err != nil {
		log.Println("Error in database:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the server, please try again !"})
		return
	}

	exist := 0
	err = g.DB.QueryRow("SELECT COUNT (*) FROM users WHERE username = ? OR email = ?", checker.UsernameOrEmail, checker.UsernameOrEmail).Scan(&exist)
	if err != nil {
		log.Println("Error in database:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the server, please try again !"})
		return
	}

	if exist == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Username or Email not found !"})
		return
	}
	hashedPassword := ""
	err = g.DB.QueryRow("SELECT password_hash FROM users WHERE username = ? OR email = ?", checker.UsernameOrEmail, checker.UsernameOrEmail).Scan(&hashedPassword)
	if err != nil {
		log.Println("Error in database:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the server, please try again !"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(checker.Password))
	if err != nil {
		log.Println("Error in the hashing:", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Password not correct!"})
		return
	}

	username := ""
	id := ""
	err = g.DB.QueryRow("SELECT username,id FROM users WHERE username = ? OR email = ?", checker.UsernameOrEmail, checker.UsernameOrEmail).Scan(&username,&id)
	if err != nil {
		log.Println("Error in database:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the server, please try again !"})
		return
	}

	err = CreateSession(w, id, username)
	if err != nil {
		log.Println("Failed to create session:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the server, please try again !"})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Login successful!" , "username": username})

}
