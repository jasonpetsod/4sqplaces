package admin

import (
	"appengine"
	"appengine/datastore"
	"appengine/user"
	"html/template"
	"net/http"
	"types"
)

func init() {
	http.HandleFunc("/admin", consoleHandler)
	http.HandleFunc("/admin/set_auth_token", setAuthTokenHandler)
}

var consoleTmpl = template.Must(template.ParseFiles(
	"templates/base.html",
	"admin/templates/console.html"))

func consoleHandler(w http.ResponseWriter, r *http.Request) {
	templateData := map[string]string{}
	consoleTmpl.Execute(w, templateData)
}

func setAuthTokenHandler(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)
	u := user.Current(c)

	token := types.FoursquareAuthToken{
		OAuthToken: r.FormValue("token"),
		Email:      u.Email,
	}
	key := datastore.NewKey(c, "types.FoursquareAuthToken", u.ID, 0, nil)
	_, err := datastore.Put(c, key, &token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Location", "/admin")
	w.WriteHeader(http.StatusFound)
}
