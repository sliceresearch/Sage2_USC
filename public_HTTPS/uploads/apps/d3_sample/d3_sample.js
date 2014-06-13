// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file


function addCSS( url, callback ) {
    var fileref = document.createElement("link")
	if( callback ) fileref.onload = callback;
    fileref.setAttribute("rel", "stylesheet")
    fileref.setAttribute("type", "text/css")
    fileref.setAttribute("href", url)
	document.head.appendChild( fileref );
}


var d3_sample = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "continuous"; //"onfinish";
		this.vertices = null;
		this.voronoi  = null;
		this.svg      = null;
		this.path     = null;
	},


	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

		// Get width height from the supporting div		
		var width  = this.element.clientWidth;
		var height = this.element.clientHeight;

		this.element.id = "div" + id;

		// Load the CSS file
		addCSS(this.resrcPath + "scripts/style.css", null);

		// from voronoi example
		this.vertices = d3.range(100).map(function(d) {
		  return [Math.random() * width, Math.random() * height];
		});
		this.voronoi = d3.geom.voronoi().clipExtent([[0, 0], [width, height]]);

		// backup of the context
		var self = this;
		// attach the SVG into the this.element node provided to us
		var box="0,0,"+width+","+height;
		this.svg = d3.select(this.element).append("svg")
		    .attr("width",   width)
		    .attr("height",  height)
		    .attr("viewBox", box);
		  	//.on("mousemove", function() { self.vertices[0] = d3.mouse(this); self.draw_d3(); });

		this.path = this.svg.append("g").selectAll("path");

		this.svg.selectAll("circle")
		    .data(this.vertices.slice(1))
		  	.enter().append("circle")
		    .attr("transform", function(d) { return "translate(" + d + ")"; })
		    .attr("r", 1.5);

		this.draw_d3(date);
	},

	load: function(state, date) {
	},

	draw_d3: function(date) {
		var p = this.path.data(this.voronoi(this.vertices), polygon);

		p.exit().remove();

		p.enter().append("path")
			.attr("class", function(d, i) { return "q" + (i % 9) + "-9"; })
			.attr("d", polygon);

		p.order();
	},
	
	draw: function(date) {
	},

	resize: function(date) {
		this.svg.attr('width' ,  this.element.clientWidth  +"px");
		this.svg.attr('height' , this.element.clientHeight  +"px");
		this.refresh(date);
	},
	
	event: function(eventType, userId, x, y, data, date) {
		if (eventType === "pointerPress" && (data.button === "left") ) {
		}
		if (eventType === "pointerMove" ) {
			// seems slow
			//this.vertices[0] = [x,y];
			//this.draw_d3();
		}
		if (eventType === "pointerRelease" && (data.button === "left") ) {
		}
	}
	
});


function polygon(d) {
  return "M" + d.join("L") + "Z";
}
