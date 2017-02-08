// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

//
// Ported to SAGE2 from https://bl.ocks.org/mbostock/b89c89ec6b58435956a1
//

var polarclock_svg = (function() {
	// import d3.v4 specifically
	let d3 = SAGE2_LibLoader.import("d3", "v4");

	let myApp = SAGE2_App.extend({
		init: function(data) {
			this.SAGE2Init("div", data);

			this.element.id = "div" + data.id;

			this.resizeEvents = "continuous"; // "onfinish";

			// save the view box (coordinate system)
			this.box = [data.width, data.height];

			// attach the SVG into the this.element node provided to us
			var box = "0,0," + this.box[0] + "," + this.box[1];
			this.svg = d3.select(this.element).append("svg")
				.attr("width",   data.width)
				.attr("height",  data.height)
				.attr("viewBox", box);

			d3.select(this.element)
				.style("background", "#222")
				.style("margin", "auto");

			this.draw_d3(data.date);
			this.controls.finishedAddingControls();
		},

		load: function(date) {
		},

		draw_d3: function(date) {
			var svg = this.svg,
			    width = +svg.attr("width"),
			    height = +svg.attr("height"),
			    radius = Math.min(width, height) / 1.9,
			    bodyRadius = radius / 23,
			    dotRadius = bodyRadius - 8;

			var pi = Math.PI;

			var fields = [
			  {radius: 0.2 * radius, format: d3.timeFormat("%B"),          interval: d3.timeYear},
			  {radius: 0.3 * radius, format: formatDate,                   interval: d3.timeMonth},
			  {radius: 0.4 * radius, format: d3.timeFormat("%A"),          interval: d3.timeWeek},
			  {radius: 0.6 * radius, format: d3.timeFormat("%-H hours"),   interval: d3.timeDay},
			  {radius: 0.7 * radius, format: d3.timeFormat("%-M minutes"), interval: d3.timeHour},
			  {radius: 0.8 * radius, format: d3.timeFormat("%-S seconds"), interval: d3.timeMinute}
			];

			var arcBody = d3.arc()
			    .startAngle(function(d) { return bodyRadius / d.radius; })
			    .endAngle(function(d) { return -pi - bodyRadius / d.radius; })
			    .innerRadius(function(d) { return d.radius - bodyRadius; })
			    .outerRadius(function(d) { return d.radius + bodyRadius; })
			    .cornerRadius(bodyRadius);

			var arcTextPath = d3.arc()
			    .startAngle(function(d) { return -bodyRadius / d.radius; })
			    .endAngle(-pi)
			    .innerRadius(function(d) { return d.radius; })
			    .outerRadius(function(d) { return d.radius; });

			var g = svg.append("g")
			    .attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

			g.append("g")
			    .attr("class", "tracks")
					.style("fill", "none")
					.style("stroke", "#000")
					.style("stroke-width", "1.5px")
			  .selectAll("circle")
			    .data(fields)
			  .enter().append("circle")
			    .attr("r", function(d) { return d.radius; });

			var body = g.append("g")
			    .attr("class", "bodies")
			  .selectAll("g")
			    .data(fields)
			  .enter().append("g");

			body.append("path")
			    .attr("d", function(d) {
			      return arcBody(d)
			          + "M0," + (dotRadius - d.radius)
			          + "a" + dotRadius + "," + dotRadius + " 0 0,1 0," + -dotRadius * 2
			          + "a" + dotRadius + "," + dotRadius + " 0 0,1 0," + dotRadius * 2;
			    })
					.style("stroke", "#000")
					.style("stroke-width", "1.5px");

			body.append("path")
			    .attr("class", "text-path")
			    .attr("id", function(d, i) { return "body-text-path-" + i; })
			    .attr("d", arcTextPath)
					.style("stroke", "none");

			var bodyText = body.append("text")
			    .attr("dy", ".35em")
			  .append("textPath")
			    .attr("xlink:href", function(d, i) { return "#body-text-path-" + i; })
					.style("fill", "#000")
					.style("font", "500 16px 'Helvetica Neue'");

			tick();

			d3.timer(tick);

			function tick() {
			  var now = Date.now();

			  fields.forEach(function(d) {
			    var start = d.interval(now),
			        end = d.interval.offset(start, 1);
			    d.angle = Math.round((now - start) / (end - start) * 360 * 100) / 100;
			  });

			  body
			      .style("fill", function(d) { return d3.interpolateRainbow(d.angle/360); })
			      .attr("transform", function(d) { return "rotate(" + d.angle + ")"; });

			  bodyText
			      .attr("startOffset", function(d, i) { return d.angle <= 90 || d.angle > 270 ? "100%" : "0%"; })
			      .attr("text-anchor", function(d, i) { return d.angle <= 90 || d.angle > 270 ? "end" : "start"; })
			      .text(function(d) { return d.format(now); });
			}

			function formatDate(d) {
			  d = new Date(d).getDate();
			  switch (10 <= d && d <= 19 ? 10 : d % 10) {
			    case 1: d += "st"; break;
			    case 2: d += "nd"; break;
			    case 3: d += "rd"; break;
			    default: d += "th"; break;
			  }
			  return d;
			}
		},

		draw: function(date) {
		},

		resize: function(date) {
			this.svg.attr('width',  this.element.clientWidth);
			this.svg.attr('height', this.element.clientHeight);
			this.refresh(date);
		},

		event: function(eventType, position, user_id, data, date) {
			// if (eventType === "pointerPress" && (data.button === "left")) {
			// 	// press
			// }
			// if (eventType === "pointerMove") {
			// 	// scale the coordinate by the viewbox (coordinate system)
			// 	var scalex = this.box[0] / this.element.clientWidth;
			// 	var scaley = this.box[1] / this.element.clientHeight;
			// 	this.vertices[0] = [position.x * scalex, position.y * scaley];
			// 	this.draw_d3();
			// }
			// if (eventType === "pointerRelease" && (data.button === "left")) {
			// 	// release
			// }
		}
	});

	return myApp;

})();
