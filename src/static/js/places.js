var places = {}

places.FOURSQUARE_API_VERSION = "20131201";

var places_app = angular.module(
        'places_app',
        ['google-maps'],
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

    $scope.map = {
        center: {
            latitude: 40.730885,
            longitude: -73.997383
        },
        zoom: 15
    }

    $scope.updateMap = function () {
        // TODO: Implement pagination.
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
                venue.location.latitude = venue.location.lat;
                venue.location.longitude = venue.location.lng;
                $scope.venues.push(venue);
            });
            console.log($scope.venues);
        }).
        error(function (data) {
            console.log('error', error);
        });
    };
});
