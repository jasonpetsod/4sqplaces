package root

import (
	"appengine"
	"appengine/datastore"
	"appengine/user"
	"fmt"
	"net/http"
	"types"
)

func init() {
	http.HandleFunc("/", handler)
}

func handler(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)
	u := user.Current(c)
	oauth_token_key := datastore.NewKey(c, "types.FoursquareAuthToken",
		u.ID, 0, nil)
	q := datastore.NewQuery("types.FoursquareAuthToken").Filter(
		"__key__ =", oauth_token_key)
	var tokens []types.FoursquareAuthToken
	_, err := q.GetAll(c, &tokens)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// TODO: Use switch statement here.
	if len(tokens) == 0 {
		w.Header().Set("Location", "/connect_to_foursquare")
		w.WriteHeader(http.StatusTemporaryRedirect)
	} else if len(tokens) == 1 {
		// Display the pretty map using the token.
		fmt.Fprintf(w, "hello %v, your token is %v", u, tokens[0].OAuthToken)
	} else {
		err := fmt.Sprintf("Unexpected number of tokens for %v", u)
		http.Error(w, err, http.StatusInternalServerError)
	}
}
