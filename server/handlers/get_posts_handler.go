package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"
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
	for i := len(g.Posts)-1; i >= 0; i-- {
		posts = append(posts, g.Posts[i])
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
	posts = nil
	g.Posts = nil
}

func reverseArray(arr []int) []int {
	reversed := make([]int, len(arr))
	for i := 0; i < len(arr); i++ {
		reversed[i] = arr[len(arr)-1-i]
	}
	return reversed
}
