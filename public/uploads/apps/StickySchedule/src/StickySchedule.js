//
// SAGE2 application: ConferenceScheduler
// by: Vishal Doshi <vdoshi3@uic.edu>
//
// Copyright (c) 2015
//

//Git Curent Branch: master



var StickySchedule = SAGE2_App.extend( {
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);

		// Set window manipulation callback frequency
		this.resizeEvents = "onfinish";
		this.moveEvents   = "onfinish";

		// Set the background to black
		this.element.style.backgroundColor = "#000000";
		this.element.id = this.id + "_main";

		// Create user interartion object 
		this.userInteraction = {};

		// Check if already loaded session 
		this.loadedAlready = false; 
		this.turn = 0;
		this.currentScheduler = 0;
		
		this.defaultFill = "rgba(10,10,10, 0.1)";
		this.defaultStroke = "rgba(180, 180, 180, 0.80)";
		this.defaultButtonFill = "rgba(100,100,100,0.5)";
		this.defaultButtonPressedFill = "rgba(0,0,0,1)";
		this.numberOfDays = 5;
		this.numberOfHalls = 3;
		this.numberOfSessions = 6;

		// this.themeNames = ["Robotics","Visualization","Neural Networks"];
		this.themeNames = [];
		this.array_days = [];
		this.array_dates = [];
		this.array_halls = [];
		this.array_sessions = [];
		this.array_session_constraints = [];

		// this.catagorizedStickies = {"Robotics":[],"Visualization":[],"Neural Networks":[]};
		this.catagorizedStickies = {};
		//Colors for Sticky
		// this.stickyColor = {"Robotics":"#FEBB32","Visualization":"#8EE13E", "Neural Networks":"#76CBC8"};
		this.stickyColor = {};

		//Names of Schedulers
		this.conferenceSchedulers = {};
		this.numberOfSchedulers = 0;

		//Create an array of stickies
		this.array_sticky = [];
		//Create Array of Sticky objects
		this.sticky_object_array = [];

		//To Save State
		this.saveState = {};

		//Grid variables
		this.numberOfRows = this.numberOfSessions;
		this.numberOfColumns =  this.numberOfDays * this.numberOfHalls;

		//Sticky variables
		this.numberOfThemes = 6;
		this.stickyReservoirRatio = 3;

		//Division ratio
		this.gridWRatio = 0.6;
		this.gridHRatio = 0.9;

		this.textColor = "rgba(150, 150, 150, 1)";
		// this.textColor = "rgb(182,34,32)";
		this.txtSize = "20";
		// this.textColor1 = "rgb(180,180,180)";
		this.textColor1 = "rgb(182,34,32)";

		// this.fontFamily ="Tahoma, Geneva, sans-serif";
		//Flags for Buttons
		this.toggleFP = true;
		this.toggleRI = true;
		this.toggleTI = true;
		this.toggleTN = false;
		this.toggleSave = true;
		this.movesAllowed = 1;
		this.g_feedback = undefined;

		//Button Width and Height
		this.numberOfButtons = 6;
		this.buttonW = 0;
		this.buttonH = 0;
		this.buttonPadding = 0;
		this.controlsLeftPadding = 0;
		this.imagePadding = 20;

		//Post-it Width and Height
		this.postItW = 0;
		this.postItH = 0;
		this.padding = 0;
		this.filter = null;
		this.shadowColor = "black";
		// this.shadowColor = "rgba(120,120,120,0.5)";
		this.shadowDepth = 5;
		this.stickyFontSize = 5;

		//Size of HolderCells
		this.holderW = 0;
		this.holderH = 0;
		this.ratioOfCell = 6;

		// this.overlay_object_array = {};


		//Get the Window height and width
		this.mainDivW = parseInt(this.element.style.width,  10);
		this.mainDivH = parseInt(this.element.style.height, 10);

		this.orgMainDivW = this.mainDivW;
		this.orgMainDivH = this.mainDivH;

		//Calculating SVG viewport width and height
		//UPDATE REQUIRED: make sure the aspect ratio when the the window is resized, and refreshed.
		this.paper_mainW = 4000; 
		this.paper_mainH = (this.paper_mainW * (this.mainDivH / this.mainDivW));

		this.paper_gridXEnd = this.paper_mainW * this.gridWRatio;
		this.paper_gridYEnd = this.paper_mainH * this.gridHRatio;

		//Default values of workzone. Will be updated on resize
		this.workablePixelW = this.orgMainDivW;
		this.offsetWorkZoneX = 0;
		this.workablePixelH = this.orgMainDivH;
		this.offsetWorkZoneY = 0;
		
		//
		this.state["val2"] = data["val2"];
		console.log("State:"+ this.state["val2"]);
		console.log("Data:"+ JSON.stringify(data));
		// data.value = 10;
		// this.state.value = data.he);

		//Calling personal methods
		this.readConferenceInfo();
		// this.readPaperList();
	
		this.createSnapPaper();
		this.createPartitions();
		// this.intializeGrid();
		// this.intializeSticky();
		// this.intializeControl();
//>>>
		// this.readSavedSession();

		this.SAGE2Sync(true);

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
		
	},
		
//==> PLay Area
	readSavedSession: function(){
		var _this = this;
		readFile(this.resrcPath+"savedSession.json", function(err,data){
			if (err) throw err;
			else{
				var saveState = {};
				// console.log("Data Reading:"+ JSON.stringify(data));
				for(var key in data){
					// console.log("For loop:"+data[key]);
					// _this.saveState[key] = data[key];
					saveState[key] = data[key];
				}

				// console.log("Done Reading:"+ JSON.stringify(_this.saveState));
				_this.recreateOldSession(saveState);
				}
			}, "JSON");
	},

	recreateOldSession: function(sS){
		//MAKE SURE TO UPDAT this.workabale like in init
		var saveState = sS;
		console.log("Recreating saved using:"+ JSON.stringify(saveState));

		//Resizing to old session
		var oldWidth = saveState["dimensions"]["width"];
		var oldHeight =  saveState["dimensions"]["height"];
		var oldpaper_mainW = saveState["viewportDimensions"]["paper_mainW"];
		var oldpaper_mainH = saveState["viewportDimensions"]["paper_mainH"];
		var workablePixelW = saveState["workableDimensions"]["workablePixelW"]
		var workablePixelH = saveState["workableDimensions"]["workablePixelH"]
		var calcHeight = oldWidth*(oldpaper_mainH/oldpaper_mainW);
		// this.sendResize(oldWidth,oldHeight);
		this.sendResize(oldWidth,calcHeight);
		// this.sendResize(workablePixelW,workablePixelH);
		// $( ".masterdiv" ).empty();

		for(var saved_group in saveState["stickies"]){
			console.log("GROUP:"+JSON.stringify(saveState["stickies"][saved_group]));
			var saved_group_attr = saveState["stickies"][saved_group]["attr"];
			var g_sticky_saved = this.paper_main.g().attr({
				id: "saved_"+saved_group_attr["id"],
				x: saved_group_attr["x"],
				y: saved_group_attr["y"],
				transform : saved_group_attr["transform"],
				tX:saved_group_attr["tX"], tY:saved_group_attr["tY"],
				stickyColor : saved_group_attr["stickyColor"],
				htmlText: saved_group_attr["htmlText"],
				stickyTitle: saved_group_attr["stickyTitle"],
				stickySpeaker: saved_group_attr["stickySpeaker"],
				stickyFontSize: saved_group_attr["stickyFontSize"]
			});

			var saved_group_childNodes = saveState["stickies"][saved_group]["childNodes"];
			
			//Creating Sticky Shadow
			var saved_sticky_shadow = saved_group_childNodes[0];
			var saved_sticky_shadow_attr = saved_sticky_shadow["attr"];
			
			var shadowX = saved_sticky_shadow_attr["x"];
			var shadowY = saved_sticky_shadow_attr["y"];
			var shadowW = saved_sticky_shadow_attr["width"];
			var shadowH = saved_sticky_shadow_attr["height"];
			var sticky_shadow_saved = this.paper_main.rect(shadowX,shadowY,shadowW,shadowH).attr({
				id:"saved_"+saved_sticky_shadow_attr["id"],
				fill: saved_sticky_shadow_attr["fill"]
				// filter: saved_sticky_shadow_attr["filter"]
			});
			g_sticky_saved.add(sticky_shadow_saved);

			//Creating a sticky
			
			var saved_sticky_1 = saved_group_childNodes[1];
			var saved_sticky_1_attr = saved_sticky_1["attr"];
			//Creating Sticky Shadow
			var stickyX = saved_sticky_1_attr["x"];
			var stickyY = saved_sticky_1_attr["y"];
			var stickyW = saved_sticky_1_attr["width"];
			var stickyH = saved_sticky_1_attr["height"];

			var sticky_1_saved = this.paper_main.rect(stickyX,stickyY,stickyW,stickyH).attr({
				id:"saved_"+saved_sticky_1_attr["id"],
				fill: saved_sticky_1_attr["fill"],
				transform : saved_sticky_1_attr["transform"]
			});
			g_sticky_saved.add(sticky_1_saved);

			//Reading Values for creating the HTML Text
			var stickyTitle = g_sticky_saved.attr("stickyTitle");
			var stickySpeaker = g_sticky_saved.attr("stickySpeaker");
			var stickyFontSize = Math.floor(parseInt(g_sticky_saved.attr("stickyFontSize"))); //Because ScaleY wont change on multi hall 
			// console.log("Font Size before Release was:" + g_sticky_saved.attr("stickyFontSize"));
			// console.log("Font Size on Release:"+stickyFontSize);
			//Creating innerHTML for the sticky
			var title =  "<strong>Title:</strong> "+ stickyTitle;
			var speaker = "<strong>Speaker:</strong> "+ stickySpeaker;
			var htmlText = '<div xmlns="http://www.w3.org/1999/xhtml" style="color:black; font-size: '+stickyFontSize+'px">'
						+ title + '<br><br>' + speaker+ '</div>';



			var saved_sticky_newElement = saved_group_childNodes[2];
			var saved_sticky_newElement_attr = saved_sticky_shadow["attr"];
			//Creating Sticky Shadow
			var newElementX = saved_sticky_newElement_attr["x"];
			var newElementY = saved_sticky_newElement_attr["y"];
			var newElementW = saved_sticky_newElement_attr["width"];
			var newElementH = saved_sticky_newElement_attr["height"];
			var newElementId = saved_sticky_newElement_attr["id"];
			// Creating a foreignObject which will have HTML wrappable text
			var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject'); //Create a path in SVG's namespace
			newElement.setAttribute('x', newElementX);
       		newElement.setAttribute('y', newElementY);
       		newElement.setAttribute('width',newElementW);
       		newElement.setAttribute('height',newElementH);
       		newElement.setAttribute('id',"saved_"+newElementId);
       		var fobjsX = parseFloat(1/2);
       		var fobjtX = (-1*(newElementX-(newElementX/fobjsX)));
       		var fobjMatrix = new Snap.Matrix();
       		fobjMatrix.scale(fobjsX,1);
       		fobjMatrix.translate(fobjtX,0);
       		newElement.setAttribute('transform', fobjMatrix);
			newElement.innerHTML = htmlText;
			var nodeFobj = 	g_sticky_saved.append(newElement);


			
			this.sticky_object_array.push(g_sticky_saved);
			this.g_allSticky.add(g_sticky_saved);

		}//End of for loop
		console.log("This is the filter:"+JSON.stringify(this.filter));

	},

	//Function to Save session. Replace this.saveState with this.state when the save session in SAGE2 is working

	saveSession: function(){

		console.log("Saving session to file");
		var filename = "saved_session";
		var dimensions = {"width": this.mainDivW ,"height": this.mainDivH};
		var viewportDimensions = {"paper_mainW": this.paper_mainW, "paper_mainH": this.paper_mainH};
		var workableDimensions = {"workablePixelW":this.workablePixelW,"workablePixelH":this.workablePixelH};
		this.saveState["dimensions"] = dimensions;
		this.saveState["viewportDimensions"] = viewportDimensions;
		this.saveState["workableDimensions"] = workableDimensions;
		this.saveState["stickies"] = this.sticky_object_array;
		console.log("Save this:"+JSON.stringify(this.saveState));

	},
	

	readConferenceInfo: function(){
		var _this = this;
		readFile(this.resrcPath+"conferenceinfo.json", function(err,data){
			if (err) throw err;
			else{
			// console.log("ReadData"+ data);
			// console.log("numberOfThemes:"+data.numberOfThemes);
				_this.numberOfDays = data.numberOfDays;
				_this.numberOfHalls = data.numberOfHalls;
				_this.numberOfSessions = data.numberOfSessions;
				_this.numberOfThemes = data.numberOfThemes;
				_this.stickyColor = data.themes;
				_this.conferenceSchedulers = data.conferenceSchedulers;
				_this.numberOfSchedulers = _this.conferenceSchedulers.length;
				//Grid variables
				_this.numberOfRows = data.numberOfSessions;
				_this.numberOfColumns =  data.numberOfDays * data.numberOfHalls;
				_this.array_days = data.days;
				_this.array_dates = data.dates;
				_this.array_sessions = data.sessions;
				_this.array_halls = data.halls;
				_this.movesAllowed = data.movesAllowed;
				_this.array_session_constraints = data.sessionConstraints;
				console.log("StickyColor:"+ JSON.stringify(_this.stickyColor));
				for(var key in _this.stickyColor){
					_this.themeNames.push(key);
					//Creating empty arrays for holding catagorized sticky information
					_this.catagorizedStickies[key] = [];
				}
				console.log("catagorizedStickies:"+JSON.stringify(_this.catagorizedStickies));
				for(var i = 0; i< _this.array_sessions.length ; i++){
					console.log("Dates: " + i + ">"+ _this.array_sessions[i]);
				}
				_this.readPaperList();
				//_this.calculateVariables;
				_this.intializeGrid();
				_this.intializeControl();
				_this.intializeSticky();
				// _this.readSavedSession();

			}
  			// return data;
  		}, "JSON");
	},

	readPaperList: function(){
		var _this = this;
		readFile(this.resrcPath+"paperlist.json", function(err,data){
			if (err) throw err;
			else{
			// console.log("ReadData"+ data);
			_this.intializePostIts(data);
			}
  			// return data;
  		}, "JSON");
	},

	intializePostIts: function(paperlist){

		var longestPostItText = 0;
		if(paperlist != null){
			var postitinfo = [];

			// console.log("DATA"+ paperlist[1].date);
			for(var key = 0; key < paperlist.length ; key++){
				// console.log("From postit"+ paperlist[key]["Title"]);
				var currentPostItLength = 20; //Including length of "title:" and "speaker:"
				var title = paperlist[key]["Title"];
				var speaker = paperlist[key]["Speaker"];
				var theme = paperlist[key]["Theme"];

				currentPostItLength = title.length + speaker.length;
				if(currentPostItLength > longestPostItText){
					longestPostItText = currentPostItLength;
				}
				// console.log("Theme"+ theme);
				
				//Creating a sticky object and pushing into right catagory based on its theme.
				var newSticky = {};
				newSticky['title'] = title;
				newSticky['speaker'] = speaker;

				this.catagorizedStickies[theme].push(newSticky);
				// console.log("Objects"+JSON.stringify(newSticky));

			}
			this.longestPostItText = longestPostItText;
			this.drawPostIts(postitinfo);
			
		}

	},

	drawPostIts: function(postitinfo){
		//Getting ends of grid section
		var paper_gridXEnd = this.paper_gridXEnd;
		var paper_gridYEnd = this.paper_gridYEnd;

		//Getting svg bounds
		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		//Getting the size of sticky section
		var paper_stickyW = (paper_mainW - paper_gridXEnd) * 0.8;
		var paper_stickyH = paper_mainH * 0.8;

		//Creating table
		//Varibles for looping
		var sticky_offsetX = (paper_stickyW * 0.1);
		var sticky_offsetY = (paper_stickyH * 0.1);

		//Creating table
		//Varibles for looping
		var i;
		var j;

		//Holds the width and height of cell

		var oldCellW = paper_stickyW/(this.stickyReservoirRatio+1); //Calculating the width of theme cell
		var cellW = oldCellW;
		// var cellH = paper_stickyH/this.numberOfThemes;
		var cellH = parseInt(Math.min(paper_stickyH/this.numberOfThemes,cellW*1.5),10);
		var stickyReservoirW = cellW * (this.stickyReservoirRatio);

		//Holds location where the rectangle has to be created
		var cellX = paper_gridXEnd+sticky_offsetX+cellW;
		var cellY = sticky_offsetY;
		console.log("CellX:"+cellX+" : CellY: "+cellY);
		
		// //Create an array of stickies
		// this.array_sticky = [];
		// //Create Array of Sticky objects
		// this.sticky_object_array = [];

		var sticky_x1;
		var sticky_y1;
		var sticky_x2;
		var sticky_y2;
		var array_sticky = this.array_sticky;
		var counter = 0;


		//Post-it Width and Height
		var postItW = Math.min(stickyReservoirW/5,cellH/3) ;
		var postItH = postItW;

		//Updating the postit values
		this.postItW = postItW;
		this.postItH = postItH;
		// console.log(this.postItW + "&&&&" + this.postItH);

		//Gap between 2 stickies
		var padding = postItW * 0.3;
		console.log("padding:"+padding);
		this.padding = padding;

		//Finding the text size
		this.stickyFontSize = Math.floor(Math.sqrt((postItW * postItH * 0.5)/(this.longestPostItText)));
		console.log("longestPostItText:"+this.longestPostItText + "this.stickyFontSize:"+this.stickyFontSize);
		//Wrapping point 
		var wrapAt = paper_mainW - sticky_offsetX - padding - postItW;
		
		var stickyColor;

		//Creating Filter for shadow
		var f = this.paper_main.filter(Snap.filter.blur(padding/2,padding/2));
		this.filter = f;
		// this.g_allSticky = this.paper_main.g();
		// this.g_allSticky.attr({id: "g_allSticky"});
		

		for(var theme in this.catagorizedStickies){
			var cellActualY = cellY;
			console.log("=cfcfcfc=>"+theme);
			stickyColor = this.stickyColor[theme];
			for(var k = 0 ; k < this.catagorizedStickies[theme].length;k++){
				

				
				//Check if going out of bound
				if(cellX+postItW> wrapAt){
					cellX = paper_gridXEnd+sticky_offsetX+cellW;
					// cellY += cellH/2 - padding/2;
					cellY = sticky_y2;
				}

				//Intializing x1,x2, y1, y2 of sticky
				sticky_x1 =  cellX+padding;
				sticky_y1 =  cellY+padding;
				sticky_x2 =  sticky_x1+this.postItW;
				sticky_y2 =  sticky_y1+ this.postItH;

				//Pushing array of sticky info 
				array_sticky.push([sticky_x1,sticky_y1,sticky_x2,sticky_y2,parseFloat('0.0'),parseFloat('0.0')]);

				//Creating default transform property
				var defaultTransform = 'translate('+array_sticky[counter][4]+','+array_sticky[counter][5]+')';
				var defaultMatrix = 'matrix(1,0,0,1,'+array_sticky[counter][4]+','+array_sticky[counter][5]+')';

				//Reading Values for creating the HTML Text
				var stickyTitle = this.catagorizedStickies[theme][k]['title'];
				var stickySpeaker = this.catagorizedStickies[theme][k]['speaker'];
				var stickyFontSize = this.stickyFontSize;

				//Creating innerHTML for the sticky
				var title =  "<strong>Title:</strong> "+ stickyTitle;
				var speaker = "<strong>Speaker:</strong> "+ stickySpeaker;
				var htmlText = '<div xmlns="http://www.w3.org/1999/xhtml" style="color:black; font-size: '+stickyFontSize+'px">'
									+ title + '<br><br>' + speaker+ '</div>';

				//creating a group for group all elements of a sticky
				var g_sticky = this.paper_main.g().attr({
					id: "g_sticky"+counter,
					x: array_sticky[counter][0],
					y: array_sticky[counter][1],
					transform : defaultMatrix,
					tX:0, tY:0,
					stickyTheme: theme,
					stickyColor : stickyColor,
					htmlText: htmlText,
					stickyTitle: stickyTitle,
					stickySpeaker: stickySpeaker,
					stickyFontSize: stickyFontSize
				});
				// var svg_sticky = this.paper_main.svg(array_sticky[counter][0],array_sticky[counter][1],this.postItW+(padding/3),this.postItH+(padding/3)).attr({transform : defaultTransform});

				//Creating Sticky Shadow
				var sticky_shadow = this.paper_main.rect(array_sticky[counter][0]+(padding/this.shadowDepth),array_sticky[counter][1]+(padding/this.shadowDepth),this.postItW,this.postItH).attr({
					id:"sticky_shadow_"+counter,
					fill: this.shadowColor,
					filter: f
				});
				//Creating a sticky
				var sticky_1= this.paper_main.rect(array_sticky[counter][0],array_sticky[counter][1],this.postItW,this.postItH).attr({
					id:"sticky_rect_"+counter,
					fill: stickyColor,
					transform : defaultMatrix
				});


				//Add sticky and shadow to group.
				g_sticky.add(sticky_shadow);
				g_sticky.add(sticky_1);
				// g_sticky.add(sticky_triangle);
				// g_sticky.add(svg_sticky);
				


				//Creating a foreignObject which will have HTML wrappable text
				var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject'); //Create a path in SVG's namespace
					newElement.setAttribute('x', (array_sticky[counter][0]+(padding/3)));
       				newElement.setAttribute('y', (array_sticky[counter][1]+(padding/3)));
       				newElement.setAttribute('width',(this.postItW - (2*padding/3)));
       				newElement.setAttribute('height',(this.postItH - (2*padding/3)));
       				newElement.setAttribute('id',"sticky_fobj_"+counter);
					newElement.innerHTML = htmlText;
				var nodeFobj = 	g_sticky.append(newElement);

				// console.log("Following SVG Group is created: "+ JSON.stringify(g_sticky));
				//Pushing into sticky group object
				this.sticky_object_array.push(g_sticky);

				this.g_allSticky.add(g_sticky);

				// Move x, y
				cellX = sticky_x2;

				
				// console.log("cellX for next sticky of same theme:"+cellX);
				//Increase the counter
				counter++;
			}
			//Change themeReservoir
			//Reset X
			cellX = paper_gridXEnd+sticky_offsetX+cellW;
			cellY= cellActualY+cellH;
		}
		//THIS IS THE RIGHT PLACE
		// this.readSavedSession();
		
	},


	createSnapPaper: function(){
		//Getting Main Window Pixel Value
		var mainDivW = this.mainDivW;
		var mainDivH = this.mainDivH;

		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		//Creating a snap paper.
		this.paper_main= new Snap(paper_mainW,paper_mainH).attr({ 
			viewBox: "0 0 "+ paper_mainW.toString()+ " "+ paper_mainH,
			id: "paper_main",
  			width:   mainDivW,
  			//height:  parseInt(2.6*grid, 10) // DONOT DELETE For future reference
  			height:  mainDivH,
  			// preserveAspectRatio: "xMinYMin meet" //For top left. Default is center.
  			// preserveAspectRatio: 'none'
  			fontFamily:"Tahoma, Geneva, sans-serif"
		});

		//Add the snap container to the div
		this.element.appendChild(this.paper_main.node);
		// this.state.hello = "This will be saved in state!";
		// data.state.hello = this.state.hello;
	},

	createPartitions: function(){
		//Getting ends of grid section
		var paper_gridXEnd = this.paper_gridXEnd;
		var paper_gridYEnd = this.paper_gridYEnd;

		//Getting svg bounds
		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		//Drawing Rectangles for each section

		//Section 1: Grid
		this.rect_grid = this.paper_main.rect(0,0,paper_gridXEnd,paper_gridYEnd).attr({
			fill:        this.defaultFill,
			stroke:      this.defaultStroke,
			strokeWidth: 3
		});

		//Section 2: Sticky
		this.rect_sticky = this.paper_main.rect(paper_gridXEnd,0,paper_mainW -paper_gridXEnd,paper_mainH).attr({
			fill:        this.defaultFill,
			stroke:      this.defaultStroke,
			strokeWidth: 3
		});

		//Section 3: Control
		this.rect_control = this.paper_main.rect(0,paper_gridYEnd,paper_gridXEnd,paper_mainH - paper_gridYEnd).attr({
			fill:        this.defaultFill,
			stroke:      this.defaultStroke,
			strokeWidth: 3
		});

		//Testing how gropping works
		this.g_partition = this.paper_main.g();
		this.g_partition.attr({ id: 'g_partition'});
		this.g_partition.add(this.rect_grid, this.rect_sticky, this.rect_control);

	},

	intializeGrid: function(){
		//Getting ends of grid section
		var paper_gridXEnd = this.paper_gridXEnd;
		var paper_gridYEnd = this.paper_gridYEnd;

		//Getting svg bounds
		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		var paper_tableX1 = paper_gridXEnd * 0.2;
		var paper_tableX2 = paper_gridXEnd *(1-0.05);
		var paper_tableY1 = paper_gridYEnd * 0.3;
		var paper_tableY2 = paper_gridYEnd*(1-0.05);

		var paper_tableW = paper_tableX2 - paper_tableX1;
		var paper_tableH = paper_tableY2 - paper_tableY1;

		//sneha code start		
		this.paper_tableW = paper_tableW;
		this.paper_tableH = paper_tableH;

		this.paper_tableX1 = paper_tableX1;
		this.paper_tableY1 = paper_tableY1;
		//sneha code end

		//Creating table
		//Varibles for looping
		var i;
		var j;

		var cellW = paper_tableW/this.numberOfDays;
		var cellH = parseInt(Math.min(paper_tableH/this.numberOfRows, paper_tableW/this.numberOfColumns),10);
		cellW = cellH * this.numberOfHalls;
		// var cellH = paper_tableH/this.numberOfRows;

		//Creating group of headers
		this.g_gridHeaders = this.paper_main.g();
		this.g_gridHeaders.attr({ id: 'g_gridHeaders'});
		//Height of Day Headers
		var dayH = cellW*0.25;

		var cellX = paper_tableX1;
		var cellY = paper_tableY1 - cellH - dayH;

		//But, before that, display title
		var titleText = this.paper_main.text((this.paper_gridXEnd/2),cellY*0.8 ,"Conference Scheduler").attr({
				fill: this.textColor,
				'font-size': "40",
				"text-anchor" : "middle"
		});

		//Find length of the partition line
		var partitionLength = cellY+dayH+(cellH*(this.numberOfRows+1));

		var partitionColor = this.textColor;
		//Printing Day1, Day2 etc.
		for(var k = 0;k<this.numberOfDays;k++){
			var dayPartition = this.paper_main.line(cellX, cellY,cellX,partitionLength).attr({ stroke:partitionColor, strokeWidth: 6});
			var headRect = this.paper_main.rect(cellX, cellY, cellW, dayH).attr({
				fill:        this.defaultButtonFill,
				stroke:      this.defaultStroke,
				strokeWidth: 3
				});
			var dayText = this.paper_main.text(cellX+(cellW*0.5),cellY+(dayH*0.5),"Day "+(k+1)+": "+this.array_days[k]+", "+this.array_dates[k]).attr({
				fill: this.textColor,
				'font-size': this.txtSize,
				"text-anchor" : "middle"
			});
			//Add header to the group
			this.g_gridHeaders.add(headRect);
			this.g_gridHeaders.add(dayPartition);
			this.g_gridHeaders.add(dayText);
			cellX += cellW;
		}
		//Drawing the last line and add it to the group
		var dayPartition = this.paper_main.line(cellX, cellY,cellX,partitionLength).attr({ stroke:partitionColor, strokeWidth: 6});
		this.g_gridHeaders.add(dayPartition);


		//Holds the width and height of cell
		// cellW = paper_tableW/this.numberOfColumns;
		cellW = cellH;

		//UNCOMMENT 
		// cellH = parseInt(Math.min(paper_tableH/this.numberOfRows, cellW),10);

		var sessionW = cellW*2;



		cellX = paper_tableX1-sessionW;
		cellY = paper_tableY1;

		//Saving this for refering it in controls.
		this.controlsLeftPadding = cellX;

		//Session
		for(var k = 0;k<this.numberOfSessions;k++){
			
			var sessionRect = this.paper_main.rect(cellX, cellY, sessionW, cellH).attr({
				fill:        this.defaultFill,
				stroke:      this.defaultStroke,
				strokeWidth: 3
				});
			var sessionText = this.paper_main.text(cellX+(sessionW*0.5),cellY+(cellH*0.7),this.array_sessions[k]).attr({
				fill: this.textColor,
				'font-size': this.txtSize,
				"text-anchor" : "middle"
			});
			//Add header to the group
			this.g_gridHeaders.add(sessionRect);
			this.g_gridHeaders.add(sessionText);
			cellY += cellH;
		}
		
		//Halls
		//Holds location where the rectangle has to be created
		cellX = paper_tableX1;
		cellY = paper_tableY1-cellH;


		//Start the loop to print hall names
		for(var k = 0; k< this.numberOfColumns; k++){
			var hallRect = this.paper_main.rect(cellX, cellY, cellW, cellH).attr({
				fill:        this.defaultFill,
				stroke:      this.defaultStroke,
				strokeWidth: 3
				});
			// var hallText = this.paper_main.text(cellX+(cellW*0.5),cellY+(cellH*0.7),"Hall "+(((k)%this.numberOfHalls)+1)).attr({fill: this.textColor, "text-anchor" : "middle", fontFamily: "Tahoma, Geneva, sans-serif"});
			var hallText = this.paper_main.text(cellX+(cellW*0.5),cellY+(cellH*0.7),this.array_halls[k%this.numberOfHalls]).attr({
				fill: this.textColor,
				'font-size': this.txtSize,
				"text-anchor" : "middle",
				fontFamily: "Tahoma, Geneva, sans-serif"
			});
			//Add header to the group
			this.g_gridHeaders.add(hallRect);
			this.g_gridHeaders.add(hallText);
			cellX += cellW;
		}

		//Print image rect
		var imgW = sessionW;
		var imgH = dayH+cellH;
		var imgX = paper_tableX1 - imgW;
		var imgY = paper_tableY1 - imgH;
		var imgRect = this.paper_main.rect(imgX, imgY, imgW, imgH).attr({
				fill:        this.defaultFill,
				// stroke:      this.defaultStroke,
				stroke: this.defaultStroke,
				strokeWidth: 3
				});
		imgX=imgX+((imgW-imgH)/2);
		var imgImage = this.paper_main.image(this.resrcPath +"ConferenceScheduler.png",imgX, imgY+1.5, imgH, imgH-3);	
		// var s = Snap("#paper_main");	
		// Snap.load(this.resrcPath +"logo.svg", onSVGLoaded ) ;

		// function onSVGLoaded( data ){ 
		//     this.g_gridHeaders.append( data );
		// }			

		this.g_gridHeaders.add(imgRect);
		this.g_gridHeaders.add(imgImage);

		// hidden rects: the dotted rectangles between two days

		var ratioOfCell = this.ratioOfCell;
		var mhoffset = cellW/ratioOfCell;
		//Update cellW to new width for hidden rects
		var hiddencellW = mhoffset;
		//Holds location where the  hidden rectangle has to be created
		cellX = paper_tableX1 + (cellW - mhoffset);
		cellY = paper_tableY1;

		//Set the global Holder Size
		this.holderW = cellW;
		this.holderH = cellH;

		//Create a group for grid cell
		this.g_gridhiddenholders = this.paper_main.g();
		this.g_gridhiddenholders.attr({ id : 'g_gridhiddenholders'})

		//Creating array of holders
		this.hiddenholder_object_array = [];
		var defaultTransform = 'translate(0,0)';
		var defaultMatrix = 'matrix(1,0,0,1,0,0)';
		var cellCounter = 0;
		var hallCounter = 1; 
		//Loop that creates rectangles
		for(i = 0;i<this.numberOfRows;i++){
			hallCounter = 1;
			for(j=0;j<this.numberOfColumns-this.numberOfDays;j++ ){
				if(hallCounter%this.numberOfHalls == 0){
					cellX +=this.holderW;
					hallCounter = 1;
				}
				var numberOfSubPartitions = this.numberOfHalls - hallCounter;
				// var hiddencellH = cellH/numberOfSubPartitions;
				var hiddencellH = cellH;
				var cellRect = this.paper_main.rect(cellX, cellY, hiddencellW, hiddencellH).attr({
					id: "HiddenHolder_"+cellCounter,
					fill:        this.defaultFill,
					// fill:        "pink",
					stroke:      this.defaultStroke,
					strokeWidth: 1,
					'stroke-dasharray':"5,5",
					transform: defaultMatrix,
					holdsSticky: ""
				});
				//Add the cell to group
				this.g_gridhiddenholders.add(cellRect);
				//Pusing the rect in holder
				this.hiddenholder_object_array.push(cellRect);
				//Update value of the x-coordinate
				cellX +=this.holderW;
				//Increase the counter value
				cellCounter++;
				hallCounter++;
			}
			//Update value of the y-coordinate
			cellY += cellH;
			//Reset Value of x-coordinate
			cellX = paper_tableX1+(cellW - mhoffset);
		}//End of loop that creates rectangles


		//CREATING CELLS
		//Holds location where the rectangle has to be created
		cellX = paper_tableX1;
		cellY = paper_tableY1;

		// //Set the global Holder Size //UNcomment if Hidden Rects are deleted in future
		// this.holderW = cellW;
		// this.holderH = cellH;

		//Create a group for grid cell
		this.g_gridholders = this.paper_main.g();
		this.g_gridholders.attr({ id : 'g_gridholders'})

		//Creating array of holders
		this.holder_object_array = [];
		var defaultTransform = 'translate(0,0)';
		var defaultMatrix = 'matrix(1,0,0,1,0,0)';
		var cellCounter = 0;
		var hallCounter = 0;
		//Loop that creates rectangles
		for(i = 0;i<this.numberOfRows;i++){
			for(j=0;j<this.numberOfColumns;j++ ){
				if(hallCounter>this.numberOfHalls - 1){
					hallCounter = 0;
				}
				var cellColor = this.defaultFill;
				var sessionConstraint = this.array_session_constraints[i];
				if(sessionConstraint != ""){
					cellColor = "rgba(150,150,150,0.3)";
				}
				//For reference : Paper.rect(x,y,width,height,[rx],[ry])
				var cellRect = this.paper_main.rect(cellX, cellY, cellW, cellH).attr({
					id: "Holder_"+cellCounter,
					fill:     cellColor,   
					stroke:      this.defaultStroke,
					strokeWidth: 2,
					transform: defaultMatrix,
					holdsSticky: "",
					hallNumber: hallCounter,
					sessionConstraint: sessionConstraint
				});
				//Add the cell to group
				this.g_gridholders.add(cellRect);
				//Pusing the rect in holder
				this.holder_object_array.push(cellRect);
				//Update value of the x-coordinate
				cellX +=cellW;
				//Increase the counter value
				cellCounter++;
				hallCounter++;
			}
			//Update value of the y-coordinate
			cellY += cellH;
			//Reset Value of x-coordinate
			cellX = paper_tableX1;
		}//End of loop that creates rectangles
	},

	intializeSticky: function(){

		//Getting ends of grid section
		var paper_gridXEnd = this.paper_gridXEnd;
		var paper_gridYEnd = this.paper_gridYEnd;

		//Getting svg bounds
		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		//Getting the size of sticky section
		var paper_stickyW = (paper_mainW - paper_gridXEnd) * 0.8;
		var paper_stickyH = paper_mainH * 0.8;

		//Creating table
		//Varibles for looping
		var sticky_offsetX = (paper_stickyW * 0.1);
		var sticky_offsetY = (paper_stickyH * 0.1);

		//Holds the width and height of cell

		var oldCellW = paper_stickyW/(this.stickyReservoirRatio+1); //Calculating the width of theme cell
		var cellW = oldCellW;
		// var cellH = paper_stickyH/this.numberOfThemes;
		var cellH = parseInt(Math.min(paper_stickyH/this.numberOfThemes,cellW*1.5),10);
		var stickyReservoirW = cellW * (this.stickyReservoirRatio);

		//Holds location where the rectangle has to be created
		var cellX = paper_gridXEnd + sticky_offsetX;
		var cellY = sticky_offsetY;

		//Creating group for theme headers
		this.g_themeHeaders = this.paper_main.g();
		this.g_themeHeaders.attr({ id: 'g_themeHeaders'});

		//Creating Theme headers
		for(var k = 0; k<this.numberOfThemes;k++){
			var themeRect = this.paper_main.rect(cellX, cellY, cellW, cellH).attr({
				fill:        this.defaultFill,
				stroke:      this.defaultStroke,
				strokeWidth: 3
				});
			var  themeText = this.paper_main.text(cellX+(cellW*0.5),cellY+(cellH*0.5),this.themeNames[k]).attr({
				fill: this.textColor,
				'font-size': this.txtSize,
				"text-anchor" : "middle"
			});
			this.g_themeHeaders.add(themeRect);
			this.g_themeHeaders.add(themeText);
			cellY += cellH;
		}

		//Theme Reservoir Creation

		//Moving the X to right
		cellX += cellW;

		//Moving the Y back to top
		cellY = sticky_offsetY;

		//Changing the width of Theme Pool
		cellW = stickyReservoirW; 

		//Creating group for theme Reservoir
		this.g_themeReservoir = this.paper_main.g();
		this.g_themeReservoir.attr({id:'g_themeReservoir'});
		//Creating Theme Reservoirs
		for(var k = 0; k<this.numberOfThemes;k++){
			var themeRect = this.paper_main.rect(cellX, cellY, cellW, cellH).attr({
				fill:        this.defaultFill,
				stroke:      this.defaultStroke,
				strokeWidth: 3
				});
			this.g_themeReservoir.add(themeRect)
			cellY += cellH;
		}
		//Create Sticky Group
		this.g_allSticky = this.paper_main.g();
		this.g_allSticky.attr({id: "g_allSticky"});
//-> Correct place for readPaperList if no load
		// this.readPaperList();
	},

	intializeControl: function(){
		//Getting ends of grid section
		var paper_gridXEnd = this.paper_gridXEnd;
		var paper_gridYEnd = this.paper_gridYEnd;

		//Getting svg bounds
		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		//Getting size of control section
		var paper_controlW = paper_gridXEnd;
		var paper_controlH = paper_mainH - paper_gridYEnd;

		var buttonH = paper_controlH*0.7;
		var buttonPadding = paper_controlH*0.1;
		var buttonW = ((paper_controlW - this.controlsLeftPadding)/this.numberOfButtons) - (2*buttonPadding);
		
		var buttonColor = this.textColor;
		var buttonTextColor = this.textColor;
		// var buttonH = paper_controlH*0.7;
		// var buttonW = buttonH * 5;
		// var buttonPadding = paper_controlH*0.1;

		this.buttonW = buttonW;
		this.buttonH = buttonH;
		this.buttonPadding = buttonPadding;
		
		//Button 1
		this.g_button1 = this.paper_main.g();
		this.g_button1.attr({
			id: "Button1"
		});

		var button1X = this.controlsLeftPadding;
		var button1Y = paper_gridYEnd+this.buttonPadding;

		var button_tutorial = this.paper_main.rect(button1X,button1Y,this.buttonW,this.buttonH).attr({
			fill:        this.defaultButtonFill,
			stroke:      this.defaultStroke,
			strokeWidth: 3		
		});

		var text_tutorial = this.paper_main.text(button1X+(this.buttonW*0.5),button1Y+(this.buttonH*0.6), "Tutorials").attr({
			fill: buttonTextColor,
			'font-size':"40" ,
			"text-anchor" : "middle"
		});
		
		this.g_button1.add(button_tutorial);
		this.g_button1.add(text_tutorial);

		//Button 2
		this.g_button2 = this.paper_main.g();
		this.g_button2.attr({
			id: "Button2"
		});

		var button2X = button1X + this.buttonW + this.buttonPadding;
		var button2Y = paper_gridYEnd+this.buttonPadding;

		
		var button_roomInfo = this.paper_main.rect(button2X,button2Y,this.buttonW,this.buttonH).attr({
			// fill: "#330099",
			// stroke: "#ffffff"
			fill:        this.defaultButtonFill,
			stroke:      this.defaultStroke,
			strokeWidth: 3
		
		});
				
		var text_roomInfo = this.paper_main.text(button2X+(this.buttonW*0.5),button2Y+(this.buttonH*0.6), "Room Info.").attr({
			fill: buttonTextColor,
			'font-size':"40" ,
			"text-anchor" : "middle"
		});
		
		this.g_button2.add(button_roomInfo);
		this.g_button2.add(text_roomInfo);

		//Button 3
		this.g_button3 = this.paper_main.g();
		this.g_button3.attr({
			id: "Button3"
		});

		var button3X = button2X + this.buttonW + this.buttonPadding;
		var button3Y = paper_gridYEnd+this.buttonPadding;

		var button_floorPlan = this.paper_main.rect(button3X,button3Y,this.buttonW,this.buttonH).attr({
			// fill: "#330099",
			// stroke: "#ffffff"
			fill:        this.defaultButtonFill,
			stroke:      this.defaultStroke,
			strokeWidth: 3
		
		}); 
		
		
		var text_floorPlan = this.paper_main.text(button3X+(this.buttonW*0.5),button3Y+(this.buttonH*0.6), "Floor Plan").attr({
			fill: buttonTextColor,
			'font-size':"40" ,
			"text-anchor" : "middle"
		});
		
		this.g_button3.add(button_floorPlan);
		this.g_button3.add(text_floorPlan);

		//Button 4
		this.g_button4 = this.paper_main.g();
		this.g_button4.attr({
			id: "Button4"
		});
		
		var button4X = button3X + this.buttonW + this.buttonPadding;
		var button4Y = paper_gridYEnd+this.buttonPadding;

		var button_next = this.paper_main.rect(button4X,button4Y,this.buttonW,this.buttonH).attr({
			// fill: "#330099",
			// stroke: "#ffffff"
			fill:        this.defaultButtonFill,
			stroke:      this.defaultStroke,
			strokeWidth: 3
		
		});
		
		var text_next = this.paper_main.text(button4X+(this.buttonW*0.5),button4Y+(this.buttonH*0.6), "Next Scheduler").attr({
			fill: buttonTextColor,
			'font-size':"40" ,
			"text-anchor" : "middle"
		});
		this.g_button4.add(button_next);
		this.g_button4.add(text_next);


		//Button 5
		this.g_button5 = this.paper_main.g();
		this.g_button5.attr({
			id: "Button5"
		});

		var button5X = button4X + this.buttonW + this.buttonPadding;
		var button5Y = paper_gridYEnd+this.buttonPadding;

		var turn_buttonW = this.buttonPadding+(this.buttonW*2);
		var button_turn = this.paper_main.rect(button5X,button5Y,turn_buttonW,this.buttonH).attr({
			// fill: "#330099",
			// stroke: "#ffffff"
			fill:        this.defaultFill,
			stroke:      this.defaultStroke,
			strokeWidth: 3,
			'stroke-dasharray':"5,5"
		
		});
		
		// var turn=this.turn + 1; //Because we are starting from 0;
		this.turnInfo = [button5X+(turn_buttonW*0.5),button5Y+(this.buttonH*0.6)]; //Saving value for future reference.
		var turnString = "Current Scheduler: "+this.conferenceSchedulers[this.currentScheduler]["Name"];
		this.text_turn= this.paper_main.text(this.turnInfo[0],this.turnInfo[1], turnString).attr({
			fill: this.stickyColor[this.conferenceSchedulers[this.currentScheduler]["Theme"]],
			'font-size':"40" ,
			"text-anchor" : "middle"
		});
		
		this.g_button5.add(button_turn);
		// this.g_button5.add(this.text_turn);
		
		// //Button 6
		// this.g_button6 = this.paper_main.g();
		// this.g_button6.attr({
		// 	id: "Button6"
		// });

		// var button6X = button5X + this.buttonW + this.buttonPadding;
		// var button6Y = paper_gridYEnd+this.buttonPadding;

		
		// var button_load = this.paper_main.rect(button6X,button6Y,this.buttonW,this.buttonH).attr({
		// 	// fill: "#330099",
		// 	// stroke: "#ffffff"
		// 	fill:        this.defaultFill,
		// 	stroke:      this.defaultStroke,
		// 	strokeWidth: 3
		
		// });
		
		
		// var text_load = this.paper_main.text(button6X+(this.buttonW*0.5),button6Y+(this.buttonH*0.6), "Next").attr({
		// 	fill: buttonTextColor,
		// 	'font-size':"40" ,
		// 	"text-anchor" : "middle"
		// });
		
		// this.g_button6.add(button_load);
		// this.g_button6.add(text_load);


		// //Button 7
		// this.g_button7 = this.paper_main.g();
		// this.g_button7.attr({
		// 	id: "Button7"
		// });

		// var button7X = button6X + this.buttonW + this.buttonPadding;
		// var button7Y = paper_gridYEnd+this.buttonPadding;

		
		// var button_new = this.paper_main.rect(button7X,button7Y,this.buttonW,this.buttonH).attr({
		// 	// fill: "#330099",
		// 	// stroke: "#ffffff"
		// 	fill:        this.defaultFill,
		// 	stroke:      this.defaultStroke,
		// 	strokeWidth: 3
		
		// });
		
		
		// var text_new = this.paper_main.text(button7X+(this.buttonW*0.5),button7Y+(this.buttonH*0.6), "New").attr({
		// 	fill: buttonTextColor,
		// 	'font-size':"40" ,
		// 	"text-anchor" : "middle"
		// });
		
		// this.g_button7.add(button_load);
		// this.g_button7.add(text_load);	

		this.g_buttonGroup = this.paper_main.g();
		this.g_buttonGroup.attr({
			id: "g_buttons"
		});
		this.g_buttonGroup.add(this.g_button1);
		this.g_buttonGroup.add(this.g_button2);
		this.g_buttonGroup.add(this.g_button3);
		this.g_buttonGroup.add(this.g_button4);
		this.g_buttonGroup.add(this.g_button5);

		// this.readSavedSession();
	},

//<== Play Area ends

	load: function(date) {
		console.log('ConferenceScheduler> Load with state value', this.state.value);
		console.log("State:"+ JSON.stringify(data));
		this.refresh(date);
	},

	draw: function(date) {
		console.log('ConferenceScheduler> Draw with state value', this.state.value);
	},

	resize: function(date) {

		//Get the Window height and width
		var mainDivW = parseInt(this.element.style.width,  10);
		var mainDivH = parseInt(this.element.style.height, 10);

		//Calculating SVG viewport width and height
		//UPDATE REQUIRED: make sure the aspect ratio when the the window is resized, and refreshed.
		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		//Resizing the snap grid paper
		this.paper_main.attr({
  			width: mainDivW,
  			height: mainDivH
  		});

  		//Updating main window width and height 
		this.mainDivW = mainDivW;
		this.mainDivH = mainDivH;


		this.updatePositionTracker();

		//Refreshing
		this.refresh(date);
	},
	move: function(date) {
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

//==> Play Area

	findStickyId: function(paperX,paperY){
		var result = null;
		var postItW = this.postItW;
		var postItH = this.postItH;
	
		for (var key in this.sticky_object_array) {
 			// console.log(">%^^^^$#%"+ JSON.stringify(this.sticky_object_array[key]));

 			//Get X and Y co-ordinates
 			var sticky_X = parseFloat(this.sticky_object_array[key].attr("x"));
 			var sticky_Y = parseFloat(this.sticky_object_array[key].attr("y"));

 			//Get Tranform values
			var transformString = this.sticky_object_array[key].attr().transform;
			// console.log("Total Rect sticky tranform matrix:"+transformString);
			// var tXY = transformString.split(',');
			// var tX = parseFloat(tXY[0].slice(1),10);
			// var tY = parseFloat(tXY[1],10);
			// console.log("TX:"+tX+"TY: "+tY);


			var currentMatrix = transformString.slice(7,-1).split("\,");
			// console.log("currentMatrix:" +currentMatrix);
     
      		for(var i=0; i<currentMatrix.length; i++) {
      			currentMatrix[i] = parseFloat(currentMatrix[i]);
      			// console.log("HI:"+ i+ " ->"+ JSON.stringify(currentMatrix[i]));
     		}

     		var scaleX = currentMatrix[0];
			var scaleY = currentMatrix[3];

   			// var tX = currentMatrix[4];
			// var tY = currentMatrix[5];
			var tX = parseFloat(this.sticky_object_array[key].attr("tX"));
 			var tY = parseFloat(this.sticky_object_array[key].attr("tY"));
			// console.log("TX:"+tX+"TY: "+tY);



			//Find resulting co ordinates by adding location and translation
			var rX = sticky_X+tX;
			var rY = sticky_Y+tY;
			


			//Find if the mouse click was on sticky
			if(paperX >= rX && paperX < rX+(postItW*scaleX) && paperY >= rY && paperY < rY+(postItH*scaleY)){
				result = key;
				break;
			}
			// console.log("**VSD**"+transformString);
			// console.log("tsdX:"+tX+ "tsdY: "+tY);

 		}

		return result;
	},


	findHolderId: function(paperX,paperY){
		var result = null;
		var holderW = this.holderW;
		var holderH = this.holderH;
		for (var key in this.holder_object_array) {
 			// console.log(">%^^^^$#%"+ JSON.stringify(this.sticky_object_array[key]));

 			//Get X and Y co-ordinates
 			var holder_X = parseFloat(this.holder_object_array[key].attr("x"));
 			var holder_Y = parseFloat(this.holder_object_array[key].attr("y"));
 			var holdsSticky = this.holder_object_array[key].attr("holdsSticky");
 			console.log("holdsSticky:"+holdsSticky);
 			//Get Tranform values
			var transformString = this.holder_object_array[key].attr().transform;
			// console.log("Total Rect holder tranform matrix:"+transformString);
			// var tXY = transformString.split(',');
			// var tX = parseFloat(tXY[0].slice(1),10);
			// var tY = parseFloat(tXY[1],10);

			// console.log("TX:"+tX+"TY: "+tY);

			var currentMatrix = transformString.slice(7,-1).split("\,");
			// console.log("currentMatrix:" +currentMatrix);
     
      		for(var i=0; i<currentMatrix.length; i++) {
      			currentMatrix[i] = parseFloat(currentMatrix[i]);
      			// console.log("HI:"+ i+ " ->"+ JSON.stringify(currentMatrix[i]));
     		}

     		var tX = currentMatrix[4];
			var tY = currentMatrix[5];
			// console.log("TX:"+tX+"TY: "+tY);


			//Find resulting co ordinates by adding location and translation
			var rX = holder_X+tX;
			var rY = holder_Y+tY;


			//Find if the mouse click was on sticky
			// if(paperX >= rX && paperX < rX+holderW && paperY >= rY && paperY < rY+holderH){
			if(paperX >= rX && paperX < rX+holderW && paperY >= rY && paperY < rY+holderH){
				// console.log("Found Sticky");
				// if(holdsSticky == null){
					// console.log("FALSE");
					if(holdsSticky != null){ console.log("Holds Following sticky:"+holdsSticky);}
					result = key;
				// }
				break;
			}
			// console.log("**VSD**"+transformString);
			// console.log("tsdX:"+tX+ "tsdY: "+tY);

 		}

		return result;
	},


	findNeighbourHolderId: function(paperX,paperY,holderId){
		var neighbour = parseInt(holderId) +1;
		console.log("Neighbour Calc:"+neighbour);
 		var totalNumberOfCells = this.holder_object_array.length;
 		console.log("number of cells:"+totalNumberOfCells);
 		if(neighbour >= totalNumberOfCells || neighbour%this.numberOfColumns == 0 || parseInt(this.holder_object_array[neighbour].attr("hallNumber")) == 0){
 			console.log("Returning this null");
 			return null;
 		}
 		else{
			var result = null;
			var holderW = this.holderW;
			var holderH = this.holderH;
	 			// console.log(">%^^^^$#%"+ JSON.stringify(this.sticky_object_array[key]));

	 			//Get X and Y co-ordinates
	 		var holder_X = parseFloat(this.holder_object_array[holderId].attr("x"));
	 		var holder_Y = parseFloat(this.holder_object_array[holderId].attr("y"));

	 		var neighbourHoldsSticky = this.holder_object_array[neighbour].attr("holdsSticky");
	 		console.log("neighbourHoldsSticky:"+neighbourHoldsSticky);

	 		//Get Tranform values
			var transformString = this.holder_object_array[holderId].attr().transform;
				// console.log("Total Rect holder tranform matrix:"+transformString);
				// var tXY = transformString.split(',');
				// var tX = parseFloat(tXY[0].slice(1),10);
				// var tY = parseFloat(tXY[1],10);

				// console.log("TX:"+tX+"TY: "+tY);
				var currentMatrix = transformString.slice(7,-1).split("\,");
				// console.log("currentMatrix:" +currentMatrix);
	     
	      		for(var i=0; i<currentMatrix.length; i++) {
	      			currentMatrix[i] = parseFloat(currentMatrix[i]);
	      			// console.log("HI:"+ i+ " ->"+ JSON.stringify(currentMatrix[i]));
	     		}

	     		var tX = currentMatrix[4];
				var tY = currentMatrix[5];
				// console.log("TX:"+tX+"TY: "+tY);


				//Find resulting co ordinates by adding location and translation
				var rX = holder_X+tX;
				var rY = holder_Y+tY;

				var mhoffset = holderW - (holderW/this.ratioOfCell);

				//Find if the mouse click was on sticky
				// if(paperX >= rX && paperX < rX+holderW && paperY >= rY && paperY < rY+holderH){
				if(paperX >= rX + mhoffset && paperX < rX+holderW&& paperY >= rY && paperY < rY+holderH){
					// if(neighbourHoldsSticky != null){
						result = [neighbour];
					// }

				}
			return result;
		}
	},


	updatePositionTracker: function() {

		var mainDivW = this.mainDivW;
		var mainDivH = this.mainDivH;
	
		var orgMainDivW = this.orgMainDivW;
		var orgMainDivH = this.orgMainDivH;


		//Can remove this, but keep it, incase of any bug in future
		// this.paper_gridXEnd = this.paper_mainW * this.gridWRatio;
		// this.paper_gridYEnd = this.paper_mainH * this.gridHRatio;
		
		//Getting ends of grid section
		var paper_gridXEnd = this.paper_gridXEnd;
		var paper_gridYEnd = this.paper_gridYEnd;

		//Getting svg bounds
		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		//Getting the size of sticky section
		var paper_stickyW = paper_mainW - paper_gridXEnd;
		var paper_stickyH = paper_mainH;

		//Getting size of control
		var paper_controlW = paper_gridXEnd;
		var paper_controlH = paper_mainH - paper_gridYEnd;

		// var x = position.x;
		// var y = position.y;

		var workablePixelW;
		var workablePixelH;

		var originalHWRatio = orgMainDivH/orgMainDivW;

		var newHWRatio = mainDivH/mainDivW;

		var offsetWorkZoneX = 0;
		var offsetWorkZoneY = 0;

		if(newHWRatio<originalHWRatio){
			// console.log("Width has Black Patch");
			var newHtoOldHRatio = mainDivH/orgMainDivH;

			workablePixelW = orgMainDivW*newHtoOldHRatio;
			workablePixelH = mainDivH;

			var offsetPixelX = (mainDivW - workablePixelW)/2;
			offsetWorkZoneX = (offsetPixelX/workablePixelW) * paper_mainW;
			offsetWorkZoneY = 0;
		}
		else if(newHWRatio>originalHWRatio){
			// console.log("Height has Black Patch");
			var newWtoOldWRatio = mainDivW/orgMainDivW;

			workablePixelW = mainDivW;
			workablePixelH = orgMainDivH*newWtoOldWRatio;
			
			var offsetPixelY = (mainDivH - workablePixelH)/2;
			offsetWorkZoneX = 0;
			offsetWorkZoneY = (offsetPixelY/workablePixelH) * paper_mainH;
		}
		else{
			console.log("No Black Patch");
			workablePixelW = mainDivW;
			workablePixelH = mainDivH;
		}

		//Update the global values
		this.workablePixelW = workablePixelW;
		this.offsetWorkZoneX = offsetWorkZoneX;
		this.workablePixelH = workablePixelH;
		this.offsetWorkZoneY = offsetWorkZoneY;

	},

	//display feedback

	displayFeedback: function(paperX,paperY,message,fw, fh){
		//Display Feedback
						var feedback_W = fw;
						var feedback_H = fh;
						var feedback_X = paperX - feedback_W;
						var feedback_Y = paperY - feedback_H;
						
						var feedback_filter = this.paper_main.filter(Snap.filter.blur(20,20));
						var feedback_textSize = this.txtSize*2;
						var feedback_textColor = "rgb(182,34,32)";
						var feedback_padding = feedback_textSize;
						this.g_feedback = this.paper_main.g();
						var feedback_shadow = this.paper_main.rect(feedback_X,feedback_Y,feedback_W,feedback_H).attr({
							id: "feedback_shadow",
							fill: "rgba(255,255,255,0.40)",
							filter: feedback_filter
						});
						this.g_feedback.add(feedback_shadow);
						var feedback_rect = this.paper_main.rect(feedback_X,feedback_Y,feedback_W,feedback_H).attr({
							id: "feedback_rect",
							fill: "rgba(0,0,0,0.70)",
							stroke: "rgba(255,255,255,0.30)"
						});
						this.g_feedback.add(feedback_rect);
						var htmlText = '<div xmlns="http://www.w3.org/1999/xhtml" style="color:'+feedback_textColor+'; font-size: '+feedback_textSize+'px"> '+message+'<br></div>';
						var feedback_fObj = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject'); //Create a path in SVG's namespace
						feedback_fObj.setAttribute('x',feedback_X + feedback_textSize);
       					feedback_fObj.setAttribute('y',feedback_Y + feedback_textSize);
       					feedback_fObj.setAttribute('width',feedback_W - (2*feedback_textSize));
       					feedback_fObj.setAttribute('height',feedback_H - (2*feedback_textSize));
       					feedback_fObj.setAttribute('id',"feedback_fobj");
       					
						feedback_fObj.innerHTML = htmlText;
						this.g_feedback.append(feedback_fObj);
						//End of Display Feedback
	},

//End of Play Area

	event: function(eventType, position, user, data, date) {
		var emptyArray = [0,0,0,0];

		var mainDivW = this.mainDivW;
		var mainDivH = this.mainDivH;
		//=>Added
		var orgMainDivW = this.orgMainDivW;
		var orgMainDivH = this.orgMainDivH;

		var offsetW = ((mainDivW - orgMainDivW)/2)/mainDivW * paper_mainW;
		var offsetH = ((mainDivH - orgMainDivH)/2)/mainDivH * paper_mainH;

		this.paper_gridXEnd = this.paper_mainW * this.gridWRatio;
		this.paper_gridYEnd = this.paper_mainH * this.gridHRatio;
		//<==
		//Getting ends of grid section
		var paper_gridXEnd = this.paper_gridXEnd;
		var paper_gridYEnd = this.paper_gridYEnd;

		//Getting svg bounds
		var paper_mainW = this.paper_mainW;
		var paper_mainH = this.paper_mainH;

		//Getting the size of sticky section
		var paper_stickyW = paper_mainW - paper_gridXEnd;
		var paper_stickyH = paper_mainH;

		//Getting size of control
		var paper_controlW = paper_gridXEnd;
		var paper_controlH = paper_mainH - paper_gridYEnd;

		var x = position.x;
		var y = position.y;

		//Gett the work zone and offset
		var workablePixelW = this.workablePixelW;
		var workablePixelH = this.workablePixelH;

		var offsetWorkZoneX = this.offsetWorkZoneX;
		var offsetWorkZoneY = this.offsetWorkZoneY;


		//Converting real co-ordinates to paper co-ordinates
		var paperX = ((x/workablePixelW) * paper_mainW) - offsetWorkZoneX;
		var paperY = ((y/workablePixelH) * paper_mainH) - offsetWorkZoneY;

		// //Converting real co-ordinates to paper co-ordinates
		//This works in case the aspect ratio will be locked. i.e. No Black area in width or height
		// var paperX = (x/mainDivW) * paper_mainW;
		// var paperY = (y/mainDivH) * paper_mainH;

		//Creating a new user object if it doesnot exists
		if (this.userInteraction[user.id] === undefined) {
			this.userInteraction[user.id] = {dragging: false, position: {x: 0, y: 0, tX: 0, tY: 0}, stickyId: null,stickyPast: emptyArray};
		}
		// //Remove FeedBack Group
		// if(this.g_feedback != undefined){
		// 	this.g_feedback.remove();
		// }
		if (eventType === "pointerPress" && (data.button === "left")) {
			// console.log("Width:=>"+mainDivW);
			// this.paper_main.rect(paperX,paperY,10,10).attr({id: 'touch', stroke: 'White', fill: 'rgba(12,13,44,0.1)'});

			console.log("Mouse Clicked at: ("+paperX+"),("+paperY+") User:"+ JSON.stringify(user));

			//Remove FeedBack Group
			if(this.g_feedback != undefined){
				this.g_feedback.remove();
			}
			// console.log("User:"+JSON.stringify(user));

			//Grid section or sticky section
			if(( paperX >= 0 && paperX < paper_gridXEnd && paperY>=0 && paperY<=paper_gridYEnd) ||  (paperX >= paper_gridXEnd && paperX < paper_mainW && paperY>=0 && paperY<=paper_mainH)){
				console.log("Clicked in Sticky Section("+ x+ ","+ y +")");

				var stickyId = this.findStickyId(paperX,paperY);
				console.log("Returned: "+ stickyId);
				if(stickyId != null){
					console.log("Not Null");
					var holderId = this.findHolderId(paperX,paperY);
					console.log("Returned: "+ holderId);

					if(holderId != null){
						var hoS = this.holder_object_array[holderId].attr("holdsSticky");
						if( hoS != null){
							this.holder_object_array[holderId].attr({
								holdsSticky: ""
							});
						// }
						//--->
							var neighbours = [parseInt(holderId)-1,parseInt(holderId)+1];
							var noS = [];
							var totalNumberOfCells = this.numberOfRows * this.numberOfColumns;
							
								if(neighbours[0] < 0 || neighbours[0]%this.numberOfColumns == (this.numberOfColumns - 1)){
	 								console.log("Do nothing0");
	 							}
	 							else{
	 								// noS.push(this.holder_object_array[neighbours[n]].attr("holdsSticky"));
	 								console.log("Neighbour Found0");
	 								var noS = this.holder_object_array[neighbours[0]].attr("holdsSticky");
	 								if(hoS == noS){
	 									this.holder_object_array[neighbours[0]].attr({
										holdsSticky: ""
										});
	 								}
	 							}
								if(neighbours[1] >= totalNumberOfCells || neighbours[1]%this.numberOfColumns == 0){
	 								console.log("Do nothing1:"+neighbours[1]);
	 							}
	 							else{
	 								// noS.push(this.holder_object_array[neighbours[1]].attr("holdsSticky"));
	 								console.log("Neighbour Found1:"+neighbours[1]);
	 								var noS = this.holder_object_array[neighbours[1]].attr("holdsSticky");
	 								if(hoS == noS){
	 									this.holder_object_array[neighbours[1]].attr({
										holdsSticky: ""
										});
	 								}
	 							}


 						}

						//--->
					}
					this.userInteraction[user.id].dragging = true;
					// this.userInteraction[user.id].position.x = position.x; //DONOT DELETE X  and Y from user were never used.
					// this.userInteraction[user.id].position.y = position.y;
					this.userInteraction[user.id].position.x = paperX;
					this.userInteraction[user.id].position.y = paperY;
					this.userInteraction[user.id].stickyId = stickyId;

					

					//Get X and Y co-ordinates
 					var sticky_X = parseFloat(this.sticky_object_array[stickyId].attr("x"));
 					var sticky_Y = parseFloat(this.sticky_object_array[stickyId].attr("y"));
//-------->
					// var stickyWidth = parseFloat(this.sticky_object_array[stickyId].attr("width"));
 					var transX = parseFloat(this.sticky_object_array[stickyId].attr("tX")) - this.postItW;
 					var transY = parseFloat(this.sticky_object_array[stickyId].attr("tY")) - this.postItH;

	//------>^^^^^
				var shadowColor = this.shadowColor;
				var padding = this.padding; 
				//Creating default transform property
				// var defaultMatrix = 'matrix(1,0,0,1,'+transX+','+transY+')';
				var defaultMatrix = 'matrix(1,0,0,1,0,0)';
				var stickyColor = this.sticky_object_array[stickyId].attr("stickyColor");
				var f = this.filter;
				var htmlText = this.sticky_object_array[stickyId].attr("htmlText");
				console.log("HTML TEXT:"+htmlText);
				var stickyTheme = this.sticky_object_array[stickyId].attr("stickyTheme");
				var stickyTitle = this.sticky_object_array[stickyId].attr("stickyTitle");
				var stickySpeaker = this.sticky_object_array[stickyId].attr("stickySpeaker");
				var stickyFontSize = this.sticky_object_array[stickyId].attr("stickyFontSize");
				//creating a group for group all elements of a sticky
				var g_sticky = this.paper_main.g().attr({
					id: "g_sticky"+stickyId,
					x: sticky_X,
					y: sticky_Y,
					transform : defaultMatrix,
					tX:transX, tY:transY,
					stickyTheme: stickyTheme,
					stickyColor: stickyColor,
					htmlText: htmlText,
					stickyTitle: stickyTitle,
					stickySpeaker: stickySpeaker,
					stickyFontSize: stickyFontSize
				});
				
				//Creating Sticky Shadow
				var sticky_shadow = this.paper_main.rect(sticky_X+(padding/this.shadowDepth),sticky_Y+(padding/this.shadowDepth),this.postItW,this.postItH).attr({
					id:"sticky_shadow_"+stickyId,
					fill: shadowColor,
					filter: f
				});
				//Creating a sticky
				var sticky_1= this.paper_main.rect(sticky_X,sticky_Y,this.postItW,this.postItH).attr({
					id:"sticky_rect_"+stickyId,
					fill: stickyColor,
					transform : defaultMatrix
				});
				

				//Creating a sticky Triangle
				var sticky_triangle = this.paper_main.polyline([sticky_X,sticky_Y,sticky_X+(padding/2),sticky_Y,sticky_X,sticky_Y+(padding/2)]).attr({
					id:"sticky_triangle_"+stickyId,
					fill: this.textColor1,
					transform : defaultMatrix
				});
			
				//Add sticky and shadow to group.
				g_sticky.add(sticky_shadow);
				g_sticky.add(sticky_1);
				g_sticky.add(sticky_triangle);
				

				//Creating a foreignObject which will have HTML wrappable text
				var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject'); //Create a path in SVG's namespace
					newElement.setAttribute('x', (sticky_X+(padding/3)));
       				newElement.setAttribute('y', (sticky_Y+(padding/3)));
       				newElement.setAttribute('width',(this.postItW - (2*padding/3)));
       				newElement.setAttribute('height',(this.postItH - (2*padding/3)));
       				newElement.setAttribute('id',"sticky_fobj_"+stickyId);

					newElement.innerHTML = htmlText;
				var nodeFobj = 	g_sticky.append(newElement);

			
				this.sticky_object_array[stickyId].remove();
				delete this.sticky_object_array[stickyId];

				this.sticky_object_array[stickyId] = g_sticky;
				this.g_allSticky.add(g_sticky);

				
	//<------^^^^^
				//SCALE on Click 
					var scaleX = 2;
					var scaleY = 2;
					var myMatrix = new Snap.Matrix();
					myMatrix.scale(scaleX,scaleY);            // play with scaling before and after the rotate 
					// myMatrix.translate((((transX-sticky_X) - ((transX-sticky_X)/3))),0);
					// myMatrix.translate(scaTraX,0);
					myMatrix.translate(-(sticky_X-(sticky_X/scaleX))+(transX/scaleX),-(sticky_Y-(sticky_Y/scaleY))+(transY/scaleY));

						this.sticky_object_array[stickyId].attr({
						transform: myMatrix
						});
						console.log("ATTribute:"+ this.sticky_object_array[stickyId].attr().transform);

//<-------

 					//Get Tranform values
					// var transformString = this.sticky_object_array[stickyId].attr("transform")+'';
					// var tXY = transformString.split(',');
					// var tX = parseFloat(tXY[0].slice(1),10);
					// var tY = parseFloat(tXY[1],10);

					//Get Tranform values
					var transformString = this.sticky_object_array[stickyId].attr().transform;
					// console.log("Total Rect holder tranform matrix:"+transformString);

					var currentMatrix = transformString.slice(7,-1).split("\,");
					console.log("currentMatrix:" +currentMatrix);
     
      				for(var i=0; i<currentMatrix.length; i++) {
      					currentMatrix[i] = parseFloat(currentMatrix[i]);
      					// console.log("HI:"+ i+ " ->"+ JSON.stringify(currentMatrix[i]));
     				}

     				var tX = currentMatrix[4];
					var tY = currentMatrix[5];
					// console.log("TX:"+tX+"TY: "+tY);



					this.userInteraction[user.id].stickyPast[0] = sticky_X;
					this.userInteraction[user.id].stickyPast[1] = sticky_Y;
					this.userInteraction[user.id].stickyPast[2] = tX;
					this.userInteraction[user.id].stickyPast[3] = tY;
					// //Get Tranform values
					// var transformString = this.sticky_object_array[stickyId].attr("transform")+'';
					// var tXY = transformString.split(',');
					// var tX = parseFloat(tXY[0].slice(1),10);
					// var tY = parseFloat(tXY[1],10);



					// console.log("User: ->"+ JSON.stringify(this.userInteraction[user.id]));
					// console.log("****"+transformString);
					// console.log("tX:"+tX+ "tY: "+tY);


					// this.userInteraction[user.id].position.tX = tX;
					// this.userInteraction[user.id].position.tY = tY;

					// this.sticky_array[stickyId][4] =tX;
					// this.sticky_array[stickyId][5] = tY;


				}
				//Printing All users
				// for(key in this.userInteraction){
				// 	console.log("User: "+ key + "->"+ JSON.stringify(this.userInteraction[key]));
				// }

			}
			else if(paperX >= 0 && paperX < paper_controlW && paperY >=paper_gridYEnd && paperY <=paper_mainH){ // Control Section
				console.log("Clicked in Control Section("+ x + ","+ y +")");
				var f = this.paper_main.filter(Snap.filter.blur(20,20));
				

				// Clicked  on Tutorials
				var button1X = this.controlsLeftPadding;
				var button1Y = paper_gridYEnd+this.buttonPadding;

				if(paperX >= button1X && paperX < button1X+ this.buttonW*0.8 && paperY >= button1Y && paperY < button1Y+this.buttonH){
					console.log("ButtonClicked ("+ paperX + ","+ paperY +")");
					
					if(this.toggleTI == true){
						this.g_tutorialsImage = this.paper_main.g();		
						this.g_tutorialsImage.attr({
							id: "TutorialsImage"
						});

						var button_tutorial = this.paper_main.rect(button1X,button1Y,this.buttonW,this.buttonH).attr({
							fill:        this.defaultButtonPressedFill,
							stroke:       this.textColor,
							strokeWidth: 3
						
						});
		
						var text_tutorial = this.paper_main.text(button1X+(this.buttonW*0.5),button1Y+(this.buttonH*0.6), "Tutorials").attr({
							fill: this.textColor1,
							'font-size':"40" ,
							"text-anchor" : "middle"
						});
				
						
						var shadow_next = this.paper_main.rect((this.paper_mainW/4),(this.paper_mainH/4),(this.paper_mainW/3),(this.paper_mainH/1.8)).attr({
							fill: this.shadowColor,
							filter: f
						});
						var tutorialnextImage = this.paper_main.image(this.resrcPath +"Untitled.png",(this.paper_mainW/4),(this.paper_mainH/4),(this.paper_mainW/3),(this.paper_mainH/1.8));					
						
						this.shadow_tutorials = this.paper_main.rect((this.paper_mainW/4),(this.paper_mainH/4),(this.paper_mainW/3),(this.paper_mainH/1.8)).attr({
							fill: this.shadowColor,
							filter: f
						});
						this.tutorialsImage = this.paper_main.image(this.resrcPath +"Tutorial.png",(this.paper_mainW/4),(this.paper_mainH/4),(this.paper_mainW/3),(this.paper_mainH/1.8));
						
						//Creating a sticky Triangle
						this.text_nexttutorialsign= this.paper_main.polyline([button1X+(this.buttonW*0.8),button1Y+(this.buttonH*0.3),button1X+(this.buttonW*0.95),button1Y+(this.buttonH*0.5),button1X+(this.buttonW*0.8),button1Y+(this.buttonH*0.7)]).attr({
							// id:"sticky_triangle_"+stickyId,
							fill: this.textColor1,
							// transform : defaultMatrix
						});
						this.g_tutorialsImage.add(this.shadow_tutorials);
						this.g_tutorialsImage.add(shadow_next);
						
						this.g_tutorialsImage.add(tutorialnextImage);
						this.g_tutorialsImage.add(button_tutorial);
						this.g_tutorialsImage.add(text_tutorial);
						this.g_tutorialsImage.add(this.tutorialsImage);
						this.g_tutorialsImage.add(this.text_nexttutorialsign);
						
						this.toggleTI = false;
						this.toggleTN = true;
						}
						else{
							this.g_tutorialsImage.remove();		
							this.toggleTI = true;
						}
						console.log("done");
				}


				//clicked on next arrow
				var buttonnextX = button1X+(this.buttonW*0.8)
				var buttonnextY = button1Y+(this.buttonH*0.7)

				if(paperX >= buttonnextX && paperX < button1X+ this.buttonW && paperY >= button1Y && paperY < button1Y+this.buttonH){
					console.log("ButtonClicked ("+ paperX + ","+ paperY +")");
					
					if(this.toggleTN == true){
						
						
						this.tutorialsImage.remove();	
						this.shadow_tutorials.remove();
						this.text_nexttutorialsign.remove();

						this.toggleTN = false;
					}
					else{
						this.g_tutorialsImage.remove();
						this.toggleTI = true;
						this.toggleTN = false;
					}
					console.log("done");
				}



				// Clicked  on Room Info
				var button2X = button1X + this.buttonW + this.buttonPadding;
				var button2Y = paper_gridYEnd+this.buttonPadding;

				if(paperX >= button2X && paperX < button2X+ this.buttonW && paperY >= button2Y && paperY < button2Y+this.buttonH){
					console.log("ButtonClicked ("+ paperX + ","+ paperY +")");
					
					if(this.toggleRI == true){
						this.g_roomInfo = this.paper_main.g();
						var shadow_roomInfo = this.paper_main.rect((this.paper_mainW/6),(this.paper_mainH/4),(this.paper_mainW/3)-this.imagePadding,(this.paper_mainH/2)).attr({
							fill: this.shadowColor,
							filter: f
						});
					
						var image_roomInfo = this.paper_main.image(this.resrcPath +"info.png",(this.paper_mainW/6),(this.paper_mainH/4),(this.paper_mainW/3)-this.imagePadding,(this.paper_mainH/2));
						
						var button_roomInfonew = this.paper_main.rect(button2X,button2Y,this.buttonW,this.buttonH).attr({
							
							fill:        this.defaultButtonPressedFill,
							stroke:       this.textColor,
							strokeWidth: 3
						
						});
		
						var text_roomInfonew = this.paper_main.text(button2X+(this.buttonW*0.5),button2Y+(this.buttonH*0.6), "Room Info.").attr({
							fill: this.textColor1,
							'font-size':"40" ,
							"text-anchor" : "middle"
						});

						this.g_roomInfo.add(shadow_roomInfo);
						this.g_roomInfo.add(image_roomInfo);
						this.g_roomInfo.add(button_roomInfonew);
						this.g_roomInfo.add(text_roomInfonew);

						this.toggleRI = false;
					}
					else{
						this.g_roomInfo.remove();		
						this.toggleRI = true;
					}
					console.log("done");
				}


				// Clicked on View Floor Plan
				var button3X = button2X + this.buttonW + this.buttonPadding;
				var button3Y = paper_gridYEnd+this.buttonPadding;
				
				if(paperX >= button3X && paperX < button3X+this.buttonW && paperY >= button3Y && paperY < button3Y+this.buttonH){
					console.log("ButtonClicked ("+ paperX + ","+ paperY +")");
				
					if(this.toggleFP == true){
						this.g_floorPlan = this.paper_main.g();
						var shadow_floorPlan = this.paper_main.rect((this.paper_mainW/6)+(this.paper_mainW/3),(this.paper_mainH/4),(this.paper_mainW/3)-this.imagePadding,(this.paper_mainH/2)).attr({
							fill: this.shadowColor,
							filter: f
						});
		
						var image_floorPlan = this.paper_main.image(this.resrcPath +"icon.png",(this.paper_mainW/6)+(this.paper_mainW/3),(this.paper_mainH/4),(this.paper_mainW/3)-this.imagePadding,(this.paper_mainH/2));
						var button_floorPlannew = this.paper_main.rect(button3X,button3Y,this.buttonW,this.buttonH).attr({
							fill:         this.defaultButtonPressedFill,
							stroke:       this.textColor,
							strokeWidth: 3		
						});

						var text_floorPlannew = this.paper_main.text(button3X+(this.buttonW*0.5),button3Y+(this.buttonH*0.6), "Floor Plan").attr({
							fill: this.textColor1,
							'font-size':"40" ,
							"text-anchor" : "middle"
						});

						this.g_floorPlan.add(shadow_floorPlan);
						this.g_floorPlan.add(image_floorPlan);
						this.g_floorPlan.add(button_floorPlannew);
						this.g_floorPlan.add(text_floorPlannew);
						this.toggleFP = false;
					}
					else{
						this.g_floorPlan.remove();		
						this.toggleFP = true;
					}
					console.log("done");
				}


				// Clicked on Next Schedular
				var button4X = button3X + this.buttonW + this.buttonPadding;
				var button4Y = paper_gridYEnd+this.buttonPadding;
				
				if(paperX >= button4X && paperX < button4X+this.buttonW && paperY >= button4Y && paperY < button4Y+this.buttonH){
					console.log("NEXTClicked ("+ paperX + ","+ paperY +")");
					var currentScheduler = (this.currentScheduler+1)%this.numberOfSchedulers;
					this.currentScheduler = currentScheduler;
					var turnString = "Current Scheduler: "+this.conferenceSchedulers[currentScheduler]["Name"];

					this.text_turn.remove();

					

					this.text_turn = this.paper_main.text(this.turnInfo[0],this.turnInfo[1], turnString).attr({
						fill: this.stickyColor[this.conferenceSchedulers[currentScheduler]["Theme"]],
						'font-size':"40" ,
						"text-anchor" : "middle"
					});
						
					console.log("done");
				}


		
			

				// Clicked on save
				// var button5X = button4X + this.buttonW + this.buttonPadding;
				// var button5Y = paper_gridYEnd+this.buttonPadding;

				// if(paperX >= button5X && paperX < button5X+ this.buttonW && paperY >= button5Y && paperY < button5Y+this.buttonH){
				// 	console.log("ButtonClicked ("+ paperX + ","+ paperY +")");
					
				// 	if(this.toggleSave == true){
				// 		var button_save = this.paper_main.rect(button5X,button5Y,this.buttonW,this.buttonH).attr({
			
				// 			fill:        this.defaultFill,
				// 			stroke:      this.textColor,
				// 			strokeWidth: 3
		
				// 		});
		
				// 		var text_save = this.paper_main.text(button5X+(this.buttonW*0.5),button5Y+(this.buttonH*0.6), "Save").attr({
				// 			fill: this.textColor1,
				// 			'font-size':"40" ,
				// 			"text-anchor" : "middle"
				// 		});
			
						
				// 		var svg = document.querySelector('paper_main');
				// 		var canvas = document.querySelector('canvas');

						
				// 		  var evt = new MouseEvent('click', {
				// 		    view: window,
				// 		    bubbles: false,
				// 		    cancelable: true
				// 		  });

				// 		  var a = document.createElement('a');
				// 		  a.setAttribute('download', 'IMAGE.png');
				// 		  a.setAttribute('href', imgURI);
				// 		  a.setAttribute('target', '_blank');

				// 		  a.dispatchEvent(evt);
						

				// 		// var canvas = document.getElementById("Paper_main");
				// 		// var img    = canvas.toDataURL("image/png");
				// 		// document.write('<img src="'+img+'"/>');


						
				// 		  var canvas = document.getElementById('canvas');
				// 		  var ctx = canvas.getContext('2d');
				// 		  var data = (new XMLSerializer()).serializeToString(svg);
				// 		  var DOMURL = window.URL || window.webkitURL || window;

				// 		  var img = new Image();
				// 		  var svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
				// 		  var url = DOMURL.createObjectURL(svgBlob);

						 
				// 		    ctx.drawImage(img, 0, 0);
				// 		    DOMURL.revokeObjectURL(url);

				// 		    var imgURI = canvas
				// 			.toDataURL('image/png')
				// 			.replace('image/png', 'image/octet-stream');

				// 		    triggerDownload(imgURI);
						 
				// 		  img.src = url;
						
				// 		//second way
				// 		val = document.paper_main.value; 
				// 		mydoc = document.open(); 
				// 		mydoc.write(val); 
				// 		mydoc.execCommand("saveAs",true,".ext"); 
				// 	}
				// 	else{
				// 		// this.g_roomInfo.remove();		
				// 		this.toggleSave = true;
				// 	}
				// 	console.log("done");
				// }

				// // Clicked on next
				// var button6X = button5X + this.buttonW + this.buttonPadding;
				// var button6Y = paper_gridYEnd+this.buttonPadding;

				// if(paperX >= button6X && paperX < button6X+ this.buttonW && paperY >= button6Y && paperY < button6Y+this.buttonH){
				// 	console.log("ButtonClicked ("+ paperX + ","+ paperY +")");
					
				// 	// if(this.loadedAlready == false){
				// 		var button_loaded = this.paper_main.rect(button6X,button6Y,this.buttonW,this.buttonH).attr({
			
				// 			fill:        this.defaultFill,
				// 			stroke:      this.textColor,
				// 			strokeWidth: 3
		
				// 		});
		
				// 		var text_loaded = this.paper_main.text(button6X+(this.buttonW*0.5),button6Y+(this.buttonH*0.6), "Next").attr({
				// 			fill: this.textColor1,
				// 			'font-size':"40" ,
				// 			"text-anchor" : "middle"
				// 		});

						
				// 	// }
					
				// 	console.log("done");
				// }

				// // Clicked on load
				// var button6X = button5X + this.buttonW + this.buttonPadding;
				// var button6Y = paper_gridYEnd+this.buttonPadding;

				// if(paperX >= button6X && paperX < button6X+ this.buttonW && paperY >= button6Y && paperY < button6Y+this.buttonH){
				// 	console.log("ButtonClicked ("+ paperX + ","+ paperY +")");
					
				// 	if(this.loadedAlready == false){
				// 		var button_loaded = this.paper_main.rect(button6X,button6Y,this.buttonW,this.buttonH).attr({
			
				// 			fill:        this.defaultFill,
				// 			stroke:      this.textColor,
				// 			strokeWidth: 3
		
				// 		});
		
				// 		var text_loaded = this.paper_main.text(button6X+(this.buttonW*0.5),button6Y+(this.buttonH*0.6), "Load").attr({
				// 			fill: this.textColor1,
				// 			'font-size':"40" ,
				// 			"text-anchor" : "middle"
				// 		});

				// 		this.readSavedSession();
				// 		this.loadedAlready = true;
				// 	}
					
				// 	console.log("done");
				// }


				// // Clicked on new
				// var button7X = button6X + this.buttonW + this.buttonPadding;
				// var button7Y = paper_gridYEnd+this.buttonPadding;

				// if(paperX >= button7X && paperX < button7X+ this.buttonW && paperY >= button7Y && paperY < button7Y+this.buttonH){
				// 	console.log("ButtonClicked ("+ paperX + ","+ paperY +")");
					
				// 	if(this.loadedAlready == false){
				// 		var button_loaded = this.paper_main.rect(button7X,button7Y,this.buttonW,this.buttonH).attr({
			
				// 			fill:        this.defaultFill,
				// 			stroke:      this.textColor,
				// 			strokeWidth: 3
		
				// 		});
		
				// 		var text_loaded = this.paper_main.text(button7X+(this.buttonW*0.5),button7Y+(this.buttonH*0.6), "New").attr({
				// 			fill: this.textColor1,
				// 			'font-size':"40" ,
				// 			"text-anchor" : "middle"
				// 		});
				// 		this.readPaperList();
				// 		this.loadedAlready = true;
				// 	}
					
				// 	console.log("done");
				// }
			} 
			else{
				console.log("Clicked outside zone");
			}
		}
		// else if (eventType === "pointerMove" && this.dragging) {
		else if (eventType === "pointerMove") {
			// console.log("moving pointer");
			if(this.userInteraction[user.id].dragging){
				console.log("Dragging");
				var sid = this.userInteraction[user.id].stickyId;
				var stickyPast = this.userInteraction[user.id].stickyPast;
				//Get X and Y co-ordinates
 				var sticky_X = stickyPast[0];
 				var sticky_Y = stickyPast[1];

 			// 	//Get Tranform values
				// var tX = stickyPast[2];
				// var tY = stickyPast[3];

				// //Find old coordinates by adding location and translation
				// var rX = sticky_X+tX;
				// var rY = sticky_Y+tY;

				// console.log("RX:"+rX+" : RY: "+ rY);






				// var sid = this.userInteraction[user.id].stickyId;
				// var sOldX = this.array_sticky[sid][0]; //Get X coordinate of the sticky's location
				// var sOldY = this.array_sticky[sid][1]; //Get Y coordinate of the sticky's location

				// var tOldX = this.array_sticky[sid][4];
				// var tOldY = this.array_sticky[sid][5];

				// console.log("TransX:"+ transX+" TransY: "+transY);
				var transX = paperX - sticky_X - this.postItW;
				var transY = paperY - sticky_Y- this.postItH;


				// this.array_sticky[sid][4] = transX;
				// this.array_sticky[sid][5] = transY;

				// //Get translate property of the sticky
				// var attr1 =  this.sticky_object_array[sid].attr("transform")+'';
				// console.log("<><><>:"+attr1);
				// var tOldXY = attr1.split(',');
				// var tOldX = parseInt(tOldXY[0].slice(1),10);
				// var tOldY = parseInt(tOldXY[1],10);
				// console.log("solx:"+sOldX+" solY: "+sOldY);
				console.log("Vishaltranx:"+transX+" TolY: "+transY);


				// console.log("Old X:"+sidOldX+" Old Y:"+sidOldY+" New X: " + paperX + " New Y: "+ paperY );
				// console.log("Translate X:" + transX + " Translate Y:"+ transY);
				var myMatrix = new Snap.Matrix();
				// myMatrix.scale(scaleX,scaleY);            // play with scaling before and after the rotate 
					// myMatrix.translate((((transX-sticky_X) - ((transX-sticky_X)/3))),0);
					// myMatrix.translate(scaTraX,0);
				myMatrix.translate(transX,transY);
					// myMatrix.translate(0,transY);


				this.sticky_object_array[sid].attr({
					transform: myMatrix
				});

				// this.sticky_object_array[sid].attr({
				// 		transform: 'translate('+transX+','+transY+')'
				// 	});
				// console.log("GROUP OBJECT"+JSON.stringify(this.sticky_object_array[sid].parent().attr('transform')));
				// console.log("StickyRECT OBJECT"+JSON.stringify(this.sticky_object_array[sid].attr('transform')));
			}
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
			if(this.userInteraction[user.id].dragging){
				//Update the new coordinates of the sticky
				var sid = this.userInteraction[user.id].stickyId;
				var stickyTheme = this.sticky_object_array[sid].attr("stickyTheme");
				// this.array_sticky[sid][0] = paperX;
				// this.array_sticky[sid][1] = paperY;
				// this.array_sticky[sid][2] = paperX + this.postItW; //Updateing X2 and Y2
				// this.array_sticky[sid][3] = paperY + this.postItH;
				var holderId = this.findHolderId(paperX-this.postItW,paperY-this.postItH);
				console.log("Returned: "+ holderId);
				
				if(holderId == null){
					
					// this.sticky_object_array[sid].attr({
					// 	transform: 'translate(0,0)'
					// });
					var myMatrix = new Snap.Matrix();
					myMatrix.translate(0,0);
					this.sticky_object_array[sid].attr({
						transform: myMatrix,
						tX: 0,
						tY: 0
					});

				}
				else{
					var hoS = this.holder_object_array[holderId].attr("holdsSticky");
					var cS = this.holder_object_array[holderId].attr("sessionConstraint");
					console.log("CS:"+cS);
					if(hoS != null){
						console.log("Holds Sticky: "+hoS);
						//Display Feedback
						this.displayFeedback(paperX,paperY,'ERROR: The cell is occupied!', paper_mainW/10, (paper_mainW/10)*0.5);
						var myMatrix = new Snap.Matrix();
						myMatrix.translate(0,0);
						this.sticky_object_array[sid].attr({
							transform: myMatrix,
							tX: 0,
							tY: 0
						});
					}
					else if(cS != null && stickyTheme != cS){
						console.log("Constraint Violated: "+ cS + "Sticky theme:"+stickyTheme);
						//Display Feedback
						var message = "Violation: <strong>" + cS + "</strong> constraint encountered.";
						this.displayFeedback(paperX,paperY,message, paper_mainW/10, (paper_mainW/10)*0.7);
						var myMatrix = new Snap.Matrix();
						myMatrix.translate(0,0);
						this.sticky_object_array[sid].attr({
							transform: myMatrix,
							tX: 0,
							tY: 0
						});
					}
					else{
						var stickyPast = this.userInteraction[user.id].stickyPast;
						//Get X and Y co-ordinates
	 					var sticky_X = stickyPast[0];
	 					var sticky_Y = stickyPast[1];
						var hX = parseFloat(this.holder_object_array[holderId].attr("x"));
						var hY = parseFloat(this.holder_object_array[holderId].attr("y"));
						var transX = hX - sticky_X;
						var transY = hY - sticky_Y;
						console.log("transX: "+transX);
						console.log("transY: "+transY);


						var scaleX = this.holderW/this.postItW;
						console.log("Scale X Ratio:"+scaleX);

						var scaleY = this.holderH/this.postItH;
						console.log("Scale Y Ratio:"+scaleY);
						var fobjsXOld = 1; //Will be updated if sticky width is increased for multihall
						var fobjW = 1;
						// var scaTraX = (transX-sticky_X) - ((transX-sticky_X)/3);
						console.log("Sticky X:"+sticky_X);
						// var scaTraX = transX - ((sticky_X)/3);
						// console.log("scaTraX:"+scaTraX);
						//Translate and Scale 
						// this.sticky_object_array[sid].attr({
						// 	transform: 'scale('+scaTraX+',1) translate('+scaTraX+','+transY+')'
						// });

						// //Working
						// this.sticky_object_array[sid].attr({
						// 	transform: 'scale(2,1) translate('+((transX-sticky_X) - ((transX-sticky_X)/2))+','+transY+')'
						// });


						// this.sticky_object_array[sid].attr({
						// 	transform: 'scale(3,1) translate('+(transX-((sticky_X)-(sticky_X/3)))+','+transY+')'
						// });

						// this.sticky_object_array[sid].attr({
						// 	transform: 'translate('+transX+','+transY+')'
						// }); //DONOT DELETE . this works if scaling of sticky not required.

//>>>>>>
						//ALSO Duplicate the sticky on neighbour

						var neighbourId = this.findNeighbourHolderId(paperX-this.postItW,paperY-this.postItH,holderId);
						console.log("Neighbour Returned: "+ neighbourId);
						if(neighbourId != null){

							var noS = this.holder_object_array[neighbourId[0]].attr("holdsSticky");
							if(noS == null){
								//get sticky color
								// var colorOfSticky = this.sticky_object_array[sid].attr("stickyColor");
								// this.holder_object_array[neighbourId[0]].attr({
								// 	fill: colorOfSticky
								// });

								this.holder_object_array[neighbourId[0]].attr({
									holdsSticky: sid
								});
								scaleX = scaleX * 2;
								fobjsXOld = fobjsXOld/2;
								fobjW = fobjW*2;
							}
						}
//>>>>>>>>>





						var myMatrix = new Snap.Matrix();
						myMatrix.scale(scaleX,scaleY);            // play with scaling before and after the rotate 
						// myMatrix.translate((((transX-sticky_X) - ((transX-sticky_X)/3))),0);
						// myMatrix.translate(scaTraX,0);
						myMatrix.translate(-(sticky_X-(sticky_X/scaleX))+(transX/scaleX),-(sticky_Y-(sticky_Y/scaleY))+(transY/scaleY));
						// myMatrix.translate(0,transY);


						this.sticky_object_array[sid].attr({
							transform: myMatrix,
							// Updating tX and tY on the group
							tX: transX,
							tY: transY
						});

						console.log("ATTR:"+this.sticky_object_array[sid].attr().transform);
						this.holder_object_array[holderId].attr({
							holdsSticky: sid
						});
						console.log("HOLDER:"+this.holder_object_array[holderId].attr("holdsSticky"));
						//~~~~~~~~~~> RESIZING THE HTML

						var stickyFobj = document.getElementById("sticky_fobj_"+sid);
						var stickyTriangle = document.getElementById("sticky_triangle_"+sid);
						if(stickyFobj!=null){
							console.log("Recreation triggered!");
							stickyFobj.parentNode.removeChild(stickyFobj);
							//Deleteing the Triangle
							stickyTriangle.parentNode.removeChild(stickyTriangle);

							var myElement = this.sticky_object_array[sid];	
							var padding = this.padding;


						//Reading Values for creating the HTML Text
						var stickyTitle = myElement.attr("stickyTitle");
						var stickySpeaker = myElement.attr("stickySpeaker");
						var stickyFontSize = Math.floor(parseInt(myElement.attr("stickyFontSize"))); //Because ScaleY wont change on multi hall 
						console.log("Font Size before Release was:" + myElement.attr("stickyFontSize"));
						console.log("Font Size on Release:"+stickyFontSize);
						//Creating innerHTML for the sticky
						var title =  "<strong>Title:</strong> "+ stickyTitle;
						var speaker = "<strong>Speaker:</strong> "+ stickySpeaker;
						var htmlText = '<div xmlns="http://www.w3.org/1999/xhtml" style="color:black; font-size: '+stickyFontSize+'px">'
									+ title + '<br><br>' + speaker+ '</div>';

						// Creating a foreignObject which will have HTML wrappable text
						var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject'); //Create a path in SVG's namespace
						newElement.setAttribute('x', (sticky_X+(padding/3)));
       					newElement.setAttribute('y', (sticky_Y+(padding/3)));
       					newElement.setAttribute('width',((this.postItW*fobjW) - (2*padding/3)));
       					newElement.setAttribute('height',(this.postItH - (2*padding/3)));
       					newElement.setAttribute('id',"sticky_fobj_"+sid);
       					var fobjsX = fobjsXOld;
       					var fobjtX = (-1*(sticky_X-(sticky_X/fobjsX)));
       					var fobjMatrix = new Snap.Matrix();
       					fobjMatrix.scale(fobjsX,1);
       					fobjMatrix.translate(fobjtX,0);
       					newElement.setAttribute('transform', fobjMatrix);
       						
						newElement.innerHTML = htmlText;
						
						myElement.append(newElement);





						}




						//<~~~~~~~~~~





						// console.log("HOLDER: "+ )

						// //----->++++
						// var g_overlaySticky = this.paper_main.g().attr({
						// 	id: "g_overlaySticky_"+sid
						// }); 
						// var padding = this.padding;
						// // var htmlText = this.sticky_object_array[sid].attr("htmlText");
						// //Reading Values for creating the HTML Text
						// var stickyTitle = this.sticky_object_array[sid].attr("stickyTitle");
						// var stickySpeaker = this.sticky_object_array[sid].attr("stickySpeaker");
						// var stickyFontSize = Math.floor(parseInt(this.sticky_object_array[sid].attr("stickyFontSize")) * scaleY); //scaleY because ScaleY wont vary with number of halls

						// //Creating innerHTML for the sticky
						// var title =  "<strong>Title:</strong> "+ stickyTitle;
						// var speaker = "<strong>Speaker:</strong> "+ stickySpeaker;
						// var htmlText = '<div xmlns="http://www.w3.org/1999/xhtml" style="color:black; font-size: '+stickyFontSize+'px">'
						// 			+ title + '<br><br>' + speaker+ '</div>';

						// var stickyColor = this.sticky_object_array[sid].attr("stickyColor");
						// var overlayRect = this.paper_main.rect(hX,hY,scaleX*this.postItW, scaleY*this.postItH).attr({
						// 	fill: stickyColor
						// 	// ,stroke: this.shadowColor // For border to sticky
						// });

						// //Creating a foreignObject which will have HTML wrappable text
						// var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject'); //Create a path in SVG's namespace
						// newElement.setAttribute('x', (hX+(padding/3)));
      //  					newElement.setAttribute('y', (hY+(padding/3)));
      //  					newElement.setAttribute('width',((scaleX*this.postItW) - (2*padding/3)));
      //  					newElement.setAttribute('height',((scaleY*this.postItH) - (2*padding/3)));

						// newElement.innerHTML = htmlText;
						// g_overlaySticky.add(overlayRect);
						// g_overlaySticky.append(newElement);

						// //REMOVE THIS IF ANY ERROR: This is added so that the overlay sticky is not on top when another sticky is moved over it.
						// this.g_allSticky.add(g_overlaySticky);

						// // if (this.overlay_object_array[sid] === undefined) {
						// 	this.overlay_object_array[sid] = g_overlaySticky;
						// // }
						// //<----++++

					}

				}



				console.log("Mouse Before: ->"+ JSON.stringify(this.userInteraction[user.id]));
				this.userInteraction[user.id].dragging = false;
				this.userInteraction[user.id].stickyId = null;
				this.userInteraction[user.id].stickyPast = emptyArray;
				// this.userInteraction[user.id].stickyId[1] = '0';
				// this.userInteraction[user.id].stickyId[2] = '0';
				// this.userInteraction[user.id].stickyId[3] = '0';
				//console.log("Dropped Sticky at: "+this.array_sticky[sid][0]+" , "+this.array_sticky[sid][1]+" And Translate at : " + this.array_sticky[sid][4] + " , " + this.array_sticky[sid][5]);
				console.log("Mouse Released: ->"+ JSON.stringify(this.userInteraction[user.id]));
			}
		}

		// Scroll events for zoom
		else if (eventType === "pointerScroll") {

			// var stickyId = this.findStickyId(paperX,paperY);
			// 	console.log("Returned: "+ stickyId);
			// 	if(stickyId != null){
			// 		console.log("Not Null");
			// 		var xS = this.sticky_object_array[stickyId].attr("x");
			// 		var yS = this.sticky_object_array[stickyId].attr("y");
			// 		console.log("xS:"+xS);
			// 		console.log("yS:"+yS);


			// 		if(this.toggle == true){
			// 			var myMatrix = new Snap.Matrix();
			// 			myMatrix.scale(3.5,1);            // play with scaling before and after the rotate 
			// 			// myMatrix.translate(-(xS-(xS/2)),0);
			// 			myMatrix.translate(-(xS-(xS/3.5))+(-10),0);
			// 			// myMatrix.translate(10,0);

			// 			this.sticky_object_array[stickyId].attr({
			// 			transform: myMatrix
			// 			});
			// 			console.log("ATTribute:"+ this.sticky_object_array[stickyId].attr().transform);
			// 			this.toggle = false;
			// 		}
			// 		else{
			// 			var myMatrix = new Snap.Matrix();
			// 			myMatrix.scale(1,1);
			// 			myMatrix.translate(0,0); //Not required

			// 			this.sticky_object_array[stickyId].attr({
			// 			transform: myMatrix
			// 			});
			// 			console.log("ATTribute:"+ JSON.stringify(this.sticky_object_array[stickyId]));
			// 			var child = document.getElementById("g_sticky12").childNodes;
			// 			console.log("ATTribute:"+ JSON.stringify(child));
			// 			this.toggle = true;
			// 		}
					
			// 	}

		}
		else if (eventType === "widgetEvent"){
		}
		else if (eventType === "keyboard") {
			if (data.character === "m") {
				console.log("Pressed M" + this.state["val2"]);
				this.state["val2"] = 10;
				console.log("Val 2 changed to" + this.state["val2"]);
				// this.refresh(date);
				this.saveSession();
			}
			else if (data.character === "z") {
				var stickyId = this.findStickyId(paperX,paperY);
				console.log("Returned: "+ stickyId);
				if(stickyId != null){
					console.log("Not Null");
					
					//Get X and Y co-ordinates
 					var sticky_X = parseFloat(this.sticky_object_array[stickyId].attr("x"));
 					var sticky_Y = parseFloat(this.sticky_object_array[stickyId].attr("y"));
					var transX = parseFloat(this.sticky_object_array[stickyId].attr("tX"));
 					var transY = parseFloat(this.sticky_object_array[stickyId].attr("tY"));
					var scaleX = 2;
					var scaleY = 2;
					var myMatrix = new Snap.Matrix();
					myMatrix.scale(scaleX,scaleY);            // play with scaling before and after the rotate 
					// myMatrix.translate((((transX-sticky_X) - ((transX-sticky_X)/3))),0);
					// myMatrix.translate(scaTraX,0);
					myMatrix.translate(-(sticky_X-(sticky_X/scaleX))+(transX/scaleX),-(sticky_Y-(sticky_Y/scaleY))+(transY/scaleY));

						this.sticky_object_array[stickyId].attr({
						transform: myMatrix
						});
						console.log("ATTribute:"+ this.sticky_object_array[stickyId].attr().transform);

				}
			}

			//Old Session
			else if (data.character === "l") {
				// if(this.loadedAlready == false){
				// 	// this.readPaperList();
				// 	// this.intializeGrid();
				// 	// this.intializeSticky();
				// 	// this.intializeControl();
				// 	// this.readSavedSession();
				// 	// this.loadedAlready = true;
				// }
				console.log("ConferenceScheduler:"+JSON.stringify(this.conferenceSchedulers));
			}
			// //New Session
			// else if (data.character === "n") {
			// 	if(this.loadedAlready == false){
			// 		this.readPaperList();
			// 		this.intializeGrid();
			// 		this.intializeSticky();
			// 		this.intializeControl();
			// 		this.loadedAlready = true;
			// 	}
			// }
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
	}
});
