package handlers

import (
	"net/http"
	g "real-time-forum/server/globalVar"
	"time"

	"github.com/google/uuid"
)

func CreateSession(w http.ResponseWriter, userId string) error {
	sessionId := uuid.New().String()

	expiration := time.Now().Add(24 * time.Hour)

	_, err := g.DB.Exec(`INSERT INTO Session (id , user_id, expires_at) VALUES (?,?,?)`, sessionId, userId, expiration)
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionId,
		Path:     "/",
		Expires:  expiration,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}
