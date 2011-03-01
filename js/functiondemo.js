// Keeps track of all stops
var allStops;

// Keep track of my current position
var mylocation;
var mylocationmarker;

// Control variable for efficiency on current location calls
var firstTime = 0;

// This is the fence for which markers are shown
var fence = {
	'0': { lat: 42.33197289, lng: -71.06660843 },
	'1': { lat: 42.35595195, lng: -71.12625179 }
};

// Markers for buses
var markers = {};

var curr_bus;

Ext.setup({
    icon: 'icon.png',
    phoneStartupScreen: 'phone_startup.png',
    glossOnIcon: true,
    onReady: function() {
        
//               Create UI Elements
///////////////////////////////////////////////////////////////////////
		
        // Creates the map
        var map = new Ext.Map({
            title: 'Live Bus',
            iconCls: 'map',
            getLocation: true,
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
                center: google.maps.LatLng(36.004118, -78.930931)
            }
        });
        
        // Creates a tamplate for the table to follow every time the method update is called
        var timeline = new Ext.Component({
            title: 'Schedule',
            iconCls: 'schedule',
            scroll: 'vertical',
            tpl: [
            	'<div class="schedulelinks">',
            		'<h2>View Whole Schedule</h2>',
            		'<div class="clear"></div>',
            		'<div id="bttn-wrapper">',
	            		'<a class="sch-bttn" id="week" target="_self" href="http://www.bu.edu/thebus//summer_noflash/files/2009/09/busmthschedule09_10-mob1.jpg">Weekly</a>',
	            		'<a class="sch-bttn" id="frid" target="_self" href="http://www.bu.edu/thebus//summer_noflash/files/2009/09/busfrschedule09_10ai-mob1.jpg">Friday</a>',
	            		'<a class="sch-bttn" id="nigh" target="_self" href="http://www.bu.edu/thebus/files/2010/04/Summer_IN.jpg">Night</a>',
            		'</div>',
            	'</div>',
            	'<div class="clear"></div>',
	            '<div class="stop">',
	                '<tpl for=".">',                    
                            '<div class="stop-content">',
                            	'<tpl if="is_closest==1">',
                                	'<div class="closest_in"><div class="closest_img"></div></div>',
                                '</tpl>',
                                '<tpl if="is_closest==0">',
                                	'<div class="closest_ot"><div class="closest_img"></div></div>',
                                '</tpl>',
                            	'<div class="next-time">',
                            		'<h2>{nextTime}</h2>',
                            		'<p>minutes</p>',
                            	'</div>',
                            	'<div class="other-info">',
	                                '<h2>{stop_name}</h2>',
	                                '<tpl if="direction_id==1">',
	                                	'<p class="inbound">inbound</p>',
	                                '</tpl>',
	                                '<tpl if="direction_id==0">',
	                                	'<p class="outbound">outbound</p>',
	                                '</tpl>',
	                                '<div class="times">',
		                                '<tpl for="vtimes">',
		                                	'<p>{.}</p>',
		                                '</tpl>',
	                                '</div>',
	                            '</div>',
                            '</div>',
						'</tpl>',
					'</div>'
            ]
        });
        
        // Creates a tab panel with the map and the table
        var panel = new Ext.TabPanel({
            fullscreen: true,
            animation: 'slide',
            tabBar: {
                dock: 'bottom',
                layout: {
                    pack: 'center'
                }
            },
            items: [map, timeline]
        });
        
        // Creates the info window
        var infoWindow = new google.maps.InfoWindow({maxWidth: 100});
        		
		var openInfoWindow = function(marker, state)
		{			
			infoWindow.setContent([
				marker.content
			].join(''));
			
			infoWindow.open(map.map, marker);
		}
		
		var closeInfoWindow = function()
		{
			infoWindow.close();
		}
		
		google.maps.event.addListener(map.map, 'click', closeInfoWindow);
        
//               Set Route
///////////////////////////////////////////////////////////////////////
  
		var routeLine = new google.maps.Polyline({
			path: route,
			strokeColor: "#CC0000",
			strokeOpacity: 1.0,
			strokeWeight: 3
		});
		
		routeLine.setMap(map.map);
        
//               Fetch Data
///////////////////////////////////////////////////////////////////////

		var coords = map.geo.coords;
		
		// Get the current schedule. This is done only once
        Ext.util.JSONP.request({
            url: 'http://m.cms-devl.bu.edu/rpc/bus/stops.json.php',
            callbackKey: 'callback',
            params: {
            	// TODO: get the right schedule given the time
                service_id: 'mon_thu'
            },
            callback: function(data) {
            	
            	// Set global var allStops with the JSON data and parse the data. Also add all the markers
            	// for all the bus stops
                allStops = data.ResultSet.Result;
                parseData();

                // Add points to the map
                for (var i = 0, ln = allStops.length; i < ln; i++) {
                    var stop = allStops[i];

                    var position = new google.maps.LatLng(stop.stop_lat, stop.stop_lon);
                    addMarker(stop, position);
                }
            }
        });
		
		// Goes and get the current buses positions
		var busesFunc = function()
		{	
			Ext.util.JSONP.request({
	            url: 'http://m.cms-devl.bu.edu/rpc/bus/livebus.json.php',
	            callbackKey: 'callback',
	            params: {
	            	// Makes sure we get unique data every time
	            	timestamp: (new Date()).getMilliseconds()
	            },
	            callback: function(data) {
	            	
	            	// set local var buses to contain all the buses objects
	                var buses = data.ResultSet.Result;		
					
					// For every bus, check if there is already a marker for it.
					// If no marker, then create a new marker for the bus
					// Update the position of the bus
	                for (var i = 0, ln = buses.length; i < ln; i++) 
	                {
	                    var bus = buses[i];
	
						// Check that the bus is within the bounds
	                   	if( ( 	( bus.lat > fence['0'].lat ) && ( bus.lng < fence['0'].lng ) ) && 
	                   		(	( bus.lat < fence['1'].lat ) && ( bus.lng > fence['1'].lng ) ) 
	                   	  )
						{
							var position = new google.maps.LatLng(bus.lat, bus.lng);
							
					        if(!markers[bus.id])
					        {
						         markers[bus.id] = new google.maps.Marker({
						                map: map.map,
						                clickable: true,
						                draggable: false,
						                icon: "images/bg.png",
						            });
					         }				         
					         markers[bus.id].setPosition(position);
					         
					         // Mark timestamp for later use
					         markers[bus.id].ts = new Date();
					         
					         markers[bus.id].content = 	'<h2>hello</h2>';
	                	}
	                }
	                
	                updateMyLoc();
	            }
	                            
	        });
        }


//               Set Timers
///////////////////////////////////////////////////////////////////////

		setInterval(busesFunc, 5000);
		setInterval(ps, 60000);
		setInterval(delBuses, 300000)
		

//               Delete old buses
///////////////////////////////////////////////////////////////////////

		var delBuses = function(){deleteOldBuses();}
		
		// If a bus has not been updated in 5 minutes, delete it from the map
		function deleteOldBuses()
		{
			var now = new Date();
			for(var ii=0; ii<markers.length; ii++)
			{
				if( (now-markers[ii].ts) > 120000 )
				{
					markers[ii].setMap(null);
					delete markers[ii];
				}
			}
			
			// Update my current location
	        updateMyLoc();
		}


//               My Location Services
///////////////////////////////////////////////////////////////////////

		// Wrapper to make function callable from setInterval
		var upLoc = function(){updateMyLoc()};
		
		// Updates my current location if geolocation is available
        function updateMyLoc()
        {
	    	if(navigator.geolocation)
            {
            	navigator.geolocation.getCurrentPosition(function(position){
            	
            		// fill in mylocation global var with my current location
            		mylocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            		
            		// If I have not created a marker for myself, then create it
            		if(!mylocationmarker)
            		{
                		mylocationmarker = new google.maps.Marker({
                			map: map.map,
                			position: mylocation,
                			icon: "images/me.png"
                		});
            		}
            		
            		//ToDo: make a range here
            		
            		// If my location is not the same as my previous location then update the position of my marker
            		if(mylocation.lat() != mylocationmarker.position.lat() || mylocation.lng() != mylocationmarker.position.lng())
            		{
            			mylocationmarker.setPosition(mylocation);
            			parseData();
            		}
            		
            		
            	});
            }
            else
            {
            	alert("No location available");
            }
            
            // If we already fetched our current location and this is the first time, then go ahead and refresh the table.
            // Only refresh the table the first time this way, since it is a costly operation and this function gets called
            // whenever we move. 
            
            if(firstTime == 0 && mylocation)
            {
				parseData();
				firstTime = 1;
				map.geo.autoUpdate = false;
        	}
        }
        
        
        function getDistanceToMe(lat, lng)
        {	
        	if(mylocation)
        		return Math.sqrt(Math.pow(Math.abs(mylocation.lat()-lat),2)+Math.pow(Math.abs(mylocation.lng()-lng),2));
        }
        
        map.geo.on('update', upLoc);
        
        
        
//               Table View Functions
///////////////////////////////////////////////////////////////////////
        
        // Wrapper to make the function callable from setInterval
        var ps = function(){parseData();}
        
        // Parses data for table view
        function parseData()
		{
			// Time to calculate time offsets later
			var now = new Date();
			
			// Control variables to calculate closest stop inbound and outbount
			var cl_in = -1;
			var cl_ot = -1;
			var dst_in = Number.MAX_VALUE;
			var dst_ot = Number.MAX_VALUE;
			
			// Loop through all stops to set relevant information about them
			for(var ii=0; ii<allStops.length; ii++)
			{
				var stop = allStops[ii];
				
				// Calculate the distance from the stop to my corrent location
				var dst = getDistanceToMe(stop.stop_lat,stop.stop_lon);
				
				// Set the current stop to NOT (-1) be the closest
				stop.is_closest = "-1";
				
				// If the distance is less than 10000 meters then find the closest stop inbound and outboud
				if(stop.direction_id == 1)
				{
					if( dst < dst_in && dst < 10000)
					{
						dst_in = dst;
						cl_in = ii;
					}
				}
				else if(stop.direction_id == 0)
				{
					if( dst < dst_ot && dst < 10000)
					{
						dst_ot = dst;
						cl_ot = ii;
					}
				}
				
				// Control variables for fetching the right amount of times
				var count = 0;
				var count2 = 0;
				
				// vtimes are the times that will be visible in the table
				stop.vtimes = new Array;
				
				// Loop through schedule
				for(var jj=0; jj<stop.times.length; jj++)
				{
					// Get the time and parse it into a javascript Date object
					var time = stop.times[jj];
					
					// If the time exists in the schedule
					if(time)
					{
						var split = time.split(":");
						var split2 = split[1].split(" ");
						
						var hour = parseInt(split[0]);
						
						if(split2[1] == "PM" && hour != 12) hour = hour+12;
						else if (split2[1] == "AM" && hour == 12) hour = 0;
						
						var then = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour.toString(), split2[0]);
						
						// Calculate th difference between the curent indexed time in the schedule and the curent time
						var diff = then.getTime()-now.getTime();
						
						// If the diference is greater than 0 then we have the first time in the schedule that is not in the past
						
						if(diff>0)
						{
						    // If it is the next scheduled time, then set the timeIndex (which is the first index
						    // in the schedule whose time is not in the past. Also set the nextTime for the current stop.
						    // The nextTime is the time in minutes that it will take te next bus to arrive
							if(count2 == 0)
							{
								stop.timeIndex = count;
								stop.nextTime = Math.round(diff/60000);
							}
							
							// Push five items into the visible times array						
							stop.vtimes.push(time);
							
							if(count2 == 4) break;
							count2++;
						}	
						
					}
					// If the time does not exist in the schedule. Say that the nextTime is tomorrow. And fill the rest of the visible times
					// with NA
					else
					{
						if(count2 == 0)
						{
							stop.timeIndex = 0;
							stop.nextTime = "Tm";
						}
						
						stop.vtimes.push("Na");
						
						if(count2 == 4) break;
						count2++;
					}
				}
			}
			
			// If we found a closest stop, then set the is_closest property of the stop to 1 if inbound, and 0 if outbound
			if(cl_in >-1)
				allStops[cl_in].is_closest = "1";
			if(cl_ot >-1)
				allStops[cl_ot].is_closest = "0";
			
			// Update the HTML
			timeline.update(allStops);
		}
        
		
//               Helper Functions
///////////////////////////////////////////////////////////////////////

		// Generic add marker function
        var addMarker = function(stop, position) {
            var marker = new google.maps.Marker({
                map: map.map,
                clickable: true,
                draggable: false,
                icon: "images/bus-stop.png",
                position: position
            });
            
            var dir;
            if(stop.direction_id == 1)
            	dir = "inbound";
            else
            	dir = "outbound";
            
            marker.content = 	'<img src="http://www.bu.edu/today/files/imagecache/bu-article-thumbnail/images/articles/coolidge_t.jpg">' +
            					'<h2 class="stop-title">' + stop.stop_name + '</h2>' + 
            					'<p class="stop-direction-' + dir +'">' + dir + '</p>' +
            					'<p class="stop-time-bubble"><span class="bold">Next Bus: </span><span>' + stop.vtimes[0] + '</span></p>'
            					;
            
            google.maps.event.addListener(marker, 'click', function() {
				openInfoWindow(marker,1);
			});
        };

    }
});

var route = [
	new google.maps.LatLng(42.353640000000006,-71.11811),
	new google.maps.LatLng(42.351350000000004,-71.11858000000001),
	new google.maps.LatLng(42.34882,-71.09781000000001),
	new google.maps.LatLng(42.34882,-71.09240000000001),	
	new google.maps.LatLng(42.346700000000006,-71.09227),	
	new google.maps.LatLng(42.346590000000006,-71.09167000000001),
	new google.maps.LatLng(42.34629,-71.09098),
	new google.maps.LatLng(42.345850000000006,-71.09068),
	new google.maps.LatLng(42.34512,-71.09073000000001),	
	new google.maps.LatLng(42.34445,-71.09086),
	new google.maps.LatLng(42.34404000000001,-71.09043000000001),
	new google.maps.LatLng(42.34382,-71.08957000000001),
	new google.maps.LatLng(42.343250000000005,-71.08592),	
	new google.maps.LatLng(42.340340000000005,-71.08169000000001),
	new google.maps.LatLng(42.339240000000004,-71.08036),
	new google.maps.LatLng(42.333580000000005,-71.07350000000001),
	new google.maps.LatLng(42.335950000000004,-71.07011),
	new google.maps.LatLng(42.338910000000006,-71.0736),	
	new google.maps.LatLng(42.336560000000006,-71.07689),	
	new google.maps.LatLng(42.34056,-71.08163),
	new google.maps.LatLng(42.342740000000006,-71.08485),
	new google.maps.LatLng(42.34335,-71.08575),
	new google.maps.LatLng(42.34591,-71.08704),	
	new google.maps.LatLng(42.350880000000004,-71.0895),
	new google.maps.LatLng(42.34987,-71.09319),
	new google.maps.LatLng(42.348960000000005,-71.09649),
	new google.maps.LatLng(42.34921000000001,-71.09928000000001),
	new google.maps.LatLng(42.35123,-71.11575),
	new google.maps.LatLng(42.352520000000005,-71.11549000000001),
	new google.maps.LatLng(42.353260000000006,-71.11685),
	new google.maps.LatLng(42.35365,-71.11768000000001),	
	new google.maps.LatLng(42.35371000000001,-71.11794),	
	new google.maps.LatLng(42.353640000000006,-71.11811)
];
