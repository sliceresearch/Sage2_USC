// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

/**
 * @module client
 * @submodule image_viewer
 */

/**
 * Image viewing application
 *
 * @class image_viewer
 */
var image_viewer = SAGE2_App.extend({

	/**
	* Init method, creates an 'img' tag in the DOM
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, state, ...)
	*/
	init: function(data) {
		this.SAGE2Init("img", data);

		this.createLayer("rgba(0,0,0,0.85)");
		this.pre = document.createElement('pre');
		this.layer.appendChild(this.pre);

		// To get position and size updates
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";

		// visible
		this.vis = true;

		// old image url
		this.old_img_url = "";

		this.title  = data.title;
		this.apiKey = "";

		this.updateAppFromState();
		this.addWidgetControlsToImageViewer();
	},

	/**
	* Load the app from a previous state
	*
	* @method load
	* @param date {Date} time from the server
	*/
	load: function(date) {
		this.updateAppFromState();
		this.refresh(date);
	},

	/**
	* Update the app from it's new state
	*
	* @method updateAppFromState
	*/
	updateAppFromState: function() {
		this.element.src  = cleanURL(this.state.src || this.state.img_url);

		this.pre.innerHTML = this.syntaxHighlight(this.state.exif);

		if (this.state.showExif === true) {
			this.showLayer();
		}

		this.layer.style.top = this.state.top + "px";

		// Fix iPhone picture: various orientations
		var ratio = this.state.exif.ImageHeight / this.state.exif.ImageWidth;
		var inv = 1.0 / ratio;
		if (this.state.exif.Orientation === 'Rotate 90 CW') {
			this.element.style.webkitTransform = "scale(" + ratio + "," + inv + ") rotate(90deg)";
			if (!this.state.crct) {
				this.sendResize(this.element.height, this.element.width);
			}
			this.state.crct = true;
		} else if (this.state.exif.Orientation === 'Rotate 270 CW') {
			this.element.style.webkitTransform = "scale(" + ratio + "," + inv + ") rotate(-90deg)";
			if (!this.state.crct) {
				this.sendResize(this.element.height, this.element.width);
			}
			this.state.crct = true;
		} else if (this.state.exif.Orientation === 'Rotate 180') {
			this.element.style.webkitTransform = "rotate(180deg)";
			this.state.crct = true;
		} else {
			this.state.crct = true;
		}
		this.layer.style.top = this.state.top + "px";
	},

	/**
	* Visibility callback, when app becomes locally visible or hidden.
	*    Called during preDraw
	*
	* @method onVisible
	* @param visibility {bool} became visible or hidden
	*/
	onVisible: function(visibility) {

		/*
		if (visibility) {
			this.element.src = this.state.src;
		} else {
			this.element.src = smallWhiteGIF();
		}
		*/
	},

	// gotAPIKey
	gotAPIKey: function(msgParams) {
		// receive an object from the web ui
		// .clientInput for what they typed
		this.apiKey = msgParams.clientInput;
	},

	// analyzeLabels
	analyzeLabels: function(msgParams) {
		var _this = this;
		console.log('analyzeLabels', msgParams.url, this.apiKey);
		if (isMaster) {
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.open("POST", "https://vision.googleapis.com/v1/images:annotate?key=" + this.apiKey);
			xmlhttp.setRequestHeader("Content-Type", "application/json");
			var requestData = {
				requests: [{
					image: { source: { imageUri: _this.state.img_url } },
					features: [{type: "LABEL_DETECTION"}]
				}]
			};
			xmlhttp.addEventListener("progress", function() {
				console.log('progress');
			});
			xmlhttp.addEventListener("load", function() {
				console.log('load');
			});
			xmlhttp.addEventListener("error", function() {
				console.log('error');
			});
			xmlhttp.addEventListener("abort", function() {
				console.log('abort');
			});
			xmlhttp.onreadystatechange = function() {
				// Call a function when the state changes.
				if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
					console.log('Response', typeof xmlhttp.responseText);
					_this.makeNoteFromLabels(xmlhttp.responseText);
				}
			};
			console.log('Sending request');
			xmlhttp.send(JSON.stringify(requestData));
		}
	},

	// analyzeWeb
	analyzeWeb: function(msgParams) {
		var _this = this;
		console.log('analyzeWeb', msgParams.url, this.apiKey);
		if (isMaster) {
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.open("POST", "https://vision.googleapis.com/v1/images:annotate?key=" + this.apiKey);
			xmlhttp.setRequestHeader("Content-Type", "application/json");
			var requestData = {
				requests: [{
					image: { source: { imageUri: _this.state.img_url } },
					features: [{type: "WEB_DETECTION"}]
				}]
			};
			xmlhttp.addEventListener("progress", function() {
				console.log('progress');
			});
			xmlhttp.addEventListener("load", function() {
				console.log('load');
			});
			xmlhttp.addEventListener("error", function() {
				console.log('error');
			});
			xmlhttp.addEventListener("abort", function() {
				console.log('abort');
			});
			xmlhttp.onreadystatechange = function() {
				// Call a function when the state changes.
				if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
					console.log('Response', typeof xmlhttp.responseText);
					_this.makeNoteFromWeb(xmlhttp.responseText);
				}
			};
			console.log('Sending request');
			xmlhttp.send(JSON.stringify(requestData));
		}
	},


	// analyzeLocation
	analyzeLocation: function(msgParams) {
		var _this = this;
		console.log('analyzeLocation', msgParams.url, this.apiKey);
		if (isMaster) {
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.open("POST", "https://vision.googleapis.com/v1/images:annotate?key=" + this.apiKey);
			xmlhttp.setRequestHeader("Content-Type", "application/json");
			var requestData = {
				requests: [{
					image: { source: { imageUri: _this.state.img_url } },
					features: [{type: "LANDMARK_DETECTION"}]
				}]
			};
			xmlhttp.addEventListener("progress", function() {
				console.log('progress');
			});
			xmlhttp.addEventListener("load", function() {
				console.log('load');
			});
			xmlhttp.addEventListener("error", function() {
				console.log('error');
			});
			xmlhttp.addEventListener("abort", function() {
				console.log('abort');
			});
			xmlhttp.onreadystatechange = function() {
				// Call a function when the state changes.
				if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
					console.log('Response', typeof xmlhttp.responseText);
					_this.makeNoteFromLocation(xmlhttp.responseText);
				}
			};
			console.log('Sending request');
			xmlhttp.send(JSON.stringify(requestData));
		}
	},

	makeNoteFromLabels: function(someText) {
		var response = JSON.parse(someText);
		var obj = response.responses[0];
		if (obj.labelAnnotations) {
			var annotations = obj.labelAnnotations;
			var noteText = "";
			annotations.forEach(function(element) {
				noteText += element.description + ": " + element.score + "\n";
			}, this);
			var noteData = {
				type: "launchAppWithValues",
				appName: "quickNote",
				csdInitValues: {
					clientName: this.title,
					clientInput: noteText,
					colorChoice: "lightyellow"
				}
			};
			wsio.emit('csdMessage', noteData);
		}
	},

	makeNoteFromWeb: function(someText) {
		var response = JSON.parse(someText);
		var obj = response.responses[0];
		if (obj.webDetection) {
			var annotations = obj.webDetection;
			var noteText = "";
			annotations.webEntities.forEach(function(element) {
				noteText += element.description + ": " + element.score + "\n";
			}, this);
			var link = "";
			var pos = [this.sage2_x + this.sage2_width + 5, this.sage2_y];
			annotations.partialMatchingImages.forEach(function(element) {
				if (element.url) {
					noteText += "Link: " + element.url + "\n";
					if (!link) {
						link = element.url;
					}
				}
			}, this);
			if (link) {
				wsio.emit('openNewWebpage', {
					id: this.id,
					url: link,
					position: pos,
					dimensions: [600, 337]
				});
				pos[0] = pos[0] + 600 + 5;
			}
			link = "";
			annotations.pagesWithMatchingImages.forEach(function(element) {
				if (element.url) {
					noteText += "Link: " + element.url + "\n";
					if (!link) {
						link = element.url;
					}
				}
			}, this);
			if (link) {
				wsio.emit('openNewWebpage', {
					id: this.id,
					url: link,
					position: pos,
					dimensions: [600, 337]
				});
			}
			var noteData = {
				type: "launchAppWithValues",
				appName: "quickNote",
				csdInitValues: {
					clientName: this.title,
					clientInput: noteText,
					colorChoice: "lightpink"
				}
			};
			wsio.emit('csdMessage', noteData);
		}
	},

	makeNoteFromLocation: function(someText) {
		var response = JSON.parse(someText);
		var obj = response.responses[0];
		if (obj.landmarkAnnotations) {
			var annotations = obj.landmarkAnnotations;
			var noteText = "";
			var latLng = "";
			annotations.forEach(function(element) {
				noteText += element.description + ": " + element.score + "\n";
				element.locations.forEach(function(loc) {
					latLng = loc.latLng.latitude + "," + loc.latLng.longitude;
					noteText += "location: " + latLng + "\n";
				}, this);
			}, this);
			var noteData = {
				type: "launchAppWithValues",
				appName: "quickNote",
				csdInitValues: {
					clientName: this.title,
					clientInput: noteText,
					colorChoice: "lightblue"
				}
			};
			wsio.emit('csdMessage', noteData);
			if (latLng) {
				wsio.emit('openNewWebpage', {
					id: this.id,
					url: "https://www.google.com/maps/@" + latLng + ",16z",
					position: [this.sage2_x + this.sage2_width + 5, this.sage2_y],
					dimensions: [600, 337]
				});
			}
		}
	},

	/**
	* To enable right click context menu support this function needs to be present with this format.
	*/
	getContextEntries: function() {
		var entries = [];

		// Show overlay with EXIF data
		entries.push({
			description: "Show EXIF",
			accelerator: "i",
			callback: "showEXIF",
			parameters: {}
		});

		// Special callback: download the file
		entries.push({
			description: "Download image",
			callback: "SAGE2_download",
			parameters: {
				url: cleanURL(this.state.src || this.state.img_url)
			}
		});
		entries.push({
			description: "Copy URL",
			callback: "SAGE2_copyURL",
			parameters: {
				url: cleanURL(this.state.src || this.state.img_url)
			}
		});

		// separator
		entries.push({description: "separator"});

		// Entry for API key
		entries.push({
			description: "Enter API key:",
			callback: "gotAPIKey",
			parameters: {},
			inputField: true,
			inputFieldSize: 20
		});

		entries.push({
			description: "Analyze picture: labels",
			callback: "analyzeLabels",
			parameters: {}
		});
		entries.push({
			description: "Analyze picture: location",
			callback: "analyzeLocation",
			parameters: {}
		});
		entries.push({
			description: "Analyze picture: web presence",
			callback: "analyzeWeb",
			parameters: {}
		});

		// Special callback: convert to a doodle.
		// entries.push({
		// 	description: "Make Doodle",
		// 	callback: "makeDoodle",
		// 	parameters: {}
		// });

		return entries;
	},

	/**
	* Called through context menu. Starts a doodle app with this image.
	*
	* @method makeDoodle
	* @param responseObject {object} standard context values.
	*/
	makeDoodle: function(responseObject) {
		if (isMaster) {
			var data = {};
			data.type    = "launchAppWithValues";
			data.appName = "doodle";
			data.func    = "initializationThroughDuplicate";
			data.xLaunch = this.sage2_x + 100;
			data.yLaunch = this.sage2_y;
			data.params  =  {};
			data.params.clientName    = responseObject.clientName;
			data.params.imageSnapshot = cleanURL(this.state.src || this.state.img_url);
			wsio.emit("csdMessage", data);
		}
	},

	/**
	* Draw function, empty since the img tag is in the DOM
	*
	* @method draw
	* @param date {Date} current time from the server
	*/
	draw: function(date) {
	},

	/**
	* Resize callback
	*
	* @method resize
	* @param date {Date} current time from the server
	*/
	resize: function(date) {
		// Force a redraw to test visibility
		this.refresh(date);
	},

	/**
	* Move callback
	*
	* @method move
	* @param date {Date} current time from the server
	*/
	move: function(date) {
		// Force a redraw to test visibility
		this.refresh(date);
	},

	/**
	* Parse JSON object and add colors
	*
	* @method syntaxHighlight
	* @param json {Object} object containing metadata
	*/
	syntaxHighlight: function(json) {
		if (typeof json !== 'string') {
			json = JSON.stringify(json, undefined, 4);
		}
		json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		/* eslint-disable max-len */
		return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
			function(match) {
				var cls = 'color: darkorange;';
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						cls = 'color: CadetBlue;';
					} else {
						cls = 'color: green;';
					}
				} else if (/true|false/.test(match)) {
					cls = 'color: blue;';
				} else if (/null/.test(match)) {
					cls = 'color: magenta;';
				}
				return '<span style="' + cls + '">' + match + '</span>';
			});

		/* eslint-enable max-len */
	},

	/**
	* Show / Hide EXIF overlay.
	*
	* @method showEXIF
	* @param responseObject {Object} contains response from entry selection
	*/
	showEXIF: function(responseObject) {
		if (this.isLayerHidden()) {
			this.state.top = 0;
			this.state.showExif = true;
			this.showLayer();
		} else {
			this.state.showExif = false;
			this.hideLayer();
		}
		this.refresh();
	},

	/**
	* Handles event processing for the app
	*
	* @method event
	* @param eventType {String} the type of event
	* @param position {Object} contains the x and y positions of the event
	* @param user_id {Object} data about the user who triggered the event
	* @param data {Object} object containing extra data about the event,
	* @param date {Date} current time from the server
	*/
	event: function(eventType, position, user_id, data, date) {
		// Press 'i' to display EXIF information
		if ((eventType === "keyboard" && data.character === "i") ||
			(eventType === "widgetEvent" && data.identifier === "Info")) {
			this.showEXIF();
		}

		// Scroll events for panning the info pannel
		if (eventType === "pointerScroll") {
			var amount = -data.wheelDelta / 32;

			this.state.top += ui.titleTextSize * amount;
			if (this.state.top > 0) {
				this.state.top = 0;
			}
			if (this.state.top < (-(this.layer.clientHeight - this.element.height))) {
				this.state.top = -(this.layer.clientHeight - this.element.height);
			}
			this.layer.style.top = this.state.top + "px";

			this.refresh(date);
		}
	},

	addWidgetControlsToImageViewer: function() {
		// UI stuff
		this.controls.addButton({label: "info", position: 7, identifier: "Info"});
		this.controls.finishedAddingControls();
	}

});

