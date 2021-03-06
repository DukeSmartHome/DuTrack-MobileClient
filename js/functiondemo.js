// Keeps track of all stops
var allStops;

var API_URL = 'http://api.dutrack.com';

// how quickly the client should ask the server for updates
var UPDATE_INTERVAL = 1500;
var mapPaths = {};

var UPDATE_INTERVAL_ID = null;
// Markers for buses

var pathNames= {
	'C1': '#111a24',
	'C2': '#111a24',
	'C5': '#111a24',
	'H1': '#111a24',
	'H2': '#111a24',
	'H3': '#111a24',
};

var currentBusValue='C1';
var activeRoute;
var activeBus;
var busMarkers = {};
var busLocations={};

var displaying={};

var curr_bus;

var map;

Ext.setup({
	//icon: 'icon.png',
	//phoneStartupScreen: 'phone_startup.png',
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
			if (UPDATE_INTERVAL_ID == null) {
				UPDATE_INTERVAL_ID = setInterval(update, UPDATE_INTERVAL);
			}
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
			return tabs;
		}
		var updateBus= function(busValue) {
			updateRoutes(busValue);
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
				dock:'top',
				layout:{pack:'center'}
			}],
			items:[map]
		});

		var update = function() {
			updateBus(currentBusValue);
			console.log("just automatically updated")
		};
	}
});

//get routes
var getWayPoint = function(busValue) {
	var waypoint;
	Ext.util.JSONP.request({
		url: API_URL+'/routes/'+busValue,
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

			displayRoute(busValue);
		}
	});
}
//update routes accordingly
var updateRoutes = function(busValue) {

	if(!mapPaths[busValue]) {
		console.log("need to retrieve waypoint for "+ busValue);
		getWayPoint(busValue);
	} else {
		displayRoute(busValue);
	}
}
//display route of given busValue
var displayRoute= function(busValue) {
	if(!activeRoute) {
		mapPaths[busValue].setOptions({strokeOpacity:1.0});
	} else if(activeRoute!=busValue) {
		mapPaths[activeRoute].setOptions({strokeOpacity:0.0});
		mapPaths[busValue].setOptions({strokeOpacity:1.0});
	}
	activeRoute=busValue;
}
//obtain data given busValue
var updateBuses = function(busValue) {
	console.log("updateBuses "+busValue);

	Ext.util.JSONP.request({
		url: API_URL+'/routes/'+busValue+'/buses',
		callbackKey: 'callback',
		params: {
			uniquify: (Math.random() + '').substr(2)
		},
		callback: function(data) {

			var busRoutes={};
			for(var busName in data) {
				//incoming data will have bus[0]=id, bus[1]=lat, bus[2]=long
				var bus = data[busName];
				console.log("loading bus"+busName);
				console.log(String(bus[0])+ ' ' + String(bus[1]));
				busRoutes[busName]= new google.maps.LatLng(bus[0],bus[1]);
			}

			busLocations[busValue]=busRoutes;

			drawUpdatedMarkers(busValue);
		}
	});
}
//draw all the buses with the given busValue
var drawUpdatedMarkers = function(busValue) {

	var newLocations = busLocations[busValue];

	if(!busMarkers[busValue]) {
		busMarkers[busValue]=initializeMarkers(newLocations);
	}

	if(busMarkers[busValue]=='invalid') {
		hideMarkers(activeBus);
	} else {
		updateBusLocations(busValue);
		displayMarkers(busValue);
	}
	activeBus = currentBusValue;

}
//update the bus locations of the bus with the given busValue
var updateBusLocations = function(busValue) {
	var markers = busMarkers[busValue];
	var newLocations = busLocations[busValue];
	for(bus in markers) {
		markers[bus].setPosition(newLocations[bus]);
	}
}
//initialize markers if no markers have been created yet
var initializeMarkers = function(locations) {
	var markers={};
	for(busName in locations) {
		markers[busName]=createMarker(locations[busName]);
	}
	return markers;
}
//return a marker for a bus
var createMarker= function(location) {
	return new google.maps.Marker({
		map: map.map,
		clickable: true,
		draggable: false,
		icon: "bus.png",
		position: location
	});
}

//display markers of given busValue if not currently active and hide
//previously active markers.
var displayMarkers = function (busValue) {
	if(activeBus!=currentBusValue) {
		hideMarkers(activeBus);
	}
	var markers = busMarkers[currentBusValue];
	for(busName in markers) {
		markers[busName].setVisible(true);
	}
}

//hide all markers given busValue
var hideMarkers = function(busValue) {
	var markers = busMarkers[busValue];
	for(busName in markers) {
		markers[busName].setVisible(false);
	}
}
