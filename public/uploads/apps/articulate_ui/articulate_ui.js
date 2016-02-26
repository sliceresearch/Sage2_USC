//
// SAGE2 application: articulate_ui
// by: Jillian Aurisano <jillian.aurisano@gmail.com>
//
// Copyright (c) 2015
//

var articulate_ui = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("canvas", data);
		// Set the background to black
		this.element.style.backgroundColor = 'white';

		// move and resize callbacks
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;

		this.ctx = this.element.getContext('2d');

		this.counter = 0;


		this.specificationObjects = [
				{"plot-type":{"valueType":"STRING","string":"BAR","chars":"BAR"},"x-axis":{"valueType":"STRING","string":"dayofweek","chars":"dayofweek"},"y-axis":{"valueType":"STRING","string":"TOTAL_CRIME","chars":"TOTAL_CRIME"},"data-query":{"valueType":"STRING","string":"SELECT count(*) as TOTAL_CRIME,`dayofweek` FROM chicagocrime WHERE `neighborhood`='loop' AND `timeofdayrange`='6pm-midnight' GROUP BY dayofweek","chars":"SELECT count(*) as TOTAL_CRIME,`dayofweek` FROM chicagocrime WHERE `neighborhood`='loop' AND `timeofdayrange`='6pm-midnight' GROUP BY dayofweek"},"data-query-result":[{"valueType":"STRING","string":"(total_crime,1255);(dayofweek,friday)","chars":"(total_crime,1255);(dayofweek,friday)"},{"valueType":"STRING","string":"(total_crime,913);(dayofweek,monday)","chars":"(total_crime,913);(dayofweek,monday)"},{"valueType":"STRING","string":"(total_crime,1117);(dayofweek,saturday)","chars":"(total_crime,1117);(dayofweek,saturday)"},{"valueType":"STRING","string":"(total_crime,699);(dayofweek,sunday)","chars":"(total_crime,699);(dayofweek,sunday)"},{"valueType":"STRING","string":"(total_crime,1018);(dayofweek,thursday)","chars":"(total_crime,1018);(dayofweek,thursday)"},{"valueType":"STRING","string":"(total_crime,935);(dayofweek,tuesday)","chars":"(total_crime,935);(dayofweek,tuesday)"},{"valueType":"STRING","string":"(total_crime,944);(dayofweek,wednesday)","chars":"(total_crime,944);(dayofweek,wednesday)"}] },
				{"plot-type":{"valueType":"STRING","string":"BAR","chars":"BAR"},"x-axis":{"valueType":"STRING","string":"crimetype","chars":"crimetype"},"y-axis":{"valueType":"STRING","string":"TOTAL_CRIME","chars":"TOTAL_CRIME"},"data-query":{"valueType":"STRING","string":"SELECT count(*) as TOTAL_CRIME,`crimetype` FROM chicagocrime WHERE `dayofweek`='saturday' GROUP BY crimetype","chars":"SELECT count(*) as TOTAL_CRIME,`crimetype` FROM chicagocrime WHERE `dayofweek`='saturday' GROUP BY crimetype"},"data-query-result":[{"valueType":"STRING","string":"(total_crime,5);(crimetype,arson)","chars":"(total_crime,5);(crimetype,arson)"},{"valueType":"STRING","string":"(total_crime,581);(crimetype,assault)","chars":"(total_crime,581);(crimetype,assault)"},{"valueType":"STRING","string":"(total_crime,1781);(crimetype,battery)","chars":"(total_crime,1781);(crimetype,battery)"},{"valueType":"STRING","string":"(total_crime,604);(crimetype,burglary)","chars":"(total_crime,604);(crimetype,burglary)"},{"valueType":"STRING","string":"(total_crime,29);(crimetype,crim-sexual-assault)","chars":"(total_crime,29);(crimetype,crim-sexual-assault)"},{"valueType":"STRING","string":"(total_crime,1410);(crimetype,criminal-damage)","chars":"(total_crime,1410);(crimetype,criminal-damage)"},{"valueType":"STRING","string":"(total_crime,664);(crimetype,criminal-trespass)","chars":"(total_crime,664);(crimetype,criminal-trespass)"},{"valueType":"STRING","string":"(total_crime,1256);(crimetype,deceptive-practice)","chars":"(total_crime,1256);(crimetype,deceptive-practice)"},{"valueType":"STRING","string":"(total_crime,12);(crimetype,gambling)","chars":"(total_crime,12);(crimetype,gambling)"},{"valueType":"STRING","string":"(total_crime,5);(crimetype,homicide)","chars":"(total_crime,5);(crimetype,homicide)"},{"valueType":"STRING","string":"(total_crime,26);(crimetype,interference-with-public-officer)","chars":"(total_crime,26);(crimetype,interference-with-public-officer)"},{"valueType":"STRING","string":"(total_crime,4);(crimetype,intimidation)","chars":"(total_crime,4);(crimetype,intimidation)"},{"valueType":"STRING","string":"(total_crime,2);(crimetype,kidnapping)","chars":"(total_crime,2);(crimetype,kidnapping)"},{"valueType":"STRING","string":"(total_crime,56);(crimetype,liquor-law-violation)","chars":"(total_crime,56);(crimetype,liquor-law-violation)"},{"valueType":"STRING","string":"(total_crime,576);(crimetype,motor-vehicle-theft)","chars":"(total_crime,576);(crimetype,motor-vehicle-theft)"},{"valueType":"STRING","string":"(total_crime,690);(crimetype,narcotics)","chars":"(total_crime,690);(crimetype,narcotics)"},{"valueType":"STRING","string":"(total_crime,1);(crimetype,non-criminal)","chars":"(total_crime,1);(crimetype,non-criminal)"},{"valueType":"STRING","string":"(total_crime,1);(crimetype,obscenity)","chars":"(total_crime,1);(crimetype,obscenity)"},{"valueType":"STRING","string":"(total_crime,55);(crimetype,offense-involving-children)","chars":"(total_crime,55);(crimetype,offense-involving-children)"},{"valueType":"STRING","string":"(total_crime,450);(crimetype,other-offense)","chars":"(total_crime,450);(crimetype,other-offense)"},{"valueType":"STRING","string":"(total_crime,41);(crimetype,prostitution)","chars":"(total_crime,41);(crimetype,prostitution)"},{"valueType":"STRING","string":"(total_crime,1);(crimetype,public-indecency)","chars":"(total_crime,1);(crimetype,public-indecency)"},{"valueType":"STRING","string":"(total_crime,190);(crimetype,public-peace-violation)","chars":"(total_crime,190);(crimetype,public-peace-violation)"},{"valueType":"STRING","string":"(total_crime,458);(crimetype,robbery)","chars":"(total_crime,458);(crimetype,robbery)"},{"valueType":"STRING","string":"(total_crime,37);(crimetype,sex-offense)","chars":"(total_crime,37);(crimetype,sex-offense)"},{"valueType":"STRING","string":"(total_crime,6);(crimetype,stalking)","chars":"(total_crime,6);(crimetype,stalking)"},{"valueType":"STRING","string":"(total_crime,8325);(crimetype,theft)","chars":"(total_crime,8325);(crimetype,theft)"},{"valueType":"STRING","string":"(total_crime,44);(crimetype,weapons-violation)","chars":"(total_crime,44);(crimetype,weapons-violation)"}] },
				{"plot-type":{"valueType":"STRING","string":"BAR","chars":"BAR"},"x-axis":{"valueType":"STRING","string":"locationtype","chars":"locationtype"},"y-axis":{"valueType":"STRING","string":"TOTAL_CRIME","chars":"TOTAL_CRIME"},"data-query":{"valueType":"STRING","string":"SELECT count(*) as TOTAL_CRIME,`locationtype` FROM chicagocrime WHERE `year`='2013' AND `neighborhood`='uic' GROUP BY locationtype","chars":"SELECT count(*) as TOTAL_CRIME,`locationtype` FROM chicagocrime WHERE `year`='2013' AND `neighborhood`='uic' GROUP BY locationtype"},"data-query-result":[{"valueType":"STRING","string":"(total_crime,4);(locationtype,)","chars":"(total_crime,4);(locationtype,)"},{"valueType":"STRING","string":"(total_crime,6);(locationtype,abandoned-building)","chars":"(total_crime,6);(locationtype,abandoned-building)"},{"valueType":"STRING","string":"(total_crime,46);(locationtype,alley)","chars":"(total_crime,46);(locationtype,alley)"},{"valueType":"STRING","string":"(total_crime,315);(locationtype,apartment)","chars":"(total_crime,315);(locationtype,apartment)"},{"valueType":"STRING","string":"(total_crime,2);(locationtype,appliance-store)","chars":"(total_crime,2);(locationtype,appliance-store)"},{"valueType":"STRING","string":"(total_crime,30);(locationtype,athletic-club)","chars":"(total_crime,30);(locationtype,athletic-club)"},{"valueType":"STRING","string":"(total_crime,10);(locationtype,atm-(automatic-teller-machine))","chars":"(total_crime,10);(locationtype,atm-(automatic-teller-machine))"},{"valueType":"STRING","string":"(total_crime,31);(locationtype,bank)","chars":"(total_crime,31);(locationtype,bank)"},{"valueType":"STRING","string":"(total_crime,19);(locationtype,bar-or-tavern)","chars":"(total_crime,19);(locationtype,bar-or-tavern)"},{"valueType":"STRING","string":"(total_crime,2);(locationtype,barbershop)","chars":"(total_crime,2);(locationtype,barbershop)"},{"valueType":"STRING","string":"(total_crime,1);(locationtype,car-wash)","chars":"(total_crime,1);(locationtype,car-wash)"},{"valueType":"STRING","string":"(total_crime,67);(locationtype,cha-apartment)","chars":"(total_crime,67);(locationtype,cha-apartment)"},{"valueType":"STRING","string":"(total_crime,15);(locationtype,cha-hallway/stairwell/elevator)","chars":"(total_crime,15);(locationtype,cha-hallway/stairwell/elevator)"},{"valueType":"STRING","string":"(total_crime,110);(locationtype,cha-parking-lot/grounds)","chars":"(total_crime,110);(locationtype,cha-parking-lot/grounds)"},{"valueType":"STRING","string":"(total_crime,13);(locationtype,church/synagogue/place-of-worship)","chars":"(total_crime,13);(locationtype,church/synagogue/place-of-worship)"},{"valueType":"STRING","string":"(total_crime,23);(locationtype,college/university-grounds)","chars":"(total_crime,23);(locationtype,college/university-grounds)"},{"valueType":"STRING","string":"(total_crime,69);(locationtype,commercial-/-business-office)","chars":"(total_crime,69);(locationtype,commercial-/-business-office)"},{"valueType":"STRING","string":"(total_crime,18);(locationtype,construction-site)","chars":"(total_crime,18);(locationtype,construction-site)"},{"valueType":"STRING","string":"(total_crime,28);(locationtype,convenience-store)","chars":"(total_crime,28);(locationtype,convenience-store)"},{"valueType":"STRING","string":"(total_crime,45);(locationtype,cta-bus)","chars":"(total_crime,45);(locationtype,cta-bus)"},{"valueType":"STRING","string":"(total_crime,15);(locationtype,cta-bus-stop)","chars":"(total_crime,15);(locationtype,cta-bus-stop)"},{"valueType":"STRING","string":"(total_crime,12);(locationtype,cta-garage-/-other-property)","chars":"(total_crime,12);(locationtype,cta-garage-/-other-property)"},{"valueType":"STRING","string":"(total_crime,39);(locationtype,cta-platform)","chars":"(total_crime,39);(locationtype,cta-platform)"},{"valueType":"STRING","string":"(total_crime,51);(locationtype,cta-train)","chars":"(total_crime,51);(locationtype,cta-train)"},{"valueType":"STRING","string":"(total_crime,11);(locationtype,currency-exchange)","chars":"(total_crime,11);(locationtype,currency-exchange)"},{"valueType":"STRING","string":"(total_crime,1);(locationtype,day-care-center)","chars":"(total_crime,1);(locationtype,day-care-center)"},{"valueType":"STRING","string":"(total_crime,2);(locationtype,delivery-truck)","chars":"(total_crime,2);(locationtype,delivery-truck)"},{"valueType":"STRING","string":"(total_crime,84);(locationtype,department-store)","chars":"(total_crime,84);(locationtype,department-store)"},{"valueType":"STRING","string":"(total_crime,5);(locationtype,driveway---residential)","chars":"(total_crime,5);(locationtype,driveway---residential)"},{"valueType":"STRING","string":"(total_crime,41);(locationtype,drug-store)","chars":"(total_crime,41);(locationtype,drug-store)"},{"valueType":"STRING","string":"(total_crime,9);(locationtype,factory/manufacturing-building)","chars":"(total_crime,9);(locationtype,factory/manufacturing-building)"},{"valueType":"STRING","string":"(total_crime,3);(locationtype,federal-building)","chars":"(total_crime,3);(locationtype,federal-building)"},{"valueType":"STRING","string":"(total_crime,1);(locationtype,fire-station)","chars":"(total_crime,1);(locationtype,fire-station)"},{"valueType":"STRING","string":"(total_crime,38);(locationtype,gas-station)","chars":"(total_crime,38);(locationtype,gas-station)"},{"valueType":"STRING","string":"(total_crime,46);(locationtype,government-building/property)","chars":"(total_crime,46);(locationtype,government-building/property)"},{"valueType":"STRING","string":"(total_crime,264);(locationtype,grocery-food-store)","chars":"(total_crime,264);(locationtype,grocery-food-store)"},{"valueType":"STRING","string":"(total_crime,1);(locationtype,highway/expressway)","chars":"(total_crime,1);(locationtype,highway/expressway)"},{"valueType":"STRING","string":"(total_crime,63);(locationtype,hospital-building/grounds)","chars":"(total_crime,63);(locationtype,hospital-building/grounds)"},{"valueType":"STRING","string":"(total_crime,6);(locationtype,hotel/motel)","chars":"(total_crime,6);(locationtype,hotel/motel)"},{"valueType":"STRING","string":"(total_crime,9);(locationtype,jail-/-lock-up-facility)","chars":"(total_crime,9);(locationtype,jail-/-lock-up-facility)"},{"valueType":"STRING","string":"(total_crime,4);(locationtype,library)","chars":"(total_crime,4);(locationtype,library)"},{"valueType":"STRING","string":"(total_crime,11);(locationtype,medical/dental-office)","chars":"(total_crime,11);(locationtype,medical/dental-office)"},{"valueType":"STRING","string":"(total_crime,5);(locationtype,nursing-home/retirement-home)","chars":"(total_crime,5);(locationtype,nursing-home/retirement-home)"},{"valueType":"STRING","string":"(total_crime,398);(locationtype,other)","chars":"(total_crime,398);(locationtype,other)"},{"valueType":"STRING","string":"(total_crime,59);(locationtype,other-commercial-transportation)","chars":"(total_crime,59);(locationtype,other-commercial-transportation)"},{"valueType":"STRING","string":"(total_crime,74);(locationtype,other-railroad-prop-/-train-depot)","chars":"(total_crime,74);(locationtype,other-railroad-prop-/-train-depot)"},{"valueType":"STRING","string":"(total_crime,56);(locationtype,park-property)","chars":"(total_crime,56);(locationtype,park-property)"},{"valueType":"STRING","string":"(total_crime,205);(locationtype,parking-lot/garage(non.resid.))","chars":"(total_crime,205);(locationtype,parking-lot/garage(non.resid.))"},{"valueType":"STRING","string":"(total_crime,28);(locationtype,police-facility/veh-parking-lot)","chars":"(total_crime,28);(locationtype,police-facility/veh-parking-lot)"},{"valueType":"STRING","string":"(total_crime,352);(locationtype,residence)","chars":"(total_crime,352);(locationtype,residence)"},{"valueType":"STRING","string":"(total_crime,54);(locationtype,residence-garage)","chars":"(total_crime,54);(locationtype,residence-garage)"},{"valueType":"STRING","string":"(total_crime,40);(locationtype,residence-porch/hallway)","chars":"(total_crime,40);(locationtype,residence-porch/hallway)"},{"valueType":"STRING","string":"(total_crime,65);(locationtype,residential-yard-(front/back))","chars":"(total_crime,65);(locationtype,residential-yard-(front/back))"},{"valueType":"STRING","string":"(total_crime,173);(locationtype,restaurant)","chars":"(total_crime,173);(locationtype,restaurant)"},{"valueType":"STRING","string":"(total_crime,157);(locationtype,school)","chars":"(total_crime,157);(locationtype,school)"},{"valueType":"STRING","string":"(total_crime,547);(locationtype,sidewalk)","chars":"(total_crime,547);(locationtype,sidewalk)"},{"valueType":"STRING","string":"(total_crime,103);(locationtype,small-retail-store)","chars":"(total_crime,103);(locationtype,small-retail-store)"},{"valueType":"STRING","string":"(total_crime,42);(locationtype,sports-arena/stadium)","chars":"(total_crime,42);(locationtype,sports-arena/stadium)"},{"valueType":"STRING","string":"(total_crime,1157);(locationtype,street)","chars":"(total_crime,1157);(locationtype,street)"},{"valueType":"STRING","string":"(total_crime,12);(locationtype,tavern/liquor-store)","chars":"(total_crime,12);(locationtype,tavern/liquor-store)"},{"valueType":"STRING","string":"(total_crime,11);(locationtype,taxicab)","chars":"(total_crime,11);(locationtype,taxicab)"},{"valueType":"STRING","string":"(total_crime,12);(locationtype,vacant-lot/land)","chars":"(total_crime,12);(locationtype,vacant-lot/land)"},{"valueType":"STRING","string":"(total_crime,12);(locationtype,vehicle-commercial)","chars":"(total_crime,12);(locationtype,vehicle-commercial)"},{"valueType":"STRING","string":"(total_crime,81);(locationtype,vehicle-non-commercial)","chars":"(total_crime,81);(locationtype,vehicle-non-commercial)"},{"valueType":"STRING","string":"(total_crime,6);(locationtype,warehouse)","chars":"(total_crime,6);(locationtype,warehouse)"},{"valueType":"STRING","string":"(total_crime,1);(locationtype,yard)","chars":"(total_crime,1);(locationtype,yard)"}]},
				{"plot-type":{"valueType":"STRING","string":"BAR","chars":"BAR"},"x-axis":{"valueType":"STRING","string":"crimetype","chars":"crimetype"},"y-axis":{"valueType":"STRING","string":"TOTAL_CRIME","chars":"TOTAL_CRIME"},"data-query":{"valueType":"STRING","string":"SELECT count(*) as TOTAL_CRIME,`crimetype` FROM chicagocrime WHERE `locationtype`='restaurant' GROUP BY crimetype","chars":"SELECT count(*) as TOTAL_CRIME,`crimetype` FROM chicagocrime WHERE `locationtype`='restaurant' GROUP BY crimetype"},"data-query-result":[{"valueType":"STRING","string":"(total_crime,2);(crimetype,arson)","chars":"(total_crime,2);(crimetype,arson)"},{"valueType":"STRING","string":"(total_crime,238);(crimetype,assault)","chars":"(total_crime,238);(crimetype,assault)"},{"valueType":"STRING","string":"(total_crime,302);(crimetype,battery)","chars":"(total_crime,302);(crimetype,battery)"},{"valueType":"STRING","string":"(total_crime,134);(crimetype,burglary)","chars":"(total_crime,134);(crimetype,burglary)"},{"valueType":"STRING","string":"(total_crime,1);(crimetype,crim-sexual-assault)","chars":"(total_crime,1);(crimetype,crim-sexual-assault)"},{"valueType":"STRING","string":"(total_crime,177);(crimetype,criminal-damage)","chars":"(total_crime,177);(crimetype,criminal-damage)"},{"valueType":"STRING","string":"(total_crime,447);(crimetype,criminal-trespass)","chars":"(total_crime,447);(crimetype,criminal-trespass)"},{"valueType":"STRING","string":"(total_crime,905);(crimetype,deceptive-practice)","chars":"(total_crime,905);(crimetype,deceptive-practice)"},{"valueType":"STRING","string":"(total_crime,2);(crimetype,gambling)","chars":"(total_crime,2);(crimetype,gambling)"},{"valueType":"STRING","string":"(total_crime,3);(crimetype,intimidation)","chars":"(total_crime,3);(crimetype,intimidation)"},{"valueType":"STRING","string":"(total_crime,1);(crimetype,kidnapping)","chars":"(total_crime,1);(crimetype,kidnapping)"},{"valueType":"STRING","string":"(total_crime,63);(crimetype,liquor-law-violation)","chars":"(total_crime,63);(crimetype,liquor-law-violation)"},{"valueType":"STRING","string":"(total_crime,2);(crimetype,motor-vehicle-theft)","chars":"(total_crime,2);(crimetype,motor-vehicle-theft)"},{"valueType":"STRING","string":"(total_crime,26);(crimetype,narcotics)","chars":"(total_crime,26);(crimetype,narcotics)"},{"valueType":"STRING","string":"(total_crime,1);(crimetype,obscenity)","chars":"(total_crime,1);(crimetype,obscenity)"},{"valueType":"STRING","string":"(total_crime,8);(crimetype,offense-involving-children)","chars":"(total_crime,8);(crimetype,offense-involving-children)"},{"valueType":"STRING","string":"(total_crime,104);(crimetype,other-offense)","chars":"(total_crime,104);(crimetype,other-offense)"},{"valueType":"STRING","string":"(total_crime,18);(crimetype,public-peace-violation)","chars":"(total_crime,18);(crimetype,public-peace-violation)"},{"valueType":"STRING","string":"(total_crime,63);(crimetype,robbery)","chars":"(total_crime,63);(crimetype,robbery)"},{"valueType":"STRING","string":"(total_crime,4);(crimetype,sex-offense)","chars":"(total_crime,4);(crimetype,sex-offense)"},{"valueType":"STRING","string":"(total_crime,2);(crimetype,stalking)","chars":"(total_crime,2);(crimetype,stalking)"},{"valueType":"STRING","string":"(total_crime,5150);(crimetype,theft)","chars":"(total_crime,5150);(crimetype,theft)"}] }
		];

		this.colors = ["steelblue", "mediumseagreen", "cadetblue", "lightskyblue"]; 


		this.commands = [];
		this.commands.push(">");
	},

	

	load: function(date) {
		console.log('articulate_ui> Load with state value', this.state.value);


		this.refresh(date);
	},

	

	//----------------------------------------//
	//---------- DRAWING FUNCTIONS ----------//
	//---------------------------------------//
	draw: function(date) {
		console.log('articulate_ui> Draw with state value', this.state.value);

		this.ctx.clearRect(0, 0, this.element.width, this.element.height);

		this.ctx.font = "32px Ariel";
		this.ctx.textAlign="left"; 
		this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		theY = 32;

		//no idea if this works... 
		startIdx = 0;
		if( this.commands.length*32 > this.element.length-100 ) {
			diff = (this.element.length-100) - (this.commands.length*32);
			startIdx = diff % 32; 
		}

		// but this works...
		for(i = 0; i < this.commands.length; i++){
			this.ctx.fillText( this.commands[i], 10, theY);
			theY += 32;
		}

		// synced data
		// this.ctx.fillStyle = "rgba(189, 148, 255, 1.0)";
		// this.ctx.fillRect(100, this.element.height - 100, this.element.width-200, 75 );
		// this.ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
		// this.ctx.font = "24px Ariel";
		// this.ctx.textAlign="left"; 
		// this.ctx.fillText("generate vis", 110, this.element.height - 50 );
	},


	//--------------------------------------------//
	//--------- WINDOW CHANGE FUNCTIONS ----------//
	//--------------------------------------------//
	resize: function(date) {
		this.refresh(date);
	},
	move: function(date) {
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},


	//------------------------------------------//
	//--------------EVENT FUNCTIONS-------------//
	//------------------------------------------//
	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			this.counter++;
			if( this.counter >= this.specificationObjects.length )
			{
				this.counter = 0;
			}
			//debug
			if( isMaster ){
				//this.launchVis2();
				this.readExample(this.specificationObjects[this.counter], this.colors[this.counter]); 
				//this.contactArticulateHub("Is there any way to see the crimetype that tend to be committed in restaurants?");
			}

		}
		else if (eventType === "pointerMove" && this.dragging) {
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
		}

		// Scroll events for zoom
		else if (eventType === "pointerScroll") {
		}
		else if (eventType === "widgetEvent"){
		}
		else if (eventType === "keyboard") {
			if (data.character === "m") {
				this.refresh(date);
			}
		}
		else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left
				this.refresh(date);
			}
			else if (data.code === 38 && data.state === "down") { // up
				this.refresh(date);
			}
			else if (data.code === 39 && data.state === "down") { // right
				this.refresh(date);
			}
			else if (data.code === 40 && data.state === "down") { // down
				this.refresh(date);
			}
		}
	},

	textInputEvent: function(text, date){
		this.commands[this.commands.length-1] = text;
		this.commands.push(">"); 

		if( isMaster ){
			//send to articulate hub...
			this.contactArticulateHub(text); 
		}

		if( text.indexOf("Launch example") > -1 ){
			//wsio.emit('launchLinkedChildApp', {application: "apps/d3plus_visapp", user: "articulate_ui", msg:"this is a message from articulate_ui"});
			this.launchVis();
		}
		if( text.indexOf("Open example") > -1 ){
			this.launchVis2();

		}

		this.refresh(date);
	},

	//---------------------------------------------
	//------------ CONNECTION FUNCTIONS -----------
	//---------------------------------------------

	//contact the smart hub-- only called by master
	contactArticulateHub: function(msg){
		console.log("sending msg: " , msg);

		msg = msg.replace(" ", "%"); 
		url = "https://articulate.evl.uic.edu:8443/smarthub/webapi/myresource/query/can%we%look%at%total%crime%by%locationtype%in%2013%for%UIC";
		//url = url+msg; 

		this.callbackFunc = this.callback.bind(this);

		this.postRequest(url, this.callbackFunc, 'JSON');
	},

	//this sends the request to the rest service
	//only called by master
	postRequest: function(filename, callback, type) {
		var dataType = type || "TEXT";

		var xhr = new XMLHttpRequest();
		xhr.open("GET", filename, true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					if (dataType === "TEXT") {
						callback(null, xhr.responseText);
					} else if (dataType === "JSON") {
						callback(null, JSON.parse(xhr.responseText));
					} else if (dataType === "CSV") {
						callback(null, csvToArray(xhr.responseText));
					} else if (dataType === "SVG") {
						callback(null, xhr.responseXML.getElementsByTagName('svg')[0]);
					} else {
						callback(null, xhr.responseText);
					}
				} else {
					callback("Error: File Not Found", null);
				}
			}
		};
		xhr.send();
	},

	//this gets the data from the smart hub, in a callback
	//only called by master, hence the 'broadcast'
	callback: function(err, specObj) {
			if (err)			{
				console.log("error connecting to articulate smart hub");
				return;
			}
			console.log("GOT THE RESPONSE: ");
			console.log(specObj);

			this.handleResponse(specObj); 
			//then broadcast the results to display nodes!
			//broadcast( "handleResponse", {response:"responseTest"} ); 
		},

	handleResponse: function(specificationObj){
		// console.log(data.response);

		applicationType ="custom",
		application = "apps/d3plus_visapp", 	
		msg = "this is a message from articulate_ui",


		//type = specificationObj.plotType.string.toLowerCase();
		type = specificationObj["plot-type"].string.toLowerCase();
		x = specificationObj["x-axis"].string.toLowerCase();
		y = specificationObj["y-axis"].string.toLowerCase();

		// x = specificationObj.xAxis.string.toLowerCase();
		// y = specificationObj.yAxis.string.toLowerCase();
		if( specificationObj.id )
			id = specificationObj.id.string.toLowerCase();
		else
			id = null;
		data = []; 

		//console.log('type' + type + "x " + x + " y " + y);
		for(i = 0; i < specificationObj["data-query-result"].length; i++){
				line = specificationObj["data-query-result"][i].string;
				console.log(line);
				line = line.replace("(", "#");
				line = line.replace(";", "#");
				line = line.replace(")", "#");
				line = line.replace(",", "#");
				line = line.replace("(", "#");
				line = line.replace(";", "#");
				line = line.replace(")", "#");
				line = line.replace(",", "#");
				//console.log(line);
				tokens = line.split("#");
				//console.log(tokens);
				obj = new Object();
				//obj = {"year": 2010+i, "total_crime": 300, "id": 2010+i};
				obj[tokens[1]] = parseInt(tokens[2]);
				obj[tokens[5]] = parseInt(tokens[6]);
				obj["id"] = parseInt(tokens[6]);//hack for now
				//obj["total_crime"] = 300;
				data.push(obj);
				console.log("HERE IS OBJECT " + i + " PASSED TO D3PLUS")
				console.log(obj);
		}
		console.log("HERE IS DATA PASSED TO D3PLUS")
		console.log(data);

		initState = {  // these values will load on child app init
			value: 10,
			type: type.toLowerCase(),
			x: x.toLowerCase(),
			y: y.toLowerCase(),
			id: "id",
			data: data
		};


		this.launchNewChild(applicationType, application, initState, msg);//defined in sage2 app
	},

	//here is where the parent launches the child app
	//we will have to add appropriate data variables 
	launchVis: function(){
		applicationType ="custom",
		application = "apps/d3plus_visapp", 	
		msg = "this is a message from articulate_ui",
		initState = {  // these values will load on child app init
				value: 10,
				type: "bar",
				x: "year",
				y: "value",
				id: "name",
				data: 
				[
				    {"year": 2010, "name":"TEST", "value": 15},
				    {"year": 2010, "name":"Loop", "value": 10},
				    {"year": 2010, "name":"River-North", "value": 5},
				    {"year": 2010, "name":"Near-West", "value": 50},
				  	{"year": 2011, "name":"TEST", "value": 22},
				    {"year": 2011, "name":"Loop", "value": 13},
				    {"year": 2011, "name":"River-North", "value": 16},
				    {"year": 2011, "name":"Near-West", "value": 55},
				  	{"year": 2012, "name":"TEST", "value": 43},
				    {"year": 2012, "name":"Loop", "value": 3},
				    {"year": 2012, "name":"River-North", "value": 34},
				    {"year": 2012, "name":"Near-West", "value": 23},
				  	{"year": 2013, "name":"TEST", "value": 27},
				    {"year": 2013, "name":"Loop", "value": 14},
				    {"year": 2013, "name":"River-North", "value": 10},
				    {"year": 2013, "name":"Near-West", "value": 2},
				    {"year": 2014, "name":"TEST", "value": 47},
				    {"year": 2014, "name":"Loop", "value": 4},
				    {"year": 2014, "name":"River-North", "value": 18},
				    {"year": 2014, "name":"Near-West", "value": 22}
			    ]
			};

		this.launchNewChild(applicationType, application, initState, msg);//defined in sage2 app
	},


	launchVis2: function(){
		applicationType ="custom",
		application = "apps/vega_vis_app", 	
		msg = "this is a message from articulate_ui",
		// initState = {  // these values will load on child app init
		// 		value: 10, 
		// 		// specFile: "uploads/apps/vega_vis_app/data/spec.json"
				
		// 	};

		initState = {  // these values will load on child app init
			value: 10,
			type: "bar",
			x: "year",
			y: "total_crime",
			data: 
			[
			    {"x": "2010", "y": 15},
			    {"x": "2011", "y": 10},
			    {"x": "2012", "y": 5},
			    {"x": "2013", "y": 50}
		    ], 
		    color: "steelblue"
		};

		this.launchNewChild(applicationType, application, initState, msg);//defined in sage2 app
	},

	readExample: function(specificationObj, color){

		applicationType ="custom",
		application = "apps/vega_vis_app";//"apps/d3plus_visapp", 	
		msg = "this is a message from articulate_ui",

		type = specificationObj["plot-type"].string.toLowerCase();
		x = specificationObj["x-axis"].string.toLowerCase();
		y = specificationObj["y-axis"].string.toLowerCase();
		if( specificationObj["id"] )
			id = specificationObj["id"].string.toLowerCase();
		else
			id = null;
		data = []; 

		console.log('type' + type + "x " + x + " y " + y);
		for(i = 0; i < specificationObj["data-query-result"].length; i++){
				line = specificationObj["data-query-result"][i].string;
				console.log(line);
				line = line.replace("(", "#");
				line = line.replace(";", "#");
				line = line.replace(")", "#");
				line = line.replace(",", "#");
				line = line.replace("(", "#");
				line = line.replace(";", "#");
				line = line.replace(")", "#");
				line = line.replace(",", "#");
				console.log(line);
				tokens = line.split("#");
				console.log(tokens);
				obj = new Object();
				//d3 plus:
				//obj[tokens[1]] = parseInt(tokens[2]);
				//obj[tokens[5]] = tokens[6];
				//obj["id"] = tokens[6];

				//vega:
				obj["x"] = tokens[6];
				obj["y"] = parseInt(tokens[2]);

				data.push(obj);
				console.log(obj);
		}

		console.log(data);

		initState = {  // these values will load on child app init
			value: 10,
			type: type.toLowerCase(),
			x: x.toLowerCase(),
			y: y.toLowerCase(),
			color: color,
			visId: this.counter,
			data: data
		};

		this.launchNewChild(applicationType, application, initState, msg);//defined in sage2 app
	}

});
