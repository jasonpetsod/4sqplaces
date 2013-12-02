var places = {
    OAUTH_TOKEN: "4J3MWVUK1POMGLPE2CUMSXRJNFFKMI03K1VUEGAWXO4AYIBO",
    FOURSQUARE_API_VERSION: "20131201",

    all_info_windows: [],
};

function InitializeMap() {
    var options = {
        center: new google.maps.LatLng(40.730885,-73.997383),
        zoom: 15
    };
    var map = new google.maps.Map($("#map-canvas").get(0), options);
    return map;
}

function DisplayListItems(map, items) {
    $.each(items, function (i, v) {
        console.log(i);
        var venue = v.venue;
        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(
                    venue.location.lat, venue.location.lng),
            map: map,
            title: venue.name
        });
        var info_window = new google.maps.InfoWindow({
            content: "<b><a href=\"https://foursquare.com/v/" + venue.id + "\">"
                + venue.name + "</a></b><br />" + venue.location.address,
        });
        places.all_info_windows.push(info_window);
        google.maps.event.addListener(marker, 'click', function() {
            $.each(places.all_info_windows, function (i, v) {
                v.close();
            });
            info_window.open(map, marker);
        });
    });
}

function GetListItems(map, list_id, num_list_items) {
    for (var i = 0; i < num_list_items / 100; i++) {
        console.log('fetching');
        $.ajax({
            url: "https://api.foursquare.com/v2/lists/" + list_id,
            data: {
                oauth_token: places.OAUTH_TOKEN,
                v: places.FOURSQUARE_API_VERSION,
                limit: 100,
                offset: i * 100
            },
            success: function (data, status, xhr) {
                DisplayListItems(map, data.response.list.listItems.items);
            },
        });
    }
}

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
            var list_id;
            $.each(data.response.lists.items, function (i, v) {
                if (v.name == "My to-do list") {
                    GetListItems(map, v.id, v.listItems.count);
                }
            });
        },
    });
});
