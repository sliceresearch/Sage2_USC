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


		//debug
		if( isMaster ){
			//this.readExample(); 
			this.contactArticulateHub("Is there any way to see the crimetype that tend to be committed in restaurants?");
		}

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
		url = "https://articulate.evl.uic.edu:8443/smarthub/webapi/myresource/query/show%20me%20theft%20in%20loop";
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
				//obj = {"year": 2010+i, "total_crime": 300, "id": 2010+i};
				obj[tokens[1]] = parseInt(tokens[2]);
				obj[tokens[5]] = parseInt(tokens[6]);
				obj["id"] = parseInt(tokens[6]);//hack for now
				//obj["total_crime"] = 300;
				data.push(obj);
				console.log(obj);
		}

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
		initState = {  // these values will load on child app init
				value: 10 
			};

		this.launchNewChild(applicationType, application, initState, msg);//defined in sage2 app
	},

	readExample: function(){

		applicationType ="custom",
		application = "apps/d3plus_visapp", 	
		msg = "this is a message from articulate_ui",

		specificationObj = 
		{
			"plot-type":
			{
				"valueType":"STRING",
				"string":"BAR",
				"chars":"BAR"
			},
			"x-axis":
			{
				"valueType":"STRING",
				"string":"year",
				"chars":"year"
			},
			"y-axis":
			{
				"valueType":"STRING",
				"string":"TOTAL_CRIME",
				"chars":"TOTAL_CRIME"
			},
			"data-query":
			{
				"valueType":"STRING",
				"string":"SELECT count(*) as TOTAL_CRIME,`year` FROM chicagocrime WHERE `crimetype`='theft' AND `neighborhood`='river-north' GROUP BY year","chars":"SELECT count(*) as TOTAL_CRIME,`year` FROM chicagocrime WHERE `crimetype`='theft' AND `neighborhood`='river-north' GROUP BY year"
			},
			"data-query-result":
			[
				{
					"valueType":"STRING",
					"string":"(total_crime,3551);(year,2010)",
					"chars":"(total_crime,3551);(year,2010)"
				},
				{
					"valueType":"STRING",
					"string":"(total_crime,3564);(year,2011)",
					"chars":"(total_crime,3564);(year,2011)"
				},
				{
					"valueType":"STRING",
					"string":"(total_crime,3798);(year,2012)",
					"chars":"(total_crime,3798);(year,2012)"
				},
				{
					"valueType":"STRING",
					"string":"(total_crime,3292);(year,2013)",
					"chars":"(total_crime,3292);(year,2013)"
				},
				{
					"valueType":"STRING",
					"string":"(total_crime,2843);(year,2014)",
					"chars":"(total_crime,2843);(year,2014)"
				}
			]
		};

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
			//obj = {"year": 2010+i, "total_crime": 300, "id": 2010+i};
			obj[tokens[1]] = parseInt(tokens[2]);
			obj[tokens[5]] = parseInt(tokens[6]);
			obj["id"] = parseInt(tokens[6]);
			//obj["total_crime"] = 300;
			data.push(obj);
			console.log(obj);
	}

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
}

});
