package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	g "real-time-forum/server/globalVar"

	"github.com/google/uuid"
)

// this function creates a session
func CreateSession(w http.ResponseWriter, userId string, username string) error {
	var existingSessionID string
	var expiration time.Time
	now := time.Now()

	err := g.DB.QueryRow("SELECT id, expires_at FROM Session WHERE user_id = ?", userId).Scan(&existingSessionID, &expiration)

	if err == nil && expiration.After(now) {
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    existingSessionID,
			Path:     "/",
			Expires:  expiration,
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteLaxMode,
		})
		return nil
	}

	newSessionID := uuid.New().String()
	newExpiration := now.Add(24 * time.Hour)

	if err == sql.ErrNoRows {
		_, err = g.DB.Exec(`INSERT INTO Session (id, user_id, expires_at, username) VALUES (?, ?, ?, ?)`, newSessionID, userId, newExpiration, username)
	} else {
		_, err = g.DB.Exec(`UPDATE Session SET id = ?, expires_at = ? WHERE user_id = ?`, newSessionID, newExpiration, userId)
	}
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    newSessionID,
		Path:     "/",
		Expires:  newExpiration,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	return nil
}

// this function checks if the session is valid or not
func CheckSession(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session_id")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the cookie"})
		return
	}

	var expiration time.Time
	var userID string
	err = g.DB.QueryRow("SELECT user_id,expires_at FROM Session WHERE id = ?", cookie.Value).Scan(&userID, &expiration)
	if err != nil || time.Now().After(expiration) {
		log.Println("Error:" , err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"message": "try to login again"})
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "ok", "userID": userID})
}
