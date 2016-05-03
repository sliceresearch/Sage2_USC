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
 * @submodule pdf_viewer
 */

PDFJS.workerSrc       = 'lib/pdf.worker.js';
PDFJS.disableWorker   = false;
PDFJS.disableWebGL    = true;
PDFJS.verbosity       = PDFJS.VERBOSITY_LEVELS.infos;
PDFJS.maxCanvasPixels = 67108864; // 8k2

/**
 * PDF viewing application, based on pdf.js library
 *
 * @class pdf_viewer
 */
 var pdf_viewer = SAGE2_App.extend({
	/**
	* Init method, creates an 'img' tag in the DOM and a few canvas contexts to handle multiple redraws
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	init: function(data) {
		this.SAGE2Init("img", data);

		// Clear the background before first rendering
		this.div.style.background = "black";

		this.resizeEvents = "onfinish";

		this.canvas  = [];
		this.ctx     = [];
		this.loaded  = false;
		this.pdfDoc  = null;
		this.ratio   = null;
		this.currCtx = 0;
		this.numCtx  = 5;
		this.src     = null;
		this.title   = data.title;
		this.gotresize      = false;
		this.enableControls = true;
		this.old_doc_url = "";

		// application specific 'init'
		for (var i = 0; i < this.numCtx; i++) {
			var canvas = document.createElement("canvas");
			canvas.width  = this.element.width;
			canvas.height = this.element.height;
			var ctx = canvas.getContext("2d");

			this.canvas.push(canvas);
			this.ctx.push(ctx);
		}

		this.updateAppFromState(data.date);
	},

	/**
	* Load the app from a previous state, parses the PDF and creates the widgets
	*
	* @method load
	* @param state {Object} object to initialize or restore the app
	* @param date {Date} time from the server
	*/
	load: function(date) {
		this.updateAppFromState(date);
	},

	updateAppFromState: function(date) {
		if (this.old_doc_url !== this.state.doc_url) {
			var _this = this;
			this.loaded = false;

			var docURL = cleanURL(this.state.doc_url);

			PDFJS.getDocument({url: docURL}).then(function getDocumentCallback(pdfDocument) {
				console.log("loaded pdf document", _this.gotresize);
				_this.pdfDoc = pdfDocument;
				_this.loaded = true;

				_this.addWidgetControlsToPdfViewer();

				// if already got a resize event, just redraw, otherwise send message
				if (_this.gotresize) {
					_this.refresh(date);
					_this.gotresize = false;
				} else {
					// Getting the size of the page
					_this.pdfDoc.getPage(1).then(function(page) {
						var viewport = page.getViewport(1.0);
						var w = parseInt(viewport.width,  10);
						var h = parseInt(viewport.height, 10);
						_this.ratio = w / h;
						// Depending on the aspect ratio, adjust one dimension
						if (_this.ratio < 1) {
							_this.sendResize(_this.element.width, _this.element.width / _this.ratio);
						} else {
							_this.sendResize(_this.element.height * _this.ratio, _this.element.height);
						}
					});
				}
			});
			this.old_doc_url = this.state.doc_url;
		} else {
			// load new state of same document
			this.refresh(date);
		}
	},

	/**
	* Adds custom widgets to app
	*
	* @method addWidgetControlsToPdfViewer
	*/
	addWidgetControlsToPdfViewer: function() {
		if (this.pdfDoc.numPages > 1) {
			this.controls.addButton({type: "fastforward", position: 6, identifier: "LastPage"});
			this.controls.addButton({type: "rewind",      position: 2, identifier: "FirstPage"});
			this.controls.addButton({type: "prev",        position: 3, identifier: "PreviousPage"});
			this.controls.addButton({type: "next",        position: 5, identifier: "NextPage"});
			this.controls.addSlider({
				minimum: 1,
				maximum: this.pdfDoc.numPages,
				increments: 1,
				property: "this.state.page",
				label: "Page",
				identifier: "Page"
			});
		}
		this.controls.finishedAddingControls();
	},

	/**
	* Draw function, renders the current page into a canvas
	*
	* @method draw
	* @param date {Date} current time from the server
	*/
	draw: function(date) {
		if (this.loaded === false) {
			return;
		}

		var _this = this;
		var renderPage = this.state.page;
		var renderCanvas;

		var gotPdfPage = function(pdfPage) {
			renderCanvas = _this.currCtx;

			// set the scale to match the canvas
			var viewport = pdfPage.getViewport(_this.canvas[renderCanvas].width / pdfPage.getViewport(1.0).width);

			// Render PDF page into canvas context
			var renderContext = {
				canvasContext: _this.ctx[_this.currCtx],
				viewport: viewport,
				continueCallback: function(cont) {
					cont(); // nothing special right now
				}
			};
			_this.currCtx = (_this.currCtx + 1) % _this.numCtx;

			pdfPage.render(renderContext).then(renderPdfPage);
		};

		var renderPdfPage = function() {
			if (renderPage === _this.state.page) {
				var data = _this.canvas[renderCanvas].toDataURL().split(',');
				var bin  = atob(data[1]);
				var mime = data[0].split(':')[1].split(';')[0];

				var buf  = new ArrayBuffer(bin.length);
				var view = new Uint8Array(buf);
				for (var i = 0; i < view.length; i++) {
					view[i] = bin.charCodeAt(i);
				}

				var blob = new Blob([buf], {type: mime});
				var source = window.URL.createObjectURL(blob);

				if (_this.src !== null) {
					window.URL.revokeObjectURL(_this.src);
				}
				_this.src = source;

				_this.element.src = _this.src;

				var newTitle;
				newTitle = _this.title + " - " + _this.state.page + " / " + _this.pdfDoc.numPages;
				_this.updateTitle(newTitle);
			}
		};
		this.pdfDoc.getPage(this.state.page).then(gotPdfPage);
	},

	/**
	* Resize function, resizes all the canvas contexts
	*
	* @method resize
	* @param date {Date} current time from the server
	*/
	resize: function(date) {
		for (var i = 0; i < this.numCtx; i++) {
			this.canvas[i].width  = this.element.width;
			this.canvas[i].height = this.element.height;
		}
		// Force a redraw after resize
		this.gotresize = true;
		this.refresh(date);
	},

	/**
	* To enable right click context menu support this function needs to be present with this format.
	*
	* Must return an array of entries. An entry is an object with three properties:
	*	description: what is to be displayed to the viewer.
	*	callback: String containing the name of the function to activate in the app. It must exist.
	*	parameters: an object with specified datafields to be given to the function.
	*		The following attributes will be automatically added by server.
	*			serverDate, on the return back, server will fill this with time object.
	*			clientId, unique identifier (ip and port) for the client that selected entry.
	*			clientName, the name input for their pointer. Note: users are not required to do so.
	*			clientInput, if entry is marked as input, the value will be in this property. See pdf_viewer.js for example.
	*		Further parameters can be added. See pdf_view.js for example.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;

		entry = {};
		entry.description = "First Page";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.parameters.page = "first";
		entries.push(entry);

		entry = {};
		entry.description = "Previous Page";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.parameters.page = "previous";
		entries.push(entry);

		entry = {};
		entry.description = "Next Page";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.parameters.page = "next";
		entries.push(entry);

		entry = {};
		entry.description = "Last Page";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.parameters.page = "last";
		entries.push(entry);

		entry = {};
		entry.description = "Jump To: ";
		entry.callback = "changeThePage";
		entry.parameters = {};
		entry.inputField = true;
		entry.inputFieldSize = 3;
		entries.push(entry);

		// Special callback: dowload the file
		entries.push({
			description: "Download",
			callback: "SAGE2_download",
			parameters: {
				url: this.state.doc_url
			}
		});

		return entries;
	},

	/**
	* Support function to allow page changing through right mouse context menu.
	*
	* @method changeThePage
	* @param responseObject {Object} contains response from entry selection
	*/
	changeThePage: function(responseObject) {
		var page = responseObject.page;
		// if the user did the input option
		if (responseObject.clientInput) {
			page = parseInt(responseObject.clientInput);
			if (page > 0 && page <= this.pdfDoc.numPages) {
				this.state.page = page;
			} else {
				return;
			}
		}
		// else check for these word options
		else {
			if (page === "first") {
				if (this.state.page === 1) {
					return;
				}
				this.state.page = 1;
			} else if (page === "previous") {
				if (this.state.page <= 1) {
					return;
				}
				this.state.page = this.state.page - 1;
			} else if (page === "next") {
				if (this.state.page >= this.pdfDoc.numPages) {
					return;
				}
				this.state.page = this.state.page + 1;
			} else if (page === "last") {
				if (this.state.page === this.pdfDoc.numPages) {
					return;
				}
				this.state.page = this.pdfDoc.numPages;
			}
		}
		// This needs to be a new date for the extra function.
		this.refresh(new Date(responseObject.serverDate));
	},

	/**
	* Handles event processing, arrow keys to navigate, and r to redraw
	*
	* @method event
	* @param eventType {String} the type of event
	* @param position {Object} contains the x and y positions of the event
	* @param user_id {Object} data about the user who triggered the event
	* @param data {Object} object containing extra data about the event,
	* @param date {Date} current time from the server
	*/
	event: function(eventType, position, user, data, date) {
		// Left Click  - go back one page
		// Right Click - go forward one page

		// if (eventType === "pointerPress") {
		// 	if (data.button === "left") {
		// 		if (this.state.page <= 1) {
		// 			return;
		// 		}
		// 		this.state.page = this.state.page - 1;
		// 		this.refresh(date);
		// 	} else if (data.button === "right") {
		// 		if (this.state.page >= this.pdfDoc.numPages) {
		// 			return;
		// 		}
		// 		this.state.page = this.state.page + 1;
		// 		this.refresh(date);
		// 	}
		// }

		// Keyboard:
		//   spacebar - next
		//   1 - first
		//   0 - last
		if (eventType === "keyboard") {
			if (data.character === " ") {
				this.state.page = (this.state.page % this.pdfDoc.numPages) + 1;
				this.refresh(date);
			} else if (data.character === "1") {
				this.state.page = 1;
				this.refresh(date);
			} else if (data.character === "0") {
				this.state.page = this.pdfDoc.numPages;
				this.refresh(date);
			} else if (data.character === "r" || data.character === "R") {
				this.refresh(date);
			}
		}

		// Left Arrow  - go back one page
		// Right Arrow - go forward one page
		if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "up") {
				// Left Arrow
				if (this.state.page <= 1) {
					return;
				}
				this.state.page = this.state.page - 1;
				this.refresh(date);
			} else if (data.code === 39 && data.state === "up") {
				// Right Arrow
				this.state.page = (this.state.page % this.pdfDoc.numPages) + 1;
				this.refresh(date);
			}
		} else if (eventType === "widgetEvent") {
			switch (data.identifier) {
				case "LastPage":
					this.state.page = this.pdfDoc.numPages;
					break;
				case "FirstPage":
					this.state.page = 1;
					break;
				case "PreviousPage":
					if (this.state.page <= 1) {
						return;
					}
					this.state.page = this.state.page - 1;
					break;
				case "NextPage":
					if (this.state.page >= this.pdfDoc.numPages) {
						return;
					}
					this.state.page = this.state.page + 1;
					break;
				case "Page":
					switch (data.action) {
						case "sliderRelease":
							break;
						default:
							return;
					}
					break;
				default:
					return;
			}
			this.refresh(date);
		}
	}
});
