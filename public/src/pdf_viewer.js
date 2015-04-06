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
 var pdf_viewer = SAGE2_App.extend( {
	/**
	* Constructor, redraws done on finish events
	*
	* @class pdf_viewer
	* @constructor
	*/
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "onfinish";

		this.canvas  = [];
		this.ctx     = [];
		this.loaded  = false;
		this.pdfDoc  = null;
		this.ratio   = null;
		this.currCtx = 0;
		this.numCtx  = 5;
		this.src     = null;
		this.gotresize      = false;
		this.enableControls = true;
	},

	/**
	* Init method, creates an 'img' tag in the DOM and a few canvas contexts to handle multiple redraws
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "img", data);

		// application specific 'init'
		for(var i=0; i<this.numCtx; i++){
			var canvas = document.createElement("canvas");
			canvas.width  = this.element.width;
			canvas.height = this.element.height;
			var ctx = canvas.getContext("2d");

			this.canvas.push(canvas);
			this.ctx.push(ctx);
		}

		this.state.doc_url  = null;
		this.state.page = null;
		this.state.numPagesShown = null;
	},

	/**
	* Load the app from a previous state, parses the PDF and creates the widgets
	*
	* @method load
	* @param state {Object} object to initialize or restore the app
	* @param date {Date} time from the server
	*/
	load: function(state, date) {
		// load new document
		if (state.doc_url !== undefined && state.doc_url !== null) {
			var _this = this;
			this.loaded = false;

			state.doc_url = cleanURL(state.doc_url);

			PDFJS.getDocument({url: state.doc_url}).then(function getDocumentCallback(pdfDocument) {
				console.log("loaded pdf document", _this.gotresize);
				_this.pdfDoc = pdfDocument;
				_this.loaded = true;

				_this.state.doc_url  = state.doc_url;
				_this.state.page = state.page;
				_this.state.numPagesShown = state.numPagesShown;

				addWidgetControlsToPdfViewer(_this);

				// if already got a resize event, just redraw, otherwise send message
				if (_this.gotresize) {
					_this.refresh(date);
					_this.gotresize = false;
				}
				else {
					// Getting the size of the page
					_this.pdfDoc.getPage(1).then(function(page) {
						var viewport = page.getViewport(1.0);
						var w = parseInt(viewport.width,  10);
						var h = parseInt(viewport.height, 10);
						_this.ratio = w / h;
						// Depending on the aspect ratio, adjust one dimension
						if (_this.ratio < 1)
							_this.sendResize(_this.element.width, _this.element.width/_this.ratio);
						else
							_this.sendResize(_this.element.height*_this.ratio, _this.element.height);
					});
				}
			});
		}
		// load new state of same document
		else {
			this.state.page = state.page;
			this.state.numPagesShown = state.numPagesShown;
			this.refresh(date);
		}
	},

	/**
	* Draw function, renders the current page into a canvas
	*
	* @method draw
	* @param date {Date} current time from the server
	*/
	draw: function(date) {
		if(this.loaded === false) return;

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
			_this.currCtx = (_this.currCtx+1) % _this.numCtx;

			pdfPage.render(renderContext).then(renderPdfPage);
		};

		var renderPdfPage = function() {
			if(renderPage === _this.state.page){
				var data = _this.canvas[renderCanvas].toDataURL().split(',');
				var bin  = atob(data[1]);
				var mime = data[0].split(':')[1].split(';')[0];

				var buf  = new ArrayBuffer(bin.length);
				var view = new Uint8Array(buf);
				for(var i=0; i<view.length; i++) {
					view[i] = bin.charCodeAt(i);
				}

				var blob = new Blob([buf], {type: mime});
				var source = window.URL.createObjectURL(blob);

				if(_this.src!== null) window.URL.revokeObjectURL(_this.src);
				_this.src = source;

				_this.element.src = _this.src;
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
		console.log("resize pdf viewer");
		for(var i=0; i<this.numCtx; i++){
			this.canvas[i].width  = this.element.width;
			this.canvas[i].height = this.element.height;
		}
		// Force a redraw after resize
		this.gotresize = true;
		this.refresh(date);
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
	event: function(type, position, user, data, date) {
		// Left Arrow  - go back one page
		// Right Arrow - go forward one page
		if (type === "specialKey") {
			if (data.code === 37 && data.state === "up") { // Left Arrow
				if(this.state.page <= 1) return;
				this.state.page = this.state.page - 1;
				this.refresh(date);
			}
			else if (data.code === 39 && data.state === "up") { // Right Arrow
				if (this.state.page >= this.pdfDoc.numPages) return;
				this.state.page = this.state.page + 1;
				this.refresh(date);
			}
		}
		if (type === "keyboard") {
			if(data.character === "r" || data.character === "R"){
				this.refresh(date);
			}
		}
	}

});


/**
* Handles event processing for the app
*
* @method addWidgetControlsToPdfViewer
* @param _this {Object} handle to the pdf app
*/
function addWidgetControlsToPdfViewer (_this){
	// UI stuff
	_this.controls.addButton({type:"fastforward", sequenceNo:3, action:function(date){
		this.state.page = this.pdfDoc.numPages;
		this.refresh(date);
	}.bind(_this)});

	_this.controls.addButton({type:"rewind", sequenceNo:5, action:function(date){
		this.state.page = 1;
		this.refresh(date);
	}.bind(_this)});

	_this.controls.addButton({type:"prev", sequenceNo:9, action:function(date){
		if(this.state.page <= 1) return;
		this.state.page = this.state.page - 1;
		this.refresh(date);
	}.bind(_this)});
	_this.controls.addButton({type:"next", sequenceNo:11, action:function(date){
		if (this.state.page >= this.pdfDoc.numPages) return;
		this.state.page = this.state.page + 1;
		this.refresh(date);
	}.bind(_this)});

	_this.controls.addSlider({begin:1, end:_this.pdfDoc.numPages, increments:1, appHandle:_this, property:"state.page", caption: "Page", action:function(date){
		this.refresh(date);
	}.bind(_this)});
	_this.controls.finishedAddingControls();

}
