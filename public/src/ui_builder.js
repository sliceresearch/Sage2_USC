// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 * Building the display background and elememnts
 *
 * @module client
 * @submodule UIBuilder
 */

/**
* Constructor for UIBuilder object
*
* @class UIBuilder
* @constructor
* @param json_cfg {Object} configuration structure
* @param clientID {Number} ID of the display client (-1, 0, ...N)
*/
function UIBuilder(json_cfg, clientID) {

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
	this.uiHidden       = null;

	// Aspect ratio of the wall and the browser
	this.wallRatio      = null;
	this.browserRatio   = null;
	this.ratio          = "fit";

	this.pointerItems   = {};
	this.radialMenus    = {};

	// Get handle on the main div
	this.bg   = document.getElementById("background");
	this.main = document.getElementById("main");

	/**
	* Build the background image/color
	*
	* @method background
	*/
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
			this.bg.style.mozTransformOrigin = "0% 0%";
			this.bg.style.transformOrigin = "0% 0%";

			// calculate the scale ratio to make it fit
			this.browserRatio = document.documentElement.clientWidth / document.documentElement.clientHeight;
			var newratio;
			if (this.wallRatio >= this.browserRatio)
				newratio = document.documentElement.clientWidth / wallWidth;
			else
				newratio = document.documentElement.clientHeight / wallHeight;
			this.bg.style.webkitTransform = "scale("+(newratio)+")";
			this.bg.style.mozTransform    = "scale("+(newratio)+")";
			this.bg.style.transform       = "scale("+(newratio)+")";

			window.onresize = function(event) {
				// recalculate after every window resize
				_this.browserRatio = document.documentElement.clientWidth / document.documentElement.clientHeight;
				if (_this.ratio === "fit") {
					var newr;
					if (_this.wallRatio >= _this.browserRatio)
						newr = document.documentElement.clientWidth / wallWidth;
					else
						newr = document.documentElement.clientHeight / wallHeight;
					_this.bg.style.webkitTransform = "scale("+(newr)+")";
					_this.bg.style.mozTransform    = "scale("+(newr)+")";
					_this.bg.style.transform       = "scale("+(newr)+")";
				}
			};
			window.onkeydown = function (event) {
				// keycode: f
				if (event.keyCode === 70) {
					if (_this.ratio === "fit") {
						_this.bg.style.webkitTransform = "scale(1)";
						_this.bg.style.mozTransform = "scale(1)";
						_this.bg.style.transform = "scale(1)";
						_this.ratio = "full";
					} else if (_this.ratio === "full") {
						var newr;
						if (_this.wallRatio >= _this.browserRatio)
							newr = document.documentElement.clientWidth / wallWidth;
						else
							newr = document.documentElement.clientHeight / wallHeight;
						_this.bg.style.webkitTransform = "scale("+(newr)+")";
						_this.bg.style.mozTransform    = "scale("+(newr)+")";
						_this.bg.style.transform       = "scale("+(newr)+")";
						_this.ratio = "fit";
					}
					// This somehow forces a reflow of the div and show the scrollbars as needed
					// Needed with chrome v36
					_this.bg.style.display='none';
					_this.bg.style.display='block';
				}
			};
			// show the cursor in this mode
			document.body.style.cursor = "initial";
		} else {
			document.body.style.backgroundColor = "#000000";
			this.bg.style.backgroundColor = this.json_cfg.background.color || "#333333";
			this.bg.style.top    = "0px";
			this.bg.style.left   = "0px";
			this.bg.style.width  = this.json_cfg.resolution.width + "px";
			this.bg.style.height = this.json_cfg.resolution.height + "px";

			this.main.style.width  = this.json_cfg.resolution.width  + "px";
			this.main.style.height = this.json_cfg.resolution.height + "px";

			if (this.json_cfg.background.image !== undefined && this.json_cfg.background.image.url !== undefined) {
				var bgImg = new Image();
				bgImg.addEventListener('load', function() {
					if (_this.json_cfg.background.image.style === "tile") {
						var top = -1 * (_this.offsetY % bgImg.naturalHeight);
						var left = -1 * (_this.offsetX % bgImg.naturalWidth);

						_this.bg.style.top    = top.toString() + "px";
						_this.bg.style.left   = left.toString() + "px";
						_this.bg.style.width  = (_this.json_cfg.resolution.width - left).toString() + "px";
						_this.bg.style.height = (_this.json_cfg.resolution.height - top).toString() + "px";

						_this.bg.style.backgroundImage    = "url(" + _this.json_cfg.background.image.url + ")";
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
						var ext = _this.json_cfg.background.image.url.lastIndexOf(".");
						if(_this.json_cfg.background.image.style === "fit" && (bgImg.naturalWidth !== _this.json_cfg.totalWidth || bgImg.naturalHeight !== _this.json_cfg.totalHeight))
							bgImgFinal = _this.json_cfg.background.image.url.substring(0, ext) + "_" + _this.clientID + ".png";
						else
							bgImgFinal = _this.json_cfg.background.image.url.substring(0, ext) + "_" + _this.clientID + _this.json_cfg.background.image.url.substring(ext);

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
				bgImg.src = this.json_cfg.background.image.url;
			}

			if (this.json_cfg.background.clip !== undefined && this.json_cfg.background.clip === true) {
				this.bg.style.overflow = "hidden";
				this.main.style.overflow = "hidden";
			}
		}
	};

	/**
	* Buidling the UI for the display
	*
	* @method build
	*/
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
			this.pointerWidth   = this.json_cfg.ui.pointerSize*3;
			this.pointerHeight  = this.json_cfg.ui.pointerSize;
			this.widgetControlSize = this.json_cfg.ui.widgetControlSize;
			this.pointerOffsetX = Math.round(0.025384*this.pointerHeight);
			this.pointerOffsetY = Math.round(0.060805*this.pointerHeight);
		} else {
			this.offsetX = this.json_cfg.displays[this.clientID].column * this.json_cfg.resolution.width;
			this.offsetY = this.json_cfg.displays[this.clientID].row * this.json_cfg.resolution.height;
			this.titleBarHeight = this.json_cfg.ui.titleBarHeight;
			this.titleTextSize  = this.json_cfg.ui.titleTextSize;
			this.pointerWidth   = this.json_cfg.ui.pointerSize*3;
			this.pointerHeight  = this.json_cfg.ui.pointerSize;
			this.widgetControlSize = this.json_cfg.ui.widgetControlSize;
			this.pointerOffsetX = Math.round(0.27917*this.pointerHeight);
			this.pointerOffsetY = Math.round(0.24614*this.pointerHeight);
		}
		if (this.json_cfg.ui.noDropShadow === true) this.noDropShadow = true;
		else this.noDropShadow = false;

		// Build the upper bar
		this.upperBar    = document.createElement('div');
		//this.upperBar.webkitTransformStyle = "preserve-3d"; // to make the transforms below "better" - necessary?
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
		this.main.appendChild(watermark);
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
		this.clock.style.mozTransform  = "translateY(-50%)";
		this.clock.style.transform  = "translateY(-50%)";

		machine.style.position   = "absolute";
		machine.style.whiteSpace = "nowrap";
		machine.style.fontSize   = Math.round(this.titleTextSize) + "px";
		machine.style.color      = textColor;
		machine.style.left       = (-this.offsetX + (6*this.titleBarHeight)).toString() + "px";
		machine.style.top        = "50%";
		machine.style.webkitTransform  = "translateY(-50%)";
		machine.style.mozTransform  = "translateY(-50%)";
		machine.style.transform  = "translateY(-50%)";

		var rightOffset = this.offsetX - (this.json_cfg.resolution.width*(this.json_cfg.layout.columns-1));
		version.style.position   = "absolute";
		version.style.whiteSpace = "nowrap";
		version.style.fontSize   = Math.round(this.titleTextSize) + "px";
		version.style.color      = textColor;
		if (this.clientID===-1)
			version.style.right  = (6*this.titleBarHeight) + "px";
		else
			version.style.right  = ((6*this.titleBarHeight) + rightOffset).toString() + "px";
		version.style.top        = "50%";
		version.style.webkitTransform  = "translateY(-50%)";
		version.style.mozTransform  = "translateY(-50%)";
		version.style.transform  = "translateY(-50%)";

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

		var dataSharingRequestDialog = document.createElement("div");
		dataSharingRequestDialog.id = "dataSharingRequestDialog";
		dataSharingRequestDialog.style.position = "absolute";
		dataSharingRequestDialog.style.top = (-this.offsetY + (2*this.titleBarHeight)).toString() + "px";
		dataSharingRequestDialog.style.left = (-this.offsetX + (this.json_cfg.totalWidth/2 - 13*this.titleBarHeight)).toString() + "px";
		dataSharingRequestDialog.style.width = (26*this.titleBarHeight).toString() + "px";
		dataSharingRequestDialog.style.height = (8*this.titleBarHeight).toString() + "px";
		dataSharingRequestDialog.style.webkitBoxSizing = "border-box";
		dataSharingRequestDialog.style.mozBoxSizing = "border-box";
		dataSharingRequestDialog.style.boxSizing = "border-box";
		dataSharingRequestDialog.style.backgroundColor =  "#666666";
		dataSharingRequestDialog.style.border =  "2px solid #000000";
		dataSharingRequestDialog.style.padding = (this.titleBarHeight/4).toString() + "px";
		dataSharingRequestDialog.style.zIndex = 8999;
		dataSharingRequestDialog.style.display = "none";
		var dataSharingText = document.createElement("p");
		dataSharingText.id = "dataSharingRequestDialog_text";
		dataSharingText.textContent = "";
		dataSharingText.style.fontSize = Math.round(2*this.titleTextSize) + "px";
		dataSharingText.style.color = "#FFFFFF";
		dataSharingText.style.marginBottom = (this.titleBarHeight/4).toString() + "px";
		var dataSharingAccept = document.createElement("div");
		dataSharingAccept.id = "dataSharingRequestDialog_accept";
		dataSharingAccept.style.position = "absolute";
		dataSharingAccept.style.left = (this.titleBarHeight/4).toString() + "px";
		dataSharingAccept.style.bottom = (this.titleBarHeight/4).toString() + "px";
		dataSharingAccept.style.width = (9*this.titleBarHeight).toString() + "px";
		dataSharingAccept.style.height = (3*this.titleBarHeight).toString() + "px";
		dataSharingAccept.style.webkitBoxSizing = "border-box";
		dataSharingAccept.style.mozBoxSizing = "border-box";
		dataSharingAccept.style.boxSizing = "border-box";
		dataSharingAccept.style.backgroundColor =  "rgba(55, 153, 130, 1.0)";
		dataSharingAccept.style.border =  "2px solid #000000";
		dataSharingAccept.style.textAlign = "center";
		dataSharingAccept.style.lineHeight = (3*this.titleBarHeight).toString() + "px";
		var dataSharingAcceptText = document.createElement("p");
		dataSharingAcceptText.id = "dataSharingRequestDialog_acceptText";
		dataSharingAcceptText.textContent = "Accept";
		dataSharingAcceptText.style.fontSize = Math.round(2*this.titleTextSize) + "px";
		dataSharingAcceptText.style.color = "#FFFFFF";
		dataSharingAccept.appendChild(dataSharingAcceptText);
		var dataSharingReject = document.createElement("div");
		dataSharingReject.id = "dataSharingRequestDialog_reject";
		dataSharingReject.style.position = "absolute";
		dataSharingReject.style.right = (this.titleBarHeight/4).toString() + "px";
		dataSharingReject.style.bottom = (this.titleBarHeight/4).toString() + "px";
		dataSharingReject.style.width = (9*this.titleBarHeight).toString() + "px";
		dataSharingReject.style.height = (3*this.titleBarHeight).toString() + "px";
		dataSharingReject.style.webkitBoxSizing = "border-box";
		dataSharingReject.style.mozBoxSizing = "border-box";
		dataSharingReject.style.boxSizing = "border-box";
		dataSharingReject.style.backgroundColor =  "rgba(173, 42, 42, 1.0)";
		dataSharingReject.style.border =  "2px solid #000000";
		dataSharingReject.style.textAlign = "center";
		dataSharingReject.style.lineHeight = (3*this.titleBarHeight).toString() + "px";
		var dataSharingRejectText = document.createElement("p");
		dataSharingRejectText.id = "dataSharingRequestDialog_rejectText";
		dataSharingRejectText.textContent = "Reject";
		dataSharingRejectText.style.fontSize = Math.round(2*this.titleTextSize) + "px";
		dataSharingRejectText.style.color = "#FFFFFF";
		dataSharingReject.appendChild(dataSharingRejectText);
		dataSharingRequestDialog.appendChild(dataSharingText);
		dataSharingRequestDialog.appendChild(dataSharingAccept);
		dataSharingRequestDialog.appendChild(dataSharingReject);
		this.main.appendChild(dataSharingRequestDialog);

		var dataSharingWaitDialog = document.createElement("div");
		dataSharingWaitDialog.id = "dataSharingWaitDialog";
		dataSharingWaitDialog.style.position = "absolute";
		dataSharingWaitDialog.style.top = (-this.offsetY + (2*this.titleBarHeight)).toString() + "px";
		dataSharingWaitDialog.style.left = (-this.offsetX + (this.json_cfg.totalWidth/2 - 13*this.titleBarHeight)).toString() + "px";
		dataSharingWaitDialog.style.width = (26*this.titleBarHeight).toString() + "px";
		dataSharingWaitDialog.style.height = (8*this.titleBarHeight).toString() + "px";
		dataSharingWaitDialog.style.webkitBoxSizing = "border-box";
		dataSharingWaitDialog.style.mozBoxSizing = "border-box";
		dataSharingWaitDialog.style.boxSizing = "border-box";
		dataSharingWaitDialog.style.backgroundColor =  "#666666";
		dataSharingWaitDialog.style.border =  "2px solid #000000";
		dataSharingWaitDialog.style.padding = (this.titleBarHeight/4).toString() + "px";
		dataSharingWaitDialog.style.zIndex = 8999;
		dataSharingWaitDialog.style.display = "none";
		var dataSharingWaitText = document.createElement("p");
		dataSharingWaitText.id = "dataSharingWaitDialog_text";
		dataSharingWaitText.textContent = "";
		dataSharingWaitText.style.fontSize = Math.round(2*this.titleTextSize) + "px";
		dataSharingWaitText.style.color = "#FFFFFF";
		dataSharingWaitText.style.marginBottom = (this.titleBarHeight/4).toString() + "px";
		var dataSharingCancel = document.createElement("div");
		dataSharingCancel.id = "dataSharingWaitDialog_cancel";
		dataSharingCancel.style.position = "absolute";
		dataSharingCancel.style.right = (this.titleBarHeight/4).toString() + "px";
		dataSharingCancel.style.bottom = (this.titleBarHeight/4).toString() + "px";
		dataSharingCancel.style.width = (9*this.titleBarHeight).toString() + "px";
		dataSharingCancel.style.height = (3*this.titleBarHeight).toString() + "px";
		dataSharingCancel.style.webkitBoxSizing = "border-box";
		dataSharingCancel.style.mozBoxSizing = "border-box";
		dataSharingCancel.style.boxSizing = "border-box";
		dataSharingCancel.style.backgroundColor =  "rgba(173, 42, 42, 1.0)";
		dataSharingCancel.style.border =  "2px solid #000000";
		dataSharingCancel.style.textAlign = "center";
		dataSharingCancel.style.lineHeight = (3*this.titleBarHeight).toString() + "px";
		var dataSharingCancelText = document.createElement("p");
		dataSharingCancelText.id = "dataSharingWaitDialog_cancelText";
		dataSharingCancelText.textContent = "Cancel";
		dataSharingCancelText.style.fontSize = Math.round(2*this.titleTextSize) + "px";
		dataSharingCancelText.style.color = "#FFFFFF";
		dataSharingCancel.appendChild(dataSharingCancelText);
		dataSharingWaitDialog.appendChild(dataSharingWaitText);
		dataSharingWaitDialog.appendChild(dataSharingCancel);
		this.main.appendChild(dataSharingWaitDialog);

		var connectedColor = "rgba(55, 153, 130, 1.0)";
		if (this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteConnectedColor !== undefined)
			connectedColor = this.json_cfg.ui.menubar.remoteConnectedColor;
		var disconnectedColor = "rgba(173, 42, 42, 1.0)";


		head.appendChild(fileref);
		this.uiHidden = false;
		this.showInterface();
	};

	/**
	* Update the clock in the title bar
	*
	* @method setTime
	* @param val {Date} new time from server
	*/
	this.setTime = function (val) {
		// must update date to construct based on (year, month, day, hours, minutes, seconds, milliseconds)
		var now;
		if (this.json_cfg.ui.clock === 12) now = formatAMPM(val);
		else now = format24Hr(val);
		this.clock.textContent = now;
	};

	/**
	* Update the version number in the title bar
	*
	* @method updateVersionText
	* @param data {Object} new time from server
	*/
	this.updateVersionText = function(data) {
		if (this.json_cfg.ui.show_version) {
			var version = document.getElementById('version');
			if (data.branch && data.commit && data.date)
				version.innerHTML = "<b>v" + data.base+"-"+data.branch+"-"+data.commit+"</b> " + data.date;
			else
				version.innerHTML = "<b>v" + data.base + "</b>";
		}
	};

	/**
	* Called when SVG logo file is finished loading
	*
	* @method logoLoaded
	* @param event {Event} event
	*/
	this.logoLoaded = function(event) {
		var logo    = document.getElementById('logo');
		var logoSVG = logo.getSVGDocument().querySelector('svg');
		var bbox    = logoSVG.getBBox();
		var height  = 0.95 * this.titleBarHeight;
		var width   = height * (bbox.width/bbox.height);

		var rightOffset = this.offsetX - (this.json_cfg.resolution.width*(this.json_cfg.layout.columns-1));

		logo.width  = width;
		logo.height = height;
		logo.style.position   = "absolute";
		if (this.clientID===-1)
			logo.style.right  = this.titleBarHeight.toString() + "px";
		else
			logo.style.right  = (this.titleBarHeight + rightOffset).toString() + "px";
		logo.style.top        = "50%";
		logo.style.webkitTransform  = "translateY(-50%)";
		logo.style.mozTransform     = "translateY(-50%)";
		logo.style.transform        = "translateY(-50%)";

		var textColor = "rgba(255, 255, 255, 1.0)";
		if(this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.textColor !== undefined)
			textColor = this.json_cfg.ui.menubar.textColor;
		this.changeSVGColor(logoSVG, "path", null, textColor);
	};

	/**
	* Called when SVG watermark file is finished loading
	*
	* @method watermarkLoaded
	* @param event {Event} event
	*/
	this.watermarkLoaded = function(event) {
		var watermark    = document.getElementById('watermark');
		var watermarkSVG = watermark.getSVGDocument().querySelector('svg');

		var bbox = watermarkSVG.getBBox();
		var width;
		var height;

		if (bbox.width/bbox.height >= this.json_cfg.totalWidth/this.json_cfg.totalHeight) {
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

		// Also hide the cursor on top of the SVG (doesnt inherit from style body)
		if (this.clientID !== -1)
			watermarkSVG.style.cursor = "none";

		this.changeSVGColor(watermarkSVG, "path", null, this.json_cfg.background.watermark.color);
	};

	/**
	* Change stroke and fill color of SVG elements
	*
	* @method changeSVGColor
	* @param svgItem {Element} base node
	* @param elementType {String} type of SVG element to update
	* @param strokeColor {String} stroke color
	* @param fillColor {String} fill color
	*/
	this.changeSVGColor = function(svgItem, elementType, strokeColor, fillColor) {
		var elements = svgItem.querySelectorAll(elementType);
		for (var i=0; i<elements.length; i++){
			if (strokeColor) elements[i].style.stroke = strokeColor;
			if (fillColor)   elements[i].style.fill   = fillColor;
		}
	};

	/**
	* Create a pointer
	*
	* @method createSagePointer
	* @param pointer_data {Object} pointer information
	*/
	this.createSagePointer = function(pointer_data) {
		if (this.pointerItems.hasOwnProperty(pointer_data.id)) return;

		var pointerElem = document.createElement('div');
		pointerElem.id  = pointer_data.id;
		pointerElem.className  = "pointerItem";
		pointerElem.style.zIndex = 10000;

		if (pointer_data.portal !== undefined && pointer_data.portal !== null) {
			pointerElem.style.left = (-this.pointerOffsetX).toString() + "px";
			pointerElem.style.top = (-this.pointerOffsetY).toString()  + "px";
			document.getElementById(pointer_data.portal+"_overlay").appendChild(pointerElem);
		}
		else {
			pointerElem.style.left = (-this.pointerOffsetX-this.offsetX).toString() + "px";
			pointerElem.style.top = (-this.pointerOffsetY-this.offsetY).toString()  + "px";
			this.main.appendChild(pointerElem);
		}

		var ptr = new Pointer();
		ptr.init(pointerElem.id, pointer_data.label, pointer_data.color, this.pointerWidth, this.pointerHeight);

		if (pointer_data.visible) {
			pointerElem.style.display = "block";
			ptr.isShown = true;
		}
		else {
			pointerElem.style.display = "none";
			ptr.isShown = false;
		}

		// keep track of the pointers
        this.pointerItems[pointerElem.id] = ptr;
	};

	/**
	* Show the pointer: change CSS values, update position, label and color
	*
	* @method showSagePointer
	* @param pointer_data {Object} pointer information
	*/
	this.showSagePointer = function(pointer_data) {
		var pointerElem = document.getElementById(pointer_data.id);
		var translate;
		if (pointer_data.portal !== undefined && pointer_data.portal !== null) {
			var left = pointer_data.left*dataSharingPortals[pointer_data.portal].scaleX;
			var top = pointer_data.top*dataSharingPortals[pointer_data.portal].scaleY;
			translate = "translate(" + left + "px," + top + "px)";
		}
		else {
			translate = "translate(" + pointer_data.left + "px," + pointer_data.top + "px)";
		}

		pointerElem.style.display = "block";
		pointerElem.style.webkitTransform = translate;
		pointerElem.style.mozTransform    = translate;
		pointerElem.style.transform       = translate;

		this.pointerItems[pointerElem.id].setLabel(pointer_data.label);
		this.pointerItems[pointerElem.id].setColor(pointer_data.color);
		this.pointerItems[pointerElem.id].setSourceType(pointer_data.sourceType);

		this.pointerItems[pointerElem.id].isShown = true;
	};

	/**
	* Hide a pointer
	*
	* @method hideSagePointer
	* @param pointer_data {Object} pointer information
	*/
	this.hideSagePointer = function(pointer_data) {
		var pointerElem = document.getElementById(pointer_data.id);
		pointerElem.style.display = "none";
		this.pointerItems[pointerElem.id].isShown = false;
	};

	/**
	* Move a pointer using CSS
	*
	* @method updateSagePointerPosition
	* @param pointer_data {Object} pointer information
	*/
	this.updateSagePointerPosition = function(pointer_data) {
		if (this.pointerItems[pointer_data.id].isShown) {
			var pointerElem = document.getElementById(pointer_data.id);

			var translate;
			if (pointer_data.portal !== undefined && pointer_data.portal !== null) {
				var left = pointer_data.left*dataSharingPortals[pointer_data.portal].scaleX;
				var top = pointer_data.top*dataSharingPortals[pointer_data.portal].scaleY;
				translate = "translate(" + left + "px," + top + "px)";
			}
			else {
				translate = "translate(" + pointer_data.left + "px," + pointer_data.top + "px)";
			}

			pointerElem.style.webkitTransform = translate;
			pointerElem.style.mozTransform    = translate;
			pointerElem.style.transform       = translate;
		}
	};

	/**
	* Switch between window and application interaction mode
	*
	* @method changeSagePointerMode
	* @param pointer_data {Object} pointer information
	*/
	this.changeSagePointerMode = function(pointer_data) {
		this.pointerItems[pointer_data.id].changeMode(pointer_data.mode);
	};

	/**
	* Create a radial menu
	*
	* @method createRadialMenu
	* @param data {Object} menu data
	*/
	this.createRadialMenu = function(data) {
		var menuElem = document.getElementById(data.id+"_menu");
		if (!menuElem && this.radialMenus[data.id+"_menu"] === undefined) {
			var radialMenuContentWindowDiv = document.createElement("div");

			radialMenuContentWindowDiv.id = data.id+"_menuDiv";
			radialMenuContentWindowDiv.style.width    = (data.radialMenuSize.x).toString() + "px";
			radialMenuContentWindowDiv.style.height   =  (data.radialMenuSize.y).toString() + "px";
			radialMenuContentWindowDiv.style.overflow = "hidden";
			radialMenuContentWindowDiv.style.position = "absolute";
			radialMenuContentWindowDiv.style.left     = (data.x - this.offsetX).toString() + "px";
			radialMenuContentWindowDiv.style.top      = (data.y - this.offsetY).toString() + "px";
			radialMenuContentWindowDiv.style.zIndex   = 9000;

			var menuElem1 = createDrawingElement(data.id+"_menu", "pointerItem",
								data.x  - this.offsetX, data.y - this.offsetY,
								data.radialMenuSize.x, data.radialMenuSize.y, 9000);
			var menuElem2 = createDrawingElement(data.id+"_menuWindow", "pointerItem",
								0, 0,
								data.radialMenuSize.x, data.radialMenuSize.y, 9001);
			var menuElem3 = createDrawingElement(data.id+"_menuWindow2", "pointerItem",
								data.x  - this.offsetX, data.y - this.offsetY,
								data.radialMenuSize.x, data.radialMenuSize.y, 9002);

			this.main.appendChild(menuElem1);
			this.main.appendChild(radialMenuContentWindowDiv);
			this.main.appendChild(menuElem3);

			radialMenuContentWindowDiv.appendChild(menuElem2);
			var rect = menuElem1.getBoundingClientRect();

			var menu = new RadialMenu();
			menu.init(data, menuElem2, menuElem3);

			menuElem1.style.left = (data.x - this.offsetX - menu.radialMenuCenter.x).toString() + "px";
			menuElem1.style.top  = (data.y - this.offsetY - menu.radialMenuCenter.y).toString() + "px";

			// keep track of the menus
			this.radialMenus[data.id+"_menu"] = menu;
			this.radialMenus[data.id+"_menu"].draw();

			if (this.radialMenus[menuElem1.id].visible === false) {
				menuElem1.style.left = (data.x - this.offsetX - menu.radialMenuCenter.x).toString() + "px";
				menuElem1.style.top  = (data.y - this.offsetY - menu.radialMenuCenter.y).toString() + "px";
				this.radialMenus[menuElem1.id].visible = true;
				menuElem1.style.display = "block";
				this.radialMenus[menuElem1.id].draw();
			}
		}
	};

	/**
	* Update the radial menu state (visibility, position)
	*
	* @method updateRadialMenu
	* @param data {Object} menu data
	*/
	this.updateRadialMenu = function(data) {
		var menuElem = document.getElementById(data.id+"_menu");

		if (menuElem !== null) {
			var menu = this.radialMenus[menuElem.id];

			menuElem.style.display = "block";
			menu.thumbnailScrollWindowElement.style.display = "block";
			menu.thumbnailWindowDiv.style.display = "block";
			menu.visible = true;

			var rect = menuElem.getBoundingClientRect();
			menuElem.style.display = "block";
			menu.thumbnailScrollWindowElement.style.display = "block";
			menu.thumbnailWindowDiv.style.display = "block";

			menu.moveMenu( {x: data.x, y: data.y, windowX: rect.left, windowY: rect.top}, {x: this.offsetX, y: this.offsetY} );

			menuElem.style.left = (data.x - this.offsetX - menu.radialMenuCenter.x).toString() + "px";
			menuElem.style.top  = (data.y - this.offsetY - menu.radialMenuCenter.y).toString()  + "px";

			//console.log("RadialMenu " + menuElem.id + " at " + menuElem.style.left + " " + menuElem.style.top);
		} else {
			// Show was called on non-existant menu (display client was likely reset)
			this.createRadialMenu(data);
		}
	};

	/**
	* Deal with event in radial menu
	*
	* @method radialMenuEvent
	* @param data {Event} event
	*/
	this.radialMenuEvent = function(data) {
		for (var menuID in this.radialMenus) {
			var menuElem = document.getElementById(menuID);
			var menu     = this.radialMenus[menuID];

			if (menuElem !== null) {
				var rect = menuElem.getBoundingClientRect();

				var pointerX = data.x - rect.left - this.offsetX;
				var pointerY = data.y - rect.top - this.offsetY;

				if (menu.visible) {
					menu.onEvent( data.type, {x: pointerX, y: pointerY, windowX: rect.left, windowY: rect.top}, data.id, data.data );
					menuElem.style.display = "block";
					menu.thumbnailScrollWindowElement.style.display = "block";
					menu.thumbnailWindowDiv.style.display = "block";

					menu.moveMenu( {x: data.x, y: data.y, windowX: rect.left, windowY: rect.top}, {x: this.offsetX, y: this.offsetY} );

					if( menu.ctx.redraw === true || menu.thumbScrollWindowctx.redraw === true ) {
						menu.draw();
					}
				}
				// If instead of else in case event triggered close menu
				if (menu.visible === false) {
					menuElem.style.display = "none";
					menu.thumbnailScrollWindowElement.style.display = "none";
					menu.thumbnailWindowDiv.style.display = "none";
				}
			}
		}
	};

	/**
	* Update the list of file in the menu
	*
	* @method updateRadialMenuDocs
	* @param data {Object} data
	*/
	this.updateRadialMenuDocs = function(data) {
		var menuElem = document.getElementById(data.id+"_menu");
		if (menuElem !== null) {
			this.radialMenus[menuElem.id].updateFileList(data.fileList);
			this.radialMenus[menuElem.id].draw();
		}
	};

	/**
	* Update the list of app in the menu
	*
	* @method updateRadialMenuApps
	* @param data {Object} data
	*/
	this.updateRadialMenuApps = function(data) {
		console.log("updateRadialMenuApps");
		var menuElem = document.getElementById(data.id+"_menu");
		if( menuElem !== null )
		{
			this.radialMenus[menuElem.id].updateAppFileList(data.fileList);
			this.radialMenus[menuElem.id].draw();
		}
	};

	/**
	* Add a remote side in the top sharing bar
	*
	* @method addRemoteSite
	* @param data {Object} remote site information
	*/
	this.addRemoteSite = function(data) {
		var connectedColor = "rgba(55, 153, 130, 1.0)";
		if (this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteConnectedColor !== undefined)
			connectedColor = this.json_cfg.ui.menubar.remoteConnectedColor;
		var disconnectedColor = "rgba(173, 42, 42, 1.0)";
		if (this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteDisconnectedColor !== undefined)
			disconnectedColor = this.json_cfg.ui.menubar.remoteDisconnectedColor;

		var remote = document.createElement('div');
		remote.id  = data.name;
		remote.style.position  = "absolute";
		remote.style.textAlign = "center";
		remote.style.width  = data.geometry.w.toString() + "px";
		remote.style.height = data.geometry.h.toString() + "px";
		remote.style.left   = (-this.offsetX + data.geometry.x).toString() + "px";
		remote.style.top    = (-this.offsetY + data.geometry.y).toString() + "px";
		if (data.connected) remote.style.backgroundColor = connectedColor;
		else remote.style.backgroundColor = disconnectedColor;

		var color = "rgba(255, 255, 255, 1.0)";
		if (this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.textColor !== undefined)
			color = this.json_cfg.ui.menubar.textColor;

		var name = document.createElement('p');
		name.style.whiteSpace = "nowrap";
		name.style.fontSize   = Math.round(this.titleTextSize) + "px";
		name.style.color = color;
		name.textContent = data.name;
		remote.appendChild(name);

		this.upperBar.appendChild(remote);
	};

	/**
	* Update remote side status and color
	*
	* @method connectedToRemoteSite
	* @param data {Object} remote site information
	*/
	this.connectedToRemoteSite = function(data) {
		var connectedColor = "rgba(55, 153, 130, 1.0)";
		if (this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteConnectedColor !== undefined)
			connectedColor = this.json_cfg.ui.menubar.remoteConnectedColor;
		var disconnectedColor = "rgba(173, 42, 42, 1.0)";
		if (this.json_cfg.ui.menubar !== undefined && this.json_cfg.ui.menubar.remoteDisconnectedColor !== undefined)
			disconnectedColor = this.json_cfg.ui.menubar.remoteDisconnectedColor;

		var remote = document.getElementById(data.name);
		if (data.connected) remote.style.backgroundColor = connectedColor;
		else remote.style.backgroundColor = disconnectedColor;
	};

	/**
	* Dialog to accept/reject requests for a new data sharing session from a remote site
	*
	* @method showDataSharingRequestDialog
	* @param data {Object} remote site information
	*/
	this.showDataSharingRequestDialog = function(data) {
		var port = (data.port === 80 || data.port === 443) ? "" : ":" + data.port;
		var host = data.host + port;
		var dataSharingRequestDialog = document.getElementById("dataSharingRequestDialog");
		var dataSharingText = document.getElementById("dataSharingRequestDialog_text");
		dataSharingText.textContent = "Data-sharing request from " + data.name + " (" + host + ")";
		dataSharingRequestDialog.style.display = "block";
	};

	/**
	* Close dialog to accept/reject requests for a new data sharing session from a remote site
	*
	* @method hideDataSharingRequestDialog
	*/
	this.hideDataSharingRequestDialog = function() {
		document.getElementById("dataSharingRequestDialog").style.display = "none";
	};

	/**
	* Dialog that displays wait message for data sharing session from a remote site
	*
	* @method showDataSharingWaitingDialog
	* @param data {Object} remote site information
	*/
	this.showDataSharingWaitingDialog = function(data) {
		var port = (data.port === 80 || data.port === 443) ? "" : ":" + data.port;
		var host = data.host + port;
		var dataSharingWaitDialog = document.getElementById("dataSharingWaitDialog");
		var dataSharingText = document.getElementById("dataSharingWaitDialog_text");
		dataSharingText.textContent = "Requested data-sharing session with " + data.name + " (" + host + ")";
		dataSharingWaitDialog.style.display = "block";
	};

	/**
	* Close dialog that displays wait message for data sharing session from a remote site
	*
	* @method hideDataSharingWaitingDialog
	*/
	this.hideDataSharingWaitingDialog = function() {
		document.getElementById("dataSharingWaitDialog").style.display = "none";
	};

	/**
	* Called when auto-hide kicks, using CSS features
	*
	* @method hideInterface
	*/
	this.hideInterface = function() {
		var i;
		if (!this.uiHidden) {
			// Hide the top bar
			this.upperBar.style.display = 'none';
			// Hide the pointers
			for (var p in this.pointerItems) {
				if (this.pointerItems[p].div)
					this.pointerItems[p].div.style.display = 'none';
			}
			// Hide the apps top bar
			var applist = document.getElementsByClassName("windowTitle");
			for (i = 0; i < applist.length; i++) {
				applist[i].style.display = 'none';
			}
			// Hide the apps border
			var itemlist = document.getElementsByClassName("windowItem");
			for (i = 0; i < itemlist.length; i++) {
				itemlist[i].classList.toggle("windowItemNoBorder");
			}
			this.uiHidden = true;
		}
	};

	/**
	* Show the ui elements again
	*
	* @method showInterface
	*/
	this.showInterface = function() {
		var i;
		if (this.uiHidden) {
			// Show the top bar
			this.upperBar.style.display = 'block';
			// Show the pointers (only if they have a name, ui pointers dont have names)
			for (var p in this.pointerItems) {
				if (this.pointerItems[p].label !== "") {
					if (this.pointerItems[p].isShown === true)
						this.pointerItems[p].div.style.display = 'block';
				}
			}
			// Show the apps top bar
			var applist = document.getElementsByClassName("windowTitle");
			for (i = 0; i < applist.length; i++) {
				applist[i].style.display = 'block';
			}
			// Show the apps border
			var itemlist = document.getElementsByClassName("windowItem");
			for (i = 0; i < itemlist.length; i++) {
				itemlist[i].classList.toggle("windowItemNoBorder");
			}
			this.uiHidden = false;
		}
	};
}
