var places = {}

places.FOURSQUARE_API_VERSION = "20131201";
places.displayed_venues = {};
places.pending_queries = 0;
places.drag_in_progress = false;

function Venue(foursquare_venue) {
    this.foursquare_venue = foursquare_venue;
}

function InitializeMap() {
    var options = {
        center: new google.maps.LatLng(40.730885,-73.997383),
        zoom: 15
    };
    var map = new google.maps.Map($("#map-canvas").get(0), options);

    google.maps.event.addListener(map, 'dragstart', function() {
        places.drag_in_progress = true;
    });
    google.maps.event.addListener(map, 'dragend', function() {
        places.drag_in_progress = false;
        RenderMap();
    });
    google.maps.event.addListener(map, 'bounds_changed', function() {
        if (places.drag_in_progress) {
            return;
        }
        RenderMap();
    });
    return map;
}

function MakeListItem(venue) {
    var item = $('<li>');
    var title = $('<h1>').html(venue.foursquare_venue.name);
    var address = $('<div>').addClass('address').html(
        venue.foursquare_venue.location.address);

    if (venue.foursquare_venue.location.crossStreet !== undefined) {
        address.append(' (' + venue.foursquare_venue.location.crossStreet + ')');
    }

    var category_name = undefined;
    $.each(venue.foursquare_venue.categories, function (_, v) {
        if (v.primary) {
            category_name = v.name;
            return;
        }
    });

    item.append(title);
    item.append(address);
    if (category_name !== undefined) {
        var category = $('<div>').addClass('category').html(category_name);
        item.append(category);
    }
    item.data('id', venue.foursquare_venue.id);
    return item;
}

function DisplayListItems(map, items) {
    $.each(items, function (i, v) {
        var foursquare_venue = v.venue;
        var venue = new Venue(foursquare_venue);
        places.displayed_venues[venue.foursquare_venue.id] = venue;

        // Add marker.
        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(
                    foursquare_venue.location.lat,
                    foursquare_venue.location.lng),
            map: map,
            title: venue.name
        });
        marker.venue = venue;
        venue.marker = marker;

        // Add element to list.
        var item = MakeListItem(venue);
        $('#venues-list ul').append(item);
        venue.list_item = item;

        google.maps.event.addListener(marker, 'click', function() {
            var item = marker.venue.list_item;

            var current_scroll_location = $('#controls').scrollTop();
            var item_position = item.position().top;
            var new_scroll_position = current_scroll_location + item_position;
            $('#controls').scrollTop(new_scroll_position);

            $('#venues-list li').removeClass('selected');
            $(item).addClass('selected');
        });
    });
}

/**
 * Retrieve list items and then render them on the map.
 *
 * @param {google.maps.Map} map
 * @param {number} list_id The ID of the list to fetch.
 * @param {number} num_list_items The number of items in the list to fetch.
 * Used for query paging.
 * @param {object} options Options for the query.
 * @param {google.maps.LatLng} [options.bounds] Only retrieve list items
 * within these geographical coordinates.
 */
function GetListItems(map, list_id, num_list_items, options) {
    if (options === undefined) {
        options = {};
    }

    var query = {
        oauth_token: places.OAUTH_TOKEN,
        v: places.FOURSQUARE_API_VERSION,
        limit: 100
    };
    if ('bounds' in options) {
        query['llBounds'] = options.bounds.toUrlValue();
    }

    // TODO: Query for the number of list items instead of getting it from the
    // /users/ endpoint which may be stale.
    // TODO: Cache the result of this request so we don't hit Foursquare every
    // time the dropdown changes.
    // TODO: Stop hardcoding the offset of 100.
    // TODO: Don't paginate if there are fewer than 100 items in the results.
    var num_queries = Math.floor(num_list_items / 100);
    places.pending_queries = num_queries;
    for (var i = 0; i < num_queries; i++) {
        var data = jQuery.extend({}, query);
        data['offset'] = i * 100;
        $.ajax({
            url: "https://api.foursquare.com/v2/lists/" + list_id,
            data: data,
            success: function (data, status, xhr) {
                DisplayListItems(map, data.response.list.listItems.items);
                MaybeFinishRendering();
            },
            error: function (xhr, status, error) {
                MaybeFinishRendering();
            },
        });
    }
}

function MaybeFinishRendering() {
    if (places.pending_queries < 0) {
        console.log('pending renders < 0! bailing.');
        return;
    }

    places.pending_queries--;
}

function RenderingAllowed() {
    return places.pending_queries == 0;
}

/**
 * Fetch list items and render them on the map.
 */
function RenderMap() {
    if (!RenderingAllowed()) {
        return;
    }

    // Destroy all info windows and markers.
    $.each(places.displayed_venues, function (_, v) {
        v.marker.setMap(null);
        v.marker = null;
    });
    places.displayed_venues = {};
    $('#venues-list ul').html('');

    // Render new items.
    var selected = $("#lists option:selected");
    if (selected.length != 1) {
        console.log("more than one list selected; bailing", selected);
        // TODO: Do something nicer.
        return;
    }
    var list_id = selected.data("list_id");
    var num_list_items = selected.data("num_list_items");
    var options = {
        bounds: places.map.getBounds()
    };
    GetListItems(places.map, list_id, num_list_items, options);
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
            RenderMap();
        },
    });

    $("#lists").change(function() {
        RenderMap();
    });
});
