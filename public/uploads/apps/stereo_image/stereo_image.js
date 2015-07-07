// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var stereo_image = SAGE2_App.extend( {
	init: function(data) {
		this.SAGE2Init("canvas", data);

		this.resizeEvents = "onfinish";
		this.moveEvents   = "onfinish";

		this.stereoImgLoaded  = false;
		this.manualOffset     = 0;
		this.interleaveOffset = 0;
		this.ctx = this.element.getContext('2d');

		var _this = this;
		this.stereoImg = new Image();
		this.stereoImg.addEventListener('load', function() {
			_this.stereoImgLoaded = true;
			_this.sendResize(_this.stereoImg.naturalWidth/2, _this.stereoImg.naturalHeight);
		}, false);
		this.stereoImg.src = this.state.file;

		this.controls.addButton({type: "prev",position: 7, identifier: "PreviousStereoMode"});
		this.controls.addButton({type: "next",position: 1, identifier: "NextStereoMode"});
		this.controls.addButton({label: "mode", position: 4, identifier: "ChangeAnaglyphMode"});
		this.controls.finishedAddingControls();
	},

	load: function(date) {
		this.stereoImg.src = this.state.file;
	},

	draw: function(date) {
		if (this.stereoImgLoaded === false) return;

		if      (this.state.stereoMode === "lefteye")    this.drawLeftEye();
		else if (this.state.stereoMode === "righteye")   this.drawRightEye();
		else if (this.state.stereoMode === "anaglyph")   this.drawStereoAnaglyph();
		else if (this.state.stereoMode === "interleave") this.drawStereoInterleave();
	},

	drawLeftEye: function() {
		var imgW = this.stereoImg.naturalWidth / 2;
		var imgH = this.stereoImg.naturalHeight;

		this.ctx.drawImage(this.stereoImg, imgW, 0, imgW, imgH, 0, 0, this.element.width, this.element.height);
	},

	drawRightEye: function() {
		var imgW = this.stereoImg.naturalWidth / 2;
		var imgH = this.stereoImg.naturalHeight;

		this.ctx.drawImage(this.stereoImg, 0, 0, imgW, imgH, 0, 0, this.element.width, this.element.height);
	},

	drawStereoAnaglyph: function() {
		var totalW = this.stereoImg.naturalWidth;
		var totalH = this.stereoImg.naturalHeight;
		var imgW = this.stereoImg.naturalWidth / 2;
		var imgH = this.stereoImg.naturalHeight;


		var tmpCanvas = document.createElement('canvas');
		var tmpCtx = tmpCanvas.getContext('2d');
		tmpCanvas.width  = totalW;
		tmpCanvas.height = totalH;

		tmpCtx.drawImage(this.stereoImg, 0, 0, totalW, totalH);
		var iData1 = tmpCtx.getImageData(imgW, 0, imgW, imgH);
		var iData2 = tmpCtx.getImageData(0, 0, imgW, imgH);

		var oData = tmpCtx.createImageData(imgW, imgH);
		this.processAnaglyph(imgW, imgH, iData1, iData2, oData);

		tmpCtx.putImageData(oData, 0, 0);

		this.ctx.drawImage(tmpCanvas, 0, 0, imgW, imgH, 0, 0, this.element.width, this.element.height);
	},

	drawStereoInterleave: function() {
		var imgW = this.stereoImg.naturalWidth / 2;
		var imgH = this.stereoImg.naturalHeight;

		// draw left half of image
		this.ctx.drawImage(this.stereoImg, 0, 0, imgW, imgH, 0, 0, this.element.width, this.element.height);


		// clip path - show only even lines
		this.ctx.save();

		this.ctx.lineWidth = 1;
		this.ctx.beginPath();
		for(var i=this.interleaveOffset; i<this.element.height; i+=2){
			this.ctx.moveTo(0, i);
			this.ctx.lineTo(this.element.width, i);
			this.ctx.lineTo(this.element.width, i+1);
			this.ctx.lineTo(0, i+1);
		}
		this.ctx.closePath();
		this.ctx.clip();


		// draw right half of image
		this.ctx.drawImage(this.stereoImg, imgW, 0, imgW, imgH, 0, 0, this.element.width, this.element.height);

		// reset clip to default
		this.ctx.restore();
	},

	processAnaglyph: function(imgW, imgH, iData1, iData2, oData) {
		var index = 0;
		var y = imgW * imgH;

		var idr = iData1;
		var idg = iData2;
		var idb = iData2;

		var r, g, b;

		switch(this.state.anaglyphMode) {
			case "TrueAnaglyph":
				for (x = 0; x++ < y; ) {
					// Data1 - left; Data2 - right
					r = idr.data[index+0] * 0.299 + idr.data[index+1] * 0.587 + idr.data[index+2] * 0.114;
					g = 0;
					b = idb.data[index+0] * 0.299 + idb.data[index+1] * 0.587 + idb.data[index+2] * 0.114;
					r = Math.min(Math.max(r, 0), 255);
					b = Math.min(Math.max(b, 0), 255);
					oData.data[index++] = r;
					oData.data[index++] = g;
					oData.data[index++] = b;
					oData.data[index++] = 0xFF;

				};
				break;

			case "GrayAnaglyph":
				for (x = 0; x++ < y; ) {
					// Data1 - left; Data2 - right
					r = idr.data[index+0] * 0.299 + idr.data[index+1] * 0.587 + idr.data[index+2] * 0.114;
					g = idg.data[index+0] * 0.299 + idg.data[index+1] * 0.587 + idg.data[index+2] * 0.114;
					b = idb.data[index+0] * 0.299 + idb.data[index+1] * 0.587 + idb.data[index+2] * 0.114;
					r = Math.min(Math.max(r, 0), 255);
					g = Math.min(Math.max(g, 0), 255);
					b = Math.min(Math.max(b, 0), 255);
					oData.data[index++] = r;
					oData.data[index++] = g;
					oData.data[index++] = b;
					oData.data[index++] = 0xFF;
				};
				break;

			case "ColorAnaglyph":
				for (x = 0; x++ < y; ) {
					// Data1 - left; Data2 - right
					oData.data[index] = idr.data[index++];
					oData.data[index] = idg.data[index++];
					oData.data[index] = idb.data[index++];
					oData.data[index] = 0xFF; index++;
				};
				break;

			case "OptimizedAnaglyph":
				for (x = 0; x++ < y; ) {
					// Data1 - left; Data2 - right
					r = idr.data[index+1] * 0.7 + idr.data[index+2] * 0.3;
					g = idg.data[index+1];
					b = idb.data[index+2];
					r = Math.min(Math.max(r, 0), 255);
					oData.data[index++] = r;
					oData.data[index++] = g;
					oData.data[index++] = b;
					oData.data[index++] = 0xFF;
				}
				break;

			case "Optimized+Anaglyph":
				for (x = 0; x++ < y; ) {
					g = idr.data[index+1] + 0.45 * Math.max(0, idr.data[index+0] - idr.data[index+1]);
					b = idr.data[index+2] + 0.25 * Math.max(0, idr.data[index+0] - idr.data[index+2]);
					r = g * 0.749 + b * 0.251;
					g = idg.data[index+1] + 0.45 * Math.max(0, idg.data[index+0] - idg.data[index+1]);
					b = idb.data[index+2] + 0.25 * Math.max(0, idb.data[index+0] - idb.data[index+2]);
					r = Math.min(Math.max(r, 0), 255);
					g = Math.min(Math.max(g, 0), 255);
					b = Math.min(Math.max(b, 0), 255);
					oData.data[index++] = r;
					oData.data[index++] = g;
					oData.data[index++] = b;
					oData.data[index++] = 0xFF;
				}
				break;
		}
	},
	
	startMove: function(date) {
	},
	
	move: function(date) {
		this.interleaveOffset = (this.sage2_y+this.manualOffset) % 2;
		this.refresh(date);
	},
	
	startResize: function(date) {
	},
	
	resize: function(date) {
		this.refresh(date);
	},
	nextStereoMode: function(date){
		if      (this.state.stereoMode === "lefteye")    this.state.stereoMode = "interleave";
		else if (this.state.stereoMode === "righteye")   this.state.stereoMode = "lefteye";
		else if (this.state.stereoMode === "anaglyph")   this.state.stereoMode = "righteye";
		else if (this.state.stereoMode === "interleave") this.state.stereoMode = "anaglyph";
		this.refresh(date);
	},
	previousStereoMode: function(date){
		if      (this.state.stereoMode === "lefteye")    this.state.stereoMode = "righteye";
		else if (this.state.stereoMode === "righteye")   this.state.stereoMode = "anaglyph";
		else if (this.state.stereoMode === "anaglyph")   this.state.stereoMode = "interleave";
		else if (this.state.stereoMode === "interleave") this.state.stereoMode = "lefteye";
		this.refresh(date);
	},
	changeAnaglyphMode: function(date){
		if (this.state.anaglyphMode === "TrueAnaglyph")       this.state.anaglyphMode = "GrayAnaglyph";
		else if (this.state.anaglyphMode === "GrayAnaglyph")       this.state.anaglyphMode = "ColorAnaglyph";
		else if (this.state.anaglyphMode === "ColorAnaglyph")      this.state.anaglyphMode = "OptimizedAnaglyph";
		else if (this.state.anaglyphMode === "OptimizedAnaglyph")  this.state.anaglyphMode = "Optimized+Anaglyph";
		else if (this.state.anaglyphMode === "Optimized+Anaglyph") this.state.anaglyphMode = "TrueAnaglyph";
		this.refresh(date);
	},

	event: function(eventType, position, user, data, date) {
		// Left Arrow  - toggle to next stereo mode
		// Right Arrow - toggle to prev stereo mode
		if(eventType === "specialKey") {
			if(data.code === 37 && data.state === "up"){ // Left Arrow
				this.previousStereoMode(date);
			}
			else if(data.code === 39 && data.state === "up"){ // Right Arrow
				this.nextStereoMode(date);
			}
		}

		else if(eventType === "keyboard") {
			// modify anaglyph mode
			if(data.character === "m" || data.character === "M"){
				this.changeAnaglyphMode(date);
			}
			// manually switch interleave offset
			if(data.character === "o" || data.character === "O"){
				this.manualOffset = 1 - this.manualOffset;
				this.interleaveOffset = (this.sage2_y+this.manualOffset) % 2;
				
				this.refresh(date);
			}
		}
		else if (eventType === "widgetEvent"){
			switch(data.ctrlId){
				case "PreviousStereoMode":
					this.previousStereoMode(date);
					break;
				case "NextStereoMode":
					this.nextStereoMode(date);
					break;
				case "ChangeAnaglyphMode":
					this.changeAnaglyphMode(date);
					break;
				default:
					console.log("No handler for:", data.ctrlId);
					break;
			}
		}
	}
});
