package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"
)

func HandleGetPosts(w http.ResponseWriter, r *http.Request) {
	// Set headers
	w.Header().Set("Content-Type", "application/json")

	var categoryFilter string

	// Handle different HTTP methods
	if r.Method == "POST" {
		// For POST requests, get category filter from request body
		var requestBody struct {
			Category string `json:"category"`
		}

		err := json.NewDecoder(r.Body).Decode(&requestBody)
		if err != nil {
			log.Println("Error parsing request body:", err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"message": "Invalid request format"})
			return
		}

		categoryFilter = requestBody.Category
	}

	var rows *sql.Rows
	var err error

	if categoryFilter != "" {
		// If a category filter is provided, get posts for that category
		rows, err = g.DB.Query(`
			SELECT p.id, p.title, p.content, p.created_at, c.category_name
			FROM posts p
			JOIN CategoriesByPost c ON p.id = c.post_id
			WHERE c.category_name = ?
		`, categoryFilter)
	} else {
		// Otherwise, get all posts
		rows, err = g.DB.Query(`
			SELECT p.id, p.title, p.content, p.created_at, c.category_name
			FROM posts p
			LEFT JOIN CategoriesByPost c ON p.id = c.post_id
		`)
	}

	if err != nil {
		log.Println("Failed to retrieve posts:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve posts"})
		return
	}
	defer rows.Close()

	var posts []g.Post

	for rows.Next() {
		var post g.Post
		err = rows.Scan(&post.ID, &post.Title, &post.Content, &post.CreatedAt, &post.Categories)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"message": "Failed to scan posts"})
			return
		}
		posts = append(posts, post)
	}

	// Reverse order if you want latest posts first
	var reversedPosts []g.Post
	for i := len(posts) - 1; i >= 0; i-- {
		reversedPosts = append(reversedPosts, posts[i])
	}

	json.NewEncoder(w).Encode(reversedPosts)
}

func HandleGetSinglePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Parse the request body to get the post ID
	var requestBody struct {
		PostID string `json:"post_id"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid request format"})
		return
	}

	if requestBody.PostID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Post ID is required"})
		return
	}

	var post g.Post
	err = g.DB.QueryRow("SELECT id, title, content, created_at FROM posts WHERE id = ?", requestBody.PostID).Scan(
		&post.ID, &post.Title, &post.Content, &post.CreatedAt)

	if err != nil {
		log.Println("Failed to retrieve post:", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve post"})
		return
	}

	// Get the category for this post
	err = g.DB.QueryRow("SELECT category_name FROM CategoriesByPost WHERE post_id = ?", post.ID).Scan(&post.Categories)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve category"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}
