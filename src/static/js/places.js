var places = {}

places.FOURSQUARE_API_VERSION = "20131201";
places.LIST_PAGINATION_LIMIT = 100;
places.LISTS_API_URI = 'https://api.foursquare.com/v2/users/self/lists';
places.VENUES_API_URI = 'https://api.foursquare.com/v2/lists/';

var places_app = angular.module(
    'places_app',
    ['google-maps'],
    function ($interpolateProvider) {
        $interpolateProvider.startSymbol('[[');
        $interpolateProvider.endSymbol(']]');
    }
);

places_app.factory('listsService', function ($http) {
    var config = {
        params: {
            oauth_token: places.OAUTH_TOKEN,
            v: places.FOURSQUARE_API_VERSION,
            group: 'created'
        }
    };

    var success = function (data) {
        return data.data.response.lists.items;
    };

    var error = function (data) {
        return data;
    }

    return {
        getLists: function() {
            return $http.get(places.LISTS_API_URI, config).then(success, error);
        }
    };
});

places_app.factory('venuesService', function ($http) {
    return {
        getVenues: function (list_id, offset) {
            var success = function (data) {
                var venues = [];
                var items = data.data.response.list.listItems.items;
                angular.forEach(items, function (v, k) {
                    var venue = v.venue;
                    // TODO: Make a Venue class.
                    angular.forEach(venue.categories, function (c, _) {
                        if (c.primary === true) {
                            venue._places_primary_category = c;
                        }
                    });
                    venue.location.latitude = venue.location.lat;
                    venue.location.longitude = venue.location.lng;
                    venue.location.latlng = new google.maps.LatLng(
                        venue.location.lat, venue.location.lng);
                    venues.push(venue);
                });
                return venues;
            };
            var error = function (data) {
                return data;
            };

            var config = {
                params: {
                    oauth_token: places.OAUTH_TOKEN,
                    v: places.FOURSQUARE_API_VERSION,
                    limit: places.LIST_PAGINATION_LIMIT,
                    offset: offset,
                }
            };
            var url = places.VENUES_API_URI + list_id;
            return $http.get(url, config).then(success, error);
        }
    };
});

places_app.controller('PlacesController', function ($scope, $location, $anchorScroll, listsService, venuesService) {
    listsService.getLists().then(
        function (data) {
            $scope.lists = data;
            $scope.active_list = $scope.lists[0];
            $scope.updateMap();
        },
        function (data) {
            console.log('error', data);
        });

    $scope.map = {
        center: {
            latitude: 40.730885,
            longitude: -73.997383
        },
        zoom: 15,
        controller: {}
    }

    $scope.updateMap = function () {
        $scope.venues = [];

        for (var offset = 0;
             offset < $scope.active_list.listItems.count;
             offset += places.LIST_PAGINATION_LIMIT) {
            venuesService.getVenues($scope.active_list.id, offset).then(
                function (venues) {
                    Array.prototype.push.apply($scope.venues, venues);
                },
                function (data) {
                    console.log('error', data);
                });
        }
    };

    $scope.visibleVenues = function (venue) {
        var bounds = $scope.map.controller.getGMap().getBounds();
        return bounds.contains(venue.location.latlng);
    };

    $scope.distanceToCenter = function (venue) {
        var center = $scope.map.controller.getGMap().getBounds().getCenter();
        return google.maps.geometry.spherical.computeDistanceBetween(
                center, venue.location.latlng);
    };

    $scope.selected_venue = null;

    $scope.selectMarker = function (venue) {
        $scope.selected_venue = venue;
        $location.hash(venue.id);
        $scope.$apply();
        $anchorScroll();
    };

    $scope.selectVenue = function (venue) {
        $scope.selected_venue = venue;
    };
});
