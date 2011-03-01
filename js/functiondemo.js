// Keeps track of all stops
var allStops;

var apiWebSite = 'http://db.dutrack.com:100';

var mapPaths = {};

// Markers for buses
var markers = {};

var pathNames= {
'c1':'#FF0000', 'c2': '#0000FF'
};

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
			title: 'Live Bus',
			iconCls: 'map',
			getLocation: false,
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

		//create tab that will toggle
		var togglableTab = function(busValue) {
			var tab = new Ext.form.Toggle({
				name: 'enable',
				label: busValue,
				value: '0'
			});
			tab.addListener('change', function() {
				displaying[busValue]=tab.getValue();
				console.log(busValue+" is now "+ tab.getValue());
			});
			return tab;
		}
		//handle updateButton's action
		var buttonHandler = function(button, event) {
			update();
			console.log("just updated");
		}

		//automatically generate all bus tabs
		var generateBusTabs = function(){
			var tabs = new Array();
			for(var busValue in pathNames){
				tabs.push(togglableTab(busValue));
			}
			return tabs
		}
		//create setting's panel
		var busSettings = new Ext.Panel({
			title:'settings',
			iconCls:'settings',
			scroll: 'vertical',
			fullscreen:'true',
			layout: {
				type: 'vbox',
				pack: 'center',
				align: 'stretch'
			},
			defaults: {
				xtype: 'button',
				cls: 'demobtn'
			},
			items: [ generateBusTabs(), new Ext.Button({
				text:'update',
				title:'update',
				handler: buttonHandler
			})]
		});

		// Creates a tab panel with the map and the setting
		var panel = new Ext.TabPanel({
			fullscreen: true,
			cardSwitchAnimation:{
				type: 'slide',
				cover: true
			},
			tabBar: {
				dock: 'bottom',
				layout: {
					pack: 'center'
				}
			},
			items: [map ,busSettings]
		});
		
		
		//setInterval(busesFunc, 5000);

	}
});

//clear all bus markers
var clearMarkers= function() {
	for(var busValue in pathNames) {
		for(var marker in markers[busValue]) {
			marker.setMap(null);
		}
	}
}

//update routes and buses
var update = function() {
	console.log("Start update");
	clearMarkers();

	for(var busValue in displaying) {
		if(displaying[busValue]==1) {
			updateRoutes(busValue,true);
			//updateBuses(busValue);
		} else {
			console.log("removing route "+ busValue);
			if(mapPaths[busValue]) {
				mapPaths[busValue].setOptions({strokeOpacity:0.0});
			}
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
				strokeOpacity: 0.5,
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
		mapPaths[busValue].setMap(map.map);
	}
}

//obtain data given busValue
var updateBuses = function(busValue) {
	console.log("updateBuses "+busValue);
	
	Ext.util.JSONP.request({
		url: apiWebSite+'/routes/'+busValue+'/busLocations',
		callbackKey: 'callback',
		callback: function(data) {

			var busArray = new Array()
			for(var i =0; i<data.length; i++) {
				//incoming data will have bus[0]=id, bus[1] lat, bus[2] long
				var bus = data[i];
				console.log(str(bus[1])+ ' ' + str(bus[2]));
				busArray.push({
					marker: createMarker(busValue),
					location: new google.maps.LatLng(bus[1],bus[2])
				});
			}

			marker[busValue]=busArray;

			drawUpdatedBuses(busValue);
		}
	});
}

//draw all the buses with the given busValue
var drawUpdatedBuses = function(busValue) {
	for(var bus in marker[busValue]) {
		bus.setPosition(bus.position);
	}
}

//return a marker for a bus
var createMakrer= function(busValue) {
	return new google.maps.Marker({ map: map.map, clickable: true, draggable: false});
}
