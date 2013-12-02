function initialize() {
    var options = {
        center: new google.maps.LatLng(40.730885,-73.997383),
        zoom: 15
    };
    var map = new google.maps.Map(document.getElementById("map-canvas"),
                                  options);
}

google.maps.event.addDomListener(window, 'load', initialize);
