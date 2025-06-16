package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"
)

// this function handles the case of loading categories
func HandleCategories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	_, err := GetSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusUnauthorized, "message": "You must be logged in"})
		return
	}

	rows, err := g.DB.Query("SELECT category_name FROM categories")
	if err != nil {
		log.Println("Failed to retrieve categories:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to retrieve categories"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var categories g.Categories
		err = rows.Scan(&categories.CategoryName)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"status": http.StatusInternalServerError, "message": "Failed to scan categories"})
			return
		}
		g.SliceOfCategories = append(g.SliceOfCategories, categories)
	}

	if len(g.SliceOfCategories) == 0 {
		json.NewEncoder(w).Encode(map[string]any{"status": http.StatusOK, "message": "There is no categories"})
		return
	}

	json.NewEncoder(w).Encode(g.SliceOfCategories)
	g.SliceOfCategories = nil
}
