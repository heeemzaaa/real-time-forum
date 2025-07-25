package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"

	"github.com/google/uuid"
)

// this function gets all the comments of a choosing post, fetch them and send them to frontend
func HandleGetComments(w http.ResponseWriter, r *http.Request) {
	_, err := GetSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusUnauthorized, "message": "You must be logged in"})
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusMethodNotAllowed, "message": "Method not allowed !"})
		return
	}


	var requestBody struct {
		PostID string `json:"post_id"`
	}

	err = json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Invalid request format"})
		return
	}

	if requestBody.PostID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Post ID is required"})
		return
	}

	rows, err := g.DB.Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username 
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC`, requestBody.PostID)

	if err != nil {
		log.Println("Failed to retrieve comments:", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to retrieve comments"})
		return
	}
	defer rows.Close()

	var comments []g.Comment
	for rows.Next() {
		var comment g.Comment
		err = rows.Scan(
			&comment.ID,
			&comment.PostId,
			&comment.UserId,
			&comment.Content,
			&comment.CreatedAt,
			&comment.UserName)

		if err != nil {
			log.Println("Error scanning comment row:", err)
			continue
		}

		comments = append(comments, comment)
	}

	if len(comments) == 0 {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "this post has no comments"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// HandleAddComment adds a new comment to a post
func HandleAddComment(w http.ResponseWriter, r *http.Request) {
	userID, err := GetSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusUnauthorized, "message": "You must be logged in"})
		return
	}
	
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusMethodNotAllowed, "message": "Method not allowed !"})
		return
	}

	var commentData struct {
		PostID  string `json:"post_id"`
		Content string `json:"content"`
	}

	err = json.NewDecoder(r.Body).Decode(&commentData)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Invalid request format"})
		return
	}

	if commentData.PostID == "" || commentData.Content == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Post ID and content are required"})
		return
	}

	commentID := uuid.New().String()
	_, err = g.DB.Exec(
		"INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)",
		commentID, commentData.PostID, userID, commentData.Content)
	if err != nil {
		log.Println("Error creating comment:", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to create comment"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "Comment added successfully", "id": commentID})
}
