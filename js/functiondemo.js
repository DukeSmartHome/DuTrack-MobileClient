// Keeps track of all stops
var allStops;

var apiWebSite = 'http://db.dutrack.com:100';

var mapPaths = {};

// Markers for buses
var markers = {};

var pathNames= {
	'c1':'#FF0000', 'c2': '#0000FF'
};

var currentBusValue='c1';

var displaying={};

var curr_bus;

var map;

Ext.setup({
	icon: 'icon.png',
	phoneStartupScreen: 'phone_startup.png',
	glossOnIcon: true,
	onReady: function() {
		// Creates the map centered on duke compus
		map = new Ext.Map({
			title: 'DuTrack',
			iconCls: 'map',
			getLocation: false,
			layout:'fit',
			ui:'dark',
			mapOptions: {
				zoom: 14,
				streetViewControl: false,
				//disableDefaultUI: true,
				mapTypeControl: false,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				navigationControl: true,
				navigationControlOptions: {
					style: google.maps.NavigationControlStyle.ANDROID,
					position: google.maps.ControlPosition.TOP_RIGHT
				},
				scaleControl: false,
				scrollwheel: true,
				//////////////
				//insert duke location
				////////////
				center: new google.maps.LatLng(36.004118,-78.930931)

			}
		});

		var tapHandler = function(button, event) {
			var busValue = button.text;
			currentBusValue=busValue;
			updateBus(busValue);
		};
		//automatically generate all bus tabs
		var generateBusTabs = function() {
			var tabs = new Array();
			for(var busValue in pathNames) {
				tabs.push( new Ext.Button({
					text: busValue,
					handler: tapHandler
				}));
			}
			return tabs
		}
		var updateBus= function(busValue) {
			clearMarkers();
			clearRoutes();

			updateRoutes(busValue, true);
			updateBuses(busValue);
		}
		var dockedItems = [{
			xtype:'segmentedbutton',
			items: [generateBusTabs()],
			layout: {
				pack: 'center'
			},
			dock: 'bottom'
		}];

		var mainPanel = new Ext.Panel({
			fullscreen: true,
			dockedItems:[{
				xtype:'toolbar',
				items: dockedItems,
				dock:'bottom',
				layout:{pack:'center'}
			}],
			items:[map]
		});
		updateBus('c1');
		
		var update = function(){updateBus(currentBusValue); console.log("just automatically updated")};
		setInterval(update, 3000);
	}
});

//clear all bus markers
var clearMarkers= function() {
	for(var busValue in pathNames) {
		var busesData = markers[busValue]
		if(busesData) {
			for(var i = 0; i<busesData.length; i++) {
				busesData[i][0].setMap(null);
			}
		}
	}
}
var clearRoutes = function() {
	for(var busValue in pathNames) {
		var busesData = mapPaths[busValue];
		if(busesData!=null) {
			busesData.setOptions({strokeOpacity:0.0});
		}
	}
}
//get routes
var getWayPoint = function(busValue) {
	var waypoint;
	Ext.util.JSONP.request({
		url: apiWebSite+'/routes/'+busValue,
		callbackKey: 'callback',
		callback: function(data) {

			var routeArray = new Array();
			for (var i = 0; i < data.coords.length; i++) {
				if(data.coords[i][2]!=1) {
					var location =data.coords[i];
					console.log(String(location[0])+" "+String(location[1]));
					routeArray.push(new google.maps.LatLng(location[0],location[1]));
				}
			}

			mapPaths[busValue] = new google.maps.Polyline({
				path: routeArray,
				strokeColor: pathNames[busValue],
				strokeOpacity: 1.5,
				strokeWeight: 3
			})

			mapPaths[busValue].setMap(map.map);
		}
	});
}
//update routes
var updateRoutes = function(busValue) {
	if(!mapPaths[busValue]) {
		console.log("need to retrieve waypoint for "+ busValue);
		getWayPoint(busValue);

	} else {
		mapPaths[busValue].setOptions({strokeOpacity:1.0});
	}
}
//return a marker for a bus
var createMarker= function(busValue) {
	return new google.maps.Marker({ map: map.map, clickable: true, draggable: false,icon: "bg.png"});
}
//obtain data given busValue
var updateBuses = function(busValue) {
	console.log("updateBuses "+busValue);

	Ext.util.JSONP.request({
		url: apiWebSite+'/routes/'+busValue+'/buses',
		callbackKey: 'callback',
		callback: function(data) {

			var busArray = new Array()
			for(var busName in data) {
				//incoming data will have bus[0]=id, bus[1] lat, bus[2] long
				var bus = data[busName];
				console.log("loading bus"+busName);
				console.log(String(bus[0])+ ' ' + String(bus[1]));
				busArray.push([
				createMarker(busValue), new google.maps.LatLng(bus[0],bus[1])
				]);
			}

			markers[busValue]=busArray;

			drawUpdatedBuses(busValue);
		}
	});
}
//draw all the buses with the given busValue
var drawUpdatedBuses = function(busValue) {
	var list = markers[busValue];
	for(var i = 0; i< list.length; i++) {
		var marker =(list[i][0]).setPosition(list[i][1]);
	}
}

