// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


function windowManager(id, ws) {
	this.element = document.getElementById(id);
	this.ctx     = this.element.getContext("2d");
	this.wsio    = ws;
	this.nRows   = 0;
	this.nCols   = 0;
	this.config  = null;

	this.aspectRatio = 1.0;
	this.resolution  = [];
	this.scale       = 1.0;
	this.titleBarHeight = 0;
	this.applications   = [];
	this.mouseX         = 0;
	this.mouseY         = 0;

	this.canvasImg        = new Image();
	this.canvasImg.src    = "images/canvas.png";
	this.imageImg         = new Image();
	this.imageImg.src     = "images/image.png";
	this.kineticjsImg     = new Image();
	this.kineticjsImg.src = "images/kineticjs.png";
	this.pdfImg           = new Image();
	this.pdfImg.src       = "images/pdf.png";
	this.screenImg        = new Image();
	this.screenImg.src    = "images/screen.png";
	this.threejsImg       = new Image();
	this.threejsImg.src   = "images/threejs.png";
	this.videoImg         = new Image();
	this.videoImg.src     = "images/video.png";
	this.webglImg         = new Image();
	this.webglImg.src     = "images/webgl.png";
	this.youtubeImg       = new Image();
	this.youtubeImg.src   = "images/youtube.png";
	this.applicationIcons = {};

	this.draw = function() {
		// clear canvas		
		this.ctx.clearRect(0,0, this.element.width, this.element.weight);
		
		var i;
		
		/* draw display background */
		this.ctx.fillStyle = "rgba(200, 200, 200, 1.0)";
		this.ctx.fillRect(0,0, this.element.width, this.element.height);
        
        
		/* draw all items */
		for(i=0; i<this.applications.length; i++){
			// item
			this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
			this.ctx.lineWidth = 2;
			this.ctx.strokeStyle = "rgba(90, 90, 90, 1.0)";
			
			if (this.config.ui.noDropShadow === true) {
				// no drop shadow
			} else {
				this.ctx.shadowOffsetX = 8;
				this.ctx.shadowOffsetY = 8;
				this.ctx.shadowBlur = 12;
				this.ctx.shadowColor = "#222222";
			}
			
			var eLeft   = this.applications[i].left * this.scale;
			var eTop    = (this.applications[i].top+this.titleBarHeight) * this.scale;
			var eWidth  = this.applications[i].width * this.scale;
			var eHeight = this.applications[i].height * this.scale;
			
			this.ctx.fillRect(eLeft, eTop, eWidth, eHeight);
			
			this.ctx.shadowOffsetX = 0;
			this.ctx.shadowOffsetY = 0;
			this.ctx.shadowBlur = 0;
			
			this.ctx.strokeRect(eLeft, eTop, eWidth, eHeight);
			
			// item icon
			var size = 0.8*Math.min(eWidth, eHeight);
			var x = eLeft + (eWidth/2) - (size/2);
			var y = eTop + (eHeight/2) - (size/2);
			var applicationName = this.applications[i].application;

			if(applicationName === "image_viewer") this.ctx.drawImage(this.imageImg, x, y, size, size);
			else if(applicationName === "movie_player") this.ctx.drawImage(this.videoImg, x, y, size, size);
			else if(applicationName === "pdf_viewer") this.ctx.drawImage(this.pdfImg, x, y, size, size);
			else if(applicationName === "media_stream") this.ctx.drawImage(this.screenImg, x, y, size, size);
			else {
				var applicationIcon = null;
				// test if the application provided an icon
				if (this.applications[i].icon) {
					if (this.applicationIcons[applicationName]) {
						// the icon is already loaded
						applicationIcon = this.applicationIcons[applicationName];
						this.ctx.drawImage(applicationIcon, x, y, size, size);
					} else {
						// loading the icon the first time
						applicationIcon     = new Image();
						applicationIcon.src = this.applications[i].icon;
						// cache the icon image
						this.applicationIcons[applicationName] = applicationIcon;
						var self = this;
						applicationIcon.onload = function() {
							// wait for the icon to load for drawing it
							self.ctx.drawImage(applicationIcon, x, y, size, size);
						};
					}
				} else {
					// by default, use the canvas icon
					applicationIcon = this.canvasImg;
					this.ctx.drawImage(applicationIcon, x, y, size, size);
				}
			}

			// title bar
			this.ctx.fillStyle = "rgba(102, 102, 102, 1.0)";
			this.ctx.lineWidth = 2;
			this.ctx.strokeStyle = "rgba(90, 90, 90, 1.0)";
			
			eLeft   = this.applications[i].left * this.scale;
			eTop    = (this.applications[i].top) * this.scale;
			eWidth  = this.applications[i].width * this.scale;
			eHeight = this.titleBarHeight * this.scale;
			
			this.ctx.fillRect(eLeft, eTop, eWidth, eHeight);
			this.ctx.strokeRect(eLeft, eTop, eWidth, eHeight);
		}
		
		/* draw tiled display layout */
		this.ctx.lineWidth = 2;
		this.ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
		this.ctx.strokeRect(0,0, this.element.width, this.element.height);
		
		var stepX = this.element.width/this.nCols;
		var stepY = this.element.height/this.nRows;
		this.ctx.beginPath();
		for(i=1; i<this.nCols; i++){
			this.ctx.moveTo(i*stepX, 0);
			this.ctx.lineTo(i*stepX, this.element.height);
		}
		for(i=1; i<this.nRows; i++){
			this.ctx.moveTo(0, i*stepY);
			this.ctx.lineTo(this.element.width, i*stepY);
		}
		this.ctx.closePath();
		this.ctx.stroke();
	};
	
	this.mousePress = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		// ignore right click for now
		if (btn !== "right")
			this.wsio.emit('pointerPress',{button:btn});
		event.preventDefault();
	};
	
	this.mouseMove = function(event) {
		var rect = this.element.getBoundingClientRect();
		this.mouseX = event.clientX - rect.left;
		this.mouseY = event.clientY - rect.top;
		var globalX = this.mouseX / this.scale;
		var globalY = this.mouseY / this.scale;
		
		this.wsio.emit('pointerPosition', {pointerX: globalX, pointerY: globalY});
	};
	
	this.mouseRelease = function(event) {
		var btn = (event.button === 0) ? "left" : (event.button === 1) ? "middle" : "right";
		// ignore right click for now
		if (btn !== "right")
			this.wsio.emit('pointerRelease',{button:btn});
		event.preventDefault();
	};
	

	this.mouseScroll = function(event) {
		this.wsio.emit('pointerScrollStart');
		this.wsio.emit('pointerScroll', {wheelDelta: event.wheelDelta});
		event.preventDefault();
	};
	
	this.mouseScrollFF = function(event) {
		var wheelDelta = -120*event.detail;
		this.wsio.emit('pointerScrollStart');
		this.wsio.emit('pointerScroll', {wheelDelta: wheelDelta});
		event.preventDefault();
	};
	
	this.mouseDblClick = function(event) {
		wsio.emit('pointerDblClick');
		event.preventDefault();
	};
	
	this.keyDown = function(event) {
		this.wsio.emit('keyDown', {code: event.keyCode});
		event.preventDefault();
	};
	
	this.keyUp = function(event) {
		this.wsio.emit('keyUp', {code: event.keyCode});
		event.preventDefault();
	};
	
    this.keyPress = function(event) {
		this.wsio.emit('keyPress', {code: event.charCode});
		event.preventDefault();
	};
	
	this.addAppWindow = function(data) {
		this.applications.push(data);
		this.draw();
	};
	
	this.deleteElement = function(elemId) {
		var selectedIndex;
		var selectedItem;
		var i;
		for(i=0; i<this.applications.length; i++){
			if(this.applications[i].id == elemId){
				selectedIndex = i;
				selectedItem = this.applications[i];
				break;
			}
		}
		for(i=selectedIndex; i<this.applications.length-1; i++){
			this.applications[i] = this.applications[i+1];
		}
		this.applications[this.applications.length-1] = selectedItem;
		this.applications.pop();
		this.draw();
	};
	
	this.initDisplayConfig = function(config) {
		this.config = config;
		this.nRows  = config.layout.rows;
		this.nCols  = config.layout.columns;
		
		this.resolution = [(config.resolution.width*this.nCols), (config.resolution.height*this.nRows)];
		this.aspectRatio = this.resolution[0] / this.resolution[1];
		
		var widthPx  = this.element.parentNode.style.width;
		var heightPx = this.element.parentNode.style.height;
		
		this.element.width = widthPx.substring(0, widthPx.length-2);
		this.element.height = heightPx.substring(0, heightPx.length-2);
		
		this.scale = this.element.width / this.resolution[0];
		
		this.titleBarHeight = config.ui.titleBarHeight;
		
		this.draw();
	};
	
	this.resize = function() {
		var widthPx  = this.element.parentNode.style.width;
		var heightPx = this.element.parentNode.style.height;
		
		this.element.width = widthPx.substring(0, widthPx.length-2);
		this.element.height = heightPx.substring(0, heightPx.length-2);
		
		this.scale = this.element.width / this.resolution[0];
		
		this.draw();
	};
	
	this.updateItemOrder = function(idList) {
		var i;
		var j;
		for(i=0; i<idList.length; i++){
			for(j=0; j<this.applications.length; j++){
				if(this.applications[j].id == idList[i]){
					var tmp = this.applications[i];
					this.applications[i] = this.applications[j];
					this.applications[j] = tmp;
				}
			}
		}
		
		this.draw();
	};
	
	this.setItemPosition = function(position_data) {
		var i;
		for(i=0; i<this.applications.length; i++){
			if(this.applications[i].id == position_data.elemId){
				this.applications[i].left = position_data.elemLeft;
				this.applications[i].top = position_data.elemTop;
				break;
			}
		}
		this.draw();
	};
	
	this.setItemPositionAndSize = function(position_data) {
		var i;
		for(i=0; i<this.applications.length; i++){
			if(this.applications[i].id == position_data.elemId){
				this.applications[i].left = position_data.elemLeft;
				this.applications[i].top = position_data.elemTop;
				this.applications[i].width = position_data.elemWidth;
				this.applications[i].height = position_data.elemHeight;
				break;
			}
		}
		this.draw();
	};

	// Mouse handlers
	this.element.addEventListener('mousedown',  this.mousePress.bind(this),    false);
	this.element.addEventListener('mousemove',  this.mouseMove.bind(this),     false);
	this.element.addEventListener('mouseup',    this.mouseRelease.bind(this),  false);
	this.element.addEventListener('dblclick',   this.mouseDblClick.bind(this), false);
	this.element.addEventListener('mousewheel', this.mouseScroll.bind(this),   false);
	//this.element.addEventListener('DOMMouseScroll', this.mouseScrollFF.bind(this), false);

	// Prevent right menu to open on the canvas
	this.element.addEventListener('contextmenu', function(evt) {
		  evt.preventDefault();
		}, false);

	// Touch-enabled code
	//    using hammer.js library: http://hammerjs.github.io/
	if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
		var _this = this;
		this.hammertime = new Hammer(this.element);

		// Enable pin-to-zoom
		this.hammertime.get('pinch').set({ enable: true });
		// Set 1sec delay to trigger 'press' event
		this.hammertime.get('press').set({ time: 1000 });

		this.hammertime.on('press', function(event) {
			// Simulate delete key: press 1sec to delete app
			_this.wsio.emit('keyUp', {code: 46});
		});

		// Pan event
		this.hammertime.on('pan', function(event) {
			// Set the pointer position
			var rect = _this.element.getBoundingClientRect();
			_this.mouseX = event.center.x - rect.left;
			_this.mouseY = event.center.y - rect.top;
			var globalX = _this.mouseX / _this.scale;
			var globalY = _this.mouseY / _this.scale;
			_this.wsio.emit('pointerPosition', {pointerX: globalX, pointerY: globalY});
			// Send a pointer press event
			_this.wsio.emit('pointerPress',{button:'left'});
		});

		this.hammertime.on('panend', function(event) {
			// When panning ends, release the pointer
			_this.wsio.emit('pointerRelease',{button:'left'});
		});

		// Double-tap event
		this.hammertime.on('doubletap', function(event) {
			// Emit the double-click event
			wsio.emit('pointerDblClick');
		});

		// Single-tap event
		this.hammertime.on('tap', function(event) {
			// Set the pointer position
			var rect = _this.element.getBoundingClientRect();
			_this.mouseX = event.center.x - rect.left;
			_this.mouseY = event.center.y - rect.top;
			var globalX = _this.mouseX / _this.scale;
			var globalY = _this.mouseY / _this.scale;
			_this.wsio.emit('pointerPosition', {pointerX: globalX, pointerY: globalY});
			// Simulate a press-release sequence
			_this.wsio.emit('pointerPress',{button:'left'});
			_this.wsio.emit('pointerRelease',{button:'left'});
		});

		this.hammertime.on('pinchstart pinchend', function(event) {
			// Position the pointer
			var rect = _this.element.getBoundingClientRect();
			_this.mouseX = event.center.x - rect.left;
			_this.mouseY = event.center.y - rect.top;
			var globalX = _this.mouseX / _this.scale;
			var globalY = _this.mouseY / _this.scale;
			_this.wsio.emit('pointerPosition', {pointerX: globalX, pointerY: globalY});
		});

		this.hammertime.on('pinchin', function(event) {
			var delta = 3 * parseInt(1.0/event.scale);  // zoom out a bit faster

			// Do the scolling
			_this.wsio.emit('pointerScrollStart');
			_this.wsio.emit('pointerScroll', {wheelDelta: delta});
		});
		this.hammertime.on('pinchout', function(event) {
			var delta = 2 * parseInt(-event.scale);   // scaling zoom in

			// Do the scolling
			_this.wsio.emit('pointerScrollStart');
			_this.wsio.emit('pointerScroll', {wheelDelta: delta});
		});
	}
}
