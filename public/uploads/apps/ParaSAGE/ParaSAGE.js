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

		this.setupVariables();
		this.setupImageEventListerers();
		this.updateTitle("ParaView [Not connected]");
		this.openWebSocketToPvwServer();
	},

	setupVariables: function() {
		// Experiemental PV render load reduction.
		this.onlyRenderRequestFromMasterDisplay  = false;
		this.orrfmdAttemptBinaryConversion       = true;
		this.orrfmdDataPassInitialized           = false; // needs to alway start false.
		this.reduceRenderResolutionOnInteraction = false;
		this.reduceResolutionAmount              = 10; // Divided dimensions by this number
		this.preventPacketSendingToPvw           = false;
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
		// Data storage for pvw
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
			left:    false,
			right:   false,
			middle: false,
			rmbScrollTracker: 0
		};
		this.refreshCounter = 0;
		this.cameraPositionOnMouseDown = {};
		this.toggleRenderModeMasterOrAll({
			toggle:this.onlyRenderRequestFromMasterDisplay
		});

		// Always setup the status update listeners.
		if (isMaster) {
			wsio.emit("csdMessage", {
				type: "setValue",
				nameOfValue: "pvwStatusUpdate",
				value:       "Trying to connect",
				description: "Using this as a way to notify non-master displays of pvw information only master will see"
			});
		} else {
			var _this = this;
			setTimeout(function() {
				wsio.emit("csdMessage", {
					type: "subscribeToValue",
					nameOfValue: "pvwStatusUpdate",
					app:         _this.id,
					func:        "csdPvwStatusUpdate"
				});
			}, 1000);
		}
		// setup listener for the render view image
		if (isMaster) {
			wsio.emit("csdMessage", {
				type:        "setValue",
				nameOfValue: "pvwRenderViewImage",
				value:       "On app start will be blank so the value exists for the subscription request",
				description: "Will hold the latest render image from ParaView"
			});
		} else {
			var _this = this;
			setTimeout(function() {
				wsio.emit("csdMessage", {
					type:        "subscribeToValue",
					nameOfValue: "pvwRenderViewImage",
					app:         _this.id,
					func:        "csdRenderViewUpdate"
				});
			}, 1000);
		}
	}, // setupVariables

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

	afterConnection: function() {
		var _this = this;
		_this.pvwRender();
		_this.getAvailableDataSetsOnServer();



        // var cam =  m_viewer.renderWindow().activeRenderer().camera(),
        //     fp_ = cam.focalPoint(),
        //     up_ = cam.viewUpDirection(),
        //     pos_ = cam.position(),
        //     fp = [fp_[0], fp_[1], fp_[2]],
        //     up = [up_[0], up_[1], up_[2]],
        //     pos = [pos_[0], pos_[1], pos_[2]];
        // m_session.call("viewport.camera.update", [Number(m_options.view), fp, up, pos]);

	    // @exportRpc("viewport.camera.get")
	    // def getCamera(self, view_id):
	    //     view = self.getView(view_id)
	    //     return {
	    //         focal: view.CameraFocalPoint,
	    //         up: view.CameraViewUp,
	    //         position: view.CameraPosition
	    //     }

		// _this.pvwConfig.session.call("viewport.camera.get", [Number(_this.renderOptions.view)])
		// .then(function(reply) {
		// 	console.log("erase me, got response to viewport.camera.get");
		// 	console.dir(reply);
		// });

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

				// if only render request fro master display binary conversion
				if (_this.onlyRenderRequestFromMasterDisplay) {
					if (_this.orrfmdAttemptBinaryConversion) {
						var satb = atob(response.image);
						// use the following to debug size difference
						// _this.refreshCounter++;
						// if (_this.refreshCounter > 100) {
						// 	_this.refreshCounter = 0;
						// 	console.log("erase me, refresh counter 100");
						// 	console.log("erase me, src length:" + _this.imageFromPvw.src.length);
						// 	console.log("erase me, src format:" + response.format);
						// 	console.log("erase me, satb length:" + satb.length + ". Difference=" + (satb.length - _this.imageFromPvw.src.length));
						// }
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwRenderViewImage",
							value: satb,
							description: "Image from ParaView in binary."
						});
					}
					else {
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwRenderViewImage",
							value: _this.imageFromPvw.src,
							description: "Image from ParaView in binary."
						});
					}
				}

				_this.logInformation.imageRoundTrip = Number(new Date().getTime() - response.localTime) - response.workTime;
				_this.logInformation.imageServerProcessing = Number(response.workTime);
			}
			// cant tell if this is causing problems.
			// If server still doing renders need to grab next frame
			// if (response.stale === true) {
			// 	setTimeout(function() {
			// 		_this.pvwRender();
			// 	}, 0);
			// }
		});
	},

	/*
		This should only be activated on non-master displays.
		Just in case a catch was put in.
		Note: this exhibits conditional errors when screens are refreshed instead of the server being reset.
	*/
	csdRenderViewUpdate: function(mostRecentRenderImage) {
		if (isMaster) {
			// Currently updates are echo'd back to sender, which eats extra time.
			// console.log("Potential error: render update sent to master display.");
			return;
		}
		this.imageFromPvw.width  = parseInt(this.sage2_width);
		this.imageFromPvw.height = parseInt(this.sage2_height);
		if (this.orrfmdAttemptBinaryConversion) {
			this.imageFromPvw.src    = "data:image/jpeg;base64," + btoa(mostRecentRenderImage);
		} else {
			this.imageFromPvw.src    = mostRecentRenderImage;
		}

		if (this.packetTimeCheck) {
			console.log("erase me, Time Diff:" + (Date.now() - this.packetTimeCheck));
		}
		// Remote information if it might be blocking the view.
		this.hideInfoDiv();
	},

	/*
		This should only be activated on non-master displays.
		Just in case a catch was put in.
		Note: this exhibits conditional errors when screens are refreshed instead of the server being reset.
	*/
	csdPvwStatusUpdate: function(statusMessage) {
		if (isMaster) {
			// Currently updates are echo'd back to sender, which eats extra time.
			// console.log("Potential error: render update sent to master display.");
			return;
		}

		if (statusMessage.indexOf("$!") == 0) {
			var res = "";
			var format = "";
			var frame = -1;
			res    = statusMessage.substring(statusMessage.indexOf(":") + 1, statusMessage.indexOf("::"));
			format = statusMessage.substring(statusMessage.indexOf("::") + 2, statusMessage.indexOf(":::"));
			frame  = parseInt(statusMessage.substring(statusMessage.indexOf(":::") + 3, statusMessage.indexOf("::::")));

			if (res == "low") {
				res = "imgLowRes";
			} else {
				res = "imgHighRes";
			}

			try{
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
				console.log(statusMessage.substring(0,20));
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
			var res = "";
			var frame = -1;
			res    = statusMessage.substring(statusMessage.indexOf(":") + 1, statusMessage.indexOf("::"));
			frame  = parseInt(statusMessage.substring(statusMessage.indexOf("::") + 2));
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
		} else if (statusMessage.indexOf("pvwRender") !== -1) {
			if (statusMessage.indexOf("stillQuality") !== -1) {
				this.renderOptions.currentQuality = this.renderOptions.stillQuality;
			}
			else if (statusMessage.indexOf("interactiveQuality") !== -1) {
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

	showInfoDiv: function(message) {
		this.infoDiv.textContent = message;
		this.infoDiv.style.width = "100%";
		this.infoDiv.style.height = "100%";
		this.infoDiv.style.background = "white";
	},

	hideInfoDiv: function() {
		this.infoDiv.textContent = "";
		this.infoDiv.style.width = "0%";
		this.infoDiv.style.height = "0%";
	},

	pvwVcrPlay: function() {
		if (!isMaster) { return; }
		if (this.renderOptions.vcrFrameData.length < 2) { return; }
		this.renderOptions.vcrPlayStatus = true;
		this.getFullContextMenuAndUpdate(); // Check inside to swap Play / Pause
		this.pvwRunAnimationLoop();
	},

	pvwVcrStop: function() {
		if (!isMaster) { return; }
		var _this = this;
		_this.renderOptions.vcrPlayStatus = false;
		_this.getFullContextMenuAndUpdate(); // Check inside to swap Play / Pause
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
	pvwRunAnimationLoopOriginal: function() {
		var _this = this;

		// If the view was changed, then the images are old and need to be recollected.
		if (_this.renderOptions.vcrViewChanged) {
			for (var i = 0; i < _this.renderOptions.vcrFrameData.length; i++) {
				_this.renderOptions.vcrFrameData[i].imgLowRes = null;
				_this.renderOptions.vcrFrameData[i].imgHighRes = null;
			}
			_this.renderOptions.vcrViewChanged = false;
		}

		if (_this.renderOptions.vcrPlayStatus) {
			// move to the next frame. Because interaction is on the last viewed frame.
			_this.renderOptions.vcrCurrentFrame++;
			if (_this.renderOptions.vcrCurrentFrame >= _this.renderOptions.vcrFrameData.length) {
				_this.renderOptions.vcrCurrentFrame = 0;
			}
			var vcrCurrentFrame = _this.renderOptions.vcrCurrentFrame;
			var vcrFrameData = _this.renderOptions.vcrFrameData;
			var vcrFrameBeingFetched = _this.renderOptions.vcrFrameBeingFetched;
			// if have imgLowRes
			if (vcrFrameData[vcrCurrentFrame].imgLowRes != null) {
				// if have imgHighRes
				if (vcrFrameData[vcrCurrentFrame].imgHighRes != null) {
					_this.imageFromPvw.src = vcrFrameData[vcrCurrentFrame].imgHighRes;
				} else { // else do not have imgHighRes, fetch it.
					_this.imageFromPvw.src = vcrFrameData[vcrCurrentFrame].imgLowRes;
					if (vcrFrameBeingFetched == -1) {
						_this.renderOptions.vcrFrameBeingFetched = _this.renderOptions.vcrCurrentFrame;
						// fetch this frame in high res
						_this.pvwConfig.session.call("pv.vcr.action", ["next"])
						.then(function(timeValue) {
							// If the time value matches, then render it
							if (timeValue == _this.renderOptions.vcrFrameData[_this.renderOptions.vcrCurrentFrame].time) {
								_this.renderOptions.currentQuality = _this.renderOptions.stillQuality;
								_this.vcrRenderCallOriginal();
								// Tell the other displays to render
								// wsio.emit("csdMessage", {
								// 	type: "setValue",
								// 	nameOfValue: "pvwStatusUpdate",
								// 	value:       "pvwRender.stillQuality",
								// 	description: "Using this as a way to notify non-master displays of pvw information only master will see"
								// });
							} else {
								console.log("erase me, or not time mismatch");
								_this.renderOptions.vcrFrameBeingFetched = -1;
							}
						});
					}
				}
				// recur this function
				setTimeout(function() {
					_this.pvwRunAnimationLoopOriginal();
				}, 50);
			} else if (vcrFrameBeingFetched == -1) { // Else do not have low res image AND not fetching, so can fetch it.
				_this.renderOptions.vcrFrameBeingFetched = vcrCurrentFrame;
				// first PVW needs to move to the next frame.
				_this.pvwConfig.session.call("pv.vcr.action", ["next"])
				.then(function(timeValue) {
					_this.renderOptions.currentQuality = _this.renderOptions.interactiveQuality;
					_this.vcrRenderCallOriginal();
					// // Tell the other displays to render
					// wsio.emit("csdMessage", {
					// 	type: "setValue",
					// 	nameOfValue: "pvwStatusUpdate",
					// 	value:       "pvwRender.interactiveQuality",
					// 	description: "Using this as a way to notify non-master displays of pvw information only master will see"
					// });
					// recur this function
					setTimeout(function() {
						_this.pvwRunAnimationLoopOriginal();
					}, 50); // ms where 50 is 1/20 second
				});
			} else { // do not have lowResImage AND currently fetching, so don't do anything.
				_this.renderOptions.vcrCurrentFrame--; // don't go faster than fetch.
				// recur this function
				setTimeout(function() {
					_this.pvwRunAnimationLoopOriginal();
				}, 50);
			}


			// _this.pvwConfig.session.call("pv.vcr.action", ["next"])
			// .then(function(timeValue) {
			// 	_this.renderOptions.currentQuality = _this.renderOptions.interactiveQuality;
			// 	_this.pvwRender();
			// 	// Tell the other displays to render
			// 	wsio.emit("csdMessage", {
			// 		type: "setValue",
			// 		nameOfValue: "pvwStatusUpdate",
			// 		value:       "pvwRender.interactiveQuality",
			// 		description: "Using this as a way to notify non-master displays of pvw information only master will see"
			// 	});
			// 	setTimeout(function() {
			// 		_this.pvwRunAnimationLoop();
			// 	}, 50); // ms where 50 is 1/20 second
			// });
		} // if vcrPlayStatus
	}, // pvwRunAnimationLoop

	/*
	Overview (master only)
		
		view change variable triggered when sending
			interaction packet
			load
			visibility toggle on data

		if (view has changed) {
			clear out the cached images.
			this probably needs notification of other displays.
			set view has not changed.

			also reset other new variables to track, mentioned below following Need
		}

		Need
			current frame (usually based off of time?)
				current frame usually starts at +1 since.
			retrieving high res status
			high res retrieve index
			have all high res values.
			have all low res status

		if (playing) {
			if (have low res image of current frame) {

				if (have all high res values) {
					how high res image
				} else {
					show low res image

					if (have all low res) {
						if ( NOT retriving high res) {
							set retriving high res to true.
							reset to 0 frame.
							then render request
								save image
								increase high res status index.
								canceli 
						}
					}
					else do not have all low res {
						do nothing, let the cycle fill out the lower res values.
						actually console log this, unsure if this should ever happen.
					}
				}
				call this function slightly later

			}
			else do not have low res image of current frame{
				request vcr next
				then {
					show it render
					store it.
					increase current frame value

					call this function slightly later

				}
			}
		}
		else not playing so don't do anything.
	*/

	pvwRunAnimationLoop: function() {
		var _this = this;
		// If the view was changed, then the images are old and need to be recollected.
		if (_this.renderOptions.vcrViewChanged) {
			for (var i = 0; i < _this.renderOptions.vcrFrameData.length; i++) {
				_this.renderOptions.vcrFrameData[i].imgLowRes = null;
				_this.renderOptions.vcrFrameData[i].imgHighRes = null;
			}
			// _this.renderOptions.vcrPlayStatus           = false; // How to prevent playing if currently as opposed to prevent 1st play.
			_this.renderOptions.vcrViewChanged          = false;
			_this.renderOptions.vcrHasAllLowResImages   = false;
			_this.renderOptions.vcrHasAllHighResImages  = false;
			_this.renderOptions.vcrGettingHighResImages = false;
			_this.renderOptions.vcrStartingHighResFetch = -1;
			_this.renderOptions.vcrIndexOfHighResFetch  = -1;

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
			var cFrame     = _this.renderOptions.vcrCurrentFrame;
			var fData      = _this.renderOptions.vcrFrameData;
			var vcrFrameBeingFetched = _this.renderOptions.vcrFrameBeingFetched;
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
						for (var i = 0; i < fData.length; i++) {
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
						if (!_this.renderOptions.vcrGettingHighResImages) {
							console.log("erase me, starting high res image grab");
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

				_this.renderOptions.vcrCurrentFrame++;
				// recur this function
				setTimeout(function() {
					_this.pvwRunAnimationLoop();
				}, 50);

			} else { // do not have low res image
				// first PVW needs to move to the next frame.
				_this.pvwConfig.session.call("pv.vcr.action", ["next"])
				.then(function(timeValue) {
					_this.renderOptions.currentQuality = _this.renderOptions.interactiveQuality;
					_this.vcrRenderCall();
					// vcr render call will recur this function;
				});
			} // else do not have low res image
		} // if vcrPlayStatus
	}, // pvwRunAnimationLoop


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
		// render call
		_this.pvwConfig.session.call("viewport.image.render", [renderCfg])
		.then(function(response) {
			_this.renderOptions.view = Number(response.global_id);
			if (response.hasOwnProperty("image") & response.image !== null) {
				if (_this.renderOptions.currentQuality == _this.renderOptions.stillQuality) {
					if (!_this.renderOptions.vcrGettingHighResImages) {
						console.log("Error got a high res image _this.renderOptions.vcrGettingHighResImages" + _this.renderOptions.vcrGettingHighResImages);
					}
					// if this is -1 then a view change occured and this is a lagged update. don't show it.
					if (_this.renderOptions.vcrIndexOfHighResFetch != -1) {
						_this.imageFromPvw.src = "data:image/" + response.format + "," + response.image;
						_this.renderOptions.vcrFrameData[_this.renderOptions.vcrIndexOfHighResFetch].imgHighRes = _this.imageFromPvw.src;

						var dataToSend = "";
						if (_this.orrfmdAttemptBinaryConversion) {
							var dataToSend = atob(response.image);
							var tdiff = Date.now();
							console.log("erase me, Conversion time(ms):" + (Date.now() - tdiff) );
							console.log("erase me, src format:" + response.format);
							console.log("erase me, dataToSend length:" + dataToSend.length + ". Difference=" + (dataToSend.length - _this.imageFromPvw.src.length));
							console.log("erase me, dataToSend type:" + (typeof dataToSend));
							console.dir(dataToSend);
						} else {
							// full image string ready to set
							dataToSend = _this.imageFromPvw.src;
						}
						wsio.emit("csdMessage", {
							type:        "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "showTime",
							description: "Using this as a way to notify non-master displays of pvw information only master will see"
						});
						wsio.emit("csdMessage", {
							type:        "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "$!:hi::" + (_this.orrfmdAttemptBinaryConversion ? "bin" : "str")
											+ ":::" + _this.renderOptions.vcrIndexOfHighResFetch + "::::" + dataToSend,
							description: "Using this as a way to notify non-master displays of pvw information only master will see"
						});

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
					
					var dataToSend = "";
					if (_this.orrfmdAttemptBinaryConversion) {
						var dataToSend = atob(response.image);
						var tdiff = Date.now();
						// console.log("erase me, Conversion time(ms):" + (Date.now() - tdiff) );
						// console.log("erase me, src format:" + response.format);
						// console.log("erase me, dataToSend length:" + dataToSend.length + ". Difference=" + (dataToSend.length - _this.imageFromPvw.src.length));
						// console.log("erase me, dataToSend type:" + (typeof dataToSend));
						// console.dir(dataToSend);
					} else {
						// full image string ready to set
						dataToSend = _this.imageFromPvw.src;
					}
					wsio.emit("csdMessage", {
						type:        "setValue",
						nameOfValue: "pvwStatusUpdate",
						value:       "showTime",
						description: "Using this as a way to notify non-master displays of pvw information only master will see"
					});

					wsio.emit("csdMessage", {
						type:        "setValue",
						nameOfValue: "pvwStatusUpdate",
						value:       "$!:low::" + (_this.orrfmdAttemptBinaryConversion ? "bin" : "str")
										+ ":::" + _this.renderOptions.vcrCurrentFrame + "::::" + dataToSend,
						description: "Using this as a way to notify non-master displays of pvw information only master will see"
					});
					// wsio.emit("csdMessage", {
					// 	type: "setValue",
					// 	nameOfValue: "pvwRenderViewImage",
					// 	value: dataToSend,
					// 	description: "Image from ParaView in binary."
					// });
					_this.pvwRunAnimationLoop();
				}
			} // if valid image
		}); // then response
	}, // vcrRenderCall

	vcrRenderCallOriginal: function() {
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

		_this.pvwConfig.session.call("viewport.image.render", [renderCfg])
		.then(function(response) {
			_this.renderOptions.view = Number(response.global_id);
			if (response.hasOwnProperty("image") & response.image !== null) {
				// set the image
				//_this.imageFromPvw.src = "data:image/" + response.format + "," + response.image;

				// If this is for a frame fetch
				if (_this.renderOptions.vcrFrameBeingFetched > -1) {
					if (_this.renderOptions.currentQuality == _this.renderOptions.stillQuality) {
						_this.imageFromPvw.src = "data:image/" + response.format + "," + response.image;
						_this.renderOptions.vcrFrameData[_this.renderOptions.vcrFrameBeingFetched].imgHighRes = _this.imageFromPvw.src;
					} else {
						_this.imageFromPvw.src = "data:image/" + response.format + "," + response.image;
						_this.renderOptions.vcrFrameData[_this.renderOptions.vcrFrameBeingFetched].imgLowRes = _this.imageFromPvw.src;
					}
					_this.renderOptions.vcrFrameBeingFetched = -1; // allow more frames to be fetched
				} else {
					console.log("erase me, ? or not this is an error vcrRenderCall but vcrFrameBeingFetched " + _this.renderOptions.vcrFrameBeingFetched);
				}
			} // if valid image
		}); // then response
	}, // vcrRenderCall

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
		// Old debug
		// this.updateTitle( "Event(" + evt.type + ") pos(" + evt.x + "," + evt.y + ") move " + evt.movementX + "," + evt.movementY);

		// Update quality based on the type of the event
		if (evt.type === "mouseup" || evt.type === "dblclick" || evt.type === "wheel") {
			this.renderOptions.currentQuality = this.renderOptions.stillQuality;
			// console.log("erase me, switching to still " + this.renderOptions.currentQuality);
		} else if (evt.type === "mousedown") {
			this.renderOptions.currentQuality = this.renderOptions.interactiveQuality;
			// console.log("erase me, " + evt.type + " detected switching to animation " + this.renderOptions.currentQuality);

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
			vtkWeb_event.x = evt.x / parseInt(this.sage2_width);
			vtkWeb_event.y = 1.0 - (evt.y / parseInt(this.sage2_height));
			if (vtkWeb_event.buttonRight) {
				this.button_state.rmbScrollTracker = vtkWeb_event.y;
			}
		}
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

				if (evt.type == "mouseup") {
					setTimeout(function() {
						// Tell the other displays to render
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "pvwRender",
							description: "Using this as a way to notify non-master displays of pvw information only master will see"
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
						setTimeout(function() { _this.pvwGetFrameAmount(); }, 10);
					}, function(err) {
						// console.log("Not really an error, loaded dataset doesn't have animation frames:" + err);
						// Tell the other displays to hide info div
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "infoHide",
							description: "Using this as a way to notify non-master displays of pvw information only master will see"
						});
						_this.hideInfoDiv();
						// Tell the other displays to render
						wsio.emit("csdMessage", {
							type: "setValue",
							nameOfValue: "pvwStatusUpdate",
							value:       "pvwRender",
							description: "Using this as a way to notify non-master displays of pvw information only master will see"
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

	*/
	pvwGetFrameAmount: function() {
		var _this = this;
		_this.pvwConfig.session.call("pv.vcr.action", ["next"])
		.then(function(timeValue) {
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






















