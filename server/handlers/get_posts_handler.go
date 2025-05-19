package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"
)

func HandleGetPosts(w http.ResponseWriter, r *http.Request) {
	// Set content type header
	w.Header().Set("Content-Type", "application/json")

	// Validate request method
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"message": "Method not allowed"})
		return
	}

	// First, get all posts
	rows, err := g.DB.Query(`
		SELECT p.id, p.title, p.content, p.created_at, p.user_id
		FROM posts p
	`)

	if err != nil {
		log.Println("Failed to retrieve posts:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve posts"})
		return
	}
	defer rows.Close()

	// Create slice to store posts
	posts := []g.Post{}

	// Iterate through result rows
	for rows.Next() {
		var post g.Post
		err = rows.Scan(&post.ID, &post.Title, &post.Content, &post.CreatedAt, &post.UserId)
		if err != nil {
			log.Println("Failed to scan post row:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"message": "Failed to scan posts"})
			return
		}

		// Get username for each post
		err = g.DB.QueryRow("SELECT username FROM users WHERE id = ?", post.UserId).Scan(&post.UserName)
		if err != nil {
			log.Println("Failed to fetch username:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"message": "Failed to fetch the username!"})
			return
		}

		// Get categories for this post
		categoryRows, err := g.DB.Query("SELECT category_name FROM CategoriesByPost WHERE post_id = ?", post.ID)
		if err != nil {
			log.Println("Failed to fetch categories:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"message": "Failed to fetch categories"})
			return
		}
		defer categoryRows.Close()

		for categoryRows.Next() {
			var category string
			if err := categoryRows.Scan(&category); err != nil {
				log.Println("Failed to scan category:", err)
				continue
			}
			post.Categories = append(post.Categories, category)
		}

		posts = append(posts, post)
	}

	// Check for errors from rows.Next()
	if err = rows.Err(); err != nil {
		log.Println("Error iterating over rows:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error processing posts"})
		return
	}

	// Reverse order to show latest posts first
	reversedPosts := make([]g.Post, len(posts))
	for i, j := 0, len(posts)-1; j >= 0; i, j = i+1, j-1 {
		reversedPosts[i] = posts[j]
	}

	// Return posts as JSON response
	if err := json.NewEncoder(w).Encode(reversedPosts); err != nil {
		log.Println("Failed to encode posts to JSON:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to encode response"})
	}
}

func HandleGetSinglePost(w http.ResponseWriter, r *http.Request) {
	// Set content type header consistently
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"message": "Method not allowed"})
		return
	}

	// Parse the request body to get the post ID
	var requestBody struct {
		PostID string `json:"post_id"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Invalid request format"})
		return
	}

	if requestBody.PostID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Post ID is required"})
		return
	}

	// Get the post details
	var post g.Post
	err = g.DB.QueryRow(`
		SELECT p.id, p.title, p.content, p.created_at, p.user_id
		FROM posts p
		WHERE p.id = ?
	`, requestBody.PostID).Scan(&post.ID, &post.Title, &post.Content, &post.CreatedAt, &post.UserId)

	if err != nil {
		log.Println("Failed to retrieve post:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve post"})
		return
	}

	// Get username for the post
	err = g.DB.QueryRow("SELECT username FROM users WHERE id = ?", post.UserId).Scan(&post.UserName)
	if err != nil {
		log.Println("Failed to fetch username:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to fetch the username!"})
		return
	}

	// Get categories for this post
	categoryRows, err := g.DB.Query("SELECT category_name FROM CategoriesByPost WHERE post_id = ?", post.ID)
	if err != nil {
		log.Println("Failed to fetch categories:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve categories"})
		return
	}
	defer categoryRows.Close()

	for categoryRows.Next() {
		var category string
		if err := categoryRows.Scan(&category); err != nil {
			log.Println("Failed to scan category:", err)
			continue
		}
		post.Categories = append(post.Categories, category)
	}

	// Check for errors from categoryRows.Next()
	if err = categoryRows.Err(); err != nil {
		log.Println("Error iterating over category rows:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error processing categories"})
		return
	}

	json.NewEncoder(w).Encode(post)
}
