var places = {}

places.FOURSQUARE_API_VERSION = "20131201";
places.all_info_windows = [];
places.markers = [];

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
        var venue = v.venue;
        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(
                    venue.location.lat, venue.location.lng),
            map: map,
            title: venue.name
        });
        places.markers.push(marker);
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
    // TODO: Query for the number of list items instead of getting it from the
    // /users/ endpoint which may be stale.
    // TODO: Cache the result of this request so we don't hit Foursquare every
    // time the dropdown changes.
    for (var i = 0; i < num_list_items / 100; i++) {
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
    places.map = InitializeMap();

    // Get Foursquare todo list metadata.
    // TODO: Handle 401 Unauthorized.
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
                var option = $("<option>");
                option.html(v.name);
                option.data("list_id", v.id);
                option.data("num_list_items", v.listItems.count);
                $("#lists").append(option);
            });
            $("#lists").change();
        },
    });

    $("#lists").change(function() {
        // Close and destroy any info windows.
        $.each(places.all_info_windows, function (_, v) {
            v.close();
        });
        places.all_info_windows.length = 0;

        // Clear all existing map items.
        $.each(places.markers, function (_, v) {
            v.setMap(null);
        });
        places.markers.length = 0;

        // Render new items.
        var selected = $("#lists option:selected");
        if (selected.length != 1) {
            console.log("more than one list selected; bailing", selected);
            // TODO: Do something nicer.
            return;
        }
        var list_id = selected.data("list_id");
        var num_list_items = selected.data("num_list_items");
        GetListItems(places.map, list_id, num_list_items);
    });
});
