// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

PDFJS.imageResourcesPath = '/images/pdfjs/';
PDFJS.workerSrc = '/lib/pdf.worker.js';
PDFJS.cMapUrl = '/cmaps/';
PDFJS.cMapPacked = true;

var pdf_viewer = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
	
		this.resizeEvents = "onfinish";
		
		this.canvas = null;
		this.ctx    = null;
		this.loaded = false;
		this.pdfDoc = null;
		this.ratio  = null;

		this.enableControls = true;
		this.pageValText = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "img", width, height, resrc, date);
		
		// application specific 'init'
		this.canvas = document.createElement("canvas");
		this.canvas.width  = this.element.width;
		this.canvas.height = this.element.height;
		this.ctx = this.canvas.getContext("2d");
		
		//  *** DO NOT OVERWRITE this.state, ALWAYS EDIT ITS PROPERTIES
		// this.state = {srcPDF: null, pageNum: null, numPagesShown: null}; // BAD
		
		this.state.src  = null;
		this.state.page = null;

		this.state.numPagesShown = null;
		
		this.pageValText         = '';
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

				// Getting the size of the page
				_this.pdfDoc.getPage(1).then(function(page) {
					var viewport = page.getViewport(1.0);
					var w = parseInt(viewport.width, 10);
					var h = parseInt(viewport.height,10);
					_this.sendResize(w, h);
					_this.ratio = w / h;
				});

				// UI stuff
				_this.controls.addButton({type:"rewind", action:function(appObj, date){
					appObj.state.page = 1;
					appObj.setLabelText();
					appObj.refresh(date);
				}});
				_this.controls.addButton({type:"prev", action:function(appObj, date){
					if(appObj.state.page <= 1) return;
					appObj.state.page = appObj.state.page - 1;
					appObj.setLabelText();
					appObj.refresh(date);
				}});
		
				_this.controls.addSlider({begin:1,end:_this.pdfDoc.numPages,increments:1,appObj:_this, property:"state.page", action:function(appObj, date){
					appObj.setLabelText();
					appObj.refresh(date);
				}});
				var labelWidth = ("" + _this.pdfDoc.numPages).length * 2 + 3; // 3 for the spaces and the '/'

				_this.controls.addLabel({textLength:labelWidth,appObj:_this, property:"pageValText"});

				_this.controls.addButton({type:"next", action:function(appObj, date){
					if (appObj.state.page >= appObj.pdfDoc.numPages) return;
					appObj.state.page = appObj.state.page + 1;
					appObj.setLabelText();
					appObj.refresh(date);
				}});
				_this.controls.addButton({type:"fastforward", action:function(appObj, date){
					appObj.state.page = appObj.pdfDoc.numPages;
					appObj.setLabelText();
					appObj.refresh(date);
				}});
				
				_this.setLabelText();
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

		this.pdfDoc.getPage(this.state.page).then(function(pdfPage) {
			// set the scale to match the canvas
			var viewport = pdfPage.getViewport(_this.canvas.width / pdfPage.getViewport(1.0).width);
			
			// Not needed I think
			// viewport.width  = _this.canvas.width;
			// viewport.height = _this.canvas.height;

			// Render PDF page into canvas context
			var renderContext = {canvasContext: _this.ctx, viewport: viewport};
			
			pdfPage.render(renderContext).then(function() {
				_this.element.src = _this.canvas.toDataURL();
				// Check for change in the aspect ratio, send a resize if needed
				//  (done after the render to avoid double rendering issues)
				if (_this.ratio !== (viewport.width/viewport.height) ) {
					_this.ratio = viewport.width/viewport.height;
					_this.sendResize(viewport.width, viewport.height);
				}
			});
		});
	},
	
	resize: function(date) {
		this.canvas.width  = this.element.width;
		this.canvas.height = this.element.height;

		this.refresh(date);
	},
	
	event: function(type, position, user, data, date) {
		// Left Arrow - go back one page
		// Right Arrow - go forward one page
		if(type === "specialKey"){
			if(data.code === 37 && data.state === "up"){ // Left Arrow
				if(this.state.page <= 1) return;
				this.state.page = this.state.page - 1;
				this.setLabelText();
				this.refresh(date);
			}
			if(data.code === 39 && data.state === "up"){ // Right Arrow
				if(this.state.page >= this.pdfDoc.numPages) return;
				this.state.page = this.state.page + 1;
				this.setLabelText();
				this.refresh(date);
			}
		}
	},

	setLabelText: function(){
		this.pageValText = this.state.page + ' / ' + this.pdfDoc.numPages;
	}

});
