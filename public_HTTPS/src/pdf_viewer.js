// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

PDFJS.workerSrc       = 'lib/pdf.worker.js';
PDFJS.disableWorker   = false;
PDFJS.disableWebGL    = true;
PDFJS.verbosity       = PDFJS.VERBOSITY_LEVELS.infos;
PDFJS.maxCanvasPixels = 67108864; // 8k2

var pdf_viewer = SAGE2_App.extend( {
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

		this.enableControls = true;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "img", width, height, resrc, date);
		
		// application specific 'init'
		for(var i=0; i<this.numCtx; i++){
			var canvas = document.createElement("canvas");
			canvas.width  = this.element.width;
			canvas.height = this.element.height;
			var ctx = canvas.getContext("2d");
			
			this.canvas.push(canvas);
			this.ctx.push(ctx);
		}
		
		//  *** DO NOT OVERWRITE this.state, ALWAYS EDIT ITS PROPERTIES
		// this.state = {srcPDF: null, pageNum: null, numPagesShown: null}; // BAD
		
		this.state.src  = null;
		this.state.page = null;

		this.state.numPagesShown = null;
	},
	
	load: function(state, date) {
		// load new document
		if(state.src !== undefined && state.src !== null) {		
			var _this = this;
			this.loaded = false;
			
			state.src = cleanURL(state.src);
			
			PDFJS.getDocument({url: state.src}).then(function getDocumentCallback(pdfDocument) {
				_this.pdfDoc = pdfDocument;
				_this.loaded = true;

				_this.state.src  = state.src;
				_this.state.page = state.page;
				_this.state.numPagesShown = state.numPagesShown;

				 addWidgetControlsToPdfViewer (_this);
				// Getting the size of the page
				_this.pdfDoc.getPage(1).then(function(page) {
					var viewport = page.getViewport(1.0);
					var w = parseInt(viewport.width, 10);
					var h = parseInt(viewport.height,10);
					_this.ratio = w / h;
					// Depending on the aspect ratio, adjust one dimension
					if (_this.ratio < 1)
						_this.sendResize(_this.element.width, _this.element.width/_this.ratio);
					else
						_this.sendResize(_this.element.height*_this.ratio, _this.element.height);
					//_this.sendResize(w, h);
				});
			});
		}
		// load new state of same document
		else {
			this.state.page = state.page;
			this.state.numPagesShown = state.numPagesShown;
			this.refresh(date);
		}
	},
	
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
			var count = 0;
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
			//console.log("rendered page " + renderPage);
			
			if(renderPage === _this.state.page){
				var data = _this.canvas[renderCanvas].toDataURL().split(',');
				var bin  = atob(data[1]);
				var mime = data[0].split(':')[1].split(';')[0];
				
				var buf = new ArrayBuffer(bin.length);
				var view = new Uint8Array(buf);
				for(var i=0; i<view.length; i++) {
					view[i] = bin.charCodeAt(i);
				}
		
				var blob = new Blob([buf], {type: mime});
				var source = window.URL.createObjectURL(blob);
		
				if(_this.src !== null) window.URL.revokeObjectURL(_this.src);
				_this.src = source;
			
				_this.element.src = _this.src;
			}
			
			// Check for change in the aspect ratio, send a resize if needed
			//  (done after the render to avoid double rendering issues)
			if (_this.ratio !== (viewport.width/viewport.height) ) {
				_this.ratio = viewport.width/viewport.height;
				_this.sendResize(viewport.width, viewport.height);
			}
		};
		
		this.pdfDoc.getPage(this.state.page).then(gotPdfPage);
	},
	
	resize: function(date) {
		for(var i=0; i<this.numCtx; i++){
			this.canvas[i].width  = this.element.width;
			this.canvas[i].height = this.element.height;
		}

		this.refresh(date);
	},
	
	event: function(type, position, user, data, date) {
		// Left Arrow - go back one page
		// Right Arrow - go forward one page
		if(type === "specialKey"){
			if(data.code === 37 && data.state === "up"){ // Left Arrow
				if(this.state.page <= 1) return;
				this.state.page = this.state.page - 1;
				this.refresh(date);
			}
			else if(data.code === 39 && data.state === "up"){ // Right Arrow
				if(this.state.page >= this.pdfDoc.numPages) return;
				this.state.page = this.state.page + 1;
				this.refresh(date);
			}
		}
		
		if(type === "keyboard"){
			if(data.character === "r" || data.character === "R"){
				this.refresh(date);
			}
		}
	}
});


function addWidgetControlsToPdfViewer (_this){
// UI stuff
	

	_this.controls.addButton({type:"fastforward",sequenceNo:2, action:function(date){
		this.state.page = this.pdfDoc.numPages;
		this.refresh(date);
	}.bind(_this)});

	_this.controls.addButton({type:"rewind",sequenceNo:4, action:function(date){
		this.state.page = 1;
		this.refresh(date);
	}.bind(_this)});

	_this.controls.addButton({type:"prev",sequenceNo:8, action:function(date){
		if(this.state.page <= 1) return;
		this.state.page = this.state.page - 1;
		this.refresh(date);
	}.bind(_this)});
	_this.controls.addButton({type:"next", sequenceNo:10,action:function(date){
		if (this.state.page >= this.pdfDoc.numPages) return;
		this.state.page = this.state.page + 1;
		this.refresh(date);
	}.bind(_this)});

	_this.controls.addSeparatorAfterButtons(1,10); // This neatly forms an X out of the four spokes.
	_this.controls.addSlider({begin:1,end:_this.pdfDoc.numPages,increments:1,appHandle:_this, property:"state.page", action:function(date){
		this.refresh(date);
	}.bind(_this)});
	_this.controls.finishedAddingControls();

}