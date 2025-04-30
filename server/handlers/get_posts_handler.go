package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"
	"strings"
)

func HandleGetPosts(w http.ResponseWriter, r *http.Request) {
	rows, err := g.DB.Query("SELECT id,title,content,created_at FROM posts")
	if err != nil {
		log.Println("Failed to retrieve posts:", err)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve posts"})
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var post g.Post
		err = rows.Scan(&post.ID, &post.Title, &post.Content, &post.CreatedAt)
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"message": "Failed to scan posts"})
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		err = g.DB.QueryRow("SELECT category_name FROM CategoriesByPost WHERE post_id = ?", post.ID).Scan(&post.Categories)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retreive categories"})
			return
		}
		g.Posts = append(g.Posts, post)
	}
	var posts []g.Post
	for i := len(g.Posts) - 1; i >= 0; i-- {
		posts = append(posts, g.Posts[i])
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
	posts = nil
	g.Posts = nil
}

func HandleGetSinglePost(w http.ResponseWriter, r *http.Request) {
	// Extract the post ID from the URL
	postID := strings.TrimPrefix(r.URL.Path, "/api/get-post/")

	if postID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Post ID is required"})
		return
	}

	var post g.Post
	err := g.DB.QueryRow("SELECT id, title, content, created_at FROM posts WHERE id = ?", postID).Scan(
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
