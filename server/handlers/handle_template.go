package handlers

import (
	"log"
	"net/http"
	g "real-time-forum/server/globalVar"
)


// handles the execution of the template
func HandleTemplate(w http.ResponseWriter, r *http.Request) {
	err := g.Tpl.ExecuteTemplate(w, "index.html", nil)
	if err != nil {
		log.Println("Error executing the template !")
		http.Error(w, "Error in the server, please try again later !", http.StatusInternalServerError)
		return
	}
}
