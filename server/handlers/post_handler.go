package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	g "real-time-forum/server/globalVar"

	"net/http"

	"github.com/google/uuid"
)

// this function handles the logic of adding a post
func PostHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var post g.Post
	err := json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		log.Println("Failed to read the json data:", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusBadRequest, "message": "Invalid request format"})
		return
	}

	err = AddCategory(post.Categories)
	if err != nil {
		log.Println("Failed to add categories:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to insert category !"})
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		log.Println("Failed to fetch the cookie:", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusUnauthorized, "message": "Please login to add a post !"})
		return
	}

	sessionId := cookie.Value
	userId := ""
	err = g.DB.QueryRow("SELECT user_id FROM Session WHERE id = ?", sessionId).Scan(&userId)
	if err != nil {
		log.Println("Error in the database:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to fetch the user id !"})
	}

	post.UserId = userId
	err = AddPost(post)
	if err != nil {
		log.Println("Error adding the post:" ,err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Error to add post !"})
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "Post created !"})
}


// this function is responsible for inserting a new post to the database
func AddPost(post g.Post) error {
	postId := uuid.New().String()
	query := `INSERT INTO posts (id,user_id,title,content) VALUES (?,?,?,?)`
	_, err := g.DB.Exec(query, postId, post.UserId, post.Title, post.Content)
	if err != nil {
		log.Println("Error in the database:",err)
		return fmt.Errorf("db error: %v", err)
	}
	for _, category := range post.Categories {
		query = `INSERT INTO CategoriesByPost (post_id,category_name) VALUES (?,?)`
		_, err = g.DB.Exec(query, postId, category)
		if err != nil {
			fmt.Println("Error in the databse:", err)
			return fmt.Errorf("db error: %v", err)
		}
	}

	return nil
}

// this function checks if a category is already in database , if not it inserts the category to it
func AddCategory(categories []string) error {
	for _, category := range categories {
		var exists int
		err := g.DB.QueryRow("SELECT COUNT(*) FROM categories WHERE category_name = ?", category).Scan(&exists)
		if err != nil {
			log.Println("DB error:", err)
			return err
		}
		if exists > 0 {
			continue
		}

		categoryID := uuid.New().String()
		_, err = g.DB.Exec("INSERT INTO categories (id, category_name) VALUES (?, ?)", categoryID, category)
		if err != nil {
			log.Println("Failed to insert category:", err)
			return err
		}
	}
	return nil
}
