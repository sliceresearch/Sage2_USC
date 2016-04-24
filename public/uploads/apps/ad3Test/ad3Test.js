// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015


//https://bost.ocks.org/mike/bar/3/
//https://bl.ocks.org/mbostock/3885304



var ad3Test = SAGE2_App.extend( {

	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous";
		this.maxFPS = 30;
		this.debug = true;

		this.passSage2PointerAsMouseEvents = true;

		this.printIfDebug( "id of this.element" + this.element.id );
		this.element.id = "div" + data.id;
		this.printIfDebug( "id of this.element after set" + this.element.id );

		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;


		this.fillWithHtml();
		this.d3ScriptFill();

	},

	printIfDebug : function(str) {
		if(this.debug) {
			console.log(str);
		}
	},

	fillWithHtml : function () {

		this.printIfDebug( "Attempting to add css tag" );
		// Load the CSS file
		this.addCSS(this.resrcPath + "scripts/styleBcTutorial.css", null);

	},

	addCSS : function(url, callback) {
	    var fileref = document.createElement("link")
		if( callback ) fileref.onload = callback;
	    fileref.setAttribute("rel", "stylesheet")
	    fileref.setAttribute("type", "text/css")
	    fileref.setAttribute("href", url)
		document.head.appendChild( fileref );
	},

	d3ScriptFill : function () {

		this.printIfDebug( "Attempting to add d3 elements" );

		var margin = {top: 20, right: 20, bottom: 30, left: 40},
		    width = 960 - margin.left - margin.right,
		    height = 500 - margin.top - margin.bottom;

		var x = d3.scale.ordinal()
		    .rangeRoundBands([0, width], .1);

		var y = d3.scale.linear()
		    .range([height, 0]);

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .orient("bottom");

		var yAxis = d3.svg.axis()
		    .scale(y)
		    .orient("left")
		    .ticks(10, "%");

		var svg = d3.select(this.element).append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var bcData = [
			{letter: "A",			frequency: .08167},
			{letter: "B",			frequency: .01492},
			{letter: "C",			frequency: .02782},
			{letter: "D",			frequency: .04253},
			{letter: "E",			frequency: .12702},
			{letter: "F",			frequency: .02288},
			{letter: "G",			frequency: .02015},
			{letter: "H",			frequency: .06094},
			{letter: "I",			frequency: .06966},
			{letter: "J",			frequency: .00153},
			{letter: "K",			frequency: .00772},
			{letter: "L",			frequency: .04025},
			{letter: "M",			frequency: .02406},
			{letter: "N",			frequency: .06749},
			{letter: "O",			frequency: .07507},
			{letter: "P",			frequency: .01929},
			{letter: "Q",			frequency: .00095},
			{letter: "R",			frequency: .05987},
			{letter: "S",			frequency: .06327},
			{letter: "T",			frequency: .09056},
			{letter: "U",			frequency: .02758},
			{letter: "V",			frequency: .00978},
			{letter: "W",			frequency: .02360},
			{letter: "X",			frequency: .00150},
			{letter: "Y",			frequency: .01974},
			{letter: "Z",			frequency: .00074}
		];

		x.domain(bcData.map(function(d) { return d.letter; }));
		y.domain([0, d3.max(bcData, function(d) { return d.frequency; })]);

		svg.append("g")
		  .attr("class", "x axis")
		  .attr("transform", "translate(0," + height + ")")
		  .call(xAxis);

		svg.append("g")
		  .attr("class", "y axis")
		  .call(yAxis)
		.append("text")
		  .attr("transform", "rotate(-90)")
		  .attr("y", 6)
		  .attr("dy", ".71em")
		  .style("text-anchor", "end")
		  .text("Frequency");

		svg.selectAll(".bar")
		  .data(bcData)
		  .enter().append("rect")
		  .attr("class", "bar")
		  .attr("x", function(d) { return x(d.letter); })
		  .attr("width", x.rangeBand())
		  .attr("y", function(d) { return y(d.frequency); })
		  .attr("height", function(d) { return height - y(d.frequency); });

		d3.selectAll(".bar")
	         .on("mouseover", function(d){
	         	d3.select(this).classed("bar",false);
	         	d3.select(this).classed("barBrown",true);
	         })
	         .on("mouseout", function(d){
	         	d3.select(this).classed("bar",true);
	         	d3.select(this).classed("barBrown",false);
	         });

	},

	type : function (d) {
		d.frequency = +d.frequency;
		return d;
	},

	load: function(date) {
	},

	draw: function(date) {
	},


	resize: function(date) {
	},
	
	event: function(eventType, position, user_id, data, date) {
		
	} //end event function

});













