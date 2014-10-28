// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

PDFJS.workerSrc     = 'lib/pdf.worker.js';
PDFJS.disableWorker = false;
PDFJS.disableWebGL  = false;

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
					_this.sendResize(w, h);
					_this.ratio = w / h;
				});

				
				/*_this.controls.addTextInput({width:120,action:function(appObj, text){
					console.log("textInput added" + text);
				}});*/
				
				
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
			console.log("rendered page " + renderPage);
			
			if(renderPage === _this.state.page)
				_this.element.src = _this.canvas[renderCanvas].toDataURL();
			
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
	
	_this.controls.addButtonGroup();

	_this.controls.addButton({type:"fastforward", action:function(appObj, date){
		appObj.state.page = appObj.pdfDoc.numPages;
		appObj.refresh(date);
	}});

	_this.controls.addButton({type:"rewind", action:function(appObj, date){
		appObj.state.page = 1;
		appObj.refresh(date);
	}});

	_this.controls.addButtonGroup();
	_this.controls.addButton({type:"prev", action:function(appObj, date){
		if(appObj.state.page <= 1) return;
		appObj.state.page = appObj.state.page - 1;
		appObj.refresh(date);
	}});
	_this.controls.addButton({type:"next", action:function(appObj, date){
		if (appObj.state.page >= appObj.pdfDoc.numPages) return;
		appObj.state.page = appObj.state.page + 1;
		appObj.refresh(date);
	}});

	
	_this.controls.addSlider({begin:1,end:_this.pdfDoc.numPages,increments:1,appHandle:_this, property:"state.page", action:function(appObj, date){
		appObj.refresh(date);
	}});
	_this.controls.finishedAddingControls();

}