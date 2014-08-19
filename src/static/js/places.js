var places = {}

places.FOURSQUARE_API_VERSION = "20131201";
places.displayed_venues = {};
places.pending_queries = 0;
places.drag_in_progress = false;

function InitializeMap() {
    var options = {
        center: new google.maps.LatLng(40.730885,-73.997383),
        zoom: 15,
        mapTypeControl: false,
        panControl: false
    };
    var map = new google.maps.Map(document.getElementById('map-canvas'), options);

    google.maps.event.addListener(map, 'dragstart', function() {
        places.drag_in_progress = true;
    });
    google.maps.event.addListener(map, 'dragend', function() {
        places.drag_in_progress = false;
        //RenderMap();
    });
    google.maps.event.addListener(map, 'bounds_changed', function() {
        if (places.drag_in_progress) {
            return;
        }
        //RenderMap();
    });
    return map;
}

function DisplayListItems(map, items) {
    $.each(items, function (i, v) {
        var foursquare_venue = v.venue;

        if ('closed' in foursquare_venue) {
            if (foursquare_venue.closed) {
                return;
            }
        }

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

            var current_scroll_location = $('#venues-list').scrollTop();
            var item_position = item.position().top;
            var new_scroll_position = current_scroll_location + item_position;
            $('#venues-list').scrollTop(new_scroll_position);

            $('#venues-list li').removeClass('selected');
            $(item).addClass('selected');
            console.log(venue.foursquare_venue);
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
        limit: 100,
        sort: 'nearby'
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
    var num_queries = Math.ceil(num_list_items / 100);
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
        console.log('rendering not allowed');
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

var places_app = angular.module(
        'places_app',
        [],
        function ($interpolateProvider) {
            $interpolateProvider.startSymbol('[[');
            $interpolateProvider.endSymbol(']]');
        }
);

places_app.controller('PlacesController', function ($scope, $http) {
    $http({
        method: 'GET',
        url: 'https://api.foursquare.com/v2/users/self/lists',
        params: {
            oauth_token: places.OAUTH_TOKEN,
            v: places.FOURSQUARE_API_VERSION,
            group: 'created'
        }
    }).
    success(function (data) {
        $scope.lists = data.response.lists.items;
        $scope.active_list = $scope.lists[0];
        // TODO: Render map.
    }).
    error(function (data) {
        console.log('error', data);
    });

    $scope.updateMap = function () {
        $http({
            method: 'GET',
            url: 'https://api.foursquare.com/v2/lists/' + $scope.active_list.id,
            params: {
                oauth_token: places.OAUTH_TOKEN,
                v: places.FOURSQUARE_API_VERSION,
                limit: 100,
                sort: 'nearby'
                // TODO: Add bounds.
            }
        }).
        success(function (data) {
            $scope.venues = [];
            angular.forEach(data.response.list.listItems.items, function (v, k) {
                var venue = v.venue;
                angular.forEach(venue.categories, function (c, _) {
                    if (c.primary === true) {
                        venue._places_primary_category = c;
                    }
                });
                $scope.venues.push(venue);
            });
            console.log($scope.venues);
        }).
        error(function (data) {
            console.log('error', error);
        });
    };
});

function loadMapScript() {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?' +
        'key=AIzaSyBkaFywaF2xqKiowMc-5DWVOdEFJzREygU&sensor=false&' +
        'callback=InitializeMap';
    document.body.appendChild(script);
}

window.onload = loadMapScript;
