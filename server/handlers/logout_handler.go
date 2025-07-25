package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	g "real-time-forum/server/globalVar"
)

// this function handles all the logout logic, clears the session from the table...
func HandleLogout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, err := GetSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusUnauthorized, "message": "You must be logged in"})
		return
	}

	_, err = g.DB.Exec("DELETE FROM Session WHERE id = ?", userID)
	if err != nil {
		log.Println("Failed to delete session:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to delete the session Id from the database!"})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   false,
	})
	
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "Session deleted successfully!"})
}
