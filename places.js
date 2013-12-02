var places = {
    OAUTH_TOKEN: "4J3MWVUK1POMGLPE2CUMSXRJNFFKMI03K1VUEGAWXO4AYIBO",
    FOURSQUARE_API_VERSION: "20131201",
};

function InitializeMap() {
    var options = {
        center: new google.maps.LatLng(40.730885,-73.997383),
        zoom: 15
    };
    var map = new google.maps.Map($("#map-canvas").get(0), options);
    return map;
}

function RenderListItems(map, items) {
    var num_todo_items = 0;
    var list_id;
    $.each(items, function (i, v) {
        if (v.name == "My to-do list") {
            console.log(v);
            num_list_items = v.listItems.count;
            list_id = v.id;
        }
    });
    console.log(num_list_items, list_id);

    var list_items = [];
    if (num_list_items > 0) {
        // Fetch items.
        for (var i = 0; i < num_list_items / 100; i++) {
            console.log('fetching');
            $.ajax({
                url: "https://api.foursquare.com/v2/lists/" + list_id,
                data: {
                    oauth_token: places.OAUTH_TOKEN,
                    v: places.FOURSQUARE_API_VERSION,
                    offset: i * 100
                },
                success: function (data, status, xhr) {
                    console.log(data);
                    $.each(data.response.list.listItems.items, function (i, v) {
                        console.log(v.venue.name);
                    });
                },
            });
        }
    }
};

$(function() {
    // Create map.
    var map = InitializeMap();

    // Get Foursquare todo list metadata.
    $.ajax({
        url: "https://api.foursquare.com/v2/users/self/lists",
        data: {
            oauth_token: places.OAUTH_TOKEN,
            v: places.FOURSQUARE_API_VERSION,
            group: "created"
        },
        success: function (data, status, xhr) {
            RenderListItems(map, data.response.lists.items);
        },
    });
});
