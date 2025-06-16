package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"
)

// this function handles the logic of all posts in the home page
func HandleGetPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	_, err := GetSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusUnauthorized, "message": "You must be logged in"})
		return
	}

	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusMethodNotAllowed, "message": "Method not allowed !"})
		return
	}

	rows, err := g.DB.Query(`
		SELECT p.id, p.title, p.content, p.created_at, p.user_id
		FROM posts p
	`)
	if err != nil {
		log.Println("Failed to retrieve posts:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to retrieve posts"})
		return
	}
	defer rows.Close()

	posts := []g.Post{}

	for rows.Next() {
		var post g.Post
		err = rows.Scan(&post.ID, &post.Title, &post.Content, &post.CreatedAt, &post.UserId)
		if err != nil {
			log.Println("Failed to scan post row:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to scan posts"})
			return
		}

		err = g.DB.QueryRow("SELECT username FROM users WHERE id = ?", post.UserId).Scan(&post.UserName)
		if err != nil {
			log.Println("Failed to fetch username:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to fetch the username!"})
			return
		}

		categoryRows, err := g.DB.Query("SELECT category_name FROM CategoriesByPost WHERE post_id = ?", post.ID)
		if err != nil {
			log.Println("Failed to fetch categories:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to fetch categories"})
			return
		}
		defer categoryRows.Close()

		for categoryRows.Next() {
			var category string
			if err := categoryRows.Scan(&category); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to scan categories"})
				log.Println("Failed to scan category:", err)
				continue
			}
			post.Categories = append(post.Categories, category)
		}
		posts = append(posts, post)
	}

	if len(posts) == 0 {
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "There is no posts"})
		return
	}

	err = rows.Err()
	if err != nil {
		log.Println("Error iterating over rows:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error processing posts"})
		return
	}

	reversedPosts := make([]g.Post, len(posts))
	for i, j := 0, len(posts)-1; j >= 0; i, j = i+1, j-1 {
		reversedPosts[i] = posts[j]
	}

	err = json.NewEncoder(w).Encode(reversedPosts)
	if err != nil {
		log.Println("Failed to encode posts to JSON:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to encode response"})
	}
}

// this function handles the logic of the single post
func HandleGetSinglePost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

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
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Invalid request format"})
		return
	}

	if requestBody.PostID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Post ID is required"})
		return
	}

	var post g.Post
	err = g.DB.QueryRow(`
		SELECT p.id, p.title, p.content, p.created_at, p.user_id
		FROM posts p
		WHERE p.id = ?
	`, requestBody.PostID).Scan(&post.ID, &post.Title, &post.Content, &post.CreatedAt, &post.UserId)

	if err != nil {
		log.Println("Failed to retrieve post:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to retrieve post"})
		return
	}

	err = g.DB.QueryRow("SELECT username FROM users WHERE id = ?", post.UserId).Scan(&post.UserName)
	if err != nil {
		log.Println("Failed to fetch username:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to fetch the username!"})
		return
	}

	categoryRows, err := g.DB.Query("SELECT category_name FROM CategoriesByPost WHERE post_id = ?", post.ID)
	if err != nil {
		log.Println("Failed to fetch categories:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to retrieve categories"})
		return
	}
	defer categoryRows.Close()

	for categoryRows.Next() {
		var category string
		err = categoryRows.Scan(&category)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to scan categories"})
			log.Println("Failed to scan category:", err)
			continue
		}
		post.Categories = append(post.Categories, category)
	}

	err = categoryRows.Err()
	if err != nil {
		log.Println("Error iterating over category rows:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error processing categories"})
		return
	}

	json.NewEncoder(w).Encode(post)
}
