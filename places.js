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
            num_list_items = v.listItems.count;
            list_id = v.id;
        }
    });

    var all_info_windows = [];
    if (num_list_items > 0) {
        // Fetch items.
        for (var i = 0; i < num_list_items / 100; i++) {
            $.ajax({
                url: "https://api.foursquare.com/v2/lists/" + list_id,
                data: {
                    oauth_token: places.OAUTH_TOKEN,
                    v: places.FOURSQUARE_API_VERSION,
                    offset: i * 100
                },
                success: function (data, status, xhr) {
                    $.each(data.response.list.listItems.items, function (i, v) {
                        var venue = v.venue;
                        var marker = new google.maps.Marker({
                            position: new google.maps.LatLng(
                                    venue.location.lat, venue.location.lng),
                            map: map,
                            title: venue.name
                        });
                        var info_window = new google.maps.InfoWindow({
                            content: "<b>" + venue.name + "</b><br />" + venue.location.address,
                        });
                        all_info_windows.push(info_window);
                        google.maps.event.addListener(marker, 'click', function() {
                            $.each(all_info_windows, function (i, v) {
                                v.close();
                            });
                            info_window.open(map, marker);
                        });
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
