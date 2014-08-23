var places = {}

places.FOURSQUARE_API_VERSION = "20131201";
places.LIST_PAGINATION_LIMIT = 100;
places.CATEGORIES_API_URI = 'https://api.foursquare.com/v2/venues/categories';
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

                    if ('closed' in venue) {
                        if (venue.closed) {
                            return;
                        }
                    }

                    // Determine the primary category.
                    angular.forEach(venue.categories, function (c, _) {
                        if (c.primary === true) {
                            venue._places_primary_category = c;
                        }
                    });

                    // 'longitude' and 'latitude' attrs are used by
                    // angular-google-maps.
                    venue.location.latitude = venue.location.lat;
                    venue.location.longitude = venue.location.lng;

                    // 'latlng' is used by $scope.distanceToCenter
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

places_app.factory('categoriesService', function ($http) {
    // TODO: OMG THIS NEEDS TESTS
    /**
     * Generate a map of category ID to all of the category's children's IDs.
     *
     * @param {Object} category Foursquare API Category object.
     * @param {Object} ids Object to populate with category IDs. Mapping of
     * string category ID to array of string category IDs of the key's
     * children. This function will add the child IDs of 'category' to 'ids'.
     */
    var generateCategoryChildren = function (category, ids) {
        ids[category.id] = [];
        angular.forEach(category.categories, function (c, _) {
            // Add the IDs of the immediate children.
            ids[category.id].push(c.id);

            // Have each child add their children's IDs.
            generateCategoryChildren(c, ids);

            // Add each child's children's IDs to us.
            Array.prototype.push.apply(ids[category.id], ids[c.id]);
        });
    };

    return {
        getCategories: function () {
            var config = {
                params: {
                    oauth_token: places.OAUTH_TOKEN,
                    v: places.FOURSQUARE_API_VERSION,
                }
            };
            var success = function (data) {
                var categories = data.data.response.categories;
                var children_of_category = {};
                var categories_by_id = {};
                var categories_by_name = {};
                angular.forEach(categories, function (category, _) {
                    generateCategoryChildren(category, children_of_category);
                    categories_by_id[category.id] = category;
                    categories_by_name[category.name] = category;
                })
                return {
                    categories_by_id: categories_by_id,
                    categories_by_name: categories_by_name,
                    children_of_category: children_of_category
                };
            };
            var error = function (data) {
                return data;
            };
            return $http.get(places.CATEGORIES_API_URI, config).then(
                success, error);
        }
    };
});

places_app.controller(
        'PlacesController',
        function ($scope, $location, $anchorScroll, listsService,
                  venuesService, categoriesService) {

    // =======================================================================
    // Object attributes
    // =======================================================================

    // Object mapping string category ID to category Object.
    this._categories_by_id = null;

    // Object mapping string category name to category Object.
    this._categories_by_name = null;

    // Object mapping category ID to array of category IDs of all of the key's
    // descendants.
    this._children_of_category = null;

    // =======================================================================
    // Initialization
    // =======================================================================

    listsService.getLists().then(
        function (data) {
            $scope.lists = data;
            $scope.active_list = $scope.lists[0];
            $scope.updateMap();
        },
        function (data) {
            console.log('error', data);
        });

    categoriesService.getCategories().then(
        function (data) {
            this._categories_by_id = data.categories_by_id;
            this._categories_by_name = data.categories_by_name;
            this._children_of_category = data.children_of_category;
        },
        function (data) {
            console.log('error', data);
        });

    // =======================================================================
    // Scope
    // =======================================================================

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

    $scope.category_filter = ''
    $scope.categoryFilter = function(venue) {
        if ($scope.category_filter == '') {
            return true;
        }
        var categories = $scope.category_filter.split(',');
        for (var i = 0; i < categories.length; i++) {
            var re = new RegExp(categories[i], 'i');
            if (venue._places_primary_category.name.match(re)) {
                return true;
            }
        };
        return false;
    };
});
