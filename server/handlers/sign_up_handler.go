package handlers

import "net/http"

func HandleSignUp(w http.ResponseWriter , r *http.Request) {
	if (r.Method != http.MethodPost) {
		ErrorPage(w , http.StatusMethodNotAllowed , "Method not allowed !")
		return
	}

	
}