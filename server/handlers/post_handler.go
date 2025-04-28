package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	g "real-time-forum/server/globalVar"

	"net/http"

	"github.com/google/uuid"
)

func PostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var post g.Post
	err := json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the parsing of the data!"})
		return
	}

	err = AddCategory(w ,post.Categories)
	if err != nil {
		log.Println("Failed to create session:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to insert category !"})
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to fetch the cookie !"})
	}
	sessionId := cookie.Value

	userId := ""
	err = g.DB.QueryRow("SELECT user_id FROM Session WHERE id = ?", sessionId).Scan(&userId)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to fetch the user id !"})
	}
	post.UserId = userId
	err = AddPost(post)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error to add post !"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Post created !"})
}

func AddPost(post g.Post) error {
	postId := uuid.New().String()

	query := `INSERT INTO posts (id,user_id,title,content) VALUES (?,?,?,?)`
	_, err := g.DB.Exec(query, postId, post.UserId, post.Title, post.Content)
	if err != nil {
		fmt.Println(18, err)
		return fmt.Errorf("db error: %v", err)
	}

	query = `INSERT INTO CategoriesByPost (post_id,category_name) VALUES (?,?)`
	_, err = g.DB.Exec(query, postId, post.Categories)
	if err != nil {
		fmt.Println(19, err)
		return fmt.Errorf("db error: %v", err)
	}
	return nil
}

func AddCategory(w http.ResponseWriter, categories string) error {
	var exist int
	err := g.DB.QueryRow("SELECT COUNT (*) FROM categories WHERE category_name = ?", categories).Scan(&exist)
	if err != nil {
		fmt.Println(20, err)
		return fmt.Errorf("db error: %v", err)
	}
	if exist > 0 {
		return nil
	}
	categoryId := uuid.New().String()

	rows, err := g.DB.Query("SELECT category_name FROM categories")
	if err != nil {
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve posts"})
		w.WriteHeader(http.StatusInternalServerError)
		return err
	}
	defer rows.Close()

	var ReserveCategories []string

	for rows.Next() {
		var category string
		err = rows.Scan(&category)
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"message": "Failed to scan categories"})
			w.WriteHeader(http.StatusInternalServerError)
			return err
		}
		ReserveCategories = append(ReserveCategories, category)
	}
	add := true
	for i := 0; i < len(ReserveCategories); i++ {
		if ReserveCategories[i] == categories {
			add = false
			break
		}
	}

	if add {
		query := `INSERT INTO categories (id,category_name) VALUES (?,?)`
		_, err = g.DB.Exec(query, categoryId, categories)
		if err != nil {
			fmt.Println(21, err)
			return fmt.Errorf("db error: %v", err)
		}
	} else {
		log.Println("Category already exist !")
	}

	return nil
}
