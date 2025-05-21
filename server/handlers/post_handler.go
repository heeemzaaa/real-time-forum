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
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var post g.Post
	err := json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		log.Println("Failed to read the json data:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error in the parsing of the data!"})
		return
	}

	err = AddCategory(post.Categories)
	if err != nil {
		log.Println("Failed to create session:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to insert category !"})
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		log.Println("Failed to fetch the cookie:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to fetch the cookie !"})
		return
	}
	sessionId := cookie.Value

	userId := ""
	err = g.DB.QueryRow("SELECT user_id FROM Session WHERE id = ?", sessionId).Scan(&userId)
	if err != nil {
		log.Println("Error in the database:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to fetch the user id !"})
	}
	post.UserId = userId
	err = AddPost(post)
	if err != nil {
		log.Println("Error adding the post:" ,err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"message": "Error to add post !"})
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Post created !"})
}

// this function is responsible for adding a new post to the database
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

// this function 
func AddCategory(categories []string) error {
	var exist int

	for _, category := range categories {
		err := g.DB.QueryRow("SELECT COUNT (*) FROM categories WHERE category_name = ?", category).Scan(&exist)
		if err != nil {
			log.Println("Error in the database:" ,err)
			return fmt.Errorf("db error: %v", err)
		}
		if exist > 0 {
			return nil
		}
		categoryId := uuid.New().String()

		rows, err := g.DB.Query("SELECT category_name FROM categories")
		if err != nil {
			log.Println("Error in the database:" ,err)
			return fmt.Errorf("db error: %v", err)
		}

		var ReserveCategories []string

		for rows.Next() {
			var category string
			err = rows.Scan(&category)
			if err != nil {
				rows.Close()
				log.Println("Error in the database:" ,err)
				return err
			}
			ReserveCategories = append(ReserveCategories, category)
		}

		rows.Close()

		add := true
		for i := 0; i < len(ReserveCategories); i++ {
			if ReserveCategories[i] == category {
				add = false
				break
			}
		}

		if add {
			query := `INSERT INTO categories (id,category_name) VALUES (?,?)`
			_, err = g.DB.Exec(query, categoryId, category)
			if err != nil {
				fmt.Println(21, err)
				return fmt.Errorf("db error: %v", err)
			}
		} else {
			log.Println("Category already exist !")
		}
	}

	return nil
}
