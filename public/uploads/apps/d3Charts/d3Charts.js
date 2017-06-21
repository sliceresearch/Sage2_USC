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

var d3Charts = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "onfinish"; // "onfinish";
		this.passSAGE2PointerAsMouseEvents = true;

		this.element.id = "div" + data.id;
		// Using SAGE2 default font
		this.element.style.fontFamily = "Arimo, Helvetica, sans-serif";
		// Default starting attributes
		this.element.style.background = "white";
		this.element.style.fontSize = ui.titleTextSize;
		this.element.style.color = "green";

		this.debug = true;
		this.appSpecific(data);
	},

	dbprint: function(string) {
		if (this.debug){
			console.log("Debug>" + string);
		}
	},

	/**
	* Pieces not created by init().
	* Will start with loading message, if given a state file, will load.
	* After load will attempt to add to this object.
	*
	* @method appSpecific
	* @param data {Object} given to app init
	*/
	appSpecific: function(data) {
		this.container = document.createElement("div");
		this.container.id = this.id + "Container";
		this.container.style.width = "100%";
		this.container.style.height = "100%";
		this.element.appendChild(this.container);

		this.selectedElements = []; // full data pieces
		this.selectedValues = []; // this is more about axis value of selection
		this.hoveredElements = []; // because there could be multiple pointers (was this coded in?)

		if (data.customLaunchParams) {
			this.dbprint(this.id + " has customLaunchParams");
			this.state.chartValues = data.customLaunchParams.chartValues; // save in the state (future work to recover / share)
			this.state.chartValues.originalData = this.state.chartValues.data; // keep an original copy

			this.generateChartIfCan();
		} else {
			// no init values, maybe should first be a state check if there are children?
			// for sake of other pieces, start with a basic set
			this.state.chartValues = {
				data: []
			};

		}
		this.broadcastInitialValues();
	},

	// ---------------------------------------------------------------------------------------------------------------- Data send / receive

	/**
	* State this apps' source destination variables.
	*
	* @method broadcastInitialValues
	*/
	broadcastInitialValues: function() {
		// serverDataSetValue = function(nameOfValue, value, description) {
		this.serverDataSetValue(this.id + ":source:dataset", this.state.chartValues.data);
		this.serverDataSetValue(this.id + ":source:dataSelected", []); // none at beginning
		this.serverDataSetValue(this.id + ":source:dataHovered", []); // none at beginning

		// create destination variables for this app
		this.serverDataSetValue(this.id + ":destination:dataset", []);
		this.serverDataSetValue(this.id + ":destination:dataSelected", []);
		this.serverDataSetValue(this.id + ":destination:dataHovered", []);
		// app.serverDataSubscribeToValue = function(nameOfValue, callback, unsubscribe) {
		this.serverDataSubscribeToValue(this.id + ":destination:dataset", "dataDestinationFullDataSetReplacement");
		this.serverDataSubscribeToValue(this.id + ":destination:dataSelected", "dataDestinationSelected"); // none at beginning
		this.serverDataSubscribeToValue(this.id + ":destination:dataHovered", "dataDestinationHovered"); // none at beginning
	},

	/**
	* Handler for receiving data set replacement. Currently full replacement.
	*
	* @method broadcastInitialValues
	* @param {Array} dataset - for usage as replacement
	*/
	dataDestinationFullDataSetReplacement: function(dataset) {
		if (Array.isArray(dataset)) {
			if (dataset.length > 0) {
				this.dbprint("Sanity check: this should be an array of data to display:" + Array.isArray(dataset));
				this.state.chartValues.data = dataset;
				// also update the broadcast data set
				this.serverDataSetValue(this.id + ":source:dataset", this.state.chartValues.data);
				this.generateChartIfCan();
			} else {
				// discard, unable to use blank set for the sake of some of the checks
			}
		}
	},

	/**
	* Handler for receiving selection effect.
	*
	* @method dataDestinationSelected
	* @param {Array} dataset - for usage as selection
	*/
	dataDestinationSelected: function(dataset) {
		var chartValues = this.state.chartValues;
		// need data in array
		if (Array.isArray(dataset)) {
			if (dataset.length > 0) {
				if (chartValues.chartType === "Bar" || chartValues.chartType === "Pie") {
					this.dataDestinationFullDataSetReplacement(dataset);
				} else if (chartValues.chartType === "Scatter") {
					
				} else { // always else?

				}
			} else if (this.state.chartValues.data !== this.state.chartValues.originalData) {
				// with a length of 0, if the current data is not original, reset to original
				this.dataDestinationFullDataSetReplacement(this.state.chartValues.originalData);
			}
		} else {
			console.log("Error: Given dataset was not in an array, cannot use, discarding.");
		}
	},

	/**
	* Handler for receiving hover effect.
	*
	* @method dataDestinationHovered
	* @param {Array} dataset - for usage as hover
	*/
	dataDestinationHovered: function(dataset) {
		var _this = this;
		// need data in array
		if (Array.isArray(dataset) && dataset.length > 0) {
			var chartValues = this.state.chartValues;
			if (chartValues.chartType === "Bar" || chartValues.chartType === "Pie") {
				// don't react on bar pie?
			} else if (chartValues.chartType === "Scatter") {
				// This is a quick fix based around id because its quick and should work
				var datasetIdList = dataset.map(function(d) { return d.id;});

				// turn off selection
				this.applyOutEffectVisual(chartValues.g.selectAll(".dot"));

				chartValues.g.selectAll(".dot").attr("hasHoverStatus", function(d){
					if (datasetIdList.includes(d.id)) {
						_this.applyOverEffectVisual(d3v4.select(this));
					}
				})
			} else { // always else?

			}
		}
	},

	// ---------------------------------------------------------------------------------------------------------------- Chart creation


	/**
	* Generates the chart. Assumes this.state.chartValues exists.
	*
	* @method generateChartIfCan
	*/
	generateChartIfCan: function() {
		var chartValues = this.state.chartValues;

		if (this["generate" + chartValues.chartType]) {
			if (chartValues.chartType !== "Bar" && chartValues.chartType !== "Pie") {
				this.updateTitle(chartValues.chartType + " (" + chartValues.xAxisAttribute + " x " + chartValues.yAxisAttribute + ")");
			} else {
				this.updateTitle(chartValues.chartType + " (" + chartValues.xAxisAttribute + " totals)");
			}
			this["generate" + chartValues.chartType](chartValues);
		} else {
			this.element.textContent = "ERROR: Unsupported chart type:" + chartValues.chartType;
		}
	},

	// --------------------------------------------------------------------------------------------------------------------------------------- BAR

	/**
	* Generate a bar graph
	*
	* @method generateBar
	* @param {Object} chartValues - assumed to contain all necessary data to build
	*/
	generateBar: function(chartValues) {
		this.chartPrep(chartValues);
		this.setDomainsBarOrPie(chartValues);
		chartValues.yAxisSuffix = ""; // used for ticks, but has to be data accurate...

		chartValues.g.append("g")
			.attr("class", "axis axis--x")
			.attr("transform", "translate(0," + chartValues.height + ")")
			.call(d3v4.axisBottom(chartValues.xAxis))
			.append("text")
			.attr("x", chartValues.width / 2)
			.attr("y", chartValues.margin.bottom / 2)
			.attr("dy", "0.71em")
			.attr("fill", "black")
			.text(chartValues.xAxisAttribute);

		chartValues.g.append("g")
			.attr("class", "axis axis--y")
			.call(d3v4.axisLeft(chartValues.yAxis).ticks(10, chartValues.yAxisSuffix))
			.append("text")
			// .attr("transform", "rotate(-90)")
			.attr("y", chartValues.margin.left / -2)
			.attr("dy", "0.71em")
			.attr("text-anchor", "end")
			.attr("fill", "black")
			.text("Count");

		chartValues.g.selectAll(".bar")
			.data(chartValues.groupedByXAxis) // not actually the original data set, since needed the groupings
			.enter().append("rect")
			.attr("class", "bar")
			.attr("x", function(d) { return chartValues.xAxis(d.key); }) // use the key of the grouping
			.attr("y", function(d) { return chartValues.yAxis(d.values.length); }) // the count for the key
			.attr("width", chartValues.xAxis.bandwidth()) // auto calc by the scaleBand
			.attr("height", function(d) { return chartValues.height - chartValues.yAxis(d.values.length); }) // one bar, not pieces. Or...?
			.attr("fill", "steelblue")
			.attr("s2appOrigin", this.id)
			.on('mouseover', this.overEffect)
			.on('mouseout', this.outEffect)
			.on('mousedown', this.downEffect);

		this.dbprint("end of generate");
	},

	/**
	* Sets the domain for Bar or Pie.
	* Current assumption is that bar / pie will always be counts of the attributes.
	*
	* @method setDomainsBarOrPie
	* @param {Object} chartValues - assumed to contain all necessary data to build
	*/
	setDomainsBarOrPie: function(chartValues) {
		// redo the x axis always. redo y axis since it's scale is determined by x axis
		chartValues.xAxis = d3v4.scaleBand().rangeRound([0, chartValues.width]).padding(0.1);
		chartValues.yAxis = d3v4.scaleLinear().rangeRound([chartValues.height, 0]);
		// domain is the different xAxis values map is 1:1 but ok, because each x axis attribute occupies a spot
		if (typeof chartValues.data[0][chartValues.xAxisAttribute] === "number") {
			chartValues.xAxis.domain(
				chartValues.data.map(function(d) {return d[chartValues.xAxisAttribute];}).sort(function(a, b) {
					if (a < b) {
						return -1;
					} else if (b < a) {
						return 1;
					}
					return 0;
				})
			);
		} else {
			chartValues.xAxis.domain(chartValues.data.map(function(d) {return d[chartValues.xAxisAttribute];}).sort());
		}
		this.setGroupedByXAxis(chartValues);
	},

	/**
	* Sets the setGroupedByXAxis property for bar or pie.
	* Current assumption is that bar / pie will always be counts of the attributes.
	*
	* @method setGroupedByXAxis
	* @param {Object} chartValues - assumed to contain all necessary data to build
	*/
	setGroupedByXAxis: function(chartValues) {
		// need to nest(group by) in order to get a count
		// groupedByXAxis is an array [{key: "1931", values: [...], {key: "1932", values: [ ...
		chartValues.groupedByXAxis = d3v4.nest() // apply a nest (group by)
			.key(function(d) { return d[chartValues.xAxisAttribute]; }) // first group by the attribute
			.entries(chartValues.data); // do nest on the data
		// set domain
		chartValues.yAxis.domain([0, d3v4.max(chartValues.groupedByXAxis, function(d) { return d.values.length; })]);
	},

	// --------------------------------------------------------------------------------------------------------------------------------------- PIE

	/**
	* Generate a pie graph
	*
	* @method generatePie
	* @param {Object} chartValues - assumed to contain all necessary data to build
	*/
	generatePie: function(chartValues) {
		this.chartPrep(chartValues);
		// set to center, as opposed to others that use the margin
		chartValues.g.attr("transform",
			"translate(" + (chartValues.width / 2 + chartValues.margin.left)
			+ "," + (chartValues.height / 2 + chartValues.margin.top) + ")");
		var color = d3v4.scaleOrdinal(d3v4.schemeCategory10);
    	var radius = Math.min(chartValues.width, chartValues.height) / 2;
		// need to nest(group by) in order to get a count
		this.setGroupedByXAxis(chartValues); // above this method

		var pie = d3v4.pie()
			.sort(null)
			.value(function(d) { return d.values.length; });

		var path = d3v4.arc()
			.outerRadius(radius - 10)
			.innerRadius(0);

		var label = d3v4.arc()
			.outerRadius(radius - 40)
			.innerRadius(radius - 40);

		var arc = chartValues.g.selectAll(".arc")
			.data(pie(chartValues.groupedByXAxis))
			.enter().append("g")
			.attr("class", "arc");

		arc.append("path")
			.attr("d", path)
			.attr("fill", function(d) { return color(d.data.key); })
			.attr("s2appOrigin", this.id)
			.on('mouseover', this.overEffect)
			.on('mouseout', this.outEffect)
			.on('mousedown', this.downEffect);

		arc.append("text")
			.attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
			.attr("dy", "0.35em")
			.text(function(d) { return d.data.key + "(" + d.data.values.length + ")"; });

		this.dbprint("end of pie generate");
	},

	// --------------------------------------------------------------------------------------------------------------------------------------- LINE
	// ---------------------------------------------------------------------------------------------------------------------------------------
	// ---------------------------------------------------------------------------------------------------------------------------------------

	/**
	* Generate a line chart based on given chartValues.
	*
	* @method generateLine
	* @param chartValues {Object} Values set from other app's launch.
	*/
	generateLine: function(chartValues) {
		this.chartPrep(chartValues);
		// included in chartPrep was d3v4.timeParse("%d-%b-%y");

		// domain sets the input possibilies. What min to max values can be given and how it maps to the range (set above).
		// why extent? -> because possible to have negative

		// need a special check for scaleBand vs other. scaleBand has a different way to calculation position it seems.
		if (chartValues.xAxisScale === "scaleBand") {
			chartValues.xAxis.domain(chartValues.data.map(function(d) { return d[chartValues.xAxisAttribute]; }));
		} else {
			chartValues.xAxis.domain(d3v4.extent(chartValues.data, function(d) { return d[chartValues.xAxisAttribute]; }));
		}
		if (chartValues.yAxisScale === "scaleBand") {
			chartValues.yAxis.domain(chartValues.data.map(function(d) { return d[chartValues.yAxisAttribute]; }));
		} else {
			chartValues.yAxis.domain(d3v4.extent(chartValues.data, function(d) { return d[chartValues.yAxisAttribute]; }));
		}

		var line = d3v4.line()
			.x(function(d) { return chartValues.xAxis(d[chartValues.xAxisAttribute]); })
			.y(function(d) { return chartValues.yAxis(d[chartValues.yAxisAttribute]); });

		chartValues.g.append("g")
			.attr("transform", "translate(0," + chartValues.height + ")")
			.call(d3v4.axisBottom(chartValues.xAxis))
			.select(".domain");

		chartValues.g.append("g")
			.call(d3v4.axisLeft(chartValues.yAxis))
			.append("text")
			.attr("fill", "#000")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", "0.71em")
			.attr("text-anchor", "end")
			.text(chartValues.yAxisAttribute);

		chartValues.g.append("path")
			.datum(chartValues.data)
			.attr("fill", "none")
			.attr("stroke", "steelblue")
			.attr("stroke-linejoin", "round")
			.attr("stroke-linecap", "round")
			.attr("stroke-width", 1.5)
			.attr("d", line)
			// interaction test? seems not to work the same on lines
			// .attr("s2appOrigin", this.id)
			// .on("mouseover", this.overEffect)
			// .on("mouseout", this.outEffect)
			// .on("mousedown", this.downEffect);

		this.dbprint("end of line generate");
	},

	// --------------------------------------------------------------------------------------------------------------------------------------- scatter
	// ---------------------------------------------------------------------------------------------------------------------------------------
	// ---------------------------------------------------------------------------------------------------------------------------------------
	generateScatter: function(chartValues) {
		// adds to chartValues: margin, width, height, xAxis, yAxis. Adds "svg" to this app.
		this.chartPrep(chartValues);

		var color = d3v4.scaleOrdinal(d3v4.schemeCategory10);

		// need a special check for scaleBand vs other. scaleBand has a different way to calculation position it seems.
		if (chartValues.xAxisScale === "scaleBand") {
			chartValues.xAxis.domain(chartValues.data.map(function(d) { return d[chartValues.xAxisAttribute]; }));
		} else {
			chartValues.xAxis.domain(d3v4.extent(chartValues.data, function(d) { return d[chartValues.xAxisAttribute]; }));
		}
		if (chartValues.yAxisScale === "scaleBand") {
			chartValues.yAxis.domain(chartValues.data.map(function(d) { return d[chartValues.yAxisAttribute]; }));
		} else {
			chartValues.yAxis.domain(d3v4.extent(chartValues.data, function(d) { return d[chartValues.yAxisAttribute]; }));
		}

		chartValues.g.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + chartValues.height + ")")
			.call(d3v4.axisBottom(chartValues.xAxis))
			.append("text")
			.attr("class", "label")
			.attr("x", chartValues.width / 2)
			.attr("y", chartValues.margin.bottom / 2)
			.attr("fill", "black")
			.style("text-anchor", "end")
			// .text("Sepal Width (cm)");
			.text(chartValues.xAxisAttribute);

		chartValues.g.append("g")
			.attr("class", "y axis")
			.call(d3v4.axisLeft(chartValues.yAxis))
			.attr("font-size", ui.titleTextSize + "px")
			.append("text")
			.attr("class", "label")
			// .attr("transform", "rotate(-90)")
			.attr("y", chartValues.margin.left / -2)
			.attr("dy", ".71em")
			.attr("fill", "black")
			.attr("font-size", ui.titleTextSize + "px")
			.style("text-anchor", "end")
			// .text("Sepal Length (cm)")
			.text(chartValues.yAxisAttribute)

		var once = true;
		chartValues.g.selectAll(".dot")
			.data(chartValues.data)
			.enter().append("circle")
			.attr("class", "dot")
			.attr("r", ui.titleTextSize / 2)
			.attr("cx", function(d) { return chartValues.xAxis(d[chartValues.xAxisAttribute]); })
			.attr("cy", function(d) { return chartValues.yAxis(d[chartValues.yAxisAttribute]); })
			// .style("fill", function(d) { return color(d.species); })
			.style("stroke", "black")
			.style("stroke-width", "1px")
			.attr("s2appOrigin", this.id)
			.on("mouseover", this.overEffect)
			.on("mouseout", this.outEffect)
			.on("mousedown", this.downEffect);


		this.dbprint("end of scatter generate");
	},

	chartPrep: function(chartValues) {
		// clear container, set margins, width, height.
		// then make svg and a group to put stuff in
		this.container.innerHTML = "";
		chartValues.margin = { // space for the chart, note: char axis may go in this area.
			top: this.sage2_height * 0.08,
			right: this.sage2_width * 0.08,
			bottom: this.sage2_height * 0.08,
			left: this.sage2_width * 0.08
		};
		chartValues.width = this.sage2_width - chartValues.margin.left - chartValues.margin.right;
    	chartValues.height = this.sage2_height - chartValues.margin.top - chartValues.margin.bottom;
		this.svg = d3v4.select("#" + this.container.id).append("svg");

		// always occupy full app size
		this.svg.attr("width", "100%").attr("height", "100%");
		this.svg.attr("preserveAspectRatio", "none");
		this.svg.attr("viewBox", " 0 0 " + this.sage2_width + " " + this.sage2_height);
		chartValues.g = this.svg.append("g").attr("transform", "translate(" + chartValues.margin.left + "," + chartValues.margin.top + ")");

		// time convert always, convert time before checking if an element is a string
		this.timeConvertData(chartValues);

		// axis settings, if not set use linear by default
		if (typeof chartValues.data[0][chartValues.xAxisAttribute] === "string") {
			this.dbprint("Changing xAxis to scaleBand, detected a string attribute");
			chartValues.xAxisScale = "scaleBand";
		} else if (!chartValues.xAxisScale) {
			this.dbprint("No xAxis scale detected, making scaleLinear");
			chartValues.xAxisScale = "scaleLinear";
		}
		chartValues.xAxis = d3v4[chartValues.xAxisScale]().rangeRound([0, chartValues.width]);

		// same for y axis, default is linear
		if (typeof chartValues.data[0][chartValues.yAxisAttribute] === "string") {
			this.dbprint("Changing yAxis to scaleBand, detected a string attribute");
			chartValues.yAxisScale = "scaleBand";
		} else if (!chartValues.yAxisScale) {
			this.dbprint("No yAxis scale detected, making scaleLinear");
			chartValues.yAxisScale = "scaleLinear";
		}
		chartValues.yAxis = d3v4[chartValues.yAxisScale]().rangeRound([chartValues.height, 0]);

	},

	timeConvertData: function(chartValues) {
		var xConvert = (chartValues.xAxisScale == "scaleTime") ? true : false;
		xConvert = (xConvert && typeof chartValues.data[0][chartValues.xAxisAttribute] === "string") ? true : false;
		var yConvert = (chartValues.yAxisScale == "scaleTime") ? true : false;
		yConvert = (yConvert && typeof chartValues.data[0][chartValues.yAxisAttribute] === "string") ? true : false;

		if (xConvert || yConvert) {
			// parse out the time from a string
			// this needs to be expanded out
			// this may be different per file format

			var parseTime;
			parseTime = this.detectParsePattern(chartValues);
			this.dbprint("Detected time pattern:" + parseTime);
			// parseTime = d3v4.timeParse("%d-%b-%y"); // %d day w/ 0 prefix, %b abreviated month name, %y year without century
			// using two different time matchers
			parseTime = d3v4.timeParse(parseTime);

			chartValues.data = chartValues.data.map(function(d) {
				if (xConvert) {
					d[chartValues.xAxisAttribute] = parseTime(d[chartValues.xAxisAttribute]);
				}
				if (yConvert) {
					d[chartValues.yAxisAttribute] = parseTime(d[chartValues.yAxisAttribute]);
				}
				// d[chartValues.yAxisAttribute] = +d[chartValues.yAxisAttribute];
				return d;
			});
		}
	},

	detectParsePattern: function(chartValues) {
		var elem1 = chartValues.data[0];
		var xConvert = (chartValues.xAxisScale == "scaleTime") ? true : false;
		var yConvert = (chartValues.yAxisScale == "scaleTime") ? true : false;
		var pattern = "";
		var timeEntry;
		if (xConvert) {
			timeEntry = elem1[chartValues.xAxisAttribute];
		} else if (yConvert) {
			timeEntry = elem1[chartValues.yAxisAttribute];
		} else {
			console.log("error in " + this.id + " no time attribute, but was given scaleTime?");
		}

		// only if there was a time entry
		if (timeEntry) {
			if (timeEntry.indexOf("!") !== -1) {
				pattern = "%Y!%m!%d";
			} else if (timeEntry.indexOf("-") !== -1) {
				pattern = "%d-%b-%y";
			}
		}

		return pattern;
	},

	/**
	 * While this function is defined in the app, it is attached to a d3 element.
	 * Keyword "this" refers to that element, not the app.
	 * @method overEffect
	 * @param {Object} d - 
	 */
	overEffect: function (d) {
		var s = d3v4.select(this);
		var de = s.attr("downEffect"); // returns a string, or null if doesn't exist.
		if (!de || de === "false") {
			// if (!s.attr("startingColor")) {
			// 	s.attr("startingColor", s.attr("fill"));
			// 	s.attr("startingStrokeWidth", s.attr("stroke-width"));
			// 	s.attr("startingStroke", s.attr("stroke"));
			// }
			// s.attr("fill", "red");
			// s.attr("stroke", "red");
			// s.attr("stroke-width", "4px");
			// find the data and add to hover
			var s2app = applications[s.attr("s2appOrigin")];
			s2app.applyOverEffectVisual(s);
			s2app.dataHoverChange(s2app.findDataPieces(s.data()), "add");
		}
	},

	/**
	 * Handler for visual over effect, in order to make it work with message selection.
	 * @method applyOverEffectVisual
	 * @param {Object} d3Selection - from events is one element, but from message could be multiple
	 */
	applyOverEffectVisual: function (d3Selection) {
		if (!d3Selection.attr("downEffect")) {
			if (!d3Selection.attr("startingColor")) {
				d3Selection.attr("startingColor", d3Selection.attr("fill"));
				d3Selection.attr("startingStrokeWidth", d3Selection.attr("stroke-width"));
				d3Selection.attr("startingStroke", d3Selection.attr("stroke"));
			}
			d3Selection.attr("fill", "red");
			d3Selection.attr("stroke", "red");
			d3Selection.attr("stroke-width", "4px");
		}
	},

	outEffect: function (d) {
		var s = d3v4.select(this);
		var de = s.attr("downEffect"); // returns a string, or null if doesn't exist.
		if (!de || de === "false") {
			// s.attr("fill", s.attr("startingColor"));
			// s.attr("stroke", s.attr("startingStroke"));
			// s.attr("stroke-width", s.attr("startingStrokeWidth"));
			// find the data and add to hover
			var s2app = applications[s.attr("s2appOrigin")];
			s2app.applyOutEffectVisual(s);
			s2app.dataHoverChange(s2app.findDataPieces(s.data()), "remove");
		}
	},

	/**
	 * Handler for visual out effect, in order to make it work with message selection.
	 * @method applyOutEffectVisual
	 * @param {Object} d3Selection - from events is one element, but from message could be multiple
	 */
	applyOutEffectVisual: function (d3Selection) {
		if (!d3Selection.attr("downEffect")) {
			d3Selection.attr("fill", d3Selection.attr("startingColor"));
			d3Selection.attr("stroke", d3Selection.attr("startingStroke"));
			d3Selection.attr("stroke-width", d3Selection.attr("startingStrokeWidth"));
		}
	},
	downEffect: function (d) {
		var s = d3v4.select(this);
		var de = s.attr("downEffect"); // returns a string, or null if doesn't exist.
		if (!de || de === "false") {
			s.attr("downEffect", true);
			s.attr("fill", "green");
			s.attr("stroke", "black");
			s.attr("stroke-width", "4px");
			// find the data and add to selection
			var s2app = applications[s.attr("s2appOrigin")];
			s2app.dataSelectionChange(s2app.findDataPieces(s.data()), "add");
		} else {
			s.attr("downEffect", false);
			s.attr("fill", s.attr("startingColor"));
			s.attr("stroke", s.attr("startingStroke"));
			s.attr("stroke-width", s.attr("startingStrokeWidth"));
			// find the data and set the selection
			var s2app = applications[s.attr("s2appOrigin")];
			s2app.dataSelectionChange(s2app.findDataPieces(s.data()), "remove");
		}
	},

	/**
	* Looks for data piece based on the d3v4.data() given an element.
	*
	* @method findDataPieces
	* @param {Array} d3DataReturn - what d3 returns after d3v4.data() on an element
	* @returns {Array} matches - Data pieces that match the selection
	*/
	findDataPieces: function(d3DataReturn) {
		var chartValues = this.state.chartValues;
		var matches = [];
		// d3DataReturn should be an array of one because something was clicked
		if (Array.isArray(d3DataReturn)) {
			d3DataReturn = d3DataReturn[0];
		}
		// some graphs have two levels... unsure why
		if (d3DataReturn.data && typeof d3DataReturn.data === "object") {
			d3DataReturn = d3DataReturn.data; // may need better check later
		}
		// switch... bar / pie uses sums, scatter uses original data
		if (d3DataReturn.key && d3DataReturn.values) {
			this.dbprint("This probably came from bar/pie, app thinks:" + chartValues.chartType);
			for (let i = 0; i < chartValues.data.length; i++) { // can it be assumed as xAxisAttribute?
				if (d3DataReturn.key == chartValues.data[i][chartValues.xAxisAttribute]) {
					matches.push(chartValues.data[i]);
				}
			}
		} else {
			this.dbprint("This probably came from scatter, app thinks:" + chartValues.chartType);
			console.dir(d3DataReturn);
			matches.push(d3DataReturn);
		}
		return matches;
	},

	/**
	* Looks for data piece based on the d3v4.data() given an element.
	*
	* @method dataSelectionChange
	* @param {Array} matches - data elements that match
	* @param {String} modification - should it be "add" or "remove"
	*/
	dataSelectionChange: function(matches, modification) {
		this.dbprint("Matches are to be " + modification);
		console.dir(matches);
		this.dbprint("Current selection size:" + this.selectedElements.length);
		if (modification === "add") {
			this.dbprint("add");
			this.selectedElements = this.selectedElements.concat(matches);
		} else if (modification === "remove") {
			this.dbprint("remove");
			for (let i = 0; i < matches.length; i++) { // find then remove
				this.selectedElements.splice(this.selectedElements.indexOf(matches[i]), 1);
			}
		} else {
			console.log("ERROR: improper usage of dataSelectionChange");
		}
		this.dbprint("New selection size:" + this.selectedElements.length);
		// update this apps broadcast value
		this.serverDataSetValue(this.id + ":source:dataSelected", this.selectedElements);
	},

	/**
	* Looks for data piece based on the d3v4.data() given an element.
	*
	* @method dataHoverChange
	* @param {Array} matches - data elements that match
	* @param {String} modification - should it be "add" or "remove"
	*/
	dataHoverChange: function(matches, modification) {
		this.dbprint("Matches are to be " + modification);
		console.dir(matches);
		this.dbprint("Current hover size:" + this.hoveredElements.length);
		if (modification === "add") {
			this.dbprint("add");
			this.hoveredElements = this.hoveredElements.concat(matches);
		} else if (modification === "remove") {
			this.dbprint("remove");
			for (let i = 0; i < matches.length; i++) { // find then remove
				this.hoveredElements.splice(this.hoveredElements.indexOf(matches[i]), 1);
			}
		} else {
			console.log("ERROR: improper usage of dataHoverChange");
		}
		this.dbprint("New hover size:" + this.hoveredElements.length);
		// update this apps broadcast value
		this.serverDataSetValue(this.id + ":source:dataHovered", this.hoveredElements);
	},

	load: function(date) {
	},

	draw: function(date) {
		// left intentionally blank
	},

	resize: function(date) {
		//this.svg.attr("width", this.sage2_width).attr("height", this.sage2_height);
	},

	/**
	* To enable right click context menu support this function needs to be present.
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
		entry.description = "Reload (resize)";
		entry.callback    = "reloadChart";
		entry.parameters  = { };
		entries.push(entry);

		entries.push({description: "separator"});

		entry = {};
		entry.description = "Set xAxis attribute:";
		entry.callback = "setAxisAttribute";
		entry.parameters     = { axis: "x" };
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		entry = {};
		entry.description = "Set yAxis attribute:";
		entry.callback = "setAxisAttribute";
		entry.parameters     = { axis: "y" };
		entry.inputField     = true;
		entry.inputFieldSize = 20;
		entries.push(entry);

		entries.push({description: "separator"});

		entry = {};
		entry.description = "Switch to Bar";
		entry.callback = "switchChartType";
		entry.parameters     = {chartType: "Bar" };
		entries.push(entry);

		entry = {};
		entry.description = "Switch to Pie";
		entry.callback = "switchChartType";
		entry.parameters     = { chartType: "Pie" };
		entries.push(entry);

		entry = {};
		entry.description = "Switch to Scatter";
		entry.callback = "switchChartType";
		entry.parameters     = { chartType: "Scatter" };
		entries.push(entry);

		return entries;
	},

	/**
	* Reloads the chart based on current values. Other actions?
	*
	* @method reloadChart
	*/
	reloadChart: function() {
		this.generateChartIfCan();
	},

	/**
	* Sets the axis attribute.
	*
	* @method setAxisAttribute
	*/
	setAxisAttribute: function(msgParams) {
		var attribute = msgParams.clientInput.trim();
		var chartValues = this.state.chartValues;
		// if the attribute exists in the first data element
		if (chartValues.data[0][attribute] !== null && chartValues.data[0][attribute] !== undefined) {
			if (msgParams.axis === "x") {
				chartValues.xAxisAttribute = attribute;
				if (this.dataTypeLookup(attribute).type === "time") {
					this.dbprint("New axis(" + attribute + ") using scaleTime");
					chartValues.xAxisScale = "scaleTime";
				} else {
					this.dbprint("New axis(" + attribute + ") using scaleLinear");
					chartValues.xAxisScale = "scaleLinear";
				}
			} else if (msgParams.axis === "y") {
				// Bar charts are the sums of unique values? Is there another case? Skip if bar
				if (chartValues.chartType !== "Bar" && chartValues.chartType !== "Pie") { // Cap 1st letter
					chartValues.yAxisAttribute = attribute;
					if (this.dataTypeLookup(attribute).type === "time") {
						chartValues.yAxisScale = "scaleTime";
					} else {
						chartValues.yAxisScale = "scaleLinear";
					}
				}
			}
			this.generateChartIfCan();
		} else {
			console.log("Error: unable to switch axis " + msgParams.axis + " to " + attribute + ". Doesn't exist in element 1?");
		}
	},

	/**
	* Changes chartType
	*
	* @method switchChartType
	*/
	switchChartType: function(msgParams) {
		if(this.state.chartValues) {
			this.state.chartValues.chartType = msgParams.chartType;
			this.generateChartIfCan();
		}
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		// no additional calls needed.
	},

	/**
	* This will check based on variable name, what it is.
	*
	* @method dataTypeLookup
	* @param {String} name - string of the field name.
	* @param {*} value - could be anything
	* @returns {Object} dataDescription - Describes what is known
	* @returns {String} dataDescription.type - String of what type is it (time)
	* @returns {String} dataDescription.format - Potentially the format of expectation (unsure...)
	*/
	dataTypeLookup: function(name, value) {
		var dataDescription = { // object to return (template)
			type: "",
			format: ""
		};
		var keys = Object.keys(this.dataTypes); // list of types known
		// for each time, check if name match
		for (var k in this.dataTypes) {
			if (this.dataTypes[k].names.includes(name)) { // set values if match
				dataDescription.type = k;
				dataDescription.format = "";
				break;
			}
		}
		return dataDescription;
	},

	dataTypes: {
		time: {
			names: ["time", "date"],
			format: ""
		}
	},

	
	blankString: "" // just a place holder

});
