// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-16

//

/* global d3 */
"use strict";

var CSV_Reader = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.element.id = "div" + data.id;

		this.resizeEvents = /* "onfinish"; */ "continuous";

		// save the view box (coordinate system)
		this.box = [data.width, data.height];

		// attach the SVG into the this.element node provided to us
		var box = "0,0," + this.box[0] + "," + this.box[1];
		this.svg = d3.select(this.element).append("svg")
			.attr("width",   data.width)
			.attr("height",  data.height)
			.attr("viewBox", box);

		// in case we want to allow for more interactive d3
		// this.passSAGE2PointerAsMouseEvents = true;

		this.svg.append("rect")
			.attr("class", "bg")
			.attr("width", "100%")
			.attr("height", "100%")
			.style("fill", "#D1E2E8");

		this.bars   = this.svg.selectAll(".dataEntry");
		this.lines  = this.svg.selectAll(".dataLine");
		this.points = this.svg.selectAll(".dataPoint");

		this.drawModeNames  = ["bar", "line", "scatter"];
		this.drawModeTitles = [
			"CSV Reader - Bar Chart",
			"CSV Reader - Line Chart",
			"CSV Reader - Scatterplot"
		];

		this.state.drawMode        = this.state.drawMode || 0;
		this.state.primaryColumn   = this.state.primaryColumn || 0;
		this.state.secondaryColumn = this.state.secondaryColumn || 0;

		console.log("creating controls");
		this.controls.addButton({label: "Mode",  position: 1,  identifier: "ModeToggle"});
		this.controls.addButton({type: "next",   position: 5,  identifier: "NextValPrim"});
		this.controls.addButton({label: "Prim.", position: 4,  identifier: "PrimVal"});
		this.controls.addButton({type: "prev",   position: 3,  identifier: "PrevValPrim"});
		this.controls.addButton({label: "Sort",  position: 7,  identifier: "SortToggle"});
		this.controls.addButton({type: "next",   position: 9,  identifier: "NextValSec"});
		this.controls.addButton({label: "Sec.",  position: 10, identifier: "SecVal"});
		this.controls.addButton({type: "prev",   position: 11, identifier: "PrevValSec"});
		this.controls.addButton({label: "Col 1", position: 12, identifier: "FirstColToggle"});

		this.controls.finishedAddingControls();

		// load csv after controls are finished

		this.csvSrc = this.state.file;
		this.csvData = [];
		this.headers = [];
		this.state.useFirstColumn = this.state.useFirstColumn || false; // only usable with line and scatter

		this.state.sorted = this.state.sorted || false;
		this.needsResort = true;
		this.load_csv(data.date);

		this.colored = true;
	},

	load: function(date) {
		// empty
	},

	load_csv: function(date) {
		var _this = this;

		d3.csv(this.csvSrc)
			.row(function(d, i) {
				var thisRow;

				_this.headers = Object.keys(d);

				thisRow = Object.keys(d).map(function(el) {
					return d[el];
				});

				if (_this.csvData.length < 500) {
					_this.csvData.push({
						number: i,
						key: thisRow[0],
						values: thisRow.slice(1, thisRow.length),
						valuesFull: thisRow
					});
				} else {
					_this.resizeEvents = "onfinish";
				}

			})
			.get(function(error, rows) {
				if (error) {
					console.log(error);
				}

				_this.numVals = _this.csvData[0].values.length;
				_this.draw_d3(date);
			});
	},

	draw_d3: function(date) {

		var width  = this.element.clientWidth;
		var height = this.element.clientHeight;

		var primInd   = this.state.primaryColumn;
		var secInd    = this.state.secondaryColumn;
		var isColored = this.colored;

		var drawTextLabels = (width - (20 * this.csvData.length)) > 0;
		var axisSpacing = 60;

		// clear axes
		this.svg.selectAll(".x-axis").remove();
		this.svg.selectAll(".y-axis").remove();

		// clear bars
		this.svg.selectAll(".dataEntry")
			.selectAll(".dataBar").remove();

		this.svg.selectAll(".dataEntry")
			.selectAll("text").remove();

		// clear lines
		this.svg.selectAll(".dataPath").remove();
		this.svg.selectAll(".axisLabel").remove();

		// clear points
		this.svg.selectAll(".dataPoint").remove();

		if (this.drawModeNames[this.state.drawMode] === "bar") {

			if (this.needsResort) {
				if (this.state.sorted) {
					this.csvData.sort(function(a, b) {
						return a.values[primInd] - b.values[primInd];
					});
				} else {
					this.csvData.sort(function(a, b) {
						return a.number - b.number;
					});
				}
				this.needsResort = false;
			}

			var scaleY = d3.scale.linear()
				.domain(d3.extent(this.csvData, function(el) {
					return Number(el.values[primInd]);
				}))
				.range([5, height - (drawTextLabels ? axisSpacing : 5) - 20]);

			var lumScale = d3.scale.linear()
				.domain(d3.extent(this.csvData, function(el) {
					return Number(el.values[secInd]);
				}))
				.range([0, 0.5]);


			var color = function(value) {
				return isColored ? d3.hsl(215, 1, lumScale(value)) : "#009DFF";
			};

			var axisScaleY = d3.scale.linear()
				.domain(scaleY.domain().reverse())
				.range([(drawTextLabels ? axisSpacing : 5) + 20, height - 5]);

			var yAxis = d3.svg.axis()
				.scale(axisScaleY)
				.orient("left")
				.innerTickSize(10);

			var yAxisG = this.svg.append("g")
				.attr("class", "y-axis")
				.attr("transform", "translate(" + axisSpacing + ", " + (-(drawTextLabels ? axisSpacing : 5)) + ")")
				.call(yAxis);

			yAxisG.selectAll("path")
				.style("fill-opacity", 0)
				.style("stroke-width", 2)
				.style("stroke", "#383C3D");

			yAxisG.selectAll("text")
				.style("font-size", 20)
				.style("font-family", "Lato, Sans-serif")
				.style("fill", "#383C3D");

			var barSpacing = 5;

			var barWidth =
				(width - (axisSpacing + (barSpacing + 1) * this.csvData.length)) / this.csvData.length;

			if (barWidth < 5) {
				barWidth = (width - axisSpacing) / this.csvData.length;
				barSpacing = 0;
			}

			this.bars = this.bars.data(this.csvData);

			this.bars.exit().remove();

			this.bars.enter().append("g")
				.attr("class", "dataEntry");

			this.svg.selectAll(".dataEntry")
				.selectAll(".dataBar").remove();

			this.svg.selectAll(".dataEntry")
				.selectAll("text").remove();

			this.svg.selectAll(".dataEntry")
				.append("rect")
				.attr("class", "dataBar")
				.attr("x", function(d, i) {
					return axisSpacing + barSpacing + ((barSpacing + barWidth) * i);
				})
				.attr("y", function(d, i) {
					return height - (drawTextLabels ? axisSpacing : 5) - scaleY(d.values[primInd]);
				})
				.attr("width", barWidth)
				.attr("height", function(d, i) {
					return scaleY(d.values[primInd]);
				})
				.style("fill", function(d) {
					return color(d.values[secInd]);
				})
				.on("click", function(d) {
					console.log("Clicked", d);
				});

			if (drawTextLabels) {
				this.svg.selectAll(".dataEntry")
					.append("text")
					.text(function(d) {
						var string = d.key;
						return string.length > 5 ? string.substring(0, 5) + "." : string;
					})
					.attr("transform", "rotate(-90)")
					.attr("y", function(d, i) {
						return (axisSpacing + barSpacing + barWidth / 2 + ((barSpacing + barWidth) * i) + 4);
					})
					.attr("x", -(height - axisSpacing + 5))
					.style("font-size", 16)
					.style("font-family", "Lato, Sans-serif")
					.style("fill", "#383C3D")
					.style("text-anchor", "end");
			}

			if (this.numVals > 1) {
				this.updateTitle("CSV Mode - Bar Chart (Value: " +
					this.headers[primInd + (/*this.state.useFirstColumn ? 0 : */1)]
					+ " | Color: " +
					this.headers[secInd + (/*this.state.useFirstColumn ? 0 :*/ 1)]
					+ ")");
			} else {
				this.updateTitle("CSV Mode - Bar Chart");
			}
		} else if (this.drawModeNames[this.state.drawMode] === "line") {
			// if using first column, use valuesFull, otherwise use values
			var valsToUse = this.state.useFirstColumn ? "valuesFull" : "values";

			if (this.needsResort) {
				if (this.state.sorted) {
					this.csvData.sort(function(a, b) {
						return a[valsToUse][primInd] - b[valsToUse][primInd];
					});
				} else {
					this.csvData.sort(function(a, b) {
						return a.number - b.number;
					});
				}
				this.needsResort = false;
			}

			var lineData = [];

			for (var i = 0; i < this.csvData[0][valsToUse].length; i++) {
				lineData.push(this.csvData.map(function(el) {
					return Number(el[valsToUse][i]);
				}));
			}

			var pointSpacing = (width - axisSpacing) / lineData[0].length;

			scaleY = d3.scale.linear()
				.domain([d3.min(lineData, function(el) {
					return Number(d3.min(el));
				}),
				d3.max(lineData, function(el) {
					return Number(d3.max(el));
				})])
				.range([5, height - (drawTextLabels ? axisSpacing : 5) - 20]);

			lumScale = d3.scale.linear()
				.domain(scaleY.domain())
				.range([0, 0.5]);

			color = function(value) {
				return isColored ? d3.hsl(215, 1, lumScale(value)) : "#009DFF";
			};

			axisScaleY = d3.scale.linear()
				.domain(scaleY.domain().reverse())
				.range([(drawTextLabels ? axisSpacing : 5) + 20, height - 5]);

			yAxis = d3.svg.axis()
				.scale(axisScaleY)
				.orient("left")
				.innerTickSize(10);

			var line = d3.svg.line()
				.x(function(d, i) {
					return axisSpacing + pointSpacing / 2 + (pointSpacing * i);
				})
				.y(function(d, i) {
					return height - (drawTextLabels ? axisSpacing : 5) - scaleY(d);
				});

			// create y-axis
			yAxisG = this.svg.append("g")
				.attr("class", "y-axis")
				.attr("transform", "translate(" + axisSpacing + ", " + (-(drawTextLabels ? axisSpacing : 5)) + ")")
				.call(yAxis);

			yAxisG.selectAll("path")
				.style("fill-opacity", 0)
				.style("stroke-width", 2)
				.style("stroke", "#383C3D");

			yAxisG.selectAll("text")
				.style("font-size", 20)
				.style("font-family", "Lato, Sans-serif")
				.style("fill", "#383C3D");

			this.lines = this.lines.data(lineData);

			this.lines.exit().remove();

			this.lines.enter().append("g")
				.attr("class", "dataLine");

			this.svg.selectAll(".dataLine")
				.append("path")
				.attr("class", "dataPath")
				.attr("d", line)
				.style("stroke", function(d) {
					return color(d3.mean(d));
				})
				.style("stroke-width", 5)
				.style("fill-opacity", 0);

			if (drawTextLabels) {
				this.svg.selectAll(".axisLabel")
					.data(this.csvData)
					.enter().append("text")
					.attr("class", "axisLabel")
					.text(function(d) {
						var string = d.key;
						return string.length > 5 ? string.substring(0, 5) + "." : string;
					})
					.attr("transform", "rotate(-90)")
					.attr("y", function(d, i) {
						return (axisSpacing + pointSpacing / 2 + (pointSpacing * i) + 4);
					})
					.attr("x", -(height - axisSpacing + 5))
					.style("font-size", 16)
					.style("font-family", "Lato, Sans-serif")
					.style("fill", "#383C3D")
					.style("text-anchor", "end");
			}

			this.updateTitle("CSV Mode - Line Chart" +
				(this.state.sorted ? " (Sorted by: " + this.headers[primInd + (this.state.useFirstColumn ? 0 : 1)] + ")"
				: ""));

		} else if (this.drawModeNames[this.state.drawMode] === "scatter") {
			// if using first column, use valuesFull, otherwise use values
			valsToUse = this.state.useFirstColumn ? "valuesFull" : "values";

			var pointData = this.csvData.map(function(el) {
				var point = {
					x: Number(el[valsToUse][primInd]),
					y: Number(el[valsToUse][secInd])
				};
				return point;
			});

			var scaleX = d3.scale.linear()
				.domain(d3.extent(pointData, function(el) {
					return el.x;
				}))
				.range([axisSpacing, width - 20]);

			scaleY = d3.scale.linear()
				.domain(d3.extent(pointData, function(el) {
					return el.y;
				}))
				.range([20, height - axisSpacing].reverse());

			var axisScaleX = d3.scale.linear()
				.domain(scaleX.domain())
				.range([axisSpacing, width - 20]);

			var xAxis = d3.svg.axis()
				.scale(axisScaleX)
				.orient("bottom")
				.innerTickSize(10);

			axisScaleY = d3.scale.linear()
				.domain(scaleY.domain().reverse())
				.range([axisSpacing + 20, height]);

			yAxis = d3.svg.axis()
				.scale(axisScaleY)
				.orient("left")
				.innerTickSize(10);

			// create x-axis
			var xAxisG = this.svg.append("g")
				.attr("class", "x-axis")
				.attr("transform", "translate(0, " + (height - axisSpacing) + ")")
				.call(xAxis);

			xAxisG.selectAll("path")
				.style("fill-opacity", 0)
				.style("stroke-width", 2)
				.style("stroke", "#383C3D");

			xAxisG.selectAll("text")
				.style("font-size", 20)
				.style("font-family", "Lato, Sans-serif")
				.style("fill", "#383C3D");

			// create y-axis
			yAxisG = this.svg.append("g")
				.attr("class", "y-axis")
				.attr("transform", "translate(" + axisSpacing + ", " + (-axisSpacing) + ")")
				.call(yAxis);

			yAxisG.selectAll("path")
				.style("fill-opacity", 0)
				.style("stroke-width", 2)
				.style("stroke", "#383C3D");

			yAxisG.selectAll("text")
				.style("font-size", 20)
				.style("font-family", "Lato, Sans-serif")
				.style("fill", "#383C3D");

			this.points = this.svg.selectAll(".dataPoint").data(pointData);

			this.points.exit().remove();

			this.points.enter().append("g")
				.attr("class", "dataPoint");

			this.points.append("circle")
				.attr("cx", function(d) {
					return scaleX(d.x);
				})
				.attr("cy", function(d) {
					return scaleY(d.y);
				})
				.attr("r", 12)
				.style("stroke", "white")
				.style("fill", d3.hsl(215, 1, 0.5))
				.style("fill-opacity", 0.1)
				.style("stroke-width", 0);

			this.points.append("circle")
				.attr("cx", function(d) {
					return scaleX(d.x);
				})
				.attr("cy", function(d) {
					return scaleY(d.y);
				})
				.attr("r", 8)
				.style("stroke", "white")
				.style("fill", d3.hsl(215, 1, 0.5))
				.style("fill-opacity", 0.25)
				.style("stroke-width", 0);

			this.points.append("circle")
				.attr("cx", function(d) {
					return scaleX(d.x);
				})
				.attr("cy", function(d) {
					return scaleY(d.y);
				})
				.attr("r", 2)
				.style("fill", d3.hsl(215, 1, 0.5))
				.style("fill-opacity", 1);

			this.updateTitle("CSV Mode - Scatterplot (X: "
				+ this.headers[primInd + (this.state.useFirstColumn ? 0 : 1)]
				+ " | Y: "
				+ this.headers[secInd + (this.state.useFirstColumn ? 0 : 1)] + ")");
		}
	},

	draw: function(date) {

	},

	resize: function(date) {
		var box = "0,0," + this.element.clientWidth + "," + this.element.clientHeight;
		this.svg.attr('width',  this.element.clientWidth)
			.attr('height', this.element.clientHeight)
			.attr("viewBox", box);

		this.svg.select(".bg")
			.attr("width", +this.svg.attr("width"))
			.attr("height", +this.svg.attr("height"));

		this.refresh(date);
		this.draw_d3(date);
	},

	getContextEntries: function() {
		var separator = {
			description: "separator"
		};

		var sortUnsortOptionName = this.state.sorted ? "Unsort Data" : "Sort Data";
		var firstColOptionName = this.state.useFirstColumn ?
			"Don't Use First Column" : "Use First Column";

		var defaultEntries = [
			{
				description: "Change Mode",
				callback: "modeToggle",
				parameters: {}
			},
			{
				description: firstColOptionName,
				callback: "toggleUseFirstColumn",
				parameters: {}
			},
			{
				description: sortUnsortOptionName,
				callback: "toggleSort",
				parameters: {}
			},
			separator,
			{
				description: "Next Primary Value",
				callback: "incrementPrimary",
				parameters: {val: 1}
			},
			{
				description: "Previous Primary Value",
				callback: "incrementPrimary",
				parameters: {val: -1}
			},
			separator,
			{
				description: "Next Secondary Value",
				callback: "incrementSecondary",
				parameters: {val: 1}
			},
			{
				description: "Previous Secondary Value",
				callback: "incrementSecondary",
				parameters: {val: -1}
			},
			separator,
			{
				description: "Save SVG result",
				callback: "downloadSVG",
				parameters: {}
			}
		];

		var modeOptions = new Array(this.drawModeNames.length);

		modeOptions[0] = [
			{
				description: "Change Mode",
				callback: "modeToggle",
				parameters: {}
			},
			{
				description: sortUnsortOptionName,
				callback: "toggleSort",
				parameters: {}
			},
			separator,
			{
				description: "Next Bar Category",
				callback: "incrementPrimary",
				parameters: {val: 1}
			},
			{
				description: "Previous Bar Category",
				callback: "incrementPrimary",
				parameters: {val: -1}
			},
			separator,
			{
				description: "Next Bar Value",
				callback: "incrementSecondary",
				parameters: {val: 1}
			},
			{
				description: "Previous Bar Value",
				callback: "incrementSecondary",
				parameters: {val: -1}
			},
			separator,
			{
				description: "Save SVG result",
				callback: "downloadSVG",
				parameters: {}
			}
		];

		modeOptions[1] = [
			{
				description: "Change Mode",
				callback: "modeToggle",
				parameters: {}
			},
			{
				description: firstColOptionName,
				callback: "toggleUseFirstColumn",
				parameters: {}
			},
			{
				description: sortUnsortOptionName,
				callback: "toggleSort",
				parameters: {}
			},
			separator,
			{
				description: "Next Sort Value",
				callback: "incrementPrimary",
				parameters: {val: 1}
			},
			{
				description: "Previous Sort Value",
				callback: "incrementPrimary",
				parameters: {val: -1}
			},
			separator,
			{
				description: "Save SVG result",
				callback: "downloadSVG",
				parameters: {}
			}
		];

		modeOptions[2] = [
			{
				description: "Change Mode",
				callback: "modeToggle",
				parameters: {}
			},
			{
				description: firstColOptionName,
				callback: "toggleUseFirstColumn",
				parameters: {}
			},
			separator,
			{
				description: "Next X Variable",
				callback: "incrementPrimary",
				parameters: {val: 1}
			},
			{
				description: "Previous X Variable",
				callback: "incrementPrimary",
				parameters: {val: -1}
			},
			separator,
			{
				description: "Next Y Variable",
				callback: "incrementSecondary",
				parameters: {val: 1}
			},
			{
				description: "Previous Y Variable",
				callback: "incrementSecondary",
				parameters: {val: -1}
			},
			separator,
			{
				description: "Save SVG result",
				callback: "downloadSVG",
				parameters: {}
			}
		];

		var contextMenuEntries = isNaN(this.state.drawMode) ? defaultEntries :
			modeOptions[this.state.drawMode];

		return contextMenuEntries;
	},

	event: function(eventType, position, user_id, data, date) {

		if (eventType === "pointerPress" && (data.button === "left")) {
			// press

		}
		if (eventType === "pointerMove") {
			// scale the coordinate by the viewbox (coordinate system)
			// var scalex = this.box[0] / this.element.clientWidth;
			// var scaley = this.box[1] / this.element.clientHeight;
		}
		if (eventType === "pointerRelease" && (data.button === "left")) {
			// release
		}
		if (eventType === "widgetEvent") {
			if (data.identifier === "NextValPrim") {
				this.incrementPrimary({val: 1});
			} else if (data.identifier === "PrevValPrim") {
				this.incrementPrimary({val: -1});
			} else if (data.identifier === "SortToggle") {
				this.toggleSort();
			} else if (data.identifier === "NextValSec") {
				this.incrementSecondary({val: 1});
			} else if (data.identifier === "PrevValSec") {
				this.incrementSecondary({val: -1});
			} else if (data.identifier === "ModeToggle") {
				this.modeToggle();
			} else if (data.identifier === "FirstColToggle") {
				this.toggleUseFirstColumn();
			}
		}
	},

	/**
	 * Toggles the sorting of the data for the bar and line charts.
	 *
	 * @method     toggleSort
	 */
	toggleSort: function() {
		this.state.sorted = !this.state.sorted;
		this.needsResort = true;

		// so context menu doesn't has generic title with modeToggle
		// 	instead of detailed title
		this.updateTitle(this.drawModeTitles[this.state.drawMode]);
		this.getFullContextMenuAndUpdate();

		this.draw_d3();
		this.refresh(new Date());
	},

	/**
	 * Toggles the use of the first column of the .CSV file, as it may be a key
	 * instead to a numerical value.
	 *
	 * @method     toggleUseFirstColumn
	 */
	toggleUseFirstColumn: function() {
		this.state.useFirstColumn = !this.state.useFirstColumn;
		console.log("Use First Col: ", this.state.useFirstColumn);

		// reset primary and secondary value columns
		this.incrementPrimary({val: 0});
		this.incrementSecondary({val: 0});

		// so context menu doesn't has generic title with modeToggle
		// 	instead of detailed title
		this.updateTitle(this.drawModeTitles[this.state.drawMode]);
		this.getFullContextMenuAndUpdate();

		this.draw_d3();
		this.refresh(new Date());
	},

	/**
	 * Adds a value to the primary variable index, updating the chart after
	 * the index is changed.
	 *
	 * @method     incrementPrimary
	 * @param 		 {Object}		param		Includes val (the amount to increment by)
	 */
	incrementPrimary: function (param) {
		var valsToUse = (this.state.drawMode === 0  || !this.state.useFirstColumn) ?
			"values" : "valuesFull";

		var inc = Number(param.val);
		while (inc < 0) {
			inc += this.csvData[0][valsToUse].length;
		}
		this.state.primaryColumn = ((this.state.primaryColumn + inc) %
			(this.csvData[0][valsToUse].length));
		this.needsResort = true;
		this.draw_d3();
		this.refresh(new Date());
	},

	/**
	 * Adds a value to the secondary variable index, updating the chart after
	 * the index is changed.
	 *
	 * @method     incrementSecondary
	 * @param 		 {Object}		param		Includes val (the amount to increment by)
	 */
	incrementSecondary: function(param) {
		var valsToUse = (this.state.drawMode === 0  || !this.state.useFirstColumn) ?
			"values" : "valuesFull";

		var inc = Number(param.val);
		while (inc < 0) {
			inc += this.csvData[0][valsToUse].length;
		}

		this.state.secondaryColumn = (this.state.secondaryColumn + inc) %
			(this.csvData[0][valsToUse].length);
		this.draw_d3();
		this.refresh(new Date());
	},

	/**
	 * Switches through the 3 drawing modes, bar, line, and scatterplot.
	 *
	 * @method     modeToggle
	 */
	modeToggle: function() {
		this.state.drawMode = (this.state.drawMode + 1) % this.drawModeNames.length;

		// reset primary and secondary value columns
		this.incrementPrimary({val: 0});
		this.incrementSecondary({val: 0});

		// so context menu doesn't has generic title with modeToggle
		// 	instead of detailed title
		this.updateTitle(this.drawModeTitles[this.state.drawMode]);
		this.getFullContextMenuAndUpdate();

		this.draw_d3();
		this.refresh(new Date());
	},


	/**
	 * Converts the SVG of the visualization into a data file to be saved.
	 * The file is given a name based on the name of the CSV file and the
	 * mode that the app was in.
	 *
	 * @method     downloadSVG
	 */
	downloadSVG: function() {
		var html = this.svg
			.attr("version", 1.1)
			.attr("xmlns", "http://www.w3.org/2000/svg")
			.node().parentNode.innerHTML;

		var filePath = this.csvSrc.split("/");

		var svgFilename = filePath[filePath.length - 1] + "_";

		if (this.state.drawMode === 0) {
			svgFilename += "BarChart" + "_";
			svgFilename += this.state.sorted ? "Sorted" + "_" : "";
			svgFilename += "Value-" + this.headers[this.state.primaryColumn] + "_";
			svgFilename += "Color-" + this.headers[this.state.secondaryColumn] + "_";
			svgFilename += new Date().toDateString().split(" ").join("-");
		} else if (this.state.drawMode === 1) {
			svgFilename += "LineChart" + "_";
			svgFilename += this.state.sorted ? "SortedBy-" + this.headers[this.state.primaryColumn] + "_" : "";
			svgFilename += new Date().toDateString().split(" ").join("-");
		} else if (this.state.drawMode === 2) {
			svgFilename += "Scatterplot" + "_";
			svgFilename += "X-" + this.headers[this.state.primaryColumn] + "_";
			svgFilename += "Y-" + this.headers[this.state.secondaryColumn] + "_";
			svgFilename += new Date().toDateString().split(" ").join("-");
		}

		console.log("CSV_Reader> Saving: " + svgFilename);

		var header = "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
		header += "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">";

		// Save the SVG as an asset (into media library)
		this.saveAsset(svgFilename, "svg", header + html);
	}

});
