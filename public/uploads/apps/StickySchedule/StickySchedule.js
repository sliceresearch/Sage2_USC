//
// SAGE2 application: StickySchedule
// by: Thomas Marrinan <thomas.j.marrinan@gmail.com>
//
// Copyright (c) 2015
//

"use strict";

/* global  */

var StickySchedule = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);
		// Set the DOM id
		this.id = data.id;
		this.element.id = this.id + "_main";
		// Set the background to black
		this.element.style.backgroundColor = "#000000";

		// Move and resize callbacks
		this.resizeEvents = "onfinish";
		this.moveEvents   = "never";

		// User defined members
		this.conferenceInfoLoaded = false;
		this.paperListLoaded = false;
		this.snapCanvas = null;
		this.errorPopup = null;
		this.errorText = null;
		this.okButton = null;
		this.closeButton = null;
		this.currentSchedulerText = null;
		this.tutorial = null;
		this.floorPlan = null;
		this.roomInfo = null;
		this.extraInfoPopup = null;
		this.errorShown = false;
		this.tutorialShown = false;
		this.roomInfoShown = false;
		this.floorPlanShown = false;
		this.extraInfoShown = false;
		this.floorPlanNeedsDraw = false;
		this.textSize = "30px";
		this.textColor = "rgba(150, 150, 150, 1.0)";
		this.defaultFill = "rgba(10, 10, 10, 0.1)";
		this.defaultStroke = "rgba(180, 180, 180, 0.8)";
		this.stickyFontSize = "24px";
		this.stickyFontSizeInCell = "30px";
		this.turn = 0;
		this.currentScheduler = 0;
		this.floorImgW = 0;
		this.floorImgH = 0;
		this.appW = parseInt(this.element.style.width,  10);
		this.appH = parseInt(this.element.style.height, 10);
		this.svgW = 4000; 
		this.svgH = this.svgW * (this.appH / this.appW);
		this.cells = [];
		this.stickyNotes = [];
		this.controlButtons = [];
		this.dragging = {};
		this.controlBtnPressed = {};
		this.okPressed = {};
		this.closePressed = {};

		var _this = this;
		var floorImg = document.createElement('img');
		floorImg.onload = function() {
			this.floorImgW = floorImg.naturalWidth;
			this.floorImgH = floorImg.naturalHeight;
			if (_this.state.conferenceInfo !== null && _this.state.paperList !== null)
				_this.drawFloorPlanAndRoomInfo(floorImg.naturalWidth, floorImg.naturalHeight, data.date);
			else
				_this.floorPlanNeedsDraw = true;
		};
		floorImg.src = this.resrcPath + "resrc/images/floorplan.png";

		// Initialize SVG canvas
		this.createSvgCanvas(data.date);

		// Populate with initial data
		if (this.state.conferenceInfo === null || this.state.paperList === null)
			this.fetchData(data.date);

		// SAGE2 Application Settings
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},

	load: function(date) {
		console.log('StickySchedule> Load with state:', this.state);
		if (this.state.conferenceInfo === null || this.state.paperList === null)
			return;

		var i;
		var tStart = this.state.conferenceInfo.dates.start.getTime();
		var tEnd = this.state.conferenceInfo.dates.end.getTime();
		var tDiff = tEnd - tStart;
		this.numberOfDays = Math.round(tDiff / (1000*60*60*24)) + 1;
		this.numberOfRows = this.state.conferenceInfo.sessions.length;
		this.numberOfColumns = this.numberOfDays * this.state.conferenceInfo.rooms.length;
		this.numberOfSchedulers = 0;
		for (i=0; i<this.state.conferenceInfo.sessionTypes.length; i++) {
			if (this.state.conferenceInfo.sessionTypes[i].hasOwnProperty("person"))
				this.numberOfSchedulers++;
		}

		this.cells = [];
		this.stickyNotes = [];
		this.snapCanvas.clear();
		this.errorPopup = null;
		this.errorShown = false;
		this.drawScheduleGrid(date);
		this.drawStickyNotes(date);
		this.drawControlButtons(date);
		this.drawErrorMessages(date);
		if (this.floorPlanNeedsDraw)
			this.drawFloorPlanAndRoomInfo(this.floorImgW, this.floorImgH, date);

		this.refresh(date);
	},

	fetchData: function(date) {
		this.conferenceInfoLoaded = false;
		this.paperListLoaded = false;

		this.readConferenceInfo(date);
		this.readPaperList(date);
	},

	readConferenceInfo: function(date) {
		var _this = this;
		readFile(this.resrcPath + "resrc/info/conferenceinfo.json", function(err, data) {
			if (err) {
				throw err;
			}
			else {
				_this.state.conferenceInfo = JSON.parse(data);
				_this.state.conferenceInfo.dates.start = new Date(_this.state.conferenceInfo.dates.start+"T12:00:00Z");
				_this.state.conferenceInfo.dates.end = new Date(_this.state.conferenceInfo.dates.end+"T12:00:00Z");
				_this.conferenceInfoLoaded = true;
				if (_this.paperListLoaded) {
					_this.load(date);
				}
			}
  		}, "TEXT");
	},

	readPaperList: function(date) {
		var _this = this;
		readFile(this.resrcPath + "resrc/info/paperlist.json", function(err, data) {
			if (err) {
				throw err;
			}
			else {
				_this.state.paperList = JSON.parse(data);
				_this.paperListLoaded = true;
				if (_this.conferenceInfoLoaded) {
					_this.load(date);
				}
			}
  		}, "TEXT");
	},

	createSvgCanvas: function(date) {
		var w = this.appW;
		var h = this.appH;
		var renderW = this.svgW;
		var renderH = this.svgH;

		this.snapCanvas = new Snap(renderW, renderH).attr({ 
			viewBox: "0 0 "+ renderW.toString()+ " "+ renderH.toString(),
			id: this.id + "_snapCanvas",
  			width: w,
  			height:h,
  			fontFamily:"Tahoma, Geneva, sans-serif"
		});

		this.element.appendChild(this.snapCanvas.node);
	},

	drawScheduleGrid: function(date) {
		var gridWRatio = 0.6;
		var gridHRatio = 0.9;
		var gridXEnd = parseInt(this.svgW * gridWRatio, 10);
		var gridYEnd = parseInt(this.svgH * gridHRatio, 10);

		//Patition 1: Grid
		this.snapCanvas.rect(0, 0, gridXEnd, gridYEnd).attr({
			fill: this.defaultFill,
			stroke: this.defaultStroke,
			strokeWidth: 3
		});

		//Partition 2: Sticky
		this.snapCanvas.rect(gridXEnd, 0, this.svgW - gridXEnd, this.svgH).attr({
			fill: this.defaultFill,
			stroke: this.defaultStroke,
			strokeWidth: 3
		});

		//Partition 3: Control
		this.snapCanvas.rect(0, gridYEnd, gridXEnd, this.svgH - gridYEnd).attr({
			fill: this.defaultFill,
			stroke: this.defaultStroke,
			strokeWidth: 3
		});

		// Grid
		var tableX1 = gridXEnd * 0.2;
		var tableX2 = gridXEnd *(1-0.05);
		var tableY1 = gridYEnd * 0.3;
		var tableY2 = gridYEnd*(1-0.05);
		var tableW = tableX2 - tableX1;
		var tableH = tableY2 - tableY1;

		var cellH = parseInt(Math.min(tableH / this.numberOfRows, tableW / this.numberOfColumns), 10);
		var cellW = cellH * this.state.conferenceInfo.rooms.length;

		var dayH = cellW*0.25;

		var cellX = tableX1;
		var cellY = tableY1 - cellH - dayH;

		this.snapCanvas.text(gridXEnd / 2, cellY * 0.8, "StickySchedule: Conference Scheduler").attr({
				fill: this.textColor,
				"font-size": "42px",
				"text-anchor" : "middle"
		});

		var i, j;
		var partitionLength = cellY + dayH + (cellH * (this.numberOfRows+1));
		var partitionColor = this.textColor;
		var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
		for (i=0; i<this.numberOfDays; i++) {
			var ttime = new Date(this.state.conferenceInfo.dates.start.getTime() + (1000*60*60*24*i));
			var tday = daysOfWeek[ttime.getDay()];
			var tdate = ttime.getFullYear() + "-" + (ttime.getMonth()+1) + "-" + ttime.getDate();
			this.snapCanvas.line(cellX, cellY, cellX, partitionLength).attr({
				stroke: partitionColor,
				strokeWidth: 6
			});
			this.snapCanvas.rect(cellX, cellY, cellW, dayH).attr({
				fill: this.defaultButtonFill,
				stroke: this.defaultStroke,
				strokeWidth: 3
			});
			this.snapCanvas.text(cellX + (cellW*0.5), cellY + (dayH*0.4), "Day " + (i+1) + ": " + tday).attr({
				fill: this.textColor,
				"font-size": this.textSize,
				"text-anchor": "middle"
			});
			this.snapCanvas.text(cellX + (cellW*0.5), cellY + (dayH*0.8), "(" + tdate + ")").attr({
				fill: this.textColor,
				"font-size": this.textSize,
				"text-anchor": "middle"
			});
			
			cellX += cellW;
		}
		this.snapCanvas.line(cellX, cellY, cellX, partitionLength).attr({
			stroke: partitionColor,
			strokeWidth: 6
		});

		cellW = cellH;
		var sessionW = cellW * 2;
		cellX = tableX1 - sessionW;
		cellY = tableY1;
		for (i=0; i<this.state.conferenceInfo.sessions.length; i++) {
			this.snapCanvas.rect(cellX, cellY, sessionW, cellH).attr({
				fill: this.defaultFill,
				stroke: this.defaultStroke,
				strokeWidth: 3
			});
			this.snapCanvas.text(cellX + (sessionW*0.08), cellY + (cellH*0.7), this.state.conferenceInfo.sessions[i].label).attr({
				fill: this.textColor,
				"font-size": this.textSize,
				"text-anchor": "left"
			});
			cellY += cellH;
		}

		cellX = tableX1;
		cellY = tableY1-cellH;
		for (i=0; i<this.numberOfColumns; i++) {
			this.snapCanvas.rect(cellX, cellY, cellW, cellH).attr({
				fill: this.defaultFill,
				stroke: this.defaultStroke,
				strokeWidth: 3
			});
			this.snapCanvas.text(cellX + (cellW*0.5), cellY + (cellH*0.7), this.state.conferenceInfo.rooms[i%this.state.conferenceInfo.rooms.length].name).attr({
				fill: this.textColor,
				'font-size': this.textSize,
				"text-anchor": "middle"
			});
			cellX += cellW;
		}

		var logoW = sessionW;
		var logoH = dayH + cellH;
		var logoX = tableX1 - logoW;
		var logoY = tableY1 - logoH;
		this.snapCanvas.rect(logoX, logoY, logoW, logoH).attr({
			fill: this.defaultFill,
			stroke: this.defaultStroke,
			strokeWidth: 3
		});
		var imgH = parseInt(logoH * 0.9, 10);
		var imgW = parseInt(imgH * (951.0 / 847.0), 10);
		var imgX = logoX + (logoW / 2) - (imgW / 2);
		var imgY = logoY + (logoH / 2) - (imgH / 2);
		this.snapCanvas.image(this.resrcPath +"resrc/images/logo.png", imgX, imgY, imgW, imgH);

		var hallCounter;
		var cellCounter = 0;
		var ratioOfCell = 6;
		var mhOffset = cellW/ratioOfCell;
		var hiddenCellW = mhOffset;
		cellX = tableX1 + (cellW - mhOffset);
		cellY = tableY1;
		var holderW = cellW;
		var holderH = cellH;
		var hiddenCellH = cellH;
		var nMerge = this.numberOfRows * (this.numberOfColumns - this.numberOfDays);
		var fRoom;
		for (i=0; i<this.numberOfRows; i++) {
			hallCounter = 1;
			fRoom = 0;
			for (j=0; j<(this.numberOfColumns - this.numberOfDays); j++) {
				if(hallCounter % this.state.conferenceInfo.rooms.length == 0) {
					cellX += holderW;
					hallCounter = 1;
					fRoom++;
				}
				this.cells.push({x: cellX, y: cellY, w: hiddenCellW, h: hiddenCellH, fillX: cellX - (cellW - mhOffset), fillY: cellY, fillW: 2 * cellW, fillH: cellH, occupied: false, constraints: null, otherCells: [nMerge + i*this.numberOfColumns + j+fRoom, nMerge + i*this.numberOfColumns + j+fRoom+1]});
				var cday = parseInt(j / this.state.conferenceInfo.rooms.length, 10);
				var sessionConstraint = this.state.conferenceInfo.sessions[i].constraints;
				if (sessionConstraint !== null && sessionConstraint.days.indexOf(cday) >= 0)
					this.cells[this.cells.length-1].constraints = sessionConstraint.type;
				var numberOfSubPartitions = this.state.conferenceInfo.rooms.length - hallCounter;
				this.snapCanvas.rect(cellX, cellY, hiddenCellW, hiddenCellH).attr({
					id: this.id + "_HiddenHolder_" + cellCounter,
					fill: this.defaultFill,
					stroke: this.defaultStroke,
					strokeWidth: 1,
					"stroke-dasharray": "5,5",
					holdsSticky: ""
				});
				cellX += holderW;
				cellCounter++;
				hallCounter++;
			}
			cellY += cellH;
			cellX = tableX1 + (cellW - mhOffset);
		}

		cellX = tableX1;
		cellY = tableY1;
		cellCounter = 0;
		hallCounter = 0;
		for (i=0; i<this.numberOfRows; i++) {
			for (j=0; j<this.numberOfColumns; j++) {
				if(hallCounter >= this.state.conferenceInfo.rooms.length) {
					hallCounter = 0;
				}
				this.cells.push({x: cellX, y: cellY, w: cellW, h: cellH, fillX: cellX, fillY: cellY, fillW: cellW, fillH: cellH, occupied: false, constraints: null});
				var cday = parseInt(j / this.state.conferenceInfo.rooms.length, 10);
				var cellColor = this.defaultFill;
				var sessionConstraint = this.state.conferenceInfo.sessions[i].constraints;
				var constraintType = "";
				if (sessionConstraint !== null && sessionConstraint.days.indexOf(cday) >= 0) {
					constraintType = sessionConstraint.type;
					cellColor = "rgba(150, 150, 150, 0.3)";
					this.cells[this.cells.length-1].constraints = sessionConstraint.type;
				}
				this.snapCanvas.rect(cellX, cellY, cellW, cellH).attr({
					id: this.id + "_Holder_" + cellCounter,
					fill: cellColor,   
					stroke: this.defaultStroke,
					strokeWidth: 2,
					holdsSticky: "",
					hallNumber: hallCounter,
					sessionConstraint: constraintType
				});
				cellX += cellW;
				cellCounter++;
				hallCounter++;
			}
			cellY += cellH;
			cellX = tableX1;
		}

		var stickyW = parseInt((this.svgW - gridXEnd) * 0.9, 10);
		var stickyH = parseInt(this.svgH * 0.9, 10);
		var offsetX = parseInt((this.svgW - gridXEnd) * 0.05, 10);
		var offsetY = parseInt(this.svgH * 0.05, 10);
		var reservoirRatio = 3;

		var i;
		var cellX = gridXEnd + offsetX;
		var cellY = offsetY;
		var cellW = stickyW / (reservoirRatio+1);
		var cellH = parseInt(Math.min(stickyH / this.state.conferenceInfo.sessionTypes.length, cellW * 1.5), 10);
		var stickyReservoirW = cellW * reservoirRatio;
		for (i=0; i<this.state.conferenceInfo.sessionTypes.length; i++) {
			this.snapCanvas.rect(cellX, cellY, cellW, cellH).attr({
				fill: this.defaultFill,
				stroke: this.defaultStroke,
				strokeWidth: 3
			});
			this.snapCanvas.text(cellX + (cellW*0.5), cellY+(cellH*0.5), this.state.conferenceInfo.sessionTypes[i].name).attr({
				fill: this.textColor,
				"font-size": this.textSize,
				"text-anchor": "middle"
			});
			cellY += cellH;
		}

		cellX += cellW;
		cellY = offsetY;
		cellW = stickyReservoirW;
		for (i=0; i<this.state.conferenceInfo.sessionTypes.length; i++) {
			this.snapCanvas.rect(cellX, cellY, cellW, cellH).attr({
				fill: this.defaultFill,
				stroke: this.defaultStroke,
				strokeWidth: 3
			});
			cellY += cellH;
		}
	},
	
	drawStickyNotes: function(date) {
		var gridWRatio = 0.6;
		var gridHRatio = 0.9;
		var gridXEnd = parseInt(this.svgW * gridWRatio, 10);
		var gridYEnd = parseInt(this.svgH * gridHRatio, 10);
		var stickyW = parseInt((this.svgW - gridXEnd) * 0.9, 10);
		var stickyH = parseInt(this.svgH * 0.9, 10);
		var offsetX = parseInt((this.svgW - gridXEnd) * 0.05, 10);
		var offsetY = parseInt(this.svgH * 0.05, 10);
		var reservoirRatio = 3;

		var i, j, k;
		var theme = "";
		var cellW = stickyW / (reservoirRatio+1);
		var cellH = parseInt(Math.min(stickyH / this.state.conferenceInfo.sessionTypes.length, cellW * 1.5), 10);
		var cellX = gridXEnd + offsetX + cellW;
		var cellY = offsetY;
		var origCellY;
		var stickyReservoirW = cellW * reservoirRatio;
		var postItW = parseInt(stickyReservoirW / 6.7, 10);
		var padding = parseInt(postItW * 0.1, 10);
		var postItH = parseInt((cellH / 2.0) - (1.5 * padding), 10);
		var wrapW = this.svgW - offsetX - padding;
		var sessionTitle;
		var sessionAward
		var htmlText;
		var stickyText;
		for (i=0; i<this.state.conferenceInfo.sessionTypes.length; i++) {
			theme = this.state.conferenceInfo.sessionTypes[i].name;
			if (this.state.paperList[theme].constructor !== Array)
				continue;
			origCellY = cellY;
			for (j=0; j<this.state.paperList[theme].length; j++) {
				if ((cellX + postItW) > wrapW){
					cellX = gridXEnd + offsetX + cellW;
					cellY += postItH + padding;
				}
				this.stickyNotes.push({rect: null, text: null, theme: theme, x: cellX+padding, y: cellY+padding, w: postItW, h: postItH, origX: cellX+padding, origY: cellY+padding, origW: postItW, origH: postItH, cells: []});
				sessionTitle = this.state.paperList[theme][j].title;
				sessionAward = (this.state.paperList[theme][j].best) ? "&#x2605;"/*" &#x1f3c6;"*/ : ""
				htmlText = "<div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"color: #000000; width: 100%; height: 100%; overflow: hidden;\"><p style=\"font-weight: normal; word-break: break-word; hyphens: auto;\">" + sessionAward + sessionTitle + "</p></div>";
				this.stickyNotes[this.stickyNotes.length-1].rect = this.snapCanvas.rect(0, 0, postItW, postItH).attr({
					id: this.id + "_sticky_" + i + "." + j,
					fill: this.state.conferenceInfo.sessionTypes[i].color,
					stroke: this.defaultStroke,
					strokeWidth: 1,
					transform: "translate(" + (cellX+padding) + "," + (cellY+padding) + ")"
				});
				this.stickyNotes[this.stickyNotes.length-1].text = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject'); //Create a path in SVG's namespace
				this.stickyNotes[this.stickyNotes.length-1].text.setAttribute("id", this.id + "_sticky_text_" + i + "." + j);
				this.stickyNotes[this.stickyNotes.length-1].text.setAttribute("x", 0);
       			this.stickyNotes[this.stickyNotes.length-1].text.setAttribute("y", 0);
       			this.stickyNotes[this.stickyNotes.length-1].text.setAttribute("style", "display: block; padding: " + (padding / 6) + "px; width: " + (postItW - (2 * padding / 6)) + "px; height: " + (postItH - (2 * padding / 6)) + "px; font-family: Tahoma, Geneva, sans-serif; font-size: " + this.stickyFontSize + ";");
       			this.stickyNotes[this.stickyNotes.length-1].text.setAttribute("transform", "translate(" + (cellX+padding) + "," + (cellY+padding) + ")");
				this.stickyNotes[this.stickyNotes.length-1].text.innerHTML = htmlText;
				this.snapCanvas.append(this.stickyNotes[this.stickyNotes.length-1].text);
				
				cellX += postItW + padding;
			}
			cellX = gridXEnd + offsetX + cellW;
			cellY = origCellY + cellH;
		}
		this.stickyPadding = padding;
	},

	drawControlButtons: function(date) {
		var gridWRatio = 0.6;
		var gridHRatio = 0.9;
		var gridXEnd = parseInt(this.svgW * gridWRatio, 10);
		var gridYEnd = parseInt(this.svgH * gridHRatio, 10);

		var buttonFill = "#2D2D2D";
		var btnTextSize = 42;
		var numberOfButtons = 4;
		var controlLeft = 165;
		var controlW = gridXEnd;
		var controlH = this.svgH - gridYEnd;
		var buttonH = controlH * 0.7;
		var padding = controlH * 0.15;
		var buttonW = ((controlW - controlLeft) / (numberOfButtons + 2)) - (2 * padding);
		var buttonX = controlLeft;
		var buttonY = gridYEnd + padding;

		this.snapCanvas.rect(buttonX, buttonY, buttonW, buttonH).attr({
			fill: buttonFill,
			stroke: this.defaultStroke,
			strokeWidth: 3
		});
		this.snapCanvas.text(buttonX + (buttonW / 2), buttonY+(2*buttonH/3), "Tutorial").attr({
			fill: this.textColor,
			"font-size": btnTextSize,
			"text-anchor": "middle"
		});
		this.controlButtons.push({x: buttonX, y: buttonY, w: buttonW, h: buttonH});

		buttonX += buttonW + padding;
		this.snapCanvas.rect(buttonX, buttonY, buttonW, buttonH).attr({
			fill: buttonFill,
			stroke: this.defaultStroke,
			strokeWidth: 3
		});
		this.snapCanvas.text(buttonX + (buttonW / 2), buttonY+(2*buttonH/3), "Room Info").attr({
			fill: this.textColor,
			"font-size": btnTextSize,
			"text-anchor": "middle"
		});
		this.controlButtons.push({x: buttonX, y: buttonY, w: buttonW, h: buttonH});

		buttonX += buttonW + padding;
		this.snapCanvas.rect(buttonX, buttonY, buttonW, buttonH).attr({
			fill: buttonFill,
			stroke: this.defaultStroke,
			strokeWidth: 3
		});
		this.snapCanvas.text(buttonX + (buttonW / 2), buttonY+(2*buttonH/3), "Floor Plan").attr({
			fill: this.textColor,
			"font-size": btnTextSize,
			"text-anchor": "middle"
		});
		this.controlButtons.push({x: buttonX, y: buttonY, w: buttonW, h: buttonH});

		buttonX += buttonW + padding;
		this.snapCanvas.rect(buttonX, buttonY, buttonW, buttonH).attr({
			fill: buttonFill,
			stroke: this.defaultStroke,
			strokeWidth: 3
		});
		this.snapCanvas.text(buttonX + (buttonW / 2), buttonY+(2*buttonH/3), "Next Scheduler").attr({
			fill: this.textColor,
			"font-size": btnTextSize,
			"text-anchor": "middle"
		});
		this.controlButtons.push({x: buttonX, y: buttonY, w: buttonW, h: buttonH});

		buttonX += buttonW + padding;
		buttonW = 2 * buttonW + padding;
		var schedulerText = "Current Scheduler: " + this.state.conferenceInfo.sessionTypes[0].person;
		this.snapCanvas.rect(buttonX, buttonY, buttonW, buttonH).attr({
			fill: "#000000",
			stroke: this.defaultStroke,
			strokeWidth: 3
		});
		this.currentSchedulerText = this.snapCanvas.text(buttonX + (buttonW / 2), buttonY+(2*buttonH/3), schedulerText).attr({
			fill: this.state.conferenceInfo.sessionTypes[0].color,
			"font-size": btnTextSize,
			"text-anchor": "middle"
		});
	},

	drawErrorMessages: function(date) {
		this.errorPopup = this.snapCanvas.g().attr({
			visibility: "hidden"
		});
		this.errorPopup.rect(0, 0, this.svgW, this.svgH).attr({
			fill: "rgba(120, 120, 120, 0.5)"
		});

		var popupX = (this.svgW*0.345) - 400;
		var popupY = (this.svgH*0.5) - 220;
		var popupW = 800;
		var popupH = 440;
		this.errorPopup.rect(popupX, popupY, popupW, popupH).attr({
			fill: "#000000",
			stroke: this.defaultStroke,
			strokeWidth: 3
		});
		this.errorPopup.text(popupX+(popupW/2), popupY+114, "Error:").attr({
			fill: "#FFAAAA",
			"font-size": "56px",
			"text-anchor": "middle"
		});
		this.errorText = this.errorPopup.text(popupX+(popupW/2), popupY+200, "").attr({
			fill: "#FFFFFF",
			"font-size": "42px",
			"text-anchor": "middle"
		});
		this.errorPopup.rect(popupX+popupW-200, popupY+popupH-100, 150, 50).attr({
			fill: "#B4B4B4",
			stroke: "#4B4B4B",
			strokeWidth: 3
		});
		this.errorPopup.text(popupX+popupW-125, popupY+popupH-58, "OK").attr({
			fill: "#000000",
			"font-size": "42px",
			"text-anchor": "middle"
		});
		this.okButton = {x: popupX+popupW-200, y: popupY+popupH-100, w: 150, h: 50};
	},

	drawFloorPlanAndRoomInfo: function(imgWidth, imgHeight, date) {
		var i;
		this.extraInfoPopup = this.snapCanvas.g().attr({
			visibility: "hidden"
		});

		this.extraInfoPopup.rect(0, 0, this.svgW, this.svgH * 0.9).attr({
			fill: "rgba(120, 120, 120, 0.5)"
		});
		this.extraInfoPopup.rect(this.svgW * 0.6, this.svgH * 0.9, this.svgW * 0.4, this.svgH * 0.1).attr({
			fill: "rgba(120, 120, 120, 0.5)"
		});

		var imgH = this.svgH * 0.67;
		var imgW = parseInt(imgH * (16.0 / 9.0), 10);
		var imgX = (this.svgW / 2) - (imgW / 2);
		var imgY = (this.svgH / 2) - (imgH / 2);
		this.tutorial = this.snapCanvas.image(this.resrcPath +"resrc/images/tutorial1.png", imgX, imgY, imgW, imgH).attr({
			visibility: "hidden"
		});

		imgH = this.svgH * 0.5;
		imgW = parseInt(imgH * (imgWidth / imgHeight), 10);
		imgX = (this.svgW / 2) + 100;
		imgY = (this.svgH / 2) - (imgH / 2);
		this.floorPlan = this.snapCanvas.image(this.resrcPath +"resrc/images/floorplan.png", imgX, imgY, imgW, imgH).attr({
			visibility: "hidden"
		});
		
		var infoH = this.svgH * 0.5;
		var infoW = infoH * 1.333;
		var infoX = (this.svgW / 2) - infoW - 100;
		var infoY = (this.svgH / 2) - (infoH / 2);
		var htmlText = "<div style=\"display: block; width: 100%; height: 100%; background-color: #FFFFFF; color: #000000;\"><h1 style=\"font-size: 56px; font-weight: bold; text-align: center; padding-top: 32px;\">Room Information</h1><ol style=\"margin-left: 100px; font-size: 42px; font-weight: bold; text-align: left;\">";
		for( i=0; i<this.state.conferenceInfo.rooms.length; i++) {
			htmlText += "<li style=\"margin-top: 32px;\">";
			htmlText += "<p>" + this.state.conferenceInfo.rooms[i].name + "</p>";
			htmlText += "<p style=\"font-size: 36px; font-weight: normal;\"><span style=\"display: inline-block; width: " + (infoW-450) + "px;\">Room capacity:</span>" + this.state.conferenceInfo.rooms[i].capacity + "</p>";
			htmlText += "<p style=\"font-size: 36px; font-weight: normal;\"><span style=\"display: inline-block; width: " + (infoW-450) + "px;\">Projector size:</span>" + this.state.conferenceInfo.rooms[i].projector.size + "</p>";
			htmlText += "<p style=\"font-size: 36px; font-weight: normal;\"><span style=\"display: inline-block; width: " + (infoW-450) + "px;\">Projector resolution:</span>" + this.state.conferenceInfo.rooms[i].projector.resolution + "</p>";
			htmlText += "</li>";
		}
		htmlText += "</ol></div>";
		this.roomInfo = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject'); //Create a path in SVG's namespace
		this.roomInfo.setAttribute("x", 0);
		this.roomInfo.setAttribute("y", 0);
		this.roomInfo.setAttribute("style", "display: block; width: " + infoW + "px; height: " + infoH + "px; font-family: Tahoma, Geneva, sans-serif;");
		this.roomInfo.setAttribute("transform", "translate(" + infoX + "," + infoY + ")");
		this.roomInfo.setAttribute("visibility", "hidden");
		this.roomInfo.innerHTML = htmlText;
		this.snapCanvas.append(this.roomInfo);
	},

	draw: function(date) {
		// Called when app is refreshed
		console.log('StickySchedule> Draw with state:', this.state);
	},

	resize: function(date) {
		// Called when window is resized
		this.appW = this.sage2_width;
		this.appH = this.sage2_height;
		this.snapCanvas.attr({
  			width: this.appW,
  			height: this.appH,
  		});

		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	event: function(eventType, position, user_id, data, date) {
		var i, selected, locX, locY, stickyRect, stickyText, dropCell, occupied, constraints, reject;
		if (eventType === "pointerPress" && (data.button === "left")) {
			locX = parseInt(position.x / this.appW * this.svgW, 10);
			locY = parseInt(position.y / this.appH * this.svgH, 10);
			if (this.errorShown) {
				if (locX >= this.okButton.x && locX <= this.okButton.x + this.okButton.w && locY >= this.okButton.y && locY <= this.okButton.y + this.okButton.h) {
					this.okPressed[user_id.id] = true;
				}
			}
			else {
				selected = -1;
				if (!this.extraInfoShown) {
					for (i=0; i<this.stickyNotes.length; i++) {
						if (locX >= this.stickyNotes[i].x && locX <= this.stickyNotes[i].x + this.stickyNotes[i].w && locY >= this.stickyNotes[i].y && locY <= this.stickyNotes[i].y + this.stickyNotes[i].h) {
							selected = i;
							break;
						}
					}
				}
				if (selected >= 0) {
					for (i=0; i<this.stickyNotes[selected].cells.length; i++) {
						this.cells[this.stickyNotes[selected].cells[i]].occupied = false;
					}
					this.stickyNotes[selected].cells = [];
					this.dragging[user_id.id] = {sticky: selected, dx: locX - this.stickyNotes[selected].x, dy: locY - this.stickyNotes[selected].y};
					stickyRect = this.stickyNotes[selected].rect;
					stickyRect.remove();
					this.snapCanvas.append(stickyRect);
					stickyText = this.stickyNotes[selected].text;
					this.snapCanvas.node.removeChild(stickyText);
					this.snapCanvas.append(stickyText);
				}
				else {
					for (i=0; i<this.controlButtons.length; i++) {
						if (locX >= this.controlButtons[i].x && locX <= this.controlButtons[i].x + this.controlButtons[i].w && locY >= this.controlButtons[i].y && locY <= this.controlButtons[i].y + this.controlButtons[i].h) {
							this.controlBtnPressed[user_id.id] = i;
						}
					}
				}
			}
		}
		else if (eventType === "pointerMove") {
			locX = parseInt(position.x / this.appW * this.svgW, 10);
			locY = parseInt(position.y / this.appH * this.svgH, 10);
			if (this.errorShown && this.okPressed[user_id.id]) {
				if (!(locX >= this.okButton.x && locX <= this.okButton.x + this.okButton.w && locY >= this.okButton.y && locY <= this.okButton.y + this.okButton.h)) {
					this.okPressed[user_id.id] = false;
				}
			}
			if (this.dragging[user_id.id]) {
				selected = this.dragging[user_id.id].sticky;
				this.stickyNotes[selected].x = locX - this.dragging[user_id.id].dx;
				this.stickyNotes[selected].y = locY - this.dragging[user_id.id].dy;

				stickyRect = this.stickyNotes[selected].rect;
				stickyRect.attr({
					transform: "translate(" + this.stickyNotes[selected].x + "," + this.stickyNotes[selected].y + ")"
				});
				stickyText = this.stickyNotes[selected].text;
				stickyText.setAttribute("transform", "translate(" + this.stickyNotes[selected].x + "," + this.stickyNotes[selected].y + ")");
			}
			if (this.controlBtnPressed[user_id.id] && this.controlBtnPressed[user_id.id] >= 0) {
				if (!(locX >= this.controlButtons[this.controlBtnPressed[user_id.id]].x && locX <= this.controlButtons[this.controlBtnPressed[user_id.id]].x + this.controlButtons[this.controlBtnPressed[user_id.id]].w && locY >= this.controlButtons[this.controlBtnPressed[user_id.id]].y && locY <= this.controlButtons[this.controlBtnPressed[user_id.id]].y + this.controlButtons[this.controlBtnPressed[user_id.id]].h)) {
					this.controlBtnPressed[user_id.id] = -1;
				}
			}
		}
		else if (eventType === "pointerRelease" && (data.button === "left")) {
			locX = parseInt(position.x / this.appW * this.svgW, 10);
			locY = parseInt(position.y / this.appH * this.svgH, 10);
			if (this.errorShown && this.okPressed[user_id.id]) {
				if (locX >= this.okButton.x && locX <= this.okButton.x + this.okButton.w && locY >= this.okButton.y && locY <= this.okButton.y + this.okButton.h) {
					this.errorPopup.attr({
						visibility: "hidden"
					});
					this.errorShown = false;
					this.okPressed = {};
				}
			}
			if (this.dragging[user_id.id]) {
				selected = this.dragging[user_id.id].sticky;
				dropCell = -1;
				reject = false;
				for (i=0; i<this.cells.length; i++) {
					if (locX >= this.cells[i].x && locX <= this.cells[i].x + this.cells[i].w && locY >= this.cells[i].y && locY <= this.cells[i].y + this.cells[i].h) {
						dropCell = i;
						break;
					}
				}
				if (dropCell >= 0) {
					occupied = this.cells[dropCell].occupied;
					constraints = this.cells[dropCell].constraints ? [this.cells[dropCell].constraints] : [];
					if (this.cells[dropCell].otherCells) {
						for (i=0; i<this.cells[dropCell].otherCells.length; i++) {
							occupied |= this.cells[this.cells[dropCell].otherCells[i]].occupied;
							if (this.cells[this.cells[dropCell].otherCells[i]].constraints) constraints.push(this.cells[this.cells[dropCell].otherCells[i]].constraints);
						}
					}
					if (occupied) {
						this.errorShown = true;
						this.errorPopup.attr({
							visibility: "visible"
						});
						this.errorText.attr({
							text: "This cell is occupied!"
						});
						this.errorPopup.remove();
						this.snapCanvas.append(this.errorPopup);
						reject = true;
					}
					else if (constraints.length > 0 && constraints.indexOf(this.stickyNotes[selected].theme) < 0) {
						this.errorShown = true;
						this.errorPopup.attr({
							visibility: "visible"
						});
						this.errorText.attr({
							text: "Constraint violation!"
						});
						this.errorPopup.remove();
						this.snapCanvas.append(this.errorPopup);
						reject = true;
					}
					else {
						this.stickyNotes[selected].x = this.cells[dropCell].fillX;
						this.stickyNotes[selected].y = this.cells[dropCell].fillY;
						this.stickyNotes[selected].w = this.cells[dropCell].fillW;
						this.stickyNotes[selected].h = this.cells[dropCell].fillH;
						this.cells[dropCell].occupied = true;
						this.stickyNotes[selected].cells = [dropCell];
						if (this.cells[dropCell].otherCells) {
							for (i=0; i<this.cells[dropCell].otherCells.length; i++) {
								this.cells[this.cells[dropCell].otherCells[i]].occupied = true;
								this.stickyNotes[selected].cells.push(this.cells[dropCell].otherCells[i]);
							}
						}
						stickyRect = this.stickyNotes[this.dragging[user_id.id].sticky].rect;
						stickyRect.attr({
							width: this.stickyNotes[selected].w,
							height: this.stickyNotes[selected].h,
							transform: "translate(" + this.stickyNotes[selected].x + "," + this.stickyNotes[selected].y + ")"
						});
						stickyText = this.stickyNotes[this.dragging[user_id.id].sticky].text;
						stickyText.style.width = (this.stickyNotes[selected].w - (2 * this.stickyPadding / 3)) + "px";
						stickyText.style.height = (this.stickyNotes[selected].h - (2 * this.stickyPadding / 3)) + "px";
						console.log(this.stickyFontSizeInCell);
						stickyText.style.fontSize = this.stickyFontSizeInCell;
						stickyText.setAttribute("transform", "translate(" + this.stickyNotes[selected].x + "," + this.stickyNotes[selected].y + ")");
					}
				}
				if (dropCell < 0 || reject) {
					this.stickyNotes[selected].x = this.stickyNotes[selected].origX;
					this.stickyNotes[selected].y = this.stickyNotes[selected].origY;
					this.stickyNotes[selected].w = this.stickyNotes[selected].origW;
					this.stickyNotes[selected].h = this.stickyNotes[selected].origH;
					stickyRect = this.stickyNotes[this.dragging[user_id.id].sticky].rect;
					stickyRect.attr({
						width: this.stickyNotes[selected].w,
						height: this.stickyNotes[selected].h,
						transform: "translate(" + this.stickyNotes[selected].x + "," + this.stickyNotes[selected].y + ")"
					});
					stickyText = this.stickyNotes[this.dragging[user_id.id].sticky].text;
					stickyText.style.width = (this.stickyNotes[selected].w - (2 * this.stickyPadding / 3)) + "px";
					stickyText.style.height = (this.stickyNotes[selected].h - (2 * this.stickyPadding / 3)) + "px";
					stickyText.style.fontSize = this.stickyFontSize;
					stickyText.setAttribute("transform", "translate(" + this.stickyNotes[selected].x + "," + this.stickyNotes[selected].y + ")");
				}
				this.dragging[user_id.id] = null;
			}
			if (this.controlBtnPressed[user_id.id] !== undefined && this.controlBtnPressed[user_id.id] >= 0) {
				if (locX >= this.controlButtons[this.controlBtnPressed[user_id.id]].x && locX <= this.controlButtons[this.controlBtnPressed[user_id.id]].x + this.controlButtons[this.controlBtnPressed[user_id.id]].w && locY >= this.controlButtons[this.controlBtnPressed[user_id.id]].y && locY <= this.controlButtons[this.controlBtnPressed[user_id.id]].y + this.controlButtons[this.controlBtnPressed[user_id.id]].h) {
					switch (this.controlBtnPressed[user_id.id]) {
						case 0: // tutorial
							if (this.tutorialShown) {
								if (!this.roomInfoShown && !this.floorPlanShown) {
									this.extraInfoPopup.attr({
										visibility: "hidden"
									});
								}
								this.tutorial.attr({
									visibility: "hidden"
								});
							}
							else {
								if (!this.roomInfoShown && !this.floorPlanShown) {
									this.extraInfoPopup.remove();
									this.snapCanvas.append(this.extraInfoPopup);
									this.extraInfoPopup.attr({
										visibility: "visible"
									});
								}
								this.roomInfo.setAttribute("visibility", "hidden");
								this.roomInfoShown = false;
								this.floorPlan.attr({
									visibility: "hidden"
								});
								this.floorPlanShown = false;
								this.tutorial.remove();
								this.snapCanvas.append(this.tutorial);
								this.tutorial.attr({
									visibility: "visible"
								});
							}
							this.tutorialShown = !this.tutorialShown;
							break;
						case 1: // room info
							if (this.roomInfoShown) {
								if (!this.tutorialShown && !this.floorPlanShown) {
									this.extraInfoPopup.attr({
										visibility: "hidden"
									});
								}
								this.roomInfo.setAttribute("visibility", "hidden");
							}
							else {
								if (!this.tutorialShown && !this.floorPlanShown) {
									this.extraInfoPopup.remove();
									this.snapCanvas.append(this.extraInfoPopup);
									this.extraInfoPopup.attr({
										visibility: "visible"
									});
								}
								this.tutorial.attr({
									visibility: "hidden"
								});
								this.tutorialShown = false;
								this.snapCanvas.node.removeChild(this.roomInfo);
								this.snapCanvas.append(this.roomInfo);
								this.roomInfo.setAttribute("visibility", "visible");
							}
							this.roomInfoShown = !this.roomInfoShown;
							break;
						case 2: // floor plan
							if (this.floorPlanShown) {
								if (!this.tutorialShown && !this.roomInfoShown) {
									this.extraInfoPopup.attr({
										visibility: "hidden"
									});
								}
								this.floorPlan.attr({
									visibility: "hidden"
								});
							}
							else {
								if (!this.tutorialShown && !this.roomInfoShown) {
									this.extraInfoPopup.remove();
									this.snapCanvas.append(this.extraInfoPopup);
									this.extraInfoPopup.attr({
										visibility: "visible"
									});
								}
								this.tutorial.attr({
									visibility: "hidden"
								});
								this.tutorialShown = false;
								this.floorPlan.remove();
								this.snapCanvas.append(this.floorPlan);
								this.floorPlan.attr({
									visibility: "visible"
								});
							}
							this.floorPlanShown = !this.floorPlanShown;
							break;
						case 3: // next scheduler
							this.currentScheduler = (this.currentScheduler + 1) % this.numberOfSchedulers;
							this.currentSchedulerText.attr({
								text: "Current Scheduler: " + this.state.conferenceInfo.sessionTypes[this.currentScheduler].person,
								fill: this.state.conferenceInfo.sessionTypes[this.currentScheduler].color
							});
							break;
					}
					this.extraInfoShown = this.tutorialShown || this.roomInfoShown || this.floorPlanShown;
					this.controlBtnPressed[user_id.id] = -1;
				}
			}
		}
	}
});
