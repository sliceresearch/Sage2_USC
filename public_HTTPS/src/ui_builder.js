// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

//
// Generic functions used by all SAGE2 applications
//

function uiBuilder(json_cfg, clientID) {

	// Save the wall configuration object
	this.json_cfg = json_cfg;
	this.clientID = clientID;
	// set the default style sheet
	this.csssheet = "css/style.css";
	// Objects for the UI
	this.upperBar = null;
	this.clock    = null;

	// Variables
	this.offsetX        = null;
	this.offsetY        = null;
	this.titleBarHeight = null;
	this.titleTextSize  = null;
	this.pointerWidth   = null;
	this.pointerHeight  = null;
	this.pointerOffsetX = null; 
	this.pointerOffsetY = null;
	this.noDropShadow   = null;

	// Aspect ratio of the wall and the browser	
	this.wallRatio      = null;
	this.browserRatio   = null;
	this.ratio          = "fit";

	this.pointerItems   = {};
	this.radialMenus	= {};
	
	// Get handle on the main div
	this.bg   = document.getElementById("background");
	this.main = document.getElementById("main");

	// Build the background image/color
	this.background = function () {
		var _this = this;

		// background color
		if (typeof this.json_cfg.background.color !== "undefined" && this.json_cfg.background.color !== null) {
			this.bg.style.backgroundColor = this.json_cfg.background.color;
		}
		else {
			this.bg.style.backgroundColor = "#000000";
		}
		
		// Setup the clipping size
		if (this.clientID===-1) {
			// set the resolution to be the whole display wall
			var wallWidth  = this.json_cfg.resolution.width  * this.json_cfg.layout.columns;
			var wallHeight = this.json_cfg.resolution.height * this.json_cfg.layout.rows;
			this.wallRatio = wallWidth / wallHeight;
			
			document.body.style.overflow = "scroll";
			
			this.bg.style.width    = wallWidth  + "px";
			this.bg.style.height   = wallHeight + "px";
			this.bg.style.overflow = "hidden";

			// put the scale up to the top left
			this.bg.style.webkitTransformOrigin = "0% 0%";

			// calculate the scale ratio to make it fit
			this.browserRatio = document.documentElement.clientWidth / document.documentElement.clientHeight;
			var newratio;
			if (this.wallRatio >= this.browserRatio)
				newratio = document.documentElement.clientWidth / wallWidth;
			else
				newratio = document.documentElement.clientHeight / wallHeight;
			this.bg.style.webkitTransform = "scale("+(newratio)+")";

			window.onresize = function(event) {
				// recalculate after every window resize
				_this.browserRatio = document.documentElement.clientWidth / document.documentElement.clientHeight;
				if (_this.ratio === "fit") {
					var newratio;
					if (_this.wallRatio >= _this.browserRatio)
						newratio = document.documentElement.clientWidth / wallWidth;
					else
						newratio = document.documentElement.clientHeight / wallHeight;
					_this.bg.style.webkitTransform = "scale("+(newratio)+")";
				}
			};
			window.onkeydown = function (event) {
				// keycode: f
				if (event.keyCode === 70) {
					if (_this.ratio === "fit") {
						_this.bg.style.webkitTransform = "scale(1)";
						_this.ratio = "full";
					} else if (_this.ratio === "full") {
						var newratio;
						if (_this.wallRatio >= _this.browserRatio)
							newratio = document.documentElement.clientWidth / wallWidth;
						else
							newratio = document.documentElement.clientHeight / wallHeight;
						_this.bg.style.webkitTransform = "scale("+(newratio)+")";
						_this.ratio = "fit";
					}
					// This somehow forces a reflow of the div and show the scrollbars as needed
					// Needed with chrome v36
					_this.bg.style.display='none';
					_this.bg.offsetHeight;
					_this.bg.style.display='block';
				}
			};
			// show the cursor in this mode
			document.body.style.cursor = "initial";
		} else {
			if (typeof this.json_cfg.background.image !== "undefined" && this.json_cfg.background.image !== null) {
				var bgImg = new Image();
				bgImg.addEventListener('load', function() {				
					if(_this.json_cfg.background.style == "tile"){
						var top = -1 * (_this.offsetY % bgImg.naturalHeight);
						var left = -1 * (_this.offsetX % bgImg.naturalWidth);
						
						_this.bg.style.top    = top.toString() + "px";
						_this.bg.style.left   = left.toString() + "px";
						_this.bg.style.width  = (_this.json_cfg.resolution.width - left).toString() + "px";
						_this.bg.style.height = (_this.json_cfg.resolution.height - top).toString() + "px";
						
						_this.bg.style.backgroundImage    = "url(" + _this.json_cfg.background.image + ")";
						_this.bg.style.backgroundPosition = "top left";
						_this.bg.style.backgroundRepeat   = "repeat-x repeat-y";
						_this.bg.style.backgroundSize     = bgImg.naturalWidth +"px " + bgImg.naturalHeight + "px";
						
						_this.main.style.top    = (-1*top).toString()  + "px";
						_this.main.style.left   = (-1*left).toString() + "px";
						_this.main.style.width  = _this.json_cfg.resolution.width  + "px";
						_this.main.style.height = _this.json_cfg.resolution.height + "px";
					}
					else {
						var bgImgFinal;
						var ext = _this.json_cfg.background.image.lastIndexOf(".");
						if(_this.json_cfg.background.style == "fit" && (bgImg.naturalWidth != _this.json_cfg.totalWidth || bgImg.naturalHeight != _this.json_cfg.totalHeight))
							bgImgFinal = _this.json_cfg.background.image.substring(0, ext) + "_" + _this.clientID + ".png";
						else
							bgImgFinal = _this.json_cfg.background.image.substring(0, ext) + "_" + _this.clientID + _this.json_cfg.background.image.substring(ext);
						
						_this.bg.style.top    = "0px";
						_this.bg.style.left   = "0px";
						_this.bg.style.width  = _this.json_cfg.resolution.width + "px";
						_this.bg.style.height = _this.json_cfg.resolution.height + "px";
						
						_this.bg.style.backgroundImage    = "url(" + bgImgFinal + ")";
						_this.bg.style.backgroundPosition = "top left";
						_this.bg.style.backgroundRepeat   = "no-repeat";
						_this.bg.style.backgroundSize     = _this.json_cfg.resolution.width +"px " + _this.json_cfg.resolution.height + "px";
						
						_this.main.style.top    = "0px";
						_this.main.style.left   = "0px";
						_this.main.style.width  = _this.json_cfg.resolution.width  + "px";
						_this.main.style.height = _this.json_cfg.resolution.height + "px";
					}
				}, false);
				bgImg.src = this.json_cfg.background.image;
			}
			else {
				this.bg.style.top    = "0px";
				this.bg.style.left   = "0px";
				this.bg.style.width  = this.json_cfg.resolution.width + "px";
				this.bg.style.height = this.json_cfg.resolution.height + "px";
				
				this.main.style.width  = this.json_cfg.resolution.width  + "px";
				this.main.style.height = this.json_cfg.resolution.height + "px";
			}
			
			if (json_cfg.background.clip === true) {
				this.main.style.overflow = "hidden";

				if (this.json_cfg.background.image === null) {
					// if no image and clip, set the color of the div instead
					document.body.style.backgroundColor = '#000000';
					this.main.style.backgroundColor = this.json_cfg.background.color;
				}
			}
		}
	};

	this.setTime = function (val) {
			// must update date to construct based on (year, month, day, hours, minutes, seconds, milliseconds)
		var now;
		if (this.json_cfg.ui.clock == 12) now = formatAMPM(val);
		else now = format24Hr(val);
		this.clock.textContent = now;
	};

	this.build = function () {
		console.log("Buidling the UI for the display");
		
		this.logoLoadedFunc = this.logoLoaded.bind(this);
		this.watermarkLoadedFunc = this.watermarkLoaded.bind(this);
		
		var head = document.getElementsByTagName("head")[0];

		// Load CSS style sheet
		var fileref = document.createElement("link");
		fileref.setAttribute("rel",   "stylesheet");
		fileref.setAttribute("type",  "text/css");
		fileref.setAttribute("media", "screen");
		fileref.setAttribute("href",  this.csssheet);
		
		if (this.clientID===-1) {
			this.offsetX = 0;
			this.offsetY = 0;
			this.titleBarHeight = this.json_cfg.ui.titleBarHeight;
			this.titleTextSize  = this.json_cfg.ui.titleTextSize;
			this.pointerWidth   = this.json_cfg.ui.pointerSize*4;
			this.pointerHeight  = this.json_cfg.ui.pointerSize;
			this.pointerOffsetX = Math.round(0.025384*this.pointerHeight);
			this.pointerOffsetY = Math.round(0.060805*this.pointerHeight);
		} else {
			this.offsetX = this.json_cfg.displays[this.clientID].column * this.json_cfg.resolution.width;
			this.offsetY = this.json_cfg.displays[this.clientID].row * this.json_cfg.resolution.height;
			this.titleBarHeight = this.json_cfg.ui.titleBarHeight;
			this.titleTextSize  = this.json_cfg.ui.titleTextSize;
			this.pointerWidth   = this.json_cfg.ui.pointerSize*4;
			this.pointerHeight  = this.json_cfg.ui.pointerSize;
			this.pointerOffsetX = Math.round(0.025384*this.pointerHeight);
			this.pointerOffsetY = Math.round(0.060805*this.pointerHeight);
		}
		if (this.json_cfg.ui.noDropShadow === true) this.noDropShadow = true;
		else this.noDropShadow = false;

		// Build the upper bar
		this.upperBar    = document.createElement('div');
		this.upperBar.webkitTransformStyle = "preserve-3d"; // to make the transforms below "better"
		this.upperBar.id = "upperBar";
		
		var textColor = "rgba(255, 255, 255, 1.0)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.textColor !== undefined)
			textColor = this.json_cfg.ui.menubar.textColor;
			
		// time clock
		this.clock = document.createElement('p');
		this.clock.id  = "time";
		// machine name
		var machine = document.createElement('p');
		machine.id  = "machine";
		// version id
		var version = document.createElement('p');
		version.id  = "version";
		// EVL-LAVA logo
		var logo = document.createElement('object');
		logo.id = "logo";
		// background watermark
		var watermark = document.createElement('object');
		watermark.id = "watermark";
		
		this.upperBar.appendChild(this.clock);
		this.upperBar.appendChild(machine);
		this.upperBar.appendChild(version);
		this.upperBar.appendChild(logo);
		this.bg.appendChild(watermark);
		this.main.appendChild(this.upperBar);
		
		var backgroundColor = "rgba(0, 0, 0, 0.5)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.backgroundColor !== undefined)
			backgroundColor = this.json_cfg.ui.menubar.backgroundColor;
			
		this.upperBar.style.height = this.titleBarHeight.toString() + "px";
		this.upperBar.style.left   = "0px";
		this.upperBar.style.top    = -this.offsetY.toString() + "px";
		this.upperBar.style.zIndex = "9999";
		this.upperBar.style.backgroundColor = backgroundColor;
		
		this.clock.style.position   = "absolute";
		this.clock.style.whiteSpace = "nowrap";
		this.clock.style.fontSize   = Math.round(this.titleTextSize) + "px";
		this.clock.style.color      = textColor;
		this.clock.style.left       = (-this.offsetX + this.titleBarHeight).toString() + "px";
		// center vertically: position top 50% and then translate by -50%
		this.clock.style.top        = "50%";
		this.clock.style.webkitTransform  = "translateY(-50%)";
		
		machine.style.position   = "absolute";
		machine.style.whiteSpace = "nowrap";
		machine.style.fontSize   = Math.round(this.titleTextSize) + "px";
		machine.style.color      = textColor;
		machine.style.left       = (-this.offsetX + (6*this.titleBarHeight)).toString() + "px";
		machine.style.top        = "50%";
		machine.style.webkitTransform  = "translateY(-50%)";
		
		version.style.position   = "absolute";
		version.style.whiteSpace = "nowrap";
		version.style.fontSize   = Math.round(this.titleTextSize) + "px";
		version.style.color      = textColor;
		version.style.left       = (this.json_cfg.totalWidth - this.offsetX - (18*this.titleBarHeight)).toString() + "px";
		version.style.top        = "50%";
		version.style.webkitTransform  = "translateY(-50%)";
		
		logo.addEventListener('load', this.logoLoadedFunc, false);
		logo.data = "images/EVL-LAVA.svg";
		logo.type = "image/svg+xml";
		
		if(this.json_cfg.background.watermark !== undefined){
			watermark.addEventListener('load', this.watermarkLoadedFunc, false);
			watermark.data = this.json_cfg.background.watermark.svg;
			watermark.type = "image/svg+xml";
		}
		
		if (this.json_cfg.ui.show_url) {
			var url   = this.json_cfg.host;
			var iport = this.json_cfg.index_port;
			if(iport !== 80) url += ":" + iport;
			if(this.json_cfg.rproxy_index_port !== undefined) {
				iport = this.json_cfg.rproxy_index_port;
				url = window.location.hostname;
				if(iport !== 80) url += ":" + iport;
				url += window.location.pathname;
			}
			machine.textContent = url;
		}
		head.appendChild(fileref);
	};
	
	this.updateVersionText = function(data) {
		if(this.json_cfg.ui.show_version) {
			var version = document.getElementById('version');
			if (data.branch && data.commit && data.date)
				version.innerHTML = "<b>v" + data.base+"-"+data.branch+"-"+data.commit+"</b> " + data.date;
			else
				version.innerHTML = "<b>v" + data.base + "</b>";
		}
	};
	
	this.logoLoaded = function(event) {
		var logo = document.getElementById('logo');
		var logoSVG = logo.getSVGDocument().querySelector('svg');
		
		var bbox = logoSVG.getBBox();
		
		var height = 0.95 * this.titleBarHeight;
		var width  = height * (bbox.width/bbox.height);
	
		logo.width  = width;
		logo.height = height;
		logo.style.position   = "absolute";
		logo.style.left       = (this.json_cfg.totalWidth - this.offsetX - width - this.titleBarHeight).toString() + "px";
		logo.style.top        = (0.025*this.titleBarHeight).toString() + "px";
		
		var textColor = "rgba(255, 255, 255, 1.0)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.textColor !== undefined)
			textColor = this.json_cfg.ui.menubar.textColor;
		this.changeSVGColor(logoSVG, "path", null, textColor);
	};
	
	this.watermarkLoaded = function(event) {
		var watermark = document.getElementById('watermark');
		var watermarkSVG = watermark.getSVGDocument().querySelector('svg');
		
		var bbox = watermarkSVG.getBBox();
		var width;
		var height;
		
		if(bbox.width/bbox.height >= this.json_cfg.totalWidth/this.json_cfg.totalHeight) {
			width  = this.json_cfg.totalWidth / 2;
			height = width * bbox.height/bbox.width;
		}
		else {
			height = this.json_cfg.totalHeight / 2;
			width  = height * bbox.width/bbox.height;
		}
	
		watermark.width  = width;
		watermark.height = height;
		watermark.style.position = "absolute";
		watermark.style.left     = ((this.json_cfg.totalWidth  / 2) - (width  / 2) - this.offsetX).toString() + "px";
		watermark.style.top      = ((this.json_cfg.totalHeight / 2) - (height / 2) - this.offsetY).toString() + "px";
		
		this.changeSVGColor(watermarkSVG, "path", null, this.json_cfg.background.watermark.color);
	};
	
	this.changeSVGColor = function(svgItem, elementType, strokeColor, fillColor) {
		var elements = svgItem.querySelectorAll(elementType);
		for(var i=0; i<elements.length; i++){
			if(strokeColor) elements[i].style.stroke = strokeColor;
			if(fillColor)   elements[i].style.fill   = fillColor;
		}
	};

	this.createSagePointer = function(pointer_data) {
		var pointerElem = createDrawingElement(pointer_data.id, "pointerItem",
							pointer_data.left - this.pointerOffsetX - this.offsetX,
							pointer_data.top  - this.pointerOffsetY - this.offsetY,
							this.pointerWidth, this.pointerHeight, 10000);
		this.main.appendChild(pointerElem); 

		var ptr = new pointer(); 
		ptr.init(pointerElem.id, pointer_data.label, pointer_data.color) ;
		ptr.draw();

		if (pointer_data.visible) pointerElem.style.display = "block";
		else pointerElem.style.display = "none";

		// keep track of the pointers
        this.pointerItems[pointerElem.id] = ptr;
	};

	this.showSagePointer = function(pointer_data) {
		var pointerElem = document.getElementById(pointer_data.id);

		pointerElem.style.display = "block";
		pointerElem.style.left    = (pointer_data.left-this.pointerOffsetX-this.offsetX).toString() + "px";
		pointerElem.style.top     = (pointer_data.top-this.pointerOffsetY-this.offsetY).toString()  + "px";

	    this.pointerItems[pointerElem.id].setLabel(pointer_data.label);
	    this.pointerItems[pointerElem.id].setColor(pointer_data.color);
	    this.pointerItems[pointerElem.id].draw();
	};

	this.hideSagePointer = function(pointer_data) {
		var pointerElem = document.getElementById(pointer_data.id);
		pointerElem.style.display = "none";
	};

	this.updateSagePointerPosition = function(pointer_data) {
		var pointerElem = document.getElementById(pointer_data.id);
		pointerElem.style.left = (pointer_data.left-this.pointerOffsetX-this.offsetX).toString() + "px";
		pointerElem.style.top  = (pointer_data.top-this.pointerOffsetY-this.offsetY).toString()  + "px";
	};
	
	this.changeSagePointerMode = function(pointer_data) {
		this.pointerItems[pointer_data.id].changeMode(pointer_data.mode);
		this.pointerItems[pointer_data.id].draw();
	};
	
	this.createRadialMenu = function(data) {

		var menuElem = document.getElementById(data.id+"_menu");

		if( !menuElem )
		{
			menuElem = createDrawingElement(data.id+"_menu", "pointerItem",
								data.x  - this.offsetX,
								data.y - this.offsetY,
								radialMenuSize.x, radialMenuSize.y, 9000);
			menuElem2 = createDrawingElement(data.id+"_menuWindow", "pointerItem",
								data.x  - this.offsetX,
								data.y - this.offsetY,
								radialMenuSize.x, radialMenuSize.y, 8900);
			this.main.appendChild(menuElem); 
			this.main.appendChild(menuElem2); 
			
			var menu = new radialMenu();
			
			menu.init(data.id+"_menu", menuElem2) ;
			
			menuElem.style.left = (data.x - this.offsetX - menu.radialMenuCenter.x).toString() + "px";
			menuElem.style.top  = (data.y - this.offsetY - menu.radialMenuCenter.y).toString()  + "px";
			
			menu.thumbnailWindowElement.style.left = menuElem.style.left;
			menu.thumbnailWindowElement.style.top = menuElem.style.top;
			
			// keep track of the menus
			this.radialMenus[data.id+"_menu"] = menu;
			this.radialMenus[data.id+"_menu"].draw();
		}
		if( this.radialMenus[menuElem.id].visible === false )
		{
			menuElem.style.left = (data.x - this.offsetX - this.radialMenus[data.id+"_menu"].radialMenuCenter.x).toString() + "px";
			menuElem.style.top  = (data.y - this.offsetY - this.radialMenus[data.id+"_menu"].radialMenuCenter.y).toString()  + "px";
			
			this.radialMenus[menuElem.id].thumbnailWindowElement.style.left = menuElem.style.left;
			this.radialMenus[menuElem.id].thumbnailWindowElement.style.top = menuElem.style.top;
			
			this.radialMenus[menuElem.id].visible = true;
			menuElem.style.display = "block";
			this.radialMenus[menuElem.id].draw();
		}
	};
	
	this.radialMenuEvent = function(data) {
		
		for (var menuID in this.radialMenus) {
			var menuElem = document.getElementById(menuID);
			var menu = this.radialMenus[menuID];

			if( menuElem !== null )
			{
				var rect = menuElem.getBoundingClientRect();
				
				pointerX = data.x - rect.left - this.offsetX;
				pointerY = data.y - rect.top - this.offsetY;
					
				if( menu.visible )
				{
					menu.onEvent( data.type, {x: pointerX, y: pointerY, windowX: rect.left, windowY: rect.top}, data.id, data.data );
					menuElem.style.display = "block";
					menu.thumbnailWindowElement.style.display = "block";
					
					dragOffset = menu.dragPosition;
					if( menu.windowInteractionMode === false )
					{
						dragOffset = menu.dragPosition;
						menuElem.style.left    = (data.x - this.offsetX - dragOffset.x).toString() + "px";
						menuElem.style.top     = (data.y - this.offsetY - dragOffset.y).toString()  + "px";
					}
					
					menu.thumbnailWindowElement.style.left = (rect.left + menu.thumbnailWindowScrollOffset.x).toString() + "px";
					menu.thumbnailWindowElement.style.top = (rect.top + menu.thumbnailWindowScrollOffset.y).toString()  + "px";
					
					if( menu.ctx.redraw === true || menu.thumbWindowctx.redraw === true )
					{
						menu.draw();
					}
				}
				else
				{
					menuElem.style.display = "none";
					menu.thumbnailWindowElement.style.display = "none";
				}
			}
		}
	};
	
	this.updateRadialMenu = function(data) {
		
		var menuElem = document.getElementById(data.id+"_menu");
		if( menuElem !== null )
		{
			this.radialMenus[menuElem.id].updateFileList(data.fileList);
			this.radialMenus[menuElem.id].draw();
		}
	};
	
	this.addRemoteSite = function(data) {
		var connectedColor = "rgba(55, 153, 130, 1.0)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteConnectedColor !== undefined)
			connectedColor = this.json_cfg.ui.menubar.remoteConnectedColor;
		var disconnectedColor = "rgba(173, 42, 42, 1.0)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteDisconnectedColor !== undefined)
			disconnectedColor = this.json_cfg.ui.menubar.remoteDisconnectedColor;
		
		var remote = document.createElement('div');
		remote.id  = data.name;
		remote.style.position = "absolute";
		remote.style.textAlign = "center";
		remote.style.width  = data.width.toString() + "px";
		remote.style.height = data.height.toString() + "px";
		remote.style.left   = (-this.offsetX + data.pos).toString() + "px";
		remote.style.top    = (-this.offsetY+2).toString() + "px";
		if (data.connected) remote.style.backgroundColor = connectedColor;
		else remote.style.backgroundColor = disconnectedColor;

		var color = "rgba(255, 255, 255, 1.0)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.textColor !== undefined)
			color = this.json_cfg.ui.menubar.textColor;
		
		var name = document.createElement('p');
		name.style.whiteSpace = "nowrap";
		name.style.fontSize = Math.round(this.titleTextSize) + "px";
		name.style.color = color;
		name.textContent = data.name;
		remote.appendChild(name);
		
		this.upperBar.appendChild(remote);
	};

	this.connectedToRemoteSite = function(data) {
		var connectedColor = "rgba(55, 153, 130, 1.0)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteConnectedColor !== undefined)
			connectedColor = this.json_cfg.ui.menubar.remoteConnectedColor;
		var disconnectedColor = "rgba(173, 42, 42, 1.0)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteDisconnectedColor !== undefined)
			disconnectedColor = this.json_cfg.ui.menubar.remoteDisconnectedColor;
			
		var remote = document.getElementById(data.name);
		if (data.connected) remote.style.backgroundColor = connectedColor;
		else remote.style.backgroundColor = disconnectedColor;
	};

	this.hideInterface = function() {
		// Hide the top bar
		this.upperBar.style.display = 'none';
		// Hide the pointers
		for (var p in this.pointerItems) {
			this.pointerItems[p].element.style.display = 'none';
		}
		// Hide the apps top bar
		var applist = document.getElementsByClassName("windowTitle");
		for (var i = 0; i < applist.length; i++) {
			applist[i].style.display = 'none';
		}
	};
	this.showInterface = function() {
		// Show the top bar
		this.upperBar.style.display = 'block';
		// Show the pointers (only if they have a name, ui pointers dont have names)
		for (var p in this.pointerItems) {
			if (this.pointerItems[p].label !== "")
				this.pointerItems[p].element.style.display = 'block';
		}
		// Show the apps top bar
		var applist = document.getElementsByClassName("windowTitle");
		for (var i = 0; i < applist.length; i++) {
			applist[i].style.display = 'block';
		}
	};
}
