$(function(){
  // google map initialize
	var options = {
		center: new google.maps.LatLng(25.008, 121.519),
		zoom: 12,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	var mapContainer = $("#map");
	var map = new google.maps.Map(mapContainer[0], options);
		mapContainer.css({position: 'absolute', bottom: '40px'})
});
