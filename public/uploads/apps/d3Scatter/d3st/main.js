// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-17

"use strict";

var width = 960,
	height = 500,
	pointRadius = 4,
	brushHandleSize = 6,
	defaultExtent = [[100, 100], [300, 300]],
	// create # entries in an array, where each entry is [random * width, random * width]
	data = d3.range(100).map(function() { return [Math.random() * width, Math.random() * height]; });

var infoWindows = [];

var x = d3.scaleIdentity().domain([0, width]),
	y = d3.scaleIdentity().domain([0, height]);

var quadtree = d3.quadtree()
.extent([[-1, -1], [width + 1, height + 1]])
.addAll(data);

/*
visuals
svg holds the draw area
point is all the points drawn
brush is the brush object
*/
var svg, point, brush;

// adds an info window
setupInfoWindow();

// adds the actual svg render zone of size (resolution?) width and height
createD3SvgOnId("#nodeForD3", width, height);

createPointObjects(data, pointRadius);

createBrush();




// --------------------------------------------------------------------------------------------------------------------------------------------
// Creates info windows, one to start, but eventually probably becomes one per pointer
// setup a new info window
function setupInfoWindow(pointerId){
	var iw;
	if (!pointerId) {
		iw = document.createElement("div");
		infoWindows.push(iw);
		document.body.appendChild(iw); // TODO change to correct node

	}

	iw.style.position = "absolute";
	iw.style.zIndex = 100;
	iw.style.background = '#d8d5e4';
	
	iw.style.textContent = "";
	iw.style.top = "-100px";
	iw.style.left = "-100px";
}




// --------------------------------------------------------------------------------------------------------------------------------------------
// Creates the svg
// takes node id, width, height
function createD3SvgOnId(nodeId, w, h) {
	svg = d3.select(nodeId).append("svg")
	.attr("width", w)
	.attr("height", h);
}


// --------------------------------------------------------------------------------------------------------------------------------------------
// this is getting the points on the svg
// takes data, point radius
function createPointObjects(d, pr) {
	point = svg.selectAll(".point")
	.data(d)
	.enter().append("circle")
	.attr("class", "point")
	// .attr("class", "allPointerEvents")
	.attr("cx", function(d) { return d[0]; })
	.attr("cy", function(d) { return d[1]; })
	.attr("r", pr); // point radius
}


// --------------------------------------------------------------------------------------------------------------------------------------------
// The following section is everything related to createBrush()
function createBrush() {
	// this is the brush object
	brush = d3.brush().handleSize(brushHandleSize);
	// but the brush object needs to be associated with an svg g element
	var brushSvgG = svg.append("g")
		.attr("class", "brush")
		.attr("id", "brushSvgGId")
		.on("mousemove", function(d){
			// this is for info div, but placed here because g covers everything, event doesn't get to back elements
			detectIfNewPointer();
			showInfoIfOverDot();
		})
		.on("mouseout", function(d) {
			// this is for info div, but placed here because g covers everything, event doesn't get to back elements
			hideInfoOverDot();
		})
		.on("mouseleave", function(d) {
			// this is for info div, but placed here because g covers everything, event doesn't get to back elements
			hideInfoOverDot();
		})
		// add the reactions to brush. this is a very specific formatting
		.call(brush.on("brush", brushed))
		.call(brush.on("end", brushended));
}

function showInfoIfOverDot() {
	var bodyNode = d3.select('body').node(); // this has to change later.. to what idk
	var d3MousePos = d3.mouse(bodyNode);

	var apData = d3.selectAll(".point").data();
	var foundDot = false;

	for (let i = 0; i < apData.length; i++) {
		if (isPointInRect(d3MousePos[0], d3MousePos[1],
			{cx: apData[i][0], cy: apData[i][1], width: pointRadius * 2, height: pointRadius * 2} )
		){
			infoWindows[0].style.left = (d3MousePos[0] + pointRadius * 2) + "px";
			infoWindows[0].style.top = (d3MousePos[1] + pointRadius * 2) + "px"; 
			infoWindows[0].innerHTML = apData[i][0] + "<br>" + apData[i][1]; 
			foundDot = true;
			break;
		}
	}
	if (!foundDot) {
		hideInfoOverDot();
	}
}

function isPointInRect(px, py, rect) {
	if (px > rect.cx - rect.width/2
	&& px < rect.cx + rect.width/2
	&& py > rect.cy - rect.height/2
	&& py < rect.cy + rect.height/2) {
		return true;
	}
	return false;
}

function hideInfoOverDot() {
	infoWindows[0].style.left = "0px";
	infoWindows[0].style.top = "0px";
	infoWindows[0].innerHTML = ""; 
}

function brushed(e) {
	if (!d3.event.selection) { return; }
	var selectRect = d3.event.selection;
	//console.log("selection detected:" + selectRect);
	point.each(function(d) { d.selected = false; });
	searchWithinQuad(quadtree, selectRect[0][0], selectRect[0][1], selectRect[1][0], selectRect[1][1]);
	point.classed("selected", function(d) { return d.selected; });
}

function brushended() {
	if (!d3.event){
	 return; //
	}
}

// Find the nodes within the specified rectangle.
/*
	when using quadtree.visit() the call back given always returns the node and that nodes boundaries
		a node is either an end point (actual data) or container
	the call back returns
		true if the container / node is outside of the selection
		false if the point or container contains the selection or is within the selection
 */
function searchWithinQuad(quadtree, cx1, cy1, cx2, cy2) {
	var onePrint = true;
	quadtree.visit(function(node, x1, y1, x2, y2) {
	var p = node.data; // the node has data. this is a change(?) from v3 -> v4
	if (p) { // since this is a node, if within selection selection set to true, otherwise false
		p.selected = (p[0] >= cx1) && (p[0] < cx2) && (p[1] >= cy1) && (p[1] < cy2);
	}
	return x1 >= cx2 || y1 >= cy2 || x2 < cx1 || y2 < cy1;
	});
}

function detectIfNewPointer() {
	if (!d3.event) {
		// need an event to check
		return;
	}
	if (d3.event.s2pid) {
		console.log("detected s2pid: " + d3.event.s2pid);
	}
}















// --------------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------------

// erase me, later this is a testing section

setTimeout(function() {
	console.log("trying to send custom mouse event");
	let bsvg = document.getElementById("brushSvgGId");
	let metp = new CustomEvent("mousemove", {bubbles: true});
	metp.s2pid = "this was generated by a custom event";
	bsvg.dispatchEvent(metp);
}, 2000 );