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
// This states autobahn is a variabled defined in another file. For PVW connection.

var ParaSAGE = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);
		this.element.id   = "div" + data.id;
		this.resizeEvents = "continous";
		this.passSAGE2PointerAsMouseEvents = true;

		// App specific variables initialization
		this.element.style.background = "white"; // default is transparent
		this.setupVariables();
		this.setupImageEventListerers();
		this.updateTitle("ParaView [Not connected]");
		this.openWebSocketToPvwServer();
	},

	setupVariables: function() {
		// Toggles
		this.onlyRenderRequestFromMasterDisplay  = false;
		this.orrfmdAttemptBinaryConversion       = true;
		this.orrfmdDataPassInitialized           = false;
		this.reduceRenderResolutionOnInteraction = false;
		this.reduceResolutionAmount              = 10; // Divided dimensions by this number
		this.onlyGetLowResAnimationFrames        = true; // prevent high res background cache and switch, no toggle setup

		// Info div for a large notification zone
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

		// Connection variables
		this.isConnected               = false;
		this.availableDataSetsOnServer = [];
		this.activePipeLines           = [];
		this.pvwConfig                 = {
			application: "visualizer",
			sessionURL:  "ws://10.232.6.218:8080/ws",
			secret:      "vtkweb-secret" // because for some reason it is always this value
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
			vcrPlayStatus: false,
			vcrFrameData: [],
			vcrCurrentFrame: 0,
			vcrViewChanged: true,
			vcrFrameBeingFetched: -1,

			vcrStartingHighResFetch: -1,
			vcrHasAllLowResImages: false,
			vcrGettingHighResImages: false,
			vcrIndexOfHighResFetch: -1
		};
		this.button_state = {
			action_pending: false,
			left:   false,
			right:  false,
			middle: false,
			rmbScrollTracker: 0
		};
		this.toggleRenderModeMasterOrAll({
			toggle: this.onlyRenderRequestFromMasterDisplay
		});
		this.otherDisplayClients   = 0;
		this.otherDisplaysGotFrame = -1;

		var _this = this;
		// Status update listeners
		if (isMaster) { // master must creates value first.
			wsio.emit("csdMessage", {
				type: "setValue",
				nameOfValue: "pvwStatusUpdate",
				value:       "Trying to connect",
				description: "Using this as a way to notify non-master displays of pvw information only master will see"
			});
		} else {
			setTimeout(function() {
				wsio.emit("csdMessage", {
					type: "subscribeToValue",
					nameOfValue: "pvwStatusUpdate",
					app:         _this.id,
					func:        "csdPvwStatusUpdate"
				});
			}, 1000); // subscribe to value after master
		}
		// Render view listener
		if (isMaster) {
			wsio.emit("csdMessage", {
				type:        "setValue",
				nameOfValue: "pvwRenderViewImage",
				value:       "On app start will be blank so the value exists for the subscription request",
				description: "Will hold the latest render image from ParaView"
			});
		} else {
			setTimeout(function() {
				wsio.emit("csdMessage", {
					type:        "subscribeToValue",
					nameOfValue: "pvwRenderViewImage",
					app:         _this.id,
					func:        "csdRenderViewUpdate"
				});
			}, 1000);
		}
		// setup a means to find the amount of other displays.
		if (isMaster) {
			wsio.emit("csdMessage", {
				type:        "setValue",
				nameOfValue: "pvwDisplayCheckin",
				value:       "master display creating pvwDisplayCheckin csd variable",
				description: "Will hold the latest render image from ParaView"
			});
			wsio.emit("csdMessage", {
				type:        "subscribeToValue",
				nameOfValue: "pvwDisplayCheckin",
				app:         this.id,
				func:        "csdDisplayCheckin"
			});
		} else {
			setTimeout(function() {
				wsio.emit("csdMessage", {
					type:        "setValue",
					nameOfValue: "pvwDisplayCheckin",
					value:       "clientDisplayInitialCheckIn",
					description: "Will hold the latest render image from ParaView"
				});
			}, 1000);
		}
	}, // setupVariables

	/*
		Creates a connection PVW server.
		Checks is stated sessionURL has ws.
			If not, it can't connect. ws is needed as part of address to specify protocol.
		Changes the title and sets info div to display status.
		Connection properties set. new autobahn.Connection
		On open, set title, update visuals. Call afterConnection()
		On close, set title, updaate visuals.
		Finally tries ot open connection.
	*/
	openWebSocketToPvwServer: function() {
		var _this = this;
		if (_this.pvwConfig.sessionURL.indexOf("ws") < 0) {
			_this.updateTitle("ParaView [Invalid sessionURL:" + _this.pvwConfig.sessionURL + "]");
			return;
		}
		_this.updateTitle("ParaView [Connecting to:" + _this.pvwConfig.sessionURL + "...]");
		_this.showInfoDiv("Connecting to " + _this.pvwConfig.sessionURL + "...");
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
				_this.hideInfoDiv();
			} catch (e) {
				console.log("Error on opening connection."); console.log(e);
			}
		};
		// setup what to do on connection close.
		_this.pvwConfig.connection.onclose = function() {
			_this.updateTitle("ParaView [DISCONNECTED from:" + _this.pvwConfig.sessionURL + "]");
			_this.isConnected = false;
			_this.imageFromPvw.src = "";
			_this.showInfoDiv("DISCONNECTED from:" + _this.pvwConfig.sessionURL);
			return false;
		};
		// attempt to open the connection
		_this.pvwConfig.connection.open();
	},

	// This gets called after connection to PVW is established.
	afterConnection: function() {
		this.pvwRender();
		this.getAvailableDataSetsOnServer();
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
	Note: documentation doesn't correctly describe.
		http://paraviewweb.kitware.com/#!/api/protocols.ParaViewWebFilterList

	This is necessary to know what datasets are available and seed the context menu
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

	// // Example on how to load datasets.
	// pvwRequestDataSetCan: function() {
	// 	var _this = this;
	// 	var fullpathFileList = ["can.ex2"];
	// 	_this.pvwConfig.session.call("pv.proxy.manager.create.reader", fullpathFileList)
	// 	.then(function(response) {
	// 		_this.pvwRender();
	// 	});
	// },


	/*
		Primary means to get view of scene.
		TODO: double check necessity of parameter fetch.
		Makes render config object.
		Send to PVW.
			http://paraviewweb.kitware.com/#!/api/protocols.ParaViewWebViewPortImageDelivery
		then()
			track view id, mtime, allow interaction,
			if an image came back, show it.

		TODO call again if render is behind, check with response.stale
	*/
	pvwRender: function(fetch = true) {
		if (this.onlyRenderRequestFromMasterDisplay && (!isMaster)) {
			return; // If not master, will get their updates from the subscription method.
		}
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
			renderCfg.size = [
				parseInt(_this.sage2_width / _this.reduceResolutionAmount),
				parseInt(_this.sage2_height / _this.reduceResolutionAmount)
			];
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

				// if only render request from master display binary conversion
				if (_this.onlyRenderRequestFromMasterDisplay) {
					if (_this.orrfmdAttemptBinaryConversion) {
						var satb = atob(response.image);
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwRenderViewImage",
							value: satb,
							description: "Image from ParaView in binary."
						});
					} else {
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwRenderViewImage",
							value: _this.imageFromPvw.src,
							description: "Image from ParaView in binary."
						});
					}
				}
			}
		}); //then
	}, // pvwRender

	/*
		If only master is to make the request, this method is what gets the image to other display clients.
		Note: this exhibits conditional errors when screens are refreshed instead of the server being reset.
	*/
	csdRenderViewUpdate: function(mostRecentRenderImage) {
		if (isMaster) {
			return;
		}
		this.imageFromPvw.width  = parseInt(this.sage2_width);
		this.imageFromPvw.height = parseInt(this.sage2_height);
		if (this.orrfmdAttemptBinaryConversion) {
			this.imageFromPvw.src    = "data:image/jpeg;base64," + btoa(mostRecentRenderImage);
		} else {
			this.imageFromPvw.src    = mostRecentRenderImage;
		}
		this.hideInfoDiv();
	},

	/*
		Function is called when master sends csdPvwStatusUpdate.
		Note: this exhibits conditional errors when screens are refreshed instead of the server being reset.
	*/
	csdPvwStatusUpdate: function(statusMessage) {
		if (isMaster) {
			return;
		}
		var res = null;
		var frame = null;
		// messages with $! are for $howing !mage in an animation. Master sends it.
		if (statusMessage.indexOf("$!") == 0) {
			var format = "";
			res    = statusMessage.substring(statusMessage.indexOf(":") + 1, statusMessage.indexOf("::"));
			format = statusMessage.substring(statusMessage.indexOf("::") + 2, statusMessage.indexOf(":::"));
			frame  = parseInt(statusMessage.substring(statusMessage.indexOf(":::") + 3, statusMessage.indexOf("::::")));

			if (res == "low") {
				res = "imgLowRes";
			} else {
				res = "imgHighRes";
			}

			try {
				if (format == "bin") {
					this.renderOptions.vcrFrameData[frame][res] = "data:image/jpeg;base64,"
						+ btoa(statusMessage.substring(statusMessage.indexOf("::::") + 4));
				} else {
					this.renderOptions.vcrFrameData[frame][res] = statusMessage.substring(statusMessage.indexOf("::::") + 4);
				}
			} catch (e) {
				console.log();
				console.log();
				console.log(e);
				console.log(statusMessage.substring(0, 120));
				console.log(frame);
				console.log(res);
				console.dir(this.renderOptions.vcrFrameData);
				console.log();
				console.log();
			}

			// only on low res show the images.
			if (res == "imgLowRes") {
				this.imageFromPvw.src = this.renderOptions.vcrFrameData[frame][res];
			}

			if (this.packetTimeCheck) {
				console.log("erase me, time diff:" + (Date.now() - this.packetTimeCheck));
			}
		} else if (statusMessage.indexOf("showAnimationFrame") !== -1) {
			res   = statusMessage.substring(statusMessage.indexOf(":") + 1, statusMessage.indexOf("::"));
			frame = parseInt(statusMessage.substring(statusMessage.indexOf("::") + 2));
			this.imageFromPvw.src = this.renderOptions.vcrFrameData[frame][res];
		} else if (statusMessage.indexOf("resetVcrImageCache") !== -1) {
			console.log("erase me, resetting vcr cache");
			this.renderOptions.vcrFrameData = [];
			var frameAmount = parseInt(statusMessage.substring(statusMessage.indexOf(":") + 1));
			for (var i = 0; i < frameAmount; i++) {
				this.renderOptions.vcrFrameData.push({
					time: 0,
					imgLowRes: null,
					imgHighRes: null
				});
			}
		} else if (statusMessage.indexOf("renderVcr") !== -1) {
			res = statusMessage.substring(statusMessage.indexOf(":") + 1, statusMessage.indexOf("::"));
			frame = parseInt(statusMessage.substring(statusMessage.indexOf("::") + 2));
			var _this = this;
			if (res.indexOf("Low")) {
				_this.renderOptions.currentQuality = _this.renderOptions.interactiveQuality;
			} else {
				_this.renderOptions.currentQuality = _this.renderOptions.stillQuality;
			}
			var renderCfg = {
				size: [parseInt(_this.sage2_width), parseInt(_this.sage2_height)],
				view: Number(_this.renderOptions.view),
				mtime: 0,
				quality: _this.renderOptions.currentQuality,
				localTime: new Date().getTime()
			};
			// If doing a resolution reduction on interaction instead of quality alter the renderCfg values.
			if (_this.reduceRenderResolutionOnInteraction
				&& (_this.renderOptions.currentQuality == _this.renderOptions.interactiveQuality)) {
				renderCfg.size = [
					parseInt(_this.sage2_width / _this.reduceResolutionAmount),
					parseInt(_this.sage2_height / _this.reduceResolutionAmount)
				];
				renderCfg.quality = _this.renderOptions.stillQuality;
			}
			// render call
			_this.pvwConfig.session.call("viewport.image.render", [renderCfg])
			.then(function(response) {
				if (res.indexOf("Low") != -1) { // only automatically show the low res image.
					_this.imageFromPvw.src = "data:image/" + response.format + "," + response.image;
				}
				_this.renderOptions.vcrFrameData[frame][res] =  "data:image/" + response.format + "," + response.image;
				// tell master display that they got the image.
				wsio.emit("csdMessage", {
					type:        "setValue",
					nameOfValue: "pvwDisplayCheckin",
					value:       "otherDisplaysGotFrame",
					description: "Will hold the latest render image from ParaView"
				});
			}, function(err) {
				console.log("renderVcr error");
				throw err;
			});
		} else if (statusMessage.indexOf("pvwRender") !== -1) {
			if (statusMessage.indexOf("stillQuality") !== -1) {
				this.renderOptions.currentQuality = this.renderOptions.stillQuality;
			} else if (statusMessage.indexOf("interactiveQuality") !== -1) {
				this.renderOptions.currentQuality = this.renderOptions.interactiveQuality;
			}
			this.pvwRender();
		} else if (statusMessage.indexOf("infoShow:") == 0) {
			var infoShow = statusMessage.substring(statusMessage.indexOf(":") + 1);
			// Remote information if it might be blocking the view.
			this.showInfoDiv(infoShow);
		} else if (statusMessage.indexOf("infoHide") == 0) {
			this.hideInfoDiv();
		} else if (statusMessage.indexOf("showTime") !== -1) {
			this.packetTimeCheck = Date.now();
			console.log("erase me, time log:" + this.packetTimeCheck);
		}
	},

	/*
		Non-master display clients activate this on master display on startup.

		ONLY master display cares about amount of other displays.
		This unfortunately means things will break if master switches.
		This potentially causes problems with multiple active ParaSAGE apps.
	*/
	csdDisplayCheckin: function(message) {
		if (!isMaster) {
			return;
		}
		if (message.indexOf("clientDisplayInitialCheckIn") !== -1) {
			this.otherDisplayClients++;
			// this.updateTitle("ERASE ME, otherDisplayClients:" + this.otherDisplayClients);
		} else if (message.indexOf("otherDisplaysGotFrame") !== -1) {
			this.otherDisplaysGotFrame++;
		}
	},

	showInfoDiv: function(message) {
		this.infoDiv.textContent      = message;
		this.infoDiv.style.width      = "100%";
		this.infoDiv.style.height     = "100%";
		this.infoDiv.style.background = "white";
	},

	hideInfoDiv: function() {
		this.infoDiv.textContent  = "";
		this.infoDiv.style.width  = "0%";
		this.infoDiv.style.height = "0%";
	},

	pvwVcrPlay: function() {
		if (!isMaster) {
			return;
		}
		if (this.renderOptions.vcrFrameData.length < 2) {
			return;
		} // Don't allow playing if only 1 frame.
		this.renderOptions.vcrPlayStatus = true;
		this.getFullContextMenuAndUpdate(); // swap Play / Pause
		this.pvwRunAnimationLoop();
	},

	pvwVcrStop: function() {
		if (!isMaster) {
			return;
		}
		var _this = this;
		_this.renderOptions.vcrPlayStatus = false;
		_this.getFullContextMenuAndUpdate(); // swap Play / Pause
		_this.renderOptions.currentQuality = _this.renderOptions.stillQuality;

		if (_this.renderOptions.vcrCurrentFrame != -1
			&& _this.renderOptions.vcrFrameData.length > _this.renderOptions.vcrCurrentFrame
			&& _this.renderOptions.vcrFrameData[_this.renderOptions.vcrCurrentFrame].imgHighRes != null) {
			_this.imageFromPvw.src = _this.renderOptions.vcrFrameData[_this.renderOptions.vcrCurrentFrame].imgHighRes;
		} else {
			setTimeout(function() {
				_this.pvwRender();
				// Tell the other displays to render
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwStatusUpdate",
					value:       "pvwRender.stillQuality",
					description: "Using this as a way to notify non-master displays of pvw information only master will see"
				});
			}, 1);
		}
	},

	/*
	Overview (master only)
		if the animation view has changed, then all cached images are invalid.
			reset all caching variables.
			dump cache
			tell other displays to do this too.
		if playing - reminder this is a recusive function
			increase the current frame
			if have low res image
				if have all high res images
					show high res
				else
					tell all displays to show this low res image
					show low res image
					determine if all low res images were collected
					if have all low res and all other displays have reported frame collection
						reset control values
						begin high res frame grab
				recur function
			else
				if all other displays are reported as frame collected
					reset control values
					begin grab of next frame in animation
				else
					reduce frame (since frame is always increased first)
					recur function
	*/

	pvwRunAnimationLoop: function() {
		var _this = this;
		var i;
		// If the view was changed, then the images are old and need to be recollected.
		if (_this.renderOptions.vcrViewChanged) {
			for (i = 0; i < _this.renderOptions.vcrFrameData.length; i++) {
				_this.renderOptions.vcrFrameData[i].imgLowRes  = null;
				_this.renderOptions.vcrFrameData[i].imgHighRes = null;
			}
			// _this.renderOptions.vcrPlayStatus           = false; // How to prevent playing if currently as opposed to prevent 1st play.
			_this.renderOptions.vcrViewChanged          = false;
			_this.renderOptions.vcrHasAllLowResImages   = false;
			_this.renderOptions.vcrHasAllHighResImages  = false;
			_this.renderOptions.vcrGettingHighResImages = false;
			_this.renderOptions.vcrStartingHighResFetch = -1;
			_this.renderOptions.vcrIndexOfHighResFetch  = -1;
			_this.otherDisplaysGotFrame = _this.otherDisplayClients;

			// Tell the other displays to render
			wsio.emit("csdMessage", {
				type: "setValue",
				nameOfValue: "pvwStatusUpdate",
				value:       "resetVcrImageCache:" + _this.renderOptions.vcrFrameData.length,
				description: "Using this as a way to notify non-master displays of pvw information only master will see"
			});

		}
		// If playing, because this is a recursive function, user might have caused a control change.
		if (_this.renderOptions.vcrPlayStatus) {
			// move to the next frame. Because vcr controls always cause frame movement.
			_this.renderOptions.vcrCurrentFrame++;
			if (_this.renderOptions.vcrCurrentFrame >= _this.renderOptions.vcrFrameData.length) {
				_this.renderOptions.vcrCurrentFrame = 0;
			}
			var cFrame = _this.renderOptions.vcrCurrentFrame;
			var fData  = _this.renderOptions.vcrFrameData;
			// if have low res
			if (fData[cFrame].imgLowRes != null) {
				if (_this.renderOptions.vcrHasAllHighResImages) {
					// if have high res image, show it
					wsio.emit("csdMessage", {
						type:        "setValue",
						nameOfValue: "pvwStatusUpdate",
						value:       "showAnimationFrame:imgHighRes::" + cFrame,
						description: "Using this as a way to notify non-master displays of pvw information only master will see"
					});
					_this.imageFromPvw.src = fData[cFrame].imgHighRes;
				} else {
					// does not have high res image so show low res
					wsio.emit("csdMessage", {
						type:        "setValue",
						nameOfValue: "pvwStatusUpdate",
						value:       "showAnimationFrame:imgLowRes::" + cFrame,
						description: "Using this as a way to notify non-master displays of pvw information only master will see"
					});
					_this.imageFromPvw.src = fData[cFrame].imgLowRes;

					// if this var is false, see if because 1st time activation.
					if (!_this.renderOptions.vcrHasAllLowResImages) {
						var didGetLowImage = true;
						for (i = 0; i < fData.length; i++) {
							if (fData[i].imgLowRes == null) {
								console.log("Full cycled, but missing lower res index:" + i);
								didGetLowImage = false;
								break;
							}
						}
						if (didGetLowImage) {
							_this.renderOptions.vcrHasAllLowResImages = true;
						}
					}
					if (_this.renderOptions.vcrHasAllLowResImages) {
						if (_this.otherDisplaysGotFrame >= _this.otherDisplayClients
								&& !_this.renderOptions.vcrGettingHighResImages
								&& !_this.onlyGetLowResAnimationFrames // OK to high res grab?
								) { // wait until all displays get frame
							_this.otherDisplaysGotFrame = 0;
							_this.renderOptions.vcrGettingHighResImages = true;
							_this.renderOptions.vcrStartingHighResFetch = cFrame;
							_this.renderOptions.vcrIndexOfHighResFetch  = cFrame; // start from the current frame

							_this.pvwConfig.session.call("pv.vcr.action", ["next"])
							.then(function(timeValue) {
								_this.renderOptions.currentQuality = _this.renderOptions.stillQuality;
								_this.vcrRenderCall();
							});
						}
					} else {
						console.log("Error? Has low frame, but missing some");
						// let the animation cycle through should recollect on next pass?
					}
				} // else doesn't have all high rest

				// recur this function
				setTimeout(function() {
					_this.pvwRunAnimationLoop();
				}, 50);

			} else {
				if (_this.otherDisplaysGotFrame >= _this.otherDisplayClients) { // wait until all displays get frame
					_this.otherDisplaysGotFrame = 0;
					// first PVW needs to move to the next frame.
					_this.pvwConfig.session.call("pv.vcr.action", ["next"])
					.then(function(timeValue) {
						wsio.emit("csdMessage", {
							type:        "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "renderVcr:imgLowRes::" + cFrame,
							description: ("Using this as a way to notify" +
								" non-master displays of pvw information only master will see")
						});
						_this.renderOptions.currentQuality = _this.renderOptions.interactiveQuality;
						_this.vcrRenderCall();
						// vcr render call will recur this function;
					});
				} else {
					_this.renderOptions.vcrCurrentFrame--;
					if (_this.renderOptions.vcrCurrentFrame < 0) {
						_this.renderOptions.vcrCurrentFrame = _this.renderOptions.vcrFrameData.length - 1;
					}
					setTimeout(function() {
						_this.pvwRunAnimationLoop();
					}, 500);
				}
			} // else do not have low res image
		} // if vcrPlayStatus
	}, // pvwRunAnimationLoop


	/*
		This is how frames are grabbed for animation playing.
		Functionally differnet from pvwRender.

		make render config
		if on high res fetch
			tell other displays which frame this is
		send render request to PVW
		then()
			if an image is returned
				if it was high res
					if index != -1, -1 indicates view changed so cache is bad
						cache the image
						binary convert if necessary
						TODO master display distribution removed due to potential bug
						increase render index
						if not done grabbing high res images
							start next frame grab
							TODO: just caught this, 7/28, need to wait for other displays.
							recur this function
						else
							set high res cache status
				else
					it must be low res so cache appropriately
					display image
					recur pvwRunAnimationLoop
	*/
	vcrRenderCall: function() {
		var _this = this;
		var renderCfg = {
			size: [parseInt(_this.sage2_width), parseInt(_this.sage2_height)],
			view: Number(_this.renderOptions.view),
			mtime: 0,
			quality: _this.renderOptions.currentQuality, // Might replace later with _this.renderOptions.vcrPlayStatus ? _this.renderOptions.interactiveQuality : _this.renderOptions.stillQuality
			localTime: new Date().getTime()
		};
		// If doing a resolution reduction on interaction instead of quality alter the renderCfg values.
		if (_this.reduceRenderResolutionOnInteraction
			&& (_this.renderOptions.currentQuality == _this.renderOptions.interactiveQuality)) {
			renderCfg.size = [
				parseInt(_this.sage2_width / _this.reduceResolutionAmount),
				parseInt(_this.sage2_height / _this.reduceResolutionAmount)
			];
			renderCfg.quality = _this.renderOptions.stillQuality;
		}

		if (_this.renderOptions.vcrIndexOfHighResFetch != -1) {
			wsio.emit("csdMessage", {
				type:        "setValue",
				nameOfValue: "pvwStatusUpdate",
				value:       "renderVcr:imgHighRes::" + _this.renderOptions.vcrIndexOfHighResFetch,
				description: "Using this as a way to notify non-master displays of pvw information only master will see"
			});
		}

		// render call
		_this.pvwConfig.session.call("viewport.image.render", [renderCfg])
		.then(function(response) {
			_this.renderOptions.view = Number(response.global_id);
			if (response.hasOwnProperty("image") & response.image !== null) {
				if (_this.renderOptions.currentQuality == _this.renderOptions.stillQuality) {
					if (!_this.renderOptions.vcrGettingHighResImages) {
						console.log("Error got a high res image _this.renderOptions.vcrGettingHighResImages"
							+ _this.renderOptions.vcrGettingHighResImages);
					}
					// if this is -1 then a view change occured and this is a lagged update. don't show it.
					if (_this.renderOptions.vcrIndexOfHighResFetch != -1) {
						_this.imageFromPvw.src = "data:image/" + response.format + "," + response.image;
						var iohrFrame = _this.renderOptions.vcrIndexOfHighResFetch;
						var vfd = _this.renderOptions.vcrFrameData;
						vfd[iohrFrame].imgHighRes = _this.imageFromPvw.src;

						/* Removed while not fully implemented.
						var dataToSend = "";
						if (_this.orrfmdAttemptBinaryConversion) {
							dataToSend = atob(response.image);
							var tdiff = Date.now();
						} else {
							// full image string ready to set
							dataToSend = _this.imageFromPvw.src;
						} // */

						_this.renderOptions.vcrIndexOfHighResFetch++;
						if (_this.renderOptions.vcrIndexOfHighResFetch >= _this.renderOptions.vcrFrameData.length) {
							_this.renderOptions.vcrIndexOfHighResFetch = 0;
						}
						if (_this.renderOptions.vcrIndexOfHighResFetch != _this.renderOptions.vcrStartingHighResFetch) {
							_this.pvwConfig.session.call("pv.vcr.action", ["next"])
							.then(function(timeValue) {
								// only render request if fetching view hasn't reset.
								if (_this.renderOptions.vcrIndexOfHighResFetch != -1) {
									_this.renderOptions.currentQuality = _this.renderOptions.stillQuality;
									_this.vcrRenderCall();
								}
							});
						} else {
							_this.renderOptions.vcrHasAllHighResImages = true;
						}
					}
				} else {
					_this.imageFromPvw.src = "data:image/" + response.format + "," + response.image;
					_this.renderOptions.vcrFrameData[_this.renderOptions.vcrCurrentFrame].imgLowRes = _this.imageFromPvw.src;

					/* Removed while not fully implemented
					var dataToSend = "";
					if (_this.orrfmdAttemptBinaryConversion) {
						dataToSend = atob(response.image);
						var tdiff = Date.now();
					} else {
						// full image string ready to set
						dataToSend = _this.imageFromPvw.src;
					} // */
					_this.pvwRunAnimationLoop();
				}
			} // if valid image
		}); // then response
	}, // vcrRenderCall

	/*
		This was started as a means to implement high res render waiting.
		It isn't actually called.
		TODO correctly call this in vcrRenderCall [work in progress for high res animation vcr timing]
		Will be needed to handle network saturation issues.
	*/
	// vcrMasterDisplayWaitForEveryoneToGetFrames: function() {
	// 	var _this = this;
	// 	// if this is -1 then a view change occured and this is a lagged update. don't show it.
	// 	if (_this.renderOptions.vcrIndexOfHighResFetch != -1 && _this.otherDisplaysGotFrame >= _this.otherDisplayClients) {
	// 		_this.otherDisplaysGotFrame = 0;
	// 		_this.renderOptions.vcrIndexOfHighResFetch++;
	// 		if (_this.renderOptions.vcrIndexOfHighResFetch >= _this.renderOptions.vcrFrameData.length) {
	// 			_this.renderOptions.vcrIndexOfHighResFetch = 0;
	// 		}
	// 		if (_this.renderOptions.vcrIndexOfHighResFetch != _this.renderOptions.vcrStartingHighResFetch) {
	// 			_this.pvwConfig.session.call("pv.vcr.action", ["next"])
	// 			.then(function(timeValue) {
	// 				// only render request if fetching view hasn't reset.
	// 				if (_this.renderOptions.vcrIndexOfHighResFetch != -1) {
	// 					_this.renderOptions.currentQuality = _this.renderOptions.stillQuality;
	// 					_this.vcrRenderCall();
	// 				}
	// 			});
	// 		} else {
	// 			_this.renderOptions.vcrHasAllHighResImages = true;
	// 		}
	// 	} else if (_this.renderOptions.vcrIndexOfHighResFetch != -1) {
	// 		setTimeout(function() {
	// 			_this.vcrMasterDisplayWaitForEveryoneToGetFrames();
	// 		}, 500);
	// 	}
	// },

	// Setup javascript event triggers.
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
	},

	/*
		function to handle interaction

		set view change status to invalidate animation cache
		to preserve the view based on animation frame
			set to first frame, then advance a number of times equal to animation frame
		if an event that end interaction
			set render quality to high
		else if a mouse down
			set to interactive quality
			render()    * IMPORTANT *
		if not master
			stop, above was important to know render quality.
		detect button status
		create PVW compliant event object
		normalize x and y coordinates to 1.
			this removes the need to know exact coordinate changes or if frames were missed
		send to PVW
		then()
			render
			notify other displays to render
			if the event was mouse up
				render again slightly later
				tell other displays to also render.©
				This is because PVW seems to have a delayed time when switching resolution quality.
	*/
	imageEventHandler: function(evt) {
		var _this = this;
		// due to animation caching, the view might not be on the correct frame.
		if (isMaster
				&& !this.renderOptions.vcrViewChanged
				&& (this.renderOptions.vcrStartingHighResFetch != -1)
				// && (this.renderOptions.vcrStartingHighResFetch != this.renderOptions.vcrIndexOfHighResFetch)
				) {
			// because of weird timing of low vs high res, just reset to 0, send that many offset commands.
			this.renderOptions.vcrViewChanged = true;
			_this.pvwConfig.session.call("pv.vcr.action", ["first"])
			.then(function(timeValue) {
				// send next frame requests equivalent to number of offset.
				for (var i = 0; i < _this.renderOptions.vcrCurrentFrame; i++) {
					_this.pvwConfig.session.call("pv.vcr.action", ["next"])
					.then(function(timeValue) {
					},
					function(err) {
						console.log("Unexpected error next frame to match animation:" + err);
					}
					);
				}
			}, function(err) {
				console.log("Unexpected error on interaction view matching for animation:" + err);
			});

		}

		// Update quality based on the type of the event
		if (evt.type === "mouseup" || evt.type === "dblclick" || evt.type === "wheel") {
			this.renderOptions.currentQuality = this.renderOptions.stillQuality;
		} else if (evt.type === "mousedown") {
			this.renderOptions.currentQuality = this.renderOptions.interactiveQuality;
			// render request first. This fixes the forward jump from what seems to be resolution shift.
			this.pvwRender();
		}

		// This must be done after the mouse checks so ALL displays know what quality to use.
		if (!isMaster) {
			return; // Don't flood pvw server with commands from displays other than master.
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

		if (evt.type != "wheel") { // The x and y should be given relative to app position when using SAGE2MEP.
			vtkWeb_event.x = evt.x / parseInt(this.sage2_width);
			vtkWeb_event.y = 1.0 - (evt.y / parseInt(this.sage2_height));
			if (vtkWeb_event.buttonRight) {
				this.button_state.rmbScrollTracker = vtkWeb_event.y;
			}
		}

		// PVW doesn't respond to wheel values.
		// if (evt.type === "wheel") {
		// 	// vtkWeb_event.action = "mousemove";
		// 	// vtkWeb_event.buttonLeft = false;
		// 	// vtkWeb_event.buttonRight = true;
		// 	// vtkWeb_event.buttonMiddle = false;
		// 	// vtkWeb_event.x = 0;
		// 	// vtkWeb_event.y = evt.deltaY / 100 + this.button_state.rmbScrollTracker;
		// 	// this.button_state.rmbScrollTracker = vtkWeb_event.y;
		// } else { // The x and y should be given relative to app position when using SAGE2MEP.
		// 	vtkWeb_event.x = evt.x / parseInt(this.sage2_width);
		// 	vtkWeb_event.y = 1.0 - (evt.y / parseInt(this.sage2_height));
		// 	if (vtkWeb_event.buttonRight) {
		// 		this.button_state.rmbScrollTracker = vtkWeb_event.y;
		// 	}
		// }


		// prevent pvw mouse event flooding
		if (evt.type !== "wheel" && this.eatMouseEvent(vtkWeb_event)) {
			return;
		}
		// console.log("erase me, does this flood with mousemove?");
		this.button_state.action_pending = true;

		// If not master, ask for a render view after a bit
		_this.pvwConfig.session.call("viewport.mouse.interaction", [vtkWeb_event])
		.then(function (res) {
			if (res) {
				_this.button_state.action_pending = false;
				// Tell the other displays to render
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwStatusUpdate",
					value:       "pvwRender",
					description: "Using this as a way to notify non-master displays of pvw information only master will see"
				});
				_this.pvwRender();
				_this.renderOptions.vcrViewChanged = true;

				// Need a delayed render on switch from low res to high res. Unknown exactly why.
				if (evt.type == "mouseup") {
					setTimeout(function() {
						// Tell the other displays to render
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "pvwRender",
							description: "Using this as a way to notify non-master"
								+ " displays of pvw information only master will see"
						});
						_this.pvwRender();
					}, 100);
				}

			}
		}, function(error) {
			console.log("Call to viewport.mouse.interaction failed");
			console.log(error);
		});
	},

	// Basically this prevents pvw event flooding
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

	/*
		This queries for active datasets.
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
		http://paraviewweb.kitware.com/#!/api/protocols.ParaViewWebProxyManager

		There are cases when double loads are possible.
		This function makes visibility toggles possible.
	*/
	pvwRequestProxyManagerList: function (response) {
		var _this = this;
		_this.pvwConfig.session.call("pv.proxy.manager.list", [])
		.then(function(data) {
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
	Context menu callbacks defined below.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;
		var i;

		entry = {};
		entry.description = "Reset camera";
		entry.callback    = "resetCamera";
		entry.parameters  = {};
		entries.push(entry);

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

		for (i = 0; i < this.activePipeLines.length; i++) {
			entry = {};
			entry.description = "Toggle visibility of " + this.activePipeLines[i].filename;
			entry.callback    = "pvwToggleVisibilityOfData";
			entry.parameters  = {
				index: i
			};
			entries.push(entry);
		}

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

	/*
		Zooms to ensure active datasets are visible.
		ONLY zooms, meaning the camera moves forward or back. No rotation.
	*/
	resetCamera: function(response) {
		var _this = this;
		if (isMaster) {
			_this.pvwConfig.session.call("viewport.camera.reset", [Number(_this.renderOptions.view)])
			.then(function(response) {
				_this.pvwRender();
				// Tell the other displays to render
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwStatusUpdate",
					value:       "pvwRender",
					description: "Using this as a way to notify non-master displays of pvw information only master will see"
				});
			});
		}
	},

	// use .clientInput for what they typed
	setWidth: function(response) {
		this.sendResize(parseInt(response.clientInput), this.sage2_height);
	},

	// use .clientInput for what they typed
	setHeight: function(response) {
		this.sendResize(this.sage2_width, parseInt(response.clientInput));
	},

	setSessionURL: function(response) {
		this.pvwConfig.sessionURL = response.clientInput;
	},

	toggleRenderModeMasterOrAll: function(response) {
		this.onlyRenderRequestFromMasterDisplay = response.toggle;
		this.getFullContextMenuAndUpdate();

		if (this.onlyRenderRequestFromMasterDisplay && (this.orrfmdDataPassInitialized === false)) {
			this.orrfmdDataPassInitialized = true;
			if (isMaster) {
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwRenderViewImage",
					value:       "On app start will be blank so the value exists for the subscription request",
					description: "Will hold the latest render image from ParaView"
				});
			} else {
				var _this = this;
				setTimeout(function() {
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

		// Show the loading message
		_this.showInfoDiv("\n\nLoading file " + responseObject.filename + "...");

		// If display is not master refresh screen after about when the view should have updated.
		if (isMaster) {
			_this.pvwConfig.session.call("pv.proxy.manager.create.reader", fullpathFileList)
			.then(function(response) {
				_this.pvwVcrStop();
				// After reading in a date set, ask the server what the id is.
				// NOTE: currently each connection will makes a request for data, meaning x Displays amount of rendered datasets.
				_this.pvwRequestProxyManagerList();
				// Tell the other displays to render
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwStatusUpdate",
					value:       "pvwRender",
					description: "Using this as a way to notify non-master displays of pvw information only master will see"
				});

				// Need to know how many frames in dataset. setup variables for a new dataset.
				_this.renderOptions.vcrFrameData = [];
				_this.renderOptions.vcrFrameData.push({
					time: 0,
					imgLowRes: null,
					imgHighRes: null
				});
				_this.renderOptions.vcrCurrentFrame = 0;
				_this.renderOptions.vcrViewChanged = true;

				// reset to beginning, then activate recursive function to get the rest of the frames.
				setTimeout(function() {
					_this.pvwConfig.session.call("pv.vcr.action", ["first"])
					.then(function(timeValue) {
						setTimeout(function() {
							_this.pvwGetFrameAmount();
						}, 10);
					}, function(err) {
						// console.log("Not really an error, loaded dataset doesn't have animation frames:" + err);
						// Tell the other displays to hide info div
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "infoHide",
							description: "Using this as a way to notify non-master"
								+ " displays of pvw information only master will see"
						});
						_this.hideInfoDiv();
						// Tell the other displays to render
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "pvwRender",
							description: "Using this as a way to notify non-master"
								+ " displays of pvw information only master will see"
						});
						_this.pvwRender(); // update the view
					});
				}, 1000); // get the frames after render requests are made (supposedly)



			}, function(err) {
				console.log("Unable to create reader:" + err);
				// Currently just trying to see if error case activates.
				_this.hideInfoDiv();
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwStatusUpdate",
					value:       "infoHide",
					description: "Using this as a way to notify non-master displays of pvw information only master will see"
				});
			});
		}
	},

	/*
		First call to this function will be after a data load.
		And it will be after getting a response to the first frame, timeValue 0.

		NOTE this actually causes a cycle through all frames.
		If interaction occurs while the frames are being cycled, then the interaction will see the cycle happening.

		PVW doesn't have a means to ask which frame the data is on.
		This will attempt to go through the animation and add an entry per "next" response.
	*/
	pvwGetFrameAmount: function() {
		var _this = this;
		_this.pvwConfig.session.call("pv.vcr.action", ["next"])
		.then(function(timeValue) { // where is PVW getting this from? What is it as well. Doesn't seem to be data time.
			if (timeValue > 0) {
				_this.renderOptions.vcrFrameData.push({
					time: timeValue,
					imgLowRes: null,
					imgHighRes: null
				});
				_this.pvwGetFrameAmount();
			} else {
				console.log("erase me, frames:" + _this.renderOptions.vcrFrameData.length);
				console.log("erase me, time:" + timeValue);

				_this.hideInfoDiv();
				// Tell the other displays to hide info div
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwStatusUpdate",
					value:       "infoHide",
					description: "Using this as a way to notify non-master displays of pvw information only master will see"
				});

				// Tell the other displays to render
				wsio.emit("csdMessage", {
					type: "setValue",
					nameOfValue: "pvwStatusUpdate",
					value:       "pvwRender",
					description: "Using this as a way to notify non-master displays of pvw information only master will see"
				});
				_this.pvwRender(); // update the view
			}
		}, function(err) {
			console.log("Error getting frames:" + err);
		});
	},

	pvwToggleVisibilityOfData: function (responseObject) {
		if (!isMaster) {
			return; // Don't double call the visibility toggle.
		} else {
			var _this = this;
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
				setTimeout(function() {
					_this.pvwRender(); // update the view
					// Tell the other displays to render
					wsio.emit("csdMessage", {
						type: "setValue",
						nameOfValue: "pvwStatusUpdate",
						value:       "pvwRender",
						description: "Using this as a way to notify non-master displays of pvw information only master will see"
					});
				}, 400);

				_this.renderOptions.vcrViewChanged = true;
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


















