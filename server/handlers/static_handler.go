package handlers

import (
	"net/http"
	"os"
	"strings"
)

func HandleStatic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		ErrorPage(w, http.StatusMethodNotAllowed, "Method not allowed !")
		return
	}
	if !strings.HasPrefix(r.URL.Path, "/static") {
		ErrorPage(w, http.StatusNotFound, "Statut not found !")
		return
	} else {
		infos, err := os.Stat(r.URL.Path[1:])
		if err != nil {
			ErrorPage(w, http.StatusNotFound, "Statut not found !")
			return
		} else if infos.IsDir() {
			ErrorPage(w, http.StatusForbidden, "Access Forbidden !")
			return
		} else {
			http.ServeFile(w, r, r.URL.Path[1:])
		}
	}
}
