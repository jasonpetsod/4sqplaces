package root

import (
	"appengine"
	"appengine/datastore"
	"appengine/user"
	"fmt"
	"net/http"
)

type FoursquareAuthToken struct {
	OAuthToken string
}

func init() {
	http.HandleFunc("/", handler)
}

func handler(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)
	u := user.Current(c)
	oauth_token_key := datastore.NewKey(c, "FoursquareAuthToken",
		u.ID, 0, nil)
	q := datastore.NewQuery("FoursquareAuthToken").Filter(
		"__key__ =", oauth_token_key)
	var tokens []FoursquareAuthToken
	_, err := q.GetAll(c, &tokens)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if len(tokens) == 0 {
		// Prompt user to generate a token.
	} else if len(tokens) == 1 {
		// Display the pretty map using the token.
		fmt.Fprintf(w, "hello %v", u)
	} else {
		err := fmt.Sprintf("Unexpected number of tokens for %v", u)
		http.Error(w, err, http.StatusInternalServerError)
	}
}
