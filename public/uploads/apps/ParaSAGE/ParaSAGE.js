// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

"use strict";

/* global autobahn */

var ParaSAGE = SAGE2_App.extend({
	init: function(data) {
		// data: contains initialization parameters, such as `x`, `y`, `width`, `height`, and `date`
		this.SAGE2Init("div", data);
		this.element.id = "div" + data.id;
		this.resizeEvents = "continous";
		this.passSAGE2PointerAsMouseEvents = true;

		// Custom app variables initialization
		this.element.style.background = "white"; // white washes the app.
		// Info div for a larget notification zone
		this.infoDiv = document.createElement("div");
		this.infoDiv.style.width     = "100%";
		this.infoDiv.style.height    = "100%";
		this.infoDiv.style.position  = "absolute";
		this.infoDiv.style.left      = "0px";
		this.infoDiv.style.top       = "0px";
		this.infoDiv.style.fontSize  = ui.titleTextSize;
		this.infoDiv.textContent     = "App performing initialization...";
		this.element.appendChild(this.infoDiv);
		// Image from ParaViewWeb
		this.imageFromPvw = document.createElement("img");
		this.imageFromPvw.style.width  = "100%";
		this.imageFromPvw.style.height = "100%";
		this.element.appendChild(this.imageFromPvw);
		// Current implementation will ignore the canvas, since that will require additional time to draw.
		this.isConnected = false;
		// Experiemental PV render load reduction.
		this.onlyRenderRequestFromMasterDisplay  = false;
		this.orrfmdAttemptBinaryConversion       = false;
		this.reduceRenderResolutionOnInteraction = false;
		this.reduceResolutionAmount = 10; // Divided by this number

		this.setupPvwConnection();
		this.setupImageEventListerers();
		this.updateTitle("ParaView [Not connected]");
		this.openWebSocketToPvwServer();
	},

	setupPvwConnection: function() {
		this.availableDataSetsOnServer = [];
		this.activePipeLines = [];
		this.pvwConfig   = {
			application: "visualizer",
			sessionURL:  "ws://10.232.6.218:8080/ws",
			secret:      "vtkweb-secret" // because for some reason it is always this value. note: unsure what happens if this changes.
		};
		this.logInformation = {
			imageRoundTrip:        -1,
			imageServerProcessing: -1
		};
		this.lastMTime     = 0;
		this.renderOptions = {
			session: null,
			view: -1,
			enableInteractions: true,
			renderer: "image",
			interactiveQuality: 10,
			stillQuality: 100,
			currentQuality: 100,
			vcrPlayStatus: false
		};
		this.button_state = {
			action_pending: false,
			left:    false,
			right:   false,
			middle: false,
			rmbScrollTracker: 0
		};
		this.refreshCounter = 0;

		if (this.onlyRenderRequestFromMasterDisplay) {
			if (isMaster) {
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwRenderViewImage",
					value:       "On app start will be blank so the value exists for the subscription request",
					description: "Will hold the latest render image from ParaView"
				});
			} else {
				var _this = this;
				setTimeout( function() {
					wsio.emit("csdMessage", {
						type: "subscribeToValue",
						nameOfValue: "pvwRenderViewImage",
						app:         _this.id,
						func:        "csdRenderViewUpdate"
					});
				}, 1000);
			}
		}
	},

	openWebSocketToPvwServer: function() {
		var _this = this;
		if (_this.pvwConfig.sessionURL.indexOf("ws") < 0) {
			_this.updateTitle("ParaView [Invalid sessionURL:" + _this.pvwConfig.sessionURL + "]");
			return;
		}
		_this.updateTitle("ParaView [Connecting to:" + _this.pvwConfig.sessionURL + "...]");
		_this.infoDiv.textContent = "Connecting to " + _this.pvwConfig.sessionURL + "...";
		var transports = [{
			type: "websocket",
			url: _this.pvwConfig.sessionURL
		}];
		// create the autobahn connection.
		_this.pvwConfig.connection = new autobahn.Connection({
			transports: transports,
			realm: "vtkweb",
			authmethods: ["wampcra"],
			authid: "vtkweb",
			max_retries: 3,
			onchallenge: function(session, method, extra) {
				if (method === "wampcra") {
					var secretKey = autobahn.auth_cra.derive_key(_this.pvwConfig.secret, "salt123");
					return autobahn.auth_cra.sign(secretKey, extra.challenge);
				} else {
					_this.updateTitle("ParaView [Connection refused, challenge failed]");
					throw "don't know how to authenticate using:" + method;
				}
			}
		});
		// setup what to do after connection open.
		_this.pvwConfig.connection.onopen = function(session, details) {
			try {
				_this.updateTitle("ParaView [CONNECTED to:" + _this.pvwConfig.sessionURL + "]");
				_this.pvwConfig.session = session;
				_this.afterConnection();
				_this.isConnected = true;
				_this.infoDiv.textContent = "";
				_this.infoDiv.style.width = "0%";
				_this.infoDiv.style.height = "0%";
			} catch (e) {
				console.log("Error on opening connection."); console.log(e);
			}
		};
		// setup what to do on connection close.
		_this.pvwConfig.connection.onclose = function() {
			_this.updateTitle("ParaView [DISCONNECTED from:" + _this.pvwConfig.sessionURL + "]");
			_this.isConnected = false;
			_this.imageFromPvw.src = "";
			_this.infoDiv.textContent = "DISCONNECTED from:" + _this.pvwConfig.sessionURL;
			_this.infoDiv.style.width = "100%";
			_this.infoDiv.style.height = "100%";
			return false;
		};
		// attempt to open the connection
		_this.pvwConfig.connection.open();
	},

	afterConnection: function() {
		var _this = this;
		_this.pvwRender();
		_this.getAvailableDataSetsOnServer();
	},

	/*
	Response to file.server.directory.list will be an object:
	{
		dirs    []
		files   [] <- files in the requested directory.
		each entry is an object with property "label" containing the name of the file.
		groups  []
		label   []
		path    []
	}
	*/
	getAvailableDataSetsOnServer: function() {
		var _this = this;
		_this.pvwConfig.session.call("file.server.directory.list", ["."])
		.then(function(reply) {
			_this.availableDataSetsOnServer = [];
			for (var i = 0; i < reply.files.length; i++) {
				_this.availableDataSetsOnServer.push(reply.files[i].label);
			}
			_this.getFullContextMenuAndUpdate();
		});
	},

	// Keeping this as a just in case
	pvwRequestDataSetCan: function() {
		var _this = this;
		var fullpathFileList = ["can.ex2"];
		_this.pvwConfig.session.call("pv.proxy.manager.create.reader", fullpathFileList)
		.then(function(response) {
			_this.pvwRender();
		});
	},

	pvwRender: function(fetch = true) {
		if (this.onlyRenderRequestFromMasterDisplay && (!isMaster)) { return; }
		var _this = this;
		var renderCfg = {
			size: [parseInt(_this.sage2_width), parseInt(_this.sage2_height)],
			view: Number(_this.renderOptions.view),
			mtime: fetch ? 0 : _this.lastMTime,
			quality: _this.renderOptions.currentQuality, // Might replace later with _this.renderOptions.vcrPlayStatus ? _this.renderOptions.interactiveQuality : _this.renderOptions.stillQuality
			localTime: new Date().getTime()
		};

		// If doing a resolution reduction on interaction instead of quality alter the renderCfg values.
		if (_this.reduceRenderResolutionOnInteraction
			&& (_this.renderOptions.currentQuality == _this.renderOptions.interactiveQuality)) {
			renderCfg.size = [parseInt(_this.sage2_width / _this.reduceResolutionAmount), parseInt(_this.sage2_height / _this.reduceResolutionAmount)];
			renderCfg.quality = _this.renderOptions.stillQuality;
		}

		_this.pvwConfig.session.call("viewport.image.render", [renderCfg])
		.then(function(response) {
			_this.renderOptions.view = Number(response.global_id);
			_this.lastMTime = response.mtime;
			_this.button_state.action_pending = false; // For interaction cleanup.
			if (response.hasOwnProperty("image") & response.image !== null) {
				_this.imageFromPvw.width = response.size[0];
				_this.imageFromPvw.height = response.size[1];
				_this.imageFromPvw.src = "data:image/" + response.format + "," + response.image;

				if (_this.orrfmdAttemptBinaryConversion) {
					var satb = atob(response.image);
					_this.refreshCounter++;
					if (_this.refreshCounter > 100) {
						_this.refreshCounter = 0;
						// console.log("erase me, refresh counter 100");
						// console.log("erase me, src length:" + _this.imageFromPvw.src.length);
						// console.log("erase me, src format:" + response.format);
						// console.log("erase me, satb length:" + satb.length + ". Difference=" + (satb.length - _this.imageFromPvw.src.length));
					}
					wsio.emit("csdMessage", {
						type: "setValue",
						nameOfValue: "pvwRenderViewImage",
						value: satb,
						description: "Image from ParaView in binary.",
					});
				} else {
					wsio.emit("csdMessage", {
						type: "setValue",
						nameOfValue: "pvwRenderViewImage",
						value: _this.imageFromPvw.src,
						description: "Image from ParaView in binary.",
					});
				}

				_this.logInformation.imageRoundTrip = Number(new Date().getTime() - response.localTime) - response.workTime;
				_this.logInformation.imageServerProcessing = Number(response.workTime);
			}
			// If server still doing renders need to grab next frame
			if (response.stale === true) {
				setTimeout(function() {
					_this.pvwRender();
				}, 0);
			}
		});
	},

	csdRenderViewUpdate: function(mostRecentRenderImage) {
		this.imageFromPvw.width  = parseInt(this.sage2_width);
		this.imageFromPvw.height = parseInt(this.sage2_height);
		if (this.orrfmdAttemptBinaryConversion) {
			this.imageFromPvw.src    = "data:image/jpeg;base64," + btoa(mostRecentRenderImage);
		} else {
			this.imageFromPvw.src    = mostRecentRenderImage;
		}
	},

	pvwVcrPlay: function() {
		this.renderOptions.vcrPlayStatus = true;
		this.getFullContextMenuAndUpdate(); // Check inside to swap Play / Pause
		this.pvwRunAnimationLoop();
	},

	pvwVcrStop: function() {
		var _this = this;
		_this.renderOptions.vcrPlayStatus = false;
		_this.getFullContextMenuAndUpdate(); // Check inside to swap Play / Pause
		_this.renderOptions.currentQuality = _this.renderOptions.stillQuality;
		setTimeout(function() {
			_this.pvwRender();
		}, 50);
	},

	pvwRunAnimationLoop: function() {
		var _this = this;
		if (_this.renderOptions.vcrPlayStatus) {
			_this.pvwConfig.session.call("pv.vcr.action", ["next"])
			.then(function(timeValue) {
				_this.renderOptions.currentQuality = _this.renderOptions.interactiveQuality;
				_this.pvwRender();
				setTimeout(function() {
					_this.pvwRunAnimationLoop();
				}, 50); // ms where 50 is 1/20 second
			});
		}
	},

	setupImageEventListerers: function() {
		var _this = this;
		this.imageFromPvw.addEventListener("click",      function(e) {
			_this.imageEventHandler(e);
		});
		this.imageFromPvw.addEventListener("mousemove",  function(e) {
			_this.imageEventHandler(e);
		});
		this.imageFromPvw.addEventListener("mousedown",  function(e) {
			_this.imageEventHandler(e);
		});
		this.imageFromPvw.addEventListener("mouseup",    function(e) {
			_this.imageEventHandler(e);
		});
		this.imageFromPvw.addEventListener("mouseenter", function(e) {
			_this.imageEventHandler(e);
		});
		this.imageFromPvw.addEventListener("mouseleave", function(e) {
			_this.imageEventHandler(e);
		});
		this.imageFromPvw.addEventListener("mouseout",   function(e) {
			_this.imageEventHandler(e);
		});
		this.imageFromPvw.addEventListener("mouseover",  function(e) {
			_this.imageEventHandler(e);
		});
		// this.imageFromPvw.addEventListener("wheel",      function(e) {
		// 	_this.imageEventHandler(e);
		// });
	},

	imageEventHandler: function(evt) {
		// Old debug
		// this.updateTitle( "Event(" + evt.type + ") pos(" + evt.x + "," + evt.y + ") move " + evt.movementX + "," + evt.movementY);

		// Update quality based on the type of the event
		if (evt.type === "mouseup" || evt.type === "dblclick" || evt.type === "wheel") {
			this.renderOptions.currentQuality = this.renderOptions.stillQuality;
			// console.log("erase me, switching to still " + this.renderOptions.currentQuality);
		} else if (evt.type === "mousedown") {
			this.renderOptions.currentQuality = this.renderOptions.interactiveQuality;
			// console.log("erase me, " + evt.type + " detected switching to animation " + this.renderOptions.currentQuality);
		}

		var buttonLeft;
		if (evt.type === "mousedown" && evt.button === 0) {
			buttonLeft = true;
		} else if (evt.type === "mouseup" && evt.button === 0) {
			buttonLeft = false;
		} else {
			buttonLeft = this.button_state.left;
		}
		var buttonMiddle;
		if (evt.type === "mousedown" && evt.button === 1) {
			buttonMiddle = true;
		} else if (evt.type === "mouseup" && evt.button === 1) {
			buttonMiddle = false;
		} else {
			buttonMiddle = this.button_state.middle;
		}
		var buttonRight;
		if (evt.type === "mousedown" && evt.button === 2) {
			buttonRight = true;
		} else if (evt.type === "mouseup" && evt.button === 2) {
			buttonRight = false;
		} else {
			buttonRight = this.button_state.right;
		}

		var vtkWeb_event = {
			view:     Number(this.renderOptions.view),
			action:   evt.type,
			charCode: evt.charCode,
			altKey:   evt.altKey,
			ctrlKey:  evt.ctrlKey,
			shiftKey: evt.shiftKey,
			metaKey:  evt.metaKey,
			buttonLeft:   buttonLeft, // Potentially problematic because default value of button is 0. For example mousemove.
			buttonMiddle: buttonMiddle,
			buttonRight:  buttonRight
		};

		// Force wheel events into right click drag. For some reason scroll packet doesn't work.
		if (evt.type === "wheel") {
			vtkWeb_event.action = "mousemove";
			vtkWeb_event.buttonLeft = false;
			vtkWeb_event.buttonRight = true;
			vtkWeb_event.buttonMiddle = false;
			vtkWeb_event.x = 0;
			vtkWeb_event.y = evt.deltaY / 100 + this.button_state.rmbScrollTracker;
			this.button_state.rmbScrollTracker = vtkWeb_event.y;
		} else { // The x and y should be given relative to app position when using SAGE2MEP.
			vtkWeb_event.x = evt.x / this.imageFromPvw.width;
			vtkWeb_event.y = 1.0 - (evt.y / this.imageFromPvw.height);
			if (vtkWeb_event.buttonRight) {
				this.button_state.rmbScrollTracker = vtkWeb_event.y;
			}
			if (this.reduceRenderResolutionOnInteraction) {
				vtkWeb_event.x /= this.reduceResolutionAmount;
				vtkWeb_event.y /= this.reduceResolutionAmount;
			}
		}
		if (evt.type !== "wheel" && this.eatMouseEvent(vtkWeb_event)) {
			return;
		}
		// console.log("erase me, does this flood with mousemove?");
		this.button_state.action_pending = true;
		var _this = this;

		// If not master, ask for a render view after a bit
		if (isMaster) {
			_this.pvwConfig.session.call("viewport.mouse.interaction", [vtkWeb_event])
			.then(function (res) {
				if (res) {
					_this.button_state.action_pending = false;
					_this.pvwRender();
				}
			}, function(error) {
				console.log("Call to viewport.mouse.interaction failed");
				console.log(error);
			});
		} else if (!isMaster && !this.onlyRenderRequestFromMasterDisplay) {
			_this.pvwRender();
		}
	},

	eatMouseEvent: function(event) {
		var force_event = (this.button_state.left !== event.buttonLeft
			|| this.button_state.right  !== event.buttonRight
			|| this.button_state.middle !== event.buttonMiddle);
		if (!force_event && !event.buttonLeft && !event.buttonRight && !event.buttonMiddle && !event.wheel) {
			return true;
		}
		if (!force_event && this.button_state.action_pending) {
			return true;
		}
		this.button_state.left   = event.buttonLeft;
		this.button_state.right  = event.buttonRight;
		this.button_state.middle = event.buttonMiddle;
		return false;
	},

	pvwRequestProxyManagerList: function (response) {
		var _this = this;
		_this.pvwConfig.session.call("pv.proxy.manager.list", [])
		.then(function(data) {

			/*
			Data is
			{
				[
					{
						id: string number
						name: "filename"
						parent: ??? dunno ???
						rep: string number
						visible: string 1 or 0.
					}
				{}
				...
				]
				view: ""
			}
			*/
			// This can be more efficient if, it prevented context update on no change.
			// The load data could be more efficient, if it prevented multiple requests (isMaster) and prevent double loads (alreayd loaded).
			var alreadyKnownPipeline = false;
			for (var responseIndex = 0; responseIndex < data.sources.length; responseIndex++) {
				alreadyKnownPipeline = false;
				for (var knownPipesIndex = 0; knownPipesIndex < _this.activePipeLines.length; knownPipesIndex++) {
					if (_this.activePipeLines[knownPipesIndex].filename === data.sources[responseIndex].name) {
						alreadyKnownPipeline = true;
						if (_this.activePipeLines[knownPipesIndex].repNumbers.indexOf(data.sources[responseIndex].rep) === -1) {
							_this.activePipeLines[knownPipesIndex].repNumbers.push(data.sources[responseIndex].rep);
						}
						break; // breaks out of checking known pipelines, goes onto next response value.
					}
				}
				if (!alreadyKnownPipeline) {
					_this.activePipeLines.push({
						filename: data.sources[responseIndex].name,
						repNumbers: [data.sources[responseIndex].rep],
						visible: data.sources[responseIndex].visible
					});
				}
			}
			_this.getFullContextMenuAndUpdate();
		}, function(err) {
			console.log("pipeline error");
			console.log(err);
		});
	},

	/*
	Context menu callbacks defined *mostly* below.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;
		var i;

		entry = {};
		entry.description = "New width:";
		entry.callback = "setWidth";
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 6;
		entries.push(entry);

		entry = {};
		entry.description = "New height:";
		entry.callback = "setHeight";
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 6;
		entries.push(entry);

		entry = {};
		entry.description = "Connect to new session URL:";
		entry.callback = "setSessionURL";
		entry.parameters     = {};
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		entry = {};
		entry.description = "Restart WebSocket connection";
		entry.callback    = "openWebSocketToPvwServer";
		entry.parameters  = {};
		entries.push(entry);

		entry = {};
		entry.description = "Refresh render view";
		entry.callback    = "pvwRender";
		entry.parameters  = {};
		entries.push(entry);

		// Toggle only master render
		if (this.onlyRenderRequestFromMasterDisplay) {
			entry = {};
			entry.description = "Toggle to: each display requests render.";
			entry.callback    = "toggleRenderModeMasterOrAll";
			entry.parameters  = {
				toggle: (!this.onlyRenderRequestFromMasterDisplay)
			};
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Toggle to: only master requests render.";
			entry.callback    = "toggleRenderModeMasterOrAll";
			entry.parameters  = {
				toggle: (!this.onlyRenderRequestFromMasterDisplay)
			};
			entries.push(entry);
		}
		// Toggle binary conversion on master only render
		if (this.onlyRenderRequestFromMasterDisplay) {
			if (this.orrfmdAttemptBinaryConversion) {
				entry = {};
				entry.description = "Toggle to: transfer received string from ParaView";
				entry.callback    = "toggleUseReceivedStringOrBinaryConvert";
				entry.parameters  = {
					toggle: (!this.orrfmdAttemptBinaryConversion)
				};
				entries.push(entry);
			} else {
				entry = {};
				entry.description = "Toggle to: convert to binary then transfer received string from ParaView";
				entry.callback    = "toggleUseReceivedStringOrBinaryConvert";
				entry.parameters  = {
					toggle: (!this.orrfmdAttemptBinaryConversion)
				};
				entries.push(entry);
			}
		}
		// Toggle only master render
		if (this.reduceRenderResolutionOnInteraction) {
			entry = {};
			entry.description = "Toggle to: use full resolution(but low quality) on interaction.";
			entry.callback    = "toggleReduceResolutionOnInteraction";
			entry.parameters  = {
				toggle: (!this.reduceRenderResolutionOnInteraction)
			};
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Toggle to: reduce resolution(but full quality) on interaction.";
			entry.callback    = "toggleReduceResolutionOnInteraction";
			entry.parameters  = {
				toggle: (!this.reduceRenderResolutionOnInteraction)
			};
			entries.push(entry);
		}

		// Switch out the play / pause option.
		if (this.renderOptions.vcrPlayStatus) {
			entry = {};
			entry.description = "Pause";
			entry.callback    = "pvwVcrStop";
			entry.parameters  = {};
			entries.push(entry);
		} else {
			entry = {};
			entry.description = "Play";
			entry.callback    = "pvwVcrPlay";
			entry.parameters  = {};
			entries.push(entry);
		}

		// entry = {};
		// entry.description = "What does manager list do?";
		// entry.callback    = "pvwRequestProxyManagerList";
		// entry.parameters  = {};
		// entries.push(entry);

		for (i = 0; i < this.activePipeLines.length; i++) {
			entry = {};
			entry.description = "Toggle visibility of " + this.activePipeLines[i].filename;
			entry.callback    = "pvwToggleVisibilityOfData";
			entry.parameters  = {
				index: i
			};
			entries.push(entry);
		}

		// entry = {};
		// entry.description = "Backup data request Can";
		// entry.callback    = "pvwRequestDataSetCan";
		// entry.parameters  = {};
		// entries.push(entry);

		for (i = 0; i < this.availableDataSetsOnServer.length; i++) {
			entry = {};
			entry.description = "Load dataset:" + this.availableDataSetsOnServer[i];
			entry.callback    = "pvwRequestDataSet";
			entry.parameters  = {
				filename: ("" + this.availableDataSetsOnServer[i])
			};
			entries.push(entry);
		}

		return entries;
	},

	// receive an from the webui use .clientInput for what they typed
	setWidth: function(response) {
		this.sendResize(parseInt(response.clientInput), this.sage2_height);
	},

	// receive an from the webui use .clientInput for what they typed
	setHeight: function(response) {
		this.sendResize(this.sage2_width, parseInt(response.clientInput));
	},

	setSessionURL: function(response) {
		this.pvwConfig.sessionURL = response.clientInput;
	},

	toggleRenderModeMasterOrAll: function(response) {
		this.onlyRenderRequestFromMasterDisplay = response.toggle;
		this.getFullContextMenuAndUpdate();
	},

	toggleUseReceivedStringOrBinaryConvert: function(response) {
		this.orrfmdAttemptBinaryConversion = response.toggle;
		this.getFullContextMenuAndUpdate();
	},

	toggleReduceResolutionOnInteraction: function(response) {
		this.reduceRenderResolutionOnInteraction = response.toggle;
		this.getFullContextMenuAndUpdate();
	},

	pvwRequestDataSet: function(responseObject) {
		var _this = this;
		var fullpathFileList = [("" + responseObject.filename)];
		// If display is not master refresh screen after about when the view should have updated.
		if (!isMaster) {
			setTimeout(function() {
				_this.pvwRender();
			}, 1000);
		} else {
			_this.pvwConfig.session.call("pv.proxy.manager.create.reader", fullpathFileList)
			.then(function(response) {
				_this.pvwRender();
				// After reading in a date set, ask the server what the id is.
				// NOTE: currently each connection will makes a request for data, meaning x Displays amount of rendered datasets.
				_this.pvwRequestProxyManagerList();
			});
		}
	},

	pvwToggleVisibilityOfData: function (responseObject) {
		var _this = this;
		// If display is not master refresh screen after about when the view should have updated.
		if (!isMaster) {
			setTimeout(function() {
				_this.pvwRender();
			}, 1000);
		} else {
			var index = responseObject.index;
			var dataToSend = [];
			_this.activePipeLines[index].visible = _this.activePipeLines[index].visible ? 0 : 1; // switch 1 and 0. Works because 0 is false, non-zero is true

			for (var i = 0; i < _this.activePipeLines[index].repNumbers.length; i++) {
				dataToSend.push({
					id: _this.activePipeLines[index].repNumbers[i],
					name: "Visibility",
					value: _this.activePipeLines[index].visible
				});
			}

			_this.pvwConfig.session.call("pv.proxy.manager.update", [dataToSend])
			.then(function() {
				_this.pvwRender(); // update the view
			}, function(err) {
				console.log("pipeline update error");
				console.log(err);
			});
		}
	},

	event: function(type, position, user, data, date) { },

	//load function allows application to begin with a particular state.  Needed for remote site collaboration.
	load: function(date) { },

	move: function(date) { },

	// image style should handle this...
	resize: function(date) { },

	// not really used since the image will be based upon data from paraview
	draw: function(date) { },

	quit: function() { }
});






















