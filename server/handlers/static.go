package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)


// this function handle the serving of the static files
func HandleStatic(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed !", http.StatusMethodNotAllowed)
		return
	}

	if !strings.HasPrefix(r.URL.Path, "/static/") {
		http.Error(w, "Page not found !", http.StatusNotFound)
		return
	}

	filePath := filepath.Join("client", r.URL.Path)

	infos, err := os.Stat(filePath)
	if err != nil {
		http.Error(w, "Page not found !", http.StatusNotFound)
		return
	}

	if infos.IsDir() {
		http.Error(w, "Access forbidden !", http.StatusForbidden)
		return
	}
	http.ServeFile(w, r, filePath)
}
