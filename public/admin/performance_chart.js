// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2017

"use strict";

/**
 * SAGE2 Performance monitoring display
 *
 * @module client
 * @submodule SAGE2_Performance
 * @class Performance_Chart
 */

// Object to hold chart references
var charts = {};
var selectedDisplayClientIDList = [];
var clientCharts = {};

var colors = [];
var clientColorMap = {};

function makeSvg(domElementID, dim) {
	var chartMargin = dim || {top: 20, right: 50, bottom: 25, left: 20};
	var domElement = document.getElementById(domElementID);
	var width = chartMargin.width || parseInt(domElement.clientWidth);
	var height = chartMargin.height || parseInt(domElement.clientHeight);
	width = width - chartMargin.left - chartMargin.right;
	height = height - chartMargin.top - chartMargin.bottom;
	console.log(height);
	var box =  "0, 0, 1000, " + parseInt(1000 * (height / width));
	var svg = d3.select(domElement).append("svg")
    	.attr("width", width + chartMargin.left + chartMargin.right)
    	.attr("height", height + chartMargin.top + chartMargin.bottom)
        .attr("viewbox", box)
        .attr("preserveAspectRatio", "xMinYMin meet")
		.append("g")
		.attr("transform", "translate(" + chartMargin.left + "," + chartMargin.top + ")")
    return {svg: svg, width: width, height: height};
}

function handlePageResize(){
	var chartMargin = {top: 20, right: 50, bottom: 25, left: 20};
	var domElement, svg, width, height, box;
	for (var id in charts) {
		if (charts.hasOwnProperty(id) === true) {
			domElement = document.getElementById(id);
			width = parseInt(domElement.clientWidth);
			height = parseInt(domElement.clientHeight);
			width = width - chartMargin.left - chartMargin.right;
			height = height - chartMargin.top - chartMargin.bottom;
			box =  "0, 0, 1000, " + parseInt(1000 * (height / width));
			svg = charts[id].svg;
			svg.attr("width", width);
		    svg.attr("height", height);
		    svg.attr("viewbox", box);
		}
	}
}


function updateLineChart(chartId, data, key, filterlist) {
	var now = performanceMetrics.cpuLoad.date;
	var entireDurationInMilliseconds = durationInMinutes * 60 * 1000;
	var timeDomain = [now - entireDurationInMilliseconds, now];
	var chart = charts[chartId];
	chart.scaleX.domain(timeDomain);
	chart.xAxis.call(chart.xAxisFunc);
	chart.yAxis.call(chart.yAxisFunc);
	if (chart.current) {
		chart.current.text(chart.currentTextFunc());	
	}
	
	if (key !== null && key !== undefined) {
		var nestedData = d3.nest()
			.key(d => d[key])
			.object(data);
		//console.log(nestedData);
		for (var k in nestedData) {
			if (nestedData.hasOwnProperty(k) === true && filterlist.indexOf(k) < 0) {
				delete nestedData[k];
			}
		}
		var svg = chart.svg;
		
		svg.selectAll('.' + chartId + 'lines').remove();

		var lines = svg.selectAll('.' + chartId + 'lines')
			.data(Object.keys(nestedData));

		var lineg = lines.enter().append('g')
			.attr('class', chartId + 'lines');

		lineg.append('path')
			.attr('class', 'line')
			.attr('id', 'clientline')
			//.attr('class', 'line')
			.attr('stroke', function(d, i) {
				return clientColorMap[d];
			})
			.attr('d', function(d) {
				return chart.lineFunc(nestedData[d]);
			});

		lines.exit().remove();
	} else {
		chart.lineChart.attr('d', chart.lineFunc(data));
	}
}

function initializeGradientColors(threshold) {
	var gradientColors = [{
		offset: "0%",
		color: fillColor(0, threshold)
	}, {
		offset: (threshold * 100) + "%",
		color: fillColor(0, threshold)
	}];
	threshold = parseInt(threshold * 10);
	for (var i = threshold; i < 10; i = i + 1) {
		var temp = {
			offset: (i * 10) + "%",
			color: fillColor((i + 1) / 10, threshold / 10)
		};
		gradientColors.push(temp);
		temp = {
			offset: ((i + 1) * 10) + "%",
			color: fillColor((i + 1) / 10, threshold / 10)
		};
		gradientColors.push(temp);
	}
	return gradientColors;
}

function setupLineChart(id, titleText, lineFuncY, yAxisFormat, currentTextFunc, ythreshold, multiLineChart) {
	var chart;
	if (charts[id]) {
		chart = charts[id];
	} else {
		chart = makeSvg(id);
			
	    // set the ranges
		var scaleX = d3.scaleTime()
			.range([0, chart.width]);
		var scaleY = d3.scaleLinear()
			.range([chart.height, 0])
			.domain([0, 1.0]);

		if (ythreshold > 0) {
			chart.svg.append("linearGradient")
				.attr("id", "value-gradient")
				.attr("gradientUnits", "userSpaceOnUse")
				.attr("x1", 0).attr("y1", scaleY(0))
				.attr("x2", 0).attr("y2", scaleY(1.0))
				.selectAll("stop")
				.data(initializeGradientColors(ythreshold))
				.enter().append("stop")
					.attr("offset", function(d) {
						return d.offset;
					})
					.attr("stop-color", function(d) {
						return d.color;
					});
		}
		
		// define the line
		var chartLineFunc = d3.line()
	    	.x(function(d) { 
	    		return scaleX(d.date); 
	    	})
	    	.y(function(d) { 
	    		return scaleY(lineFuncY(d)); 
	    	})
	    	.curve(d3.curveLinear);

	    var chartLine;
	    if (multiLineChart === true) {
			chartLine = null;
		} else {
			chartLine = chart.svg.select('path');
			if (chartLine.empty()) {
				chartLine = chart.svg.append('path');
				if (ythreshold === 0) {
					chartLine.attr("class", "line");
				} else {
					chartLine.attr("class", "thresholdline");
				}
			}
		}


		var yAxisFunc = d3.axisRight(scaleY)
			.tickSizeInner(5)
			.tickSizeOuter(0)
			.tickPadding(5)
			.ticks(4)
			.tickFormat(yAxisFormat);

		var xAxisFunc = d3.axisBottom(scaleX)
			.tickSizeInner(5)
			.tickSizeOuter(0)
			.tickPadding(5)
			.ticks(d3.timeMinute.every(1));

		var xAxis =  chart.svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0, " + chart.height + ")");

		var yAxis = chart.svg.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(" + chart.width + ", 0)");

		var title = chart.svg.append("text")
	      .attr("x", 0)
	      .attr("y", 0)
	      .attr('class', "title")
	      .style("text-anchor", "start")
	      .text(titleText);

	    var current = null;
	    if (currentTextFunc) {
	    	current = chart.svg.append("text")
				.attr("x", 0)
				.attr("y", 15)
				.attr('class', "title")
				.style("text-anchor", "start");
	    }
	    

		charts[id] = {
			svg: chart.svg,
			width: chart.width,
			height: chart.height,
	    	lineChart: chartLine,
	    	lineFunc: chartLineFunc,
	    	scaleX: scaleX,
	    	scaleY: scaleY,
	    	yAxisFunc: yAxisFunc,
	    	xAxisFunc: xAxisFunc,
	    	yAxis: yAxis,
	    	xAxis: xAxis,
	    	title: title,
	    	current: current,
	    	currentTextFunc: currentTextFunc

	    };
	}
}



function buttonClicked (d, i){
	var idx = selectedDisplayClientIDList.indexOf(d.id);
	if (idx > -1) {
		selectedDisplayClientIDList.splice(idx, 1);
		d3.select(this.firstChild)
			.attr('stroke', 'black');
	} else {
		selectedDisplayClientIDList.push(d.id);
		d3.select(this.firstChild)
			.attr('stroke', clientColorMap[d.id]);
	}
	d3.select(this).attr()
	showDisplayClientsHistory(true);
}


function showDisplayClientsHistory(clicked) {
	var clientsHistoryDiv = document.getElementById('displaypanecontainer');
	
	if (selectedDisplayClientIDList.length > 0) {
		var yAxisFormatLoad = function(d) {
			return (d * 100) + "%";
		};
		var yAxisFormatMemory = function(d) {
			var mem = getNiceNumber(d
				* (performanceMetrics.memUsage.used + performanceMetrics.memUsage.free));
			return mem.number + mem.suffix;
		}
		setupLineChart('displaycpuload', 'Client CPU Load', function(d) {
				var cpu = d.cpuLoad;
		    	return cpu.load / (cpu.load + cpu.idle);
		    }, yAxisFormatLoad, null, 0.5, true);
		setupLineChart('displayclientload', 'SAGE2 Display Client Load', function(d) {
			var client = d.clientLoad;
			return client.cpuPercent / 100;
		}, yAxisFormatLoad, null, 0.5, true);
		setupLineChart('displaymemusage', 'Client System Memory', function(d) {
			var mem = d.memUsage;
			return mem.used / (mem.used + mem.free);
		}, yAxisFormatMemory, null, 0.7, true);

		setupLineChart('displayclientmem', 'SAGE2 Display Client Memory', function(d) {
			var client = d.clientLoad;
			return client.memPercent / 100;
		}, yAxisFormatMemory, null, 0.7, true);

		updateLineChart('displaycpuload', clients.history, 'id', selectedDisplayClientIDList);
		updateLineChart('displayclientload', clients.history, 'id', selectedDisplayClientIDList);
		updateLineChart('displaymemusage', clients.history, 'id', selectedDisplayClientIDList);
		updateLineChart('displayclientmem', clients.history, 'id', selectedDisplayClientIDList);
	} else {
		clientsHistoryDiv.style.height = 0 + "px";
	}
	if (clicked === true) {
		
		if (selectedDisplayClientIDList.length > 0) {
			window.scrollTo(0, document.body.scrollHeight);
			clientsHistoryDiv.style.height = clientsHistoryDiv.scrollHeight + "px";

		} else {
			clientsHistoryDiv.style.height = 0 + "px";
		}
	}
}


function fillColor(weight, threshold) {
	var color1 = [76, 164, 247]; // Blue
	var color2 = [255, 84, 84]; // Red
    var w1 = 1 - parseInt(weight + (1 - threshold));
    var w2 = weight;
    var w3 = 1 - w2;
    var rgb = [Math.round(color1[0] * w1 + (1 - w1) *(color1[0] * w3 + color2[0] * w2)),
        Math.round(color1[1] * w1 + (1 - w1) *(color1[1] * w3 + color2[1] * w2)),
        Math.round(color1[2] * w1 + (1 - w1) *(color1[2] * w3 + color2[2] * w2))];
    return 'rgb(' + rgb.join(',') + ')';
}

function drawDisplaySM() {

	var data = clients.performanceMetrics;

	if (data.length === 0) {
		d3.selectAll('.displaySM').remove();
		return;
	}
	//var arr = new Array(36).fill().map(u => (clients.performanceMetrics[0]));
	
	var smDiv = document.getElementById('smallmultiplediv');
	var margin = {left: 18, right: 18, top: 15, bottom: 15};
	var width = 150;
	var height = 140;
	var ncols = parseInt(smDiv.clientWidth / (width + margin.left + margin.right));
	var nrows = Math.round(0.4 + data.length / ncols);
	
	var barHeight = (height - 10) / 5;
	var divHeight = nrows * (height + margin.top + margin.bottom);
	
	smDiv.style.height = divHeight + "px";

	var chart;
	if (clientCharts['smallmultiplediv']) {
		chart = clientCharts['smallmultiplediv'];
	} else {
		chart = makeSvg('smallmultiplediv', {
			width: smDiv.clientWidth,
			height: divHeight,
			left: 0,
			right: 0, 
			top: 0,
			bottom: 0
		});
		clientCharts['smallmultiplediv'] = {
			svg: chart.svg
		};
	}


	//console.log(clients.performanceMetrics[0].cpuLoad);
	var smallMultiples = chart.svg.selectAll('.displaySM')
		//.data(arr);
		.data(data);

	smallMultiples.exit().remove();

	chart.svg.selectAll('.displaySM')
		.select('#cpubar')
		.attr('width', function(d, i) {
			var cpu = d.cpuLoad;
			return width  *  cpu.load / (cpu.load + cpu.idle);
		})
		.attr('fill', function(d) {
			var w = d3.select(this).attr('width');
			return fillColor(w / width, 0.5);
		});

	chart.svg.selectAll('.displaySM')
		.select('#membar')
		.attr('width', function(d, i) {
			var mem = d.memUsage;
			return width  *  mem.used / mem.total;
		})
		.attr('fill', function(d) {
			var w = d3.select(this).attr('width');
			return fillColor(w / width, 0.5);
		});

	chart.svg.selectAll('.displaySM')
		.select('#servercpubar')
		.attr('width', function(d, i) {
			var c = d.clientLoad;
			return width  *  c.cpuPercent / 100;
		})
		.attr('fill', function(d) {
			var w = d3.select(this).attr('width');
			return fillColor(w / width, 0.5);
		});

	chart.svg.selectAll('.displaySM')
		.select('#servermembar')
		.attr('width', function(d, i) {
			var c = d.clientLoad;
			return width  *  c.memPercent / 100;
		})
		.attr('fill', function(d) {
			var w = d3.select(this).attr('width');
			return fillColor(w / width, 0.5);
		});



	//console.log(smallMultiples.selectAll('#cpubar'));
	

	var clientSM = smallMultiples.enter().append('g')
		.attr('class', 'displaySM')
		.attr('transform', function(d, i) {
			var r = parseInt(i / ncols);
			var c = i % ncols;
			return 'translate(' + (margin.left + c * (width + margin.left + margin.right))
				+ ',' + (margin.top + r * (height + margin.top + margin.bottom)) + ')';
		})
		.on('click', buttonClicked);
	clientSM.append('rect')
		.attr('class', 'clickable')
		.attr('width', width + 10)
		.attr('height', height)
		.attr('x', 0)
		.attr('y', 0)
		.attr('fill','none')
		.attr('stroke', 'black')
		.attr('stroke-width', 4);

	clientSM.append('rect')
		.attr('class', 'clickable')
		.attr('width', width)
		.attr('height', height - 10)
		.attr('x', 5)
		.attr('y', 5)
		.attr('fill','rgb(80, 80, 80)')
		.attr('stroke', 'white');
	clientSM.append('text')
		.attr('x', width / 2)
		.attr('text-anchor', 'middle')
		.attr('alignment-baseline', 'middle')
		.attr('y', 5 + barHeight * 0.5)
		.attr('class', 'title')
		.text(function(d, i) {
			return 'Display ' + d.clientID;
		});
	
	// Server Load
	clientSM.append('rect')
		.attr('class', 'clickable')
		.attr('width', width - 2)
		.attr('height', barHeight - 2)
		.attr('x', 6)
		.attr('y', 5 + barHeight)
		.attr('fill', 'black')
		.attr('stroke', 'none');
	clientSM.append('rect')
		.attr('id', 'servercpubar')
		.attr('class', 'clickable')
		.attr('width', function(d, i) {
			var c = d.clientLoad;
			return (width - 2) *  c.cpuPercent / 100;
		})
		.attr('height', barHeight - 2)
		.attr('x', 6)
		.attr('y', 5 + barHeight)
		.attr('fill', function(d) {
			var w = d3.select(this).attr('width');
			return fillColor(w / width, 0.5);
		});
	clientSM.append('text')
		.attr('class', 'barlabel')
		.attr('x', width / 2)
		.attr('text-anchor', 'middle')
		.attr('y', 5 + barHeight * 1.5)
		.text('Client Load');


	// CPU Bar
	clientSM.append('rect')
		.attr('class', 'clickable')
		.attr('width', width - 2)
		.attr('height', barHeight - 2)
		.attr('x', 6)
		.attr('y', 5 + barHeight * 2)
		.attr('fill', 'black');
	clientSM.append('rect')
		.attr('id', 'cpubar')
		.attr('class', 'clickable')
		.attr('width', function(d, i) {
			var cpu = d.cpuLoad;
			return (width - 2)  *  cpu.load / (cpu.load + cpu.idle);
		})
		.attr('height', barHeight - 2)
		.attr('x', 6)
		.attr('y', 5 + barHeight * 2)
		.attr('fill', function(d) {
			var w = d3.select(this).attr('width');
			return fillColor(w / width, 0.5);
		});
	clientSM.append('text')
		.attr('class', 'barlabel')
		.attr('x', width / 2)
		.attr('text-anchor', 'middle')
		.attr('y', 5 + barHeight * 2.5)
		.text('CPU Load');

	// Server Memory
	clientSM.append('rect')
		.attr('class', 'clickable')
		.attr('width', width - 2)
		.attr('height', barHeight - 2)
		.attr('x', 6)
		.attr('y', 5 + barHeight * 3)
		.attr('fill', 'black');
	clientSM.append('rect')
		.attr('id', 'servermembar')
		.attr('class', 'clickable')
		.attr('width', function(d, i) {
			var c = d.clientLoad;
			return (width - 2)  *  c.memPercent / 100;
		})
		.attr('height', barHeight - 2)
		.attr('x', 6)
		.attr('y', 5 + barHeight * 3)
		.attr('fill', function(d) {
			var w = d3.select(this).attr('width');
			return fillColor(w / width, 0.5);
		});
	clientSM.append('text')
		.attr('class', 'barlabel')
		.attr('x', width / 2)
		.attr('text-anchor', 'middle')
		.attr('y', 5 + barHeight * 3.5)
		.text('Client Memory');

	// Memory Bar
	clientSM.append('rect')
		.attr('class', 'clickable')
		.attr('width', width - 2)
		.attr('height', barHeight - 2)
		.attr('x', 6)
		.attr('y', 5 + barHeight * 4)
		.attr('fill', 'black');
	clientSM.append('rect')
		.attr('id', 'membar')
		.attr('class', 'clickable')
		.attr('width', function(d, i) {
			var mem = d.memUsage;
			return (width - 2)  *  mem.used / mem.total;
		})
		.attr('height', barHeight - 2)
		.attr('x', 6)
		.attr('y', 5 + barHeight * 4)
		.attr('fill', function(d) {
			var w = d3.select(this).attr('width');
			return fillColor(w / width, 0.5);
		});
	clientSM.append('text')
		.attr('class', 'barlabel')
		.attr('x', width / 2)
		.attr('text-anchor', 'middle')
		.attr('y', 5 + barHeight * 4.5)
		.text('System Memory');
}
