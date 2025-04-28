package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"
)

func HandleCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := g.DB.Query("SELECT category_name FROM categories")
	if err != nil {
		log.Println("Failed to retrieve categories:", err)
		json.NewEncoder(w).Encode(map[string]string{"message": "Failed to retrieve categories"})
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var categories g.Categories
		err = rows.Scan(&categories.CategoryName)
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"message": "Failed to scan categories"})
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		g.SliceOfCategories = append(g.SliceOfCategories, categories)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(g.SliceOfCategories)
	g.SliceOfCategories = nil
}
