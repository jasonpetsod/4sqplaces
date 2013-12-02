package foursquare_access_token

import (
	"appengine"
	"appengine/datastore"
	"appengine/memcache"
	"appengine/urlfetch"
	"appengine/user"
	"constants"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"types"
)

func init() {
	http.HandleFunc("/foursquare_access_token", handler)
}

func foursquareClientSecret(c appengine.Context) string {
	item, err := memcache.Get(c, constants.FoursquareClientSecretMemcacheKey)
	if err == memcache.ErrCacheMiss {
		q := datastore.NewQuery("types.FoursquareClientSecret").Filter(
			"__key__ =", constants.FoursquareClientID)
		var secrets []types.FoursquareClientSecret
		_, err := q.GetAll(c, &secrets)
		if err != nil {
            // TODO: Do something smarter here.
			return ""
		}

		item = &memcache.Item{
			Key:   constants.FoursquareClientSecretMemcacheKey,
			Value: []byte(secrets[0].Secret),
		}
		_ = memcache.Set(c, item)
	}
	return string(item.Value)
}

func handler(w http.ResponseWriter, r *http.Request) {
	code := r.FormValue("code")
	if len(code) == 0 {
		http.Error(w, "Missing 'code' parameter", http.StatusInternalServerError)
		return
	}

	c := appengine.NewContext(r)
	client := urlfetch.Client(c)
	resp, err := client.PostForm(constants.FoursquareAccessTokenURL,
		url.Values{
			"client_id":     {constants.FoursquareClientID},
			"client_secret": {foursquareClientSecret(c)},
			"grant_type":    {"authorization_code"},
			"redirect_uri":  {constants.FoursquareRedirectURI},
			"code":          {code},
		})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	decoder := json.NewDecoder(resp.Body)
	var result interface{}
	err = decoder.Decode(&result)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result_map := result.(map[string]interface{})
	if err, ok := result_map["error"]; ok {
		fmt.Fprintf(w, "Error from Foursquare: %v", err)
		return
	}

	if access_token, ok := result_map["access_token"]; ok {
		// Save access_token to database, then redirect.
		u := user.Current(c)

		token := types.FoursquareAuthToken{
			OAuthToken: access_token.(string),
		}

		key := datastore.NewKey(c, "types.FoursquareAuthToken", u.ID, 0, nil)
		// TODO: Ensure the key doesn't already exist.
		_, err := datastore.Put(c, key, &token)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Location", "/")
		w.WriteHeader(http.StatusFound)
	} else {
		fmt.Fprintf(w, "Did not get access token in response: %v", result_map)
	}
}
