package connect_to_foursquare

import (
	"html/template"
	"net/http"
)

func init() {
	http.HandleFunc("/connect_to_foursquare", handler)
}

var tmpl = template.Must(template.ParseFiles(
	"templates/base.html",
	"connect_to_foursquare/templates/connect_to_foursquare.html"))

func handler(w http.ResponseWriter, r *http.Request) {
	tmpl.Execute(w, "")
}
