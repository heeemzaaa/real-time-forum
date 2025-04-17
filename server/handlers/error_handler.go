package handlers

import (
	"fmt"
	"net/http"
	g "real-time-forum/server/globalVar"
)

func ErrorPage(w http.ResponseWriter, statusCode int, message string) {
	w.WriteHeader(statusCode)
	data := g.ErrorData{
		StatusCode: statusCode,
		Message:    message,
	}

	err := g.Tpl.ExecuteTemplate(w, "index.html", data)
	if err != nil {
		fmt.Println(err)
		return
	}
}