// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015


/* global ignoreFields, SAGE2WidgetControl, SAGE2PointerToNativeMouseEvent, SAGE2RemoteSitePointer */
/* global addStoredFileListEventHandler, removeStoredFileListEventHandler */

/**
 * @module client
 * @submodule SAGE2_App
 */

/**
 * Base class for SAGE2 applications
 *
 * @class SAGE2_App
 */
var SAGE2_App = Class.extend({

	/**
	* Constructor for SAGE2 applications
	*
	* @class SAGE2_App
	* @constructor
	*/
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.div          = null;
		this.element      = null;
		this.resrcPath    = null;
		this.moveEvents   = "never";
		this.resizeEvents = "never";
		this.state        = {};

		this.startDate = null;
		this.prevDate  = null;

		this.t     = null;
		this.dt    = null;
		this.frame = null;
		this.fps   = null;

		this.timer  = null;
		this.maxFPS = null;
		this.sticky = null;
		this.config = null;
		this.controls  = null;
		this.cloneable = null;
		// If the clone is not a fresh copy, this variable holds data to be loaded into the clone
		this.cloneData = null;
		this.enableControls  = null;
		this.requestForClone = null;

		// "was visible" state
		this.vis = null;

		// File Handling
		this.id = null;
		this.filePath = null;
		this.fileDataBuffer = null;
		this.fileRead = null;
		this.fileWrite = null;
		this.fileReceived = null;

		// Track if in User Event loop
		this.SAGE2UserModification = false;
		// Modify state sync options
		this.SAGE2StateSyncOptions = {visible: false, hover: null, press: {name: null, value: null}, scroll: 0};

		// Enabling this will attempt to convert SAGE2 pointer as mouse events as much as possible.
		this.passSAGE2PointerAsMouseEvents = false;

		// Tracking variables when this app launches or is launched by another.
		this.childrenAppIds = [];
		this.parentIdOfThisApp = null;
		// Used to track variables specific to this app submitted for data sharing
		this.dataSourcesBeingBroadcast = [];
		this.dataDestinationsBeingBroadcast = [];
	},

	/**
	* SAGE2Init method called right after the constructor
	*
	* @method SAGE2Init
	* @param type {String} type of DOM element to be created (div, canvas, ...)
	* @param data {Object} contains initialization values (id, width, height, state, ...)
	*/
	SAGE2Init: function(type, data) {
		// Save the application ID
		this.id = data.id;
		// Save the type of the application
		this.application = data.application;

		this.div = document.getElementById(data.id);
		this.element = document.createElement(type);
		this.element.className = "sageItem";
		this.element.style.zIndex = "0";
		if (type === "div" || type === "webview") {
			this.element.style.width  = data.width  + "px";
			this.element.style.height = data.height + "px";
		} else {
			this.element.width  = data.width;
			this.element.height = data.height;
		}
		this.div.appendChild(this.element);

		this.resrcPath = data.resrc + "/";
		this.startDate = data.date;

		// visible
		this.vis = true;

		var parentTransform = getTransform(this.div.parentNode);
		var border = parseInt(this.div.parentNode.style.borderWidth || 0, 10);
		this.sage2_x      = (data.x + border + 1) * parentTransform.scale.x + parentTransform.translate.x;
		this.sage2_y      = (data.y + border) * parentTransform.scale.y + parentTransform.translate.y;
		this.sage2_width  = data.width * parentTransform.scale.x;
		this.sage2_height = data.height * parentTransform.scale.y;

		this.sage2_x      = data.x;
		this.sage2_y      = data.y;
		this.sage2_width  = data.width;
		this.sage2_height = data.height;

		this.controls = new SAGE2WidgetControl(data.id);

		this.prevDate  = data.date;
		this.frame     = 0;

		// Measurement variables
		this.frame_sec = 0;
		this.sec       = 0;
		this.fps       = 0.0;

		// Frame rate control
		this.timer     = 0;
		this.maxFPS    = 30.0; // Default to 30fps for performance reasons

		// keep a copy of the wall configuration
		this.config    = ui.json_cfg;

		// Top layer
		this.layer     = null;

		// File Handling
		this.fileName       = "";
		this.fileDataBuffer = null;
		this.fileRead       = false;
		this.fileWrite      = false;
		this.fileReceived   = false;
		this.hasFileBuffer = false;
		this.SAGE2CopyState(data.state);
		this.SAGE2InitializeAppOptionsFromState();

		// Check for customLaunchParams and optionally a function to activate on next frame
		if (data.customLaunchParams) {
			if (data.customLaunchParams.parent) {
				this.parentIdOfThisApp = data.customLaunchParams.parent;
			}
			// If the function call should be made, do so on the next frame after app has fully initialized
			if (data.customLaunchParams.functionToCallAfterInit) {
				if (this[data.customLaunchParams.functionToCallAfterInit]) {
					window.requestAnimationFrame(() => {
						this[data.customLaunchParams.functionToCallAfterInit](data.customLaunchParams);
					});
				} else {
					console.log("App was given a function to call after init, but it doesn't exist: "
						+ data.customLaunchParams.functionToCallAfterInit);
				}
			}
		}
	},

	SAGE2Load: function(state, date) {
		this.SAGE2CopyState(state);
		this.SAGE2UpdateAppOptionsFromState();

		// update remote pointers if any over this app
		SAGE2RemoteSitePointer.checkIfAppNeedsUpdate(this);

		this.load(date);
	},

	SAGE2LoadOptions: function(optionFlags) {
		this.SAGE2LoadOptionsHelper(this.SAGE2StateOptions, optionFlags);
		this.SAGE2UpdateOptionsAfterLoad(this.SAGE2StateOptions);
	},

	SAGE2LoadOptionsHelper: function(options, optionFlags) {
		var key;
		for (key in optionFlags) {
			if (key === "_sync") {
				options._sync = optionFlags._sync;
			} else {
				this.SAGE2LoadOptionsHelper(options[key], optionFlags[key]);
			}
		}
	},

	SAGE2UpdateOptionsAfterLoad: function(parent) {
		var key;
		for (key in parent) {
			if (parent.hasOwnProperty(key) && key[0] !== "_") {
				if (parent[key]._sync) {
					parent[key]._name.setAttribute("state", "idle");
					parent[key]._name.setAttribute("synced", true);
					parent[key]._value.setAttribute("synced", true);
					this.SAGE2UpdateOptionsAfterLoad(parent[key]);
				} else {
					parent[key]._name.setAttribute("state", "unsynced");
					parent[key]._name.setAttribute("synced", false);
					parent[key]._value.setAttribute("synced", false);
					this.SAGE2UpdateOptionsAfterLoad(parent[key]);
				}
			}
		}
	},

	SAGE2Event: function(eventType, position, user_id, data, date) {
		if (this.SAGE2StateSyncOptions.visible === true &&
				(eventType === "pointerPress" || eventType === "pointerMove" ||
				eventType === "pointerRelease" || eventType === "pointerScroll" ||
				eventType === "keyboard" || eventType === "specialKey")) {
			var itemIdx = parseInt((position.y - this.SAGE2StateSyncOptions.scroll) /
				Math.round(1.5 * this.config.ui.titleTextSize), 10);
			var children = document.getElementById(this.id + "_statecontainer").childNodes;
			var hoverChild = null;
			var syncedPrev;
			var synced;
			if (itemIdx < children.length) {
				hoverChild = children[itemIdx];
			}
			switch (eventType) {
				case "pointerPress":
					if (hoverChild !== null) {
						this.SAGE2StateSyncOptions.press.name = hoverChild;
						this.SAGE2StateSyncOptions.press.value = hoverChild.childNodes[1];
					} else {
						this.SAGE2StateSyncOptions.press.name = null;
						this.SAGE2StateSyncOptions.press.value = null;
					}
					break;
				case "pointerMove":
					if (hoverChild !== null) {
						if (this.SAGE2StateSyncOptions.hover !== hoverChild) {
							if (this.SAGE2StateSyncOptions.hover !== null) {
								syncedPrev = this.SAGE2StateSyncOptions.hover.getAttribute("synced");
								synced = (syncedPrev === true || syncedPrev === "true") ? true : false;
								if (synced === true) {
									this.SAGE2StateSyncOptions.hover.setAttribute("state", "idle");
								} else {
									this.SAGE2StateSyncOptions.hover.setAttribute("state", "unsynced");
								}
							}
							hoverChild.setAttribute("state", "hover");
							this.SAGE2StateSyncOptions.hover = hoverChild;
						}
					} else if (this.SAGE2StateSyncOptions.hover !== null) {
						syncedPrev = this.SAGE2StateSyncOptions.hover.getAttribute("synced");
						synced = (syncedPrev === true || syncedPrev === "true") ? true : false;
						if (synced === true) {
							this.SAGE2StateSyncOptions.hover.setAttribute("state", "idle");
						} else {
							this.SAGE2StateSyncOptions.hover.setAttribute("state", "unsynced");
						}
						this.SAGE2StateSyncOptions.hover = null;
					}
					break;
				case "pointerRelease":
					if (hoverChild === this.SAGE2StateSyncOptions.press.name) {
						syncedPrev = this.SAGE2StateSyncOptions.press.name.getAttribute("synced");
						synced = (syncedPrev === true || syncedPrev === "true") ? false : true;
						this.SAGE2StateSyncOptions.press.name.setAttribute("synced", synced);
						if (synced === true) {
							this.SAGE2StateSyncOptions.press.name.setAttribute("state", "idle");
							this.SAGE2StateSyncOptions.press.value.setAttribute("synced", true);
							this.SAGE2StateSyncParent(this.SAGE2StateSyncOptions.press.name, this.SAGE2StateOptions);
							this.SAGE2StateSyncChildren(this.SAGE2StateSyncOptions.press.name, this.SAGE2StateOptions, true);
						} else {
							this.SAGE2StateSyncOptions.press.name.setAttribute("state", "unsynced");
							this.SAGE2StateSyncOptions.press.value.setAttribute("synced", false);
							this.SAGE2StateSyncChildren(this.SAGE2StateSyncOptions.press.name, this.SAGE2StateOptions, false);
						}

						if (isMaster) {
							var stateOp = ignoreFields(this.SAGE2StateOptions, ["_name", "_value"]);
							wsio.emit('updateStateOptions', {id: this.id, options: stateOp});
						}
					}
					this.SAGE2StateSyncOptions.press.name = null;
					this.SAGE2StateSyncOptions.press.value = null;
					break;
				case "pointerScroll":
					var windowStateContatiner = document.getElementById(this.id + "_statecontainer");
					this.SAGE2StateSyncOptions.scroll -= data.wheelDelta;
					var minY = Math.min(this.sage2_height - windowStateContatiner.clientHeight, 0);
					if (this.SAGE2StateSyncOptions.scroll < minY) {
						this.SAGE2StateSyncOptions.scroll = minY;
					}
					if (this.SAGE2StateSyncOptions.scroll > 0) {
						this.SAGE2StateSyncOptions.scroll = 0;
					}

					var newTransform = "translate(0px," + this.SAGE2StateSyncOptions.scroll + "px)";
					windowStateContatiner.style.webkitTransform = newTransform;
					windowStateContatiner.style.mozTransform = newTransform;
					windowStateContatiner.style.transform = newTransform;
					break;
				case "keyboard":
					break;
				case "specialKey":
					break;
				default:
					break;
			}
		} else {
			this.SAGE2UserModification = true;
			this.event(eventType, position, user_id, data, date);

			// If the app has specified, convert pointer actions into mouse events.
			if (this.passSAGE2PointerAsMouseEvents) {
				SAGE2PointerToNativeMouseEvent.processAndPassEvents(this.id, eventType, position,
					user_id, data, date);
			}

			// If the pointer is moved, keep track of it for showing remote pointer
			if (isMaster && eventType === "pointerMove" && this.isSharedWithRemoteSite()) {
				// if app is shared, then track pointer
				SAGE2RemoteSitePointer.trackPointer(this, user_id, position);
			} else if (isMaster && SAGE2RemoteSitePointer.shouldPassEvents && this.isSharedWithRemoteSite()) {
				// for events beyond pointerMove
				SAGE2RemoteSitePointer.trackEvent(this, {
					eventType: eventType,
					position: position,
					user_id: user_id,
					data: data,
					date: date
				});
			}

			this.SAGE2UserModification = false;
		}
	},

	/**
	* Used to check if display believes this app is shared with a remote site.
	* This is done by checking if the sync icon is visible.
	*
	* @method isSharedWithRemoteSite
	*/
	isSharedWithRemoteSite: function() {
		var windowIconSync = document.getElementById(this.id + "_iconSync");
		var windowIconUnSync = document.getElementById(this.id + "_iconUnSync");
		// if either sync button is visible, then this app is shared.
		if (windowIconSync.style.display !== "none" || windowIconUnSync.style.display !== "none") {
			return true;
		}
		return false;
	},

	/**
	* Used to set status of event sharing. Activated through context menu.
	*
	* @method toggleRemotePointerEventPassing
	*/
	toggleRemotePointerEventPassing: function(responseObject) {
		this.shouldPassRemotePointerEvents = responseObject.value ? true : false;
	},

	/**
	* SAGE2CopyState method called on init or load to copy state of app instance
	*
	* @method SAGE2CopyState
	* @param state {Object} contains state of app instance
	*/
	SAGE2CopyState: function(state) {
		var key;
		for (key in state) {
			this.state[key] = state[key];
		}
	},

	SAGE2InitializeAppOptionsFromState: function() {
		this.SAGE2StateOptions = {};

		var key;
		for (key in this.state) {
			this.SAGE2AddAppOption(key, this.state, 0, this.SAGE2StateOptions);
		}
	},

	SAGE2AddAppOption: function(name, parent, level, save) {
		var windowStateContatiner = document.getElementById(this.id + "_statecontainer");

		var p = document.createElement('p');
		p.style.whiteSpace = "noWrap";
		p.style.fontSize = Math.round(this.config.ui.titleTextSize) + "px";
		p.style.fontFamily = "\"Lucida Console\", Monaco, monospace";
		p.style.marginLeft = Math.round(2 * (level + 1) * this.config.ui.titleTextSize - this.config.ui.titleTextSize) + "px";
		p.className = "stateObject";
		p.setAttribute("synced", true);
		p.setAttribute("state", "idle");
		p.textContent = name + ": ";

		var s = document.createElement('span');
		s.style.fontSize = Math.round(this.config.ui.titleTextSize) + "px";
		s.style.fontFamily = "\"Lucida Console\", Monaco, monospace";

		p.appendChild(s);
		windowStateContatiner.appendChild(p);

		save[name] = {_name: p, _value: s, _sync: true};

		if (typeof parent[name] === "number") {
			s.className = "stateNumber";
			s.setAttribute("synced", true);
			s.textContent = parent[name].toString();
		} else if (typeof parent[name] === "boolean") {
			s.className = "stateBoolean";
			s.setAttribute("synced", true);
			s.textContent = parent[name].toString();
		} else if (typeof parent[name] === "string") {
			s.className = "stateString";
			s.setAttribute("synced", true);
			if (parent[name].length <= 260) {
				s.textContent = parent[name];
			} else {
				s.textContent = parent[name].substring(0, 257) + "...";
			}
		} else if (parent[name] === null) {
			s.className = "stateNull";
			s.setAttribute("synced", true);
			s.textContent = "null";
		} else if (parent[name] instanceof Array) {
			s.className = "stateArray";
			s.setAttribute("synced", true);
			var joined = parent[name].join(", ");
			if (joined.length <= 258) {
				s.textContent = "[" + joined + "]";
			} else {
				s.textContent = "[" + joined.substring(0, 255) + "...]";
			}
		} else if (typeof parent[name] === "object") {
			var key;
			for (key in parent[name]) {
				this.SAGE2AddAppOption(key, parent[name], level + 1, save[name]);
			}
		}
	},

	SAGE2UpdateAppOptionsFromState: function() {
		var key;
		for (key in this.state) {
			this.SAGE2UpdateAppOption(key, this.state, this.SAGE2StateOptions);
		}
	},

	SAGE2UpdateAppOption: function(name, parent, save) {
		if (!(name in save)) {
			save[name] = {_name: name, _value: {textContent: ""}, _sync: true};
		}
		if (typeof parent[name] === "number") {
			save[name]._value.textContent = parent[name].toString();
		} else if (typeof parent[name] === "boolean") {
			save[name]._value.textContent = parent[name].toString();
		} else if (typeof parent[name] === "string") {
			if (parent[name].length <= 260) {
				save[name]._value.textContent = parent[name];
			} else {
				save[name]._value.textContent = parent[name].substring(0, 257) + "...";
			}
		} else if (parent[name] === null) {
			save[name]._value.textContent = "null";
		} else if (parent[name] instanceof Array) {
			var joined = parent[name].join(", ");
			if (joined.length <= 258) {
				save[name]._value.textContent = "[" + joined + "]";
			} else {
				save[name]._value.textContent = "[" + joined.substring(0, 255) + "...]";
			}
		} else if (typeof parent[name] === "object") {
			var key;
			for (key in parent[name]) {
				this.SAGE2UpdateAppOption(key, parent[name], save[name]);
			}
		}
	},

	SAGE2StateSyncParent: function(node, parent) {
		var key;
		for (key in parent) {
			if (parent.hasOwnProperty(key) && key[0] !== "_") {
				if (parent[key]._name === node) {
					parent[key]._sync = true;
					if (parent !== this.SAGE2StateOptions) {
						parent._name.setAttribute("state", "idle");
						parent._name.setAttribute("synced", true);
						parent._value.setAttribute("synced", true);
						parent._sync = true;
						this.SAGE2StateSyncParent(parent._name, this.SAGE2StateOptions);
					}
					break;
				} else {
					this.SAGE2StateSyncParent(node, parent[key]);
				}
			}
		}
	},

	SAGE2StateSyncChildren: function(node, parent, flag) {
		var key;
		for (key in parent) {
			if (parent.hasOwnProperty(key) && key[0] !== "_") {
				if (parent[key]._name === node) {
					parent[key]._sync = flag;
					this.SAGE2StateSyncChildrenHelper(parent[key], flag);
					break;
				} else {
					this.SAGE2StateSyncChildren(node, parent[key], flag);
				}
			}
		}
	},

	SAGE2StateSyncChildrenHelper: function(parent, flag) {
		if (flag === true) {
			parent._name.setAttribute("state", "idle");
		} else {
			parent._name.setAttribute("state", "unsynced");
		}
		parent._name.setAttribute("synced", flag);
		parent._value.setAttribute("synced", flag);
		parent._sync = flag;

		var key;
		for (key in parent) {
			if (parent.hasOwnProperty(key) && key[0] !== "_") {
				this.SAGE2StateSyncChildrenHelper(parent[key], flag);
			}
		}
	},

	SAGE2Sync: function(updateRemote) {
		this.SAGE2UpdateAppOptionsFromState();

		if (isMaster) {
			var syncedState = this.SAGE2CopySyncedState(this.state, this.SAGE2StateOptions);
			wsio.emit('updateAppState', {
				id: this.id,
				localState: this.state,
				remoteState: syncedState,
				updateRemote: updateRemote
			});
		}
	},

	SAGE2CopySyncedState: function(state, syncOptions) {
		var key;
		var copy = {};
		for (key in state) {
			if (syncOptions[key]._sync === true) {
				if (state[key] === null || state[key] instanceof Array || typeof state[key] !== "object") {
					copy[key] = state[key];
				} else {
					copy[key] = this.SAGE2CopySyncedState(state[key], syncOptions[key]);
				}
			}
		}
		if (isEmpty(copy)) {
			return undefined;
		}
		return copy;
	},

	/**
	* Method to create a layered div ontop the application
	*
	* @method createLayer
	* @param backgroundColor {String} color in DOM-syntax for the div
	*/
	createLayer: function(backgroundColor) {
		this.layer = document.createElement('div');
		this.layer.style.backgroundColor  = backgroundColor;
		this.layer.style.position = "absolute";
		this.layer.style.padding  = "0px";
		this.layer.style.margin   = "0px";
		this.layer.style.left     = "0px";
		this.layer.style.top      = "0px";
		this.layer.style.width    = "100%";
		this.layer.style.color    = "#FFFFFF";
		this.layer.style.display  = "none";
		this.layer.style.overflow = "visible";
		this.layer.style.zIndex   = parseInt(this.div.zIndex) + 1;
		this.layer.style.fontSize = Math.round(this.config.ui.titleTextSize) + "px";

		this.div.appendChild(this.layer);

		return this.layer;
	},

	/**
	* Method to display the layer
	*
	* @method showLayer
	*/
	showLayer: function() {
		if (this.layer) {
			// before showing, make sure to update the size
			this.layer.style.width  = this.div.clientWidth  + 'px';
			this.layer.style.height = this.div.clientHeight + 'px';
			// Reset its top position, just in case
			this.layer.style.top = "0px";
			this.layer.style.display = "block";
		}
	},

	/**
	* Method to hide the layer
	*
	* @method hideLayer
	*/
	hideLayer: function() {
		if (this.layer) {
			this.layer.style.display = "none";
		}
	},

	/**
	* Method to flip the visibility of the layer
	*
	* @method showHideLayer
	*/
	showHideLayer: function() {
		if (this.layer) {
			if (this.isLayerHidden()) {
				this.showLayer();
			} else {
				this.hideLayer();
			}
		}
	},

	/**
	* Method returning the visibility of the layer
	*
	* @method isLayerHidden
	* @return {Bool} true if layer is hidden
	*/
	isLayerHidden: function() {
		if (this.layer) {
			return (this.layer.style.display === "none");
		}
		return false;
	},

	/**
	* Calculate if the application is hidden in this display
	*
	* @method isHidden
	* @return {Boolean} Returns true if out of screen
	*/
	isHidden: function() {
		var checkWidth  = this.config.resolution.width;
		var checkHeight = this.config.resolution.height;
		// Overview client covers all
		if (clientID === -1) {
			// set the resolution to be the whole display wall
			checkWidth  *= this.config.layout.columns;
			checkHeight *= this.config.layout.rows;
		} else {
			// multiply by the size of the tile
			checkWidth  *= (this.config.displays[clientID].width  || 1);
			checkHeight *= (this.config.displays[clientID].height || 1);
		}
		return (this.sage2_x > (ui.offsetX + checkWidth)  ||
				(this.sage2_x + this.sage2_width) < ui.offsetX ||
				this.sage2_y > (ui.offsetY + checkHeight) ||
				(this.sage2_y + this.sage2_height) < ui.offsetY);
	},

	/**
	* Calculate if the application is visible in this display
	*
	* @method isVisible
	* @return {Boolean} Returns true if visible
	*/
	isVisible: function() {
		return !this.isHidden();
	},

	/**
	* Method called before the draw function, calculates timing and frame rate
	*
	* @method preDraw
	* @param date {Date} current time from the server
	*/
	preDraw: function(date) {
		// total time since start of program (sec)
		this.t  = (date.getTime() - this.startDate.getTime()) / 1000;
		// delta time since last frame (sec)
		this.dt = (date.getTime() -  this.prevDate.getTime()) / 1000;

		// Frame rate control
		this.timer += this.dt;
		if (this.timer > (1.0 / this.maxFPS)) {
			this.timer  = 0.0;
		}

		// Check for visibility
		var visible = this.isVisible();
		if (!visible && this.vis) {
			// trigger the app visibility callback, if there's one
			if (this.onVisible) {
				this.onVisible(false);
			}
			// app became hidden
			this.vis = false;
		}
		if (visible && !this.vis) {
			// trigger the visibility callback, if there's one
			if (this.onVisible) {
				this.onVisible(true);
			}
			// app became visible
			this.vis = true;
		}

		// Increase time
		this.sec += this.dt;
	},

	/**
	* Method called after the draw function
	*
	* @method postDraw
	* @param date {Date} current time from the server
	*/
	postDraw: function(date) {
		this.prevDate = date;
		this.frame++;
	},

	/**
	* Change the title of the application window
	*
	* @method updateTitle
	* @param title {String} new title string
	*/
	updateTitle: function(title) {
		var titleText = document.getElementById(this.id + "_text");
		if (titleText) {
			// titleText.textContent = title;
			titleText.innerHTML = title;
		}
	},

	/**
	* Internal method for an actual draw loop (predraw, draw, postdraw).
	*  draw is called as needed
	*
	* @method refresh
	* @param date {Date} current time from the server
	*/
	refresh: function(date) {
		if (date === undefined) {
			// if argument not passed, use previous date
			// it should be ok for not animation-based application
			date = this.prevDate;
		}

		if (this.SAGE2UserModification === true) {
			this.SAGE2Sync(true);
		}

		var _this = this;
		requestAnimationFrame(function () {
			// update time
			_this.preDraw(date);
			// measure actual frame rate
			if (_this.sec >= 1.0) {
				_this.fps       = this.frame_sec / this.sec;
				_this.frame_sec = 0;
				_this.sec       = 0;
			}
			// actual application draw
			_this.draw(date);
			_this.frame_sec++;
			// update time and misc
			_this.postDraw(date);
		});
	},

	/**
	* Method called by SAGE2, and calls the application 'quit' method
	*
	* @method terminate
	*/
	terminate: function() {
		if (typeof this.quit === 'function') {
			this.quit();
		}
		if (isMaster && this.hasFileBuffer === true) {
			wsio.emit('closeFileBuffer', {id: this.div.id});
		}
		// hide remote pointers if any
		SAGE2RemoteSitePointer.appQuitHidePointers(this);
		// remove values placed on server
		this.serverDataRemoveAllValuesGivenToServer();
	},

	/**
	* Close the application itself
	*
	* @method close
	*/
	close: function() {
		// send the message to server
		wsio.emit('deleteApplication', {appId: this.id});
	},

	/**
	* Application request for a new size
	*
	* @method sendResize
	* @param newWidth {Number} desired width
	* @param newHeight {Number} desired height
	*/
	sendResize: function(newWidth, newHeight) {
		var msgObject = {};
		// Add the display node ID to the message
		msgObject.node   = clientID;
		msgObject.id     = this.id;
		msgObject.width  = newWidth;
		msgObject.height = newHeight;
		msgObject.keepRatio = false;
		// Send the message to the server
		wsio.emit('appResize', msgObject);
	},

	/**
	* Request fullscreen
	*
	* @method sendFullscreen
	*/
	sendFullscreen: function() {
		if (isMaster) {
			var msgObject = {};
			// Add the display node ID to the message
			msgObject.node = clientID;
			msgObject.id   = this.id;
			// send the message to server
			wsio.emit('appFullscreen', msgObject);
		}
	},

	/**
	* RPC to every application client (client-side)
	*
	* @method broadcast
	* @param funcName {String} name of the function to be called in each client
	* @param data {Object} parameters to the function call
	*/
	broadcast: function(funcName, data) {
		broadcast({app: this.div.id, func: funcName, data: data});
	},

	/**
	* Support for the RPC call to the server
	*
	* @method applicationRPC
	* @param query {Object} parameter for RPC function on server
	* @param funcName {String} return function name for broadcast or emit
	* @param broadcast {Boolean} wether or not doing a return broadcast or emit
	*/
	applicationRPC: function(query, funcName, broadcast) {
		wsio.emit('applicationRPC', {app: this.div.id, func: funcName, query: query, broadcast: broadcast});
	},

	/**
	* Entry point for a RPC callback into the app. Needed to keep state consistant
	*
	* @method callback
	* @param func {Function} actual method to call
	* @param data {Object} parameters sent from server
	*/
	callback: function(func, data) {
		// Make to allow state modification
		this.SAGE2UserModification = true;
		// if app calls 'refresh', state will be updated
		this[func](data);
		// End tracking
		this.SAGE2UserModification = false;
	},

	/**
	* Register a callback to be called when receiving a updated file list from server
	*
	* @method registerFileListHandler
	* @param mth {Method} method on object to be called back
	*/
	registerFileListHandler: function(mth) {
		addStoredFileListEventHandler(mth.bind(this));
	},

	/**
	* Unregister a callback to be called when receiving a updated file list from server
	*
	* @method unregisterFileListHandler
	* @param mth {Method} method on object to be called back
	*/
	unregisterFileListHandler: function(mth) {
		removeStoredFileListEventHandler(mth.bind(this));
	},

	/**
	* Prints message to local browser console and send to server.
	*  Accept a string as parameter or multiple parameters
	*
	* @method log
	* @param msg {Object} list of arguments to be printed
	*/
	log: function(msg) {
		if (arguments.length === 0) {
			return;
		}
		var args;
		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		} else {
			args = msg;
		}
		sage2Log({app: this.div.id, message: args});
	},

	/**
	* Application request for fileBuffer
	*
	* @method requestFileBuffer
	* @param fileName {String} name of the file to which data will be saved.
	*/
	requestFileBuffer: function (data) {
		this.hasFileBuffer = true;
		if (isMaster) {
			var msgObject = {};
			msgObject.id        = this.div.id;
			msgObject.fileName  = data.fileName;
			msgObject.owner     = data.owner;
			msgObject.createdOn = data.createdOn;
			msgObject.extension = data.extension;
			msgObject.content   = data.content;
			// Send the message to the server
			wsio.emit('requestFileBuffer', msgObject);
		}
	},

	/**
	* Application request for a new title
	*
	* @method requestNewTitle
	* @param newTitle {String} Text that will be set as the new title for this instance of the app.
	*/
	requestNewTitle: function (newTitle) {
		if (isMaster) {
			var msgObject = {};
			msgObject.id        = this.div.id;
			msgObject.title     = newTitle;
			// Send the message to the server
			wsio.emit('requestNewTitle', msgObject);
		}
	},

	/**
	* Performs full fill of app context menu and sends update to server.
	* This provides one place(mostly) to change code for context menu.
	*
	* @method getFullContextMenuAndUpdate
	*/
	getFullContextMenuAndUpdate: function() {
		// Send one update to the server
		if (isMaster) {
			var appContextMenu = {};
			appContextMenu.app = this.id;
			// If the application defines a menu function, use it
			if (typeof this.getContextEntries === "function") {
				appContextMenu.entries = this.getContextEntries();
			} else {
				appContextMenu.entries = [];
			}
			appContextMenu.entries.push({
				description: "separator"
			});
			appContextMenu.entries.push({
				description: "Send to Back",
				callback: "SAGE2SendToBack",
				parameters: {}
			});
			appContextMenu.entries.push({
				description: "Maximize",
				callback: "SAGE2Maximize",
				parameters: {}
			});
			appContextMenu.entries.push({
				description: "minimize",
				callback: "SAGE2Maximize",
				parameters: {},
				voiceEntryOverload: true // not displayed on UI, added for voice entry
			});
			// currently testing with remote pointer event testing
			/* currently disabled
			if (!this.shouldPassRemotePointerEvents) {
				appContextMenu.entries.push({
					description: "Enable remote pointer passing",
					callback: "toggleRemotePointerEventPassing",
					parameters: { value: true }
				});
			} else {
				appContextMenu.entries.push({
					description: "Disable remote pointer passing",
					callback: "toggleRemotePointerEventPassing",
					parameters: { value: false }
				});
			} //*/
			appContextMenu.entries.push({
				description: "separator"
			});

			// limit the size of the title, especially for webview titles
			var menuTitle = this.title || "Application";
			if (menuTitle.length > 40) {
				// crop the title to 40 characters and add ellipsis
				menuTitle = menuTitle.substring(0, 40) + '...';
			}
			appContextMenu.entries.push({
				description: "Close " + menuTitle,
				callback: "SAGE2DeleteElement",
				parameters: {}
			});
			wsio.emit("appContextMenuContents", appContextMenu);
		}
	},

	updateFileBufferCursorPosition: function(cursorData) {
		if (isMaster) {
			cursorData.appId = this.div.id;
			wsio.emit("updateFileBufferCursorPosition", cursorData);
		}
	},

	/**
	 * Uses WebSocket to send a request to the server to save a file from the app
	 * into the media folders. The file will be placed in a subdirectory of the media
	 * folders called savedFiles/appname/(subdir)?/ . The file name must not contains
	 * any directory characters ('/', '\', etc.).
	 *
	 * @method     saveFile
	 * @param      {String}  subdir			Subdirectory within the app's folder to save file
	 * @param      {String}  filename		The name for the file being saved
	 * @param      {String}  ext			The file's extension
	 * @param      {String}  data			The file's data
	 */
	saveFile: function(subdir, filename, ext, data) {
		if (isMaster) {
			wsio.emit("appFileSaveRequest", {
				app: this.application,
				id:  this.id,
				asset: false,
				filePath: {
					subdir: subdir,
					name:   filename,
					ext:    ext
				},
				saveData: data
			});
		}
	},

	/**
	 * Loads a saved data file (from the saveFile function)
	 *
	 * @method     loadSavedData
	 * @param      {String}  filename  The filename to load
	 * @param      {Function} callback function to call when loading is done
	 */
	loadSavedData: function(filename, callback) {
		readFile("/user/savedFiles/" + this.application + "/" + filename, function(error, data) {
			callback(error, data);
		}, "JSON");
	},

	/**
	 * Uses WebSocket to send a request to the server to save a file from the app
	 * into the media folders as an asset (image, pdf, ...)
	 *
	 * @method     saveFile
	 * @param      {String}  filename		The name for the file being saved
	 * @param      {String}  ext			The file's extension
	 * @param      {String}  data			The file's data
	 */
	saveAsset: function(filename, ext, data) {
		if (isMaster) {
			wsio.emit("appFileSaveRequest", {
				app: this.application,
				id:  this.id,
				asset: true,
				filePath: {
					subdir: "",
					name:   filename,
					ext:    ext
				},
				saveData: data
			});
		}
	},

	/**
	* Asks server to launch app with values. On the server this will add additional associations like which app launched which.
	* Part of the launch process will include calling back to this app and stating the id of the newly launched app.
	*
	* @method launchAppWithValues
	* @param {String} appName - name of app to launch. Has to correctly match.
	* @param {Object} paramObj - optional. What to pass the launched app. Appears within init() as serverDataInitValues.
	* @param {Integer|undefined|null} x - optional. X coordinate to start the app at.
	* @param {Integer|undefined|null} y -optional. Y coordinate to start the app at.
	* @param {String|undefined|null} funcToPassParams - optional. app which called this function. Could be a function and will convert to string.
	*/
	launchAppWithValues: function(appName, paramObj, x, y, funcToPassParams) {
		if (isMaster) {
			var callbackName = this.getCallbackName(funcToPassParams);
			wsio.emit("launchAppWithValues", {
				appName: appName,
				app: this.id,
				func: callbackName,
				customLaunchParams: paramObj,
				xLaunch: x,
				yLaunch: y
			});
		}
	},

	/**
	* Sends data to any apps that this one launched. This doesn't go through server.
	*
	* @method sendDataToChildrenApps
	* @param {String} func - name of function to activate. Has to correctly match
	* @param {Object} data - data to send. doens't have to be an object.
	*/
	sendDataToChildrenApps: function(func, data) {
		for (let i = 0; i < this.childrenAppIds.length; i++) {
			if (applications[this.childrenAppIds[i]]) {
				applications[this.childrenAppIds[i]][func](data);
			}
		}
	},

	/**
	* Sends data to app that launched this one if possible. This doesn't go through server.
	*
	* @method sendDataToParentApp
	* @param {String} func - name of function to activate. Has to correctly match.
	* @param {Object} data - data to send. doens't have to be an object.
	*/
	sendDataToParentApp: function(func, data) {
		if (this.parentIdOfThisApp) {
			applications[this.parentIdOfThisApp][func](data);
		}
	},

	/**
	* Asks server to launch app with values. On the server this will add additional associations like which app launched which.
	* Part of the launch process will include calling back to this app and stating the id of the newly launched app.
	*
	* @method addToAppsLaunchedList
	* @param {String} data - name of app to launch. Has to correctly match.
	*/
	addToAppsLaunchedList: function(appId) {
		this.childrenAppIds.push(appId);
	},

	/**
	* This is used to send data to a specific SAGE2 client. Usually UI clients.
	*
	* @method sendDataToClient
	* @param {String} clientDest - Which client to send the data.
	* @param {String} func - What function to call on the client.
	* @param {Object} paramObj - Object to give the function as parameter. This will have clientDest, func, and appId added.
	*/
	sendDataToClient: function(clientDest, func, paramObj) {
		if (isMaster) {
			paramObj.clientDest = clientDest;
			paramObj.func = func;
			paramObj.appId = this.id;
			wsio.emit("sendDataToClient", paramObj);
		}
	},

	/**
	 * Given a function, will attempt to determine the string name.
	 *
	 * @method getCallbackName
	 * @param {Function} callback - The function to get name as a string.
	 */
	getCallbackName: function(callback) {
		var callbackName = undefined;
		if (callback === undefined || callback === null) {
			return undefined;
		} else if (typeof(callback) == "string") {
			// If already a string, keep as is
			callbackName = callback;
		} else if (callback.name !== undefined && callback.name !== null) {
			callbackName = callback.name;
		} else {
			// Check all properties of the app, if it isn't there the given callback wasn't part of this.
			var keys = Object.keys(this);
			for (let i = 0; i < keys.length; i++) {
				if (this[i] === callback) {
					callbackName = i;
					break;
				}
			}
		}
		return callbackName;
	},

	/**
	* Given the name of the variable, will ask server for the variable.
	* The given callback will be activated with that variable's value.
	* Current setup will not activate callback if there is no variable.
	*
	* @method serverDataGetValue
	* @param {String} nameOfValue - which value to get
	* @param {String} callback - function on app to give value. Could be a function ref and will convert to string.
	*/
	serverDataGetValue: function(nameOfValue, callback) {
		if (isMaster) {
			var callbackName = this.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataGetValue";
			}
			wsio.emit("serverDataGetValue", {
				nameOfValue: nameOfValue,
				app: this.id,
				func: callbackName
			});
		}
	},

	/**
	* Given the name of the variable, set value of variable on server.
	* Will create if doesn't exist.
	*
	* @method serverDataSetValue
	* @param {String} nameOfValue - name of value on server to set
	* @param {Object} value - the value to store for this variable
	* @param {Object} description - description object
	* @param {Boolean} shouldRemoveValueFromServerWhenAppCloses - Optional. If true, app quit will remove value from server.
	*/
	serverDataSetValue: function(nameOfValue, value, description, shouldRemoveValueFromServerWhenAppCloses = false) {
		if (isMaster) {
			wsio.emit("serverDataSetValue", {
				nameOfValue: nameOfValue,
				value: value,
				description: description
			});
			if (shouldRemoveValueFromServerWhenAppCloses
				&& !this.dataSourcesBeingBroadcast.includes(nameOfValue)) {
				this.dataSourcesBeingBroadcast.push(nameOfValue);
			}
		}
	},

	/**
	* Helper function, given the variable name suffix, set value of variable on server.
	* Checks in place to ensure value exists.
	*
	* @method serverDataSetSourceValue
	* @param {String} nameSuffix - name of value on server to set
	* @param {Object} value - the value to store for this variable
	* @param {Object} description - description object
	* @param {Boolean} shouldRemoveValueFromServerWhenAppCloses - Optional. If true, app quit will remove value from server.
	*/
	serverDataSetSourceValue: function(nameSuffix, value) {
		if (isMaster) {
			var nameOfValue = this.id + ":source:" + nameSuffix;
			if (!this.dataSourcesBeingBroadcast.includes(nameOfValue)) {
				throw "Cannot update source value that this app hasn't created yet:" + nameOfValue;
			}
			wsio.emit("serverDataSetValue", {
				nameOfValue: nameOfValue,
				value: value
			});
		}
	},

	/**
	* Helper function to tell server about a source. This will add additional markers to the variable.
	* Name will be of format:
	*	app_id:source:givenName
	*
	* @method serverDataBroadcastSource
	* @param {String} nameSuffix - name suffix
	* @param {Object} value - the value to store for this variable
	* @param {Object} description - description object
	*/
	serverDataBroadcastSource: function(nameSuffix, value, description) {
		if (isMaster) {
			var nameOfValue = this.id + ":source:" + nameSuffix;
			this.serverDataSetValue(nameOfValue, value, description, true);
			if (!this.dataSourcesBeingBroadcast.includes(nameOfValue)) {
				this.dataSourcesBeingBroadcast.push(nameOfValue);
			}
		}
	},

	/**
	* Helper function to tell server about a destination.
	* In addition to creating the variable on the server, will also subscribe to the variable.
	* Name will be of format:
	*	app_id:destination:givenName
	*
	* @method serverDataBroadcastDestination
	* @param {String} nameSuffix - name suffix
	* @param {Object} value - the initial value. Probably is blank.
	* @param {Object} description - description object
	* @param {String} callback - what function will handle values given to the source
	*/
	serverDataBroadcastDestination: function(nameSuffix, value, description, callback) {
		if (isMaster) {
			var nameOfValue = this.id + ":destination:" + nameSuffix;
			var callbackName = this.getCallbackName(callback);
			// Set value first, then subscribe to it
			this.serverDataSetValue(nameOfValue, value, description, true);
			this.serverDataSubscribeToValue(nameOfValue, callbackName);
			if (!this.dataDestinationsBeingBroadcast.includes(nameOfValue)) {
				this.dataDestinationsBeingBroadcast.push(nameOfValue);
			}
		}
	},

	/**
	* Given the name of a variable, will ask server to send its value each time it is assigned.
	* Values will be sent to callback.
	*
	* @method serverDataSubscribeToValue
	* @param {String} nameOfValue - app which called this function
	* @param {String} callback - app which called this function. Could be a function and will convert to string.
	* @param {Boolean} unsubscribe - optional. If true, will stop receiving updates for that variable.
	*/
	serverDataSubscribeToValue: function(nameOfValue, callback, unsubscribe = false) {
		if (isMaster) {
			var callbackName = this.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataSubscribeToValue";
			}
			wsio.emit("serverDataSubscribeToValue", {
				nameOfValue: nameOfValue,
				app: this.id,
				func: callbackName,
				unsubscribe: unsubscribe
			});
		}
	},

	/**
	* Asks server for notifications of any new variables that are added to server.
	* The callback will get one object with properties: nameOfValue and description.
	*
	* @method serverDataSubscribeToNewValueNotification
	* @param {String} callback - app which called this function. Could be a function and will convert to string.
	* @param {Boolean} unsubscribe - optional. If true, will stop receiving notificaitons.
	*/
	serverDataSubscribeToNewValueNotification: function(callback, unsubscribe) {
		if (isMaster) {
			var callbackName = this.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataSubscribeToNewValueNotification";
			}
			// If there is a value for unsubscribe, keep otherwise false
			unsubscribe = unsubscribe ? unsubscribe : false;
			wsio.emit("serverDataSubscribeToNewValueNotification", {
				app: this.id,
				func: callbackName,
				unsubscribe: unsubscribe
			});
		}
	},

	/**
	* Asks server for all variable names and their descriptions. Goes to callback as array.
	* Contents of the array will be objects with two properties: nameOfValue and description.
	*
	* @method serverDataGetAllTrackedDescriptions
	* @param {String} callback - app which called this function. Could be a function and will convert to string.
	* @param {Boolean} unsubscribe - optional. If true, will stop receiving updates for that variable.
	*/
	serverDataGetAllTrackedDescriptions: function(callback) {
		if (isMaster) {
			var callbackName = this.getCallbackName(callback);
			if (callbackName === undefined) {
				throw "Missing callback for serverDataGetAllTrackedDescriptions";
			}
			wsio.emit("serverDataGetAllTrackedDescriptions", {
				app: this.id,
				func: callbackName
			});
		}
	},

	/**
	* Given the name of the variable, remove variable from server.
	* Expectation is this is not called by user (but the option is there) instead as part of cleanup on quit().
	* Sends an array of strings, which this function is just the specified value.
	*
	* @method serverDataRemoveValue
	* @param {String | Array} namesOfValuesToRemove - Can give a single name as string, or an array of string to remove.
	*/
	serverDataRemoveValue: function(namesOfValuesToRemove) {
		if (isMaster) {
			if (!Array.isArray(namesOfValuesToRemove)) {
				namesOfValuesToRemove = [namesOfValuesToRemove];
			}
			wsio.emit("serverDataRemoveValue", { namesOfValuesToRemove: namesOfValuesToRemove });
		}
	},

	/**
	* Will remove all source and destination variables submitted to server.
	* Expectation is this is not called by user (but the option is there) instead as part of cleanup on quit().
	*
	* @method serverDataRemoveAllValuesGivenToServer
	*/
	serverDataRemoveAllValuesGivenToServer: function() {
		if (isMaster) {
			var namesOfValuesToRemove = [];
			for (let i = 0; i < this.dataSourcesBeingBroadcast.length; i++) {
				namesOfValuesToRemove.push(this.dataSourcesBeingBroadcast[i]);
			}
			for (let i = 0; i < this.dataDestinationsBeingBroadcast.length; i++) {
				namesOfValuesToRemove.push(this.dataDestinationsBeingBroadcast[i]);
			}
			wsio.emit("serverDataRemoveValue", { namesOfValuesToRemove: namesOfValuesToRemove });
		}
	}
});
