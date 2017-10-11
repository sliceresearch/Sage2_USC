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
 * @class SAGE2_Performance
 */

/*global SAGE2_init: true */


/**
 * Global variables
 */

//One object that holds all performance related information
var performanceMetrics = {
	staticInformation: null,
	cpuLoad: null,
	serverProcessLoad: null,
	serverTraffic: null,
	network: null,
	memUsage: null,
	movingAvg1Minute: {
		cpuLoad: null,
		cpuCoresLoad: null,
		serverProcessLoad: null,
		serverTraffic: null,
		network: null,
		memUsage: null
	},
	movingAvgEntireDuration: {
		cpuLoad: null,
		serverProcessLoad: null,
		serverTraffic: null,
		network: null,
		memUsage: null
	},
	//Historical data for establishing time line
	history: {
		cpuLoad: [],
		serverProcessLoad: [],
		serverTraffic: [],
		network: [],
		memUsage: []
	}
};

var durationInMinutes = 5;
// default to 2 second - 'normal'
var samplingInterval  = 2;

// Object to hold chart references
var charts = {};





/**
 * Entry point of the performance application
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// Connect to the server
	var wsio = new WebsocketIO();

	console.log("Connected to server: ", window.location.origin);

	// Get the cookie for the session, if there's one
	var session = getCookie("session");

	// Callback when socket opens
	wsio.open(function() {
		console.log("open websocket");

		// Setup message callbacks
		setupListeners(wsio);

		// Register to the server as a console
		var clientDescription = {
			clientType: "performance",
			requests: {
				config:  true,
				version: true,
				time:    false,
				console: false
			},
			session: session
		};
		wsio.emit('addClient', clientDescription);
	});

	// Socket close event (ie server crashed)
	wsio.on('close', function() {
		var refresh = setInterval(function() {
			// make a dummy request to test the server every 2 sec
			var xhr = new XMLHttpRequest();
			xhr.open("GET", "/", true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4 && xhr.status === 200) {
					console.log("server ready");
					// when server ready, clear the interval callback
					clearInterval(refresh);
					// and reload the page
					window.location.reload();
				}
			};
			xhr.send();
		}, 2000);
	});
}


/**
 * Place callbacks on various messages from the server
 *
 * @method setupListeners
 * @param wsio {Object} websocket
 */
function setupListeners(wsio) {
	// Get elements from the DOM
	var terminal1 = document.getElementById('terminal1');
	
	// Got a reply from the server
	wsio.on('initialize', function() {
		initializeCharts();
	});

	// Server sends the SAGE2 version
	wsio.on('setupSAGE2Version', function(data) {
		console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
	});

	// Server sends the wall configuration
	wsio.on('setupDisplayConfiguration', function() {
		console.log('wall configuration');
	});

	// Server sends the animate loop event
	wsio.on('animateCanvas', function() {
		console.log('animateCanvas');
	});

	// Server sends hardware and performance data
	wsio.on('hardwareInformation', function(data) {
		var msg = "";
		if (data) {
			performanceMetrics.staticInformation = data;
			msg += 'System: ' + data.system.manufacturer + ' ' +
				data.system.model + '\n';
			msg += 'OS: ' + data.os.platform + ' ' +
				data.os.arch + ' ' + data.os.distro + ' ' + data.os.release + '\n';
			msg += 'CPU: ' + data.cpu.manufacturer + ' ' + data.cpu.brand + ' ' +
				data.cpu.speed + 'Ghz ' + data.cpu.cores + 'cores\n';
			// Sum up all the memory banks
			var totalMem = data.memLayout.reduce(function(sum, value) {
				return sum + value.size;
			}, 0);
			var memInfo = getNiceNumber(totalMem);
			msg += 'RAM: ' + memInfo.number + memInfo.suffix + '\n';
			var gpuMem = getNiceNumber(data.graphics.controllers[0].vram);
			// not very good on Linux (need to check nvidia tools)
			msg += 'GPU: ' + data.graphics.controllers[0].vendor + ' ' +
				data.graphics.controllers[0].model + ' ' +
				gpuMem.number + gpuMem.suffix + ' VRAM\n';
		}
		// Added content
		terminal1.textContent += msg;
		// automatic scrolling to bottom
		terminal1.scrollTop    = terminal1.scrollHeight;
	});
	wsio.on('performanceData', function(data) {
		if (data.durationInMinutes) {
			durationInMinutes = data.durationInMinutes;	
		}

		if (data.samplingInterval) {
			samplingInterval = data.samplingInterval;
		}
		
		saveData('cpuLoad', data.cpuLoad);
		saveData('memUsage', data.memUsage);
		saveData('network', data.network);
		
		saveData('serverProcessLoad', data.serverProcessLoad);
		saveData('serverTraffic', data.serverTraffic);
		findNetworkMax();
		console.log(performanceMetrics.network);
		updateChart('cpuload', performanceMetrics.history.cpuLoad);
		updateChart('serverload', performanceMetrics.history.serverProcessLoad);
		updateChart('memusage', performanceMetrics.history.memUsage);
		updateChart('servermem', performanceMetrics.history.serverProcessLoad);
		updateChart('servertraffic', performanceMetrics.history.serverTraffic);
		updateChart('systemtraffic', performanceMetrics.history.network);
		
	});
}



/**
  * Helper function to convert a number to shorter format with
  * appropriate suffix determined (K for Kilo and so on)
  *
  * @method getNiceNumber
  * @param {number} number - large number
  * @param {Boolean} giga - using 1000 or 1024
  */
function getNiceNumber(number, giga) {
	var suffix;
	var idx = 0;
	var base = giga ? 1000 : 1024;
	if (giga) {
		suffix = ['b', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb'];
	} else {
		suffix = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	}
	while (number > base) {
		number = number / base;
		idx = idx + 1;  // For every 1000 or 1024, a new suffix is chosen
	}
	return {number: number.toFixed(0), suffix: suffix[idx]};
}

/**
  * Helper function to get a percentage value
  *
  * @method getPercentString
  * @param {number} val - one part(of a total) for which percentage is to be computed
  * @param {number} remaining - remaining part (of the total)
  */
function getPercentString(val, remaining) {
	// Rounding off
	val = parseInt(val);
	remaining = parseInt(remaining);
	var percent = val * 100 / (val + remaining);
	return d3.format("3.0f")(percent);
}


/**
  * Saves metric data into current value placeholder and history list
  *
  * @method saveData
  * @param {string} metric - metric for which data is being saved
  * @param {object} data - current metric values obtained
  */
function saveData(metric, data) {
	// Number of samples in the history
	// time in seconds
	var samplesInDuration = durationInMinutes * 60 * (1.0 / samplingInterval);

	// Current value
	performanceMetrics[metric] = data;
	// Add data to the historic list
	performanceMetrics.history[metric].push(data);

	if (performanceMetrics.history[metric].length > samplesInDuration) {
		// Prune samples that are older than the set duration
		performanceMetrics.history[metric].splice(0,
			performanceMetrics.history[metric].length - samplesInDuration);
	} else {

	}
};

/**
  * Helper function to format memory usage info in a string 
  * 
  * @method formatMemoryString
  * @param {number} used - amount of memory used
  * @param {number} free - amount of memory free
  * @param {boolean} short - flag to request a short version of the string
  */
function formatMemoryString(used, free, short) {
	var total = used + free;
	var usedPercent = used / total * 100;
	used  = getNiceNumber(used);
	total = getNiceNumber(total);
	usedPercent = d3.format('3.0f')(usedPercent);
	var printString;
	if (short === true) {
		printString = usedPercent;
	} else {
		printString = usedPercent + "% ("  + used.number + used.suffix + ") of " +
			total.number + total.suffix;
	}
	return printString;
}


function makeSvg(domElementID) {
	var chartMargin = {top: 20, right: 50, bottom: 25, left: 20};
	var domElement = document.getElementById(domElementID);
	var width = parseInt(domElement.clientWidth);
	var height = parseInt(domElement.clientHeight);
	width = width - chartMargin.left - chartMargin.right;
	height = height - chartMargin.top - chartMargin.bottom;

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


function initializeCharts() {

	var yAxisFormatLoad = function(d) {
		return (d * 100) + "%";
	};

	var yAxisFormatMemory = function(d) {
		var mem = getNiceNumber(d
			* (performanceMetrics.memUsage.used + performanceMetrics.memUsage.free));
		return mem.number + mem.suffix;
	}

	var yAxisFormatNetworkServer = function(d) {
		var mem = getNiceNumber(d * performanceMetrics.serverTrafficMax * 1.2, true);
		return mem.number + mem.suffix;
	}

	var yAxisFormatNetworkSystem = function(d) {
		var mem = getNiceNumber(d * performanceMetrics.networkMax * 1.2, true);
		return mem.number + mem.suffix;
	}

	var currentCPULoadText = function() {
		var cpuLoad = performanceMetrics.cpuLoad;
		return "Current: " + getPercentString(cpuLoad.load, cpuLoad.idle) + "%";
	}
	setupChart('cpuload', 'CPU Load', function(d) {
    	return d.load / (d.load + d.idle);
    }, yAxisFormatLoad, currentCPULoadText, 0.5);

	
	var currentMemUsageText = function() {
		var memUsage = performanceMetrics.memUsage;
		return "Current: " + formatMemoryString(memUsage.used, memUsage.total - memUsage.used);
	}
    setupChart('memusage', 'System Memory', function(d) {
    	return d.used / (d.used + d.free);
    }, yAxisFormatMemory, currentMemUsageText, 0.7);

    var currentServerLoadText = function() {
		var serverLoad = performanceMetrics.serverProcessLoad;
		return "Current: " + d3.format('3.0f')(serverLoad.cpuPercent) + "%";
	}
	setupChart('serverload', 'Server Load', function(d) {
    	return d.cpuPercent / 100;
    }, yAxisFormatLoad, currentServerLoadText, 0.5);

	var currentServerMemText = function() {
		var memUsage = performanceMetrics.memUsage;
		var servermem = performanceMetrics.serverProcessLoad.memResidentSet;
		return "Current: " + formatMemoryString(servermem, memUsage.total - servermem);
	}
    setupChart('servermem', 'Server Memory', function(d) {
    	return d.memPercent / 100;
    }, yAxisFormatMemory, currentServerMemText, 0.7);

    var currentServerTrafficText = function() {
		var serverTraffic = performanceMetrics.serverTraffic;
		var currentTraffic = getNiceNumber(serverTraffic.totalOutBound + serverTraffic.totalInBound, true);
		return "Current: " + currentTraffic.number + currentTraffic.suffix;
	}
    setupChart('servertraffic', 'Server Traffic', function(d) {
    	return (d.totalOutBound + d.totalInBound) / (performanceMetrics.serverTrafficMax * 1.2);
    }, yAxisFormatNetworkServer, currentServerTrafficText, 0.99);

    var currentServerTrafficText = function() {
		var network = performanceMetrics.network;
		var currentTraffic = getNiceNumber(network.totalOutBound + network.totalInBound, true);
		return "Current: " + currentTraffic.number + currentTraffic.suffix;
	}
    setupChart('systemtraffic', 'System Traffic', function(d) {
    	return (d.totalOutBound + d.totalInBound) / (performanceMetrics.networkMax * 1.2);
    }, yAxisFormatNetworkSystem, currentServerTrafficText, 0.99);
}

function updateChart(chartId, data) {
	var now = performanceMetrics.cpuLoad.date;
	var entireDurationInMilliseconds = durationInMinutes * 60 * 1000;
	var timeDomain = [now - entireDurationInMilliseconds, now];
	var chart = charts[chartId];
	chart.scaleX.domain(timeDomain);
	chart.lineChart.attr('d', chart.lineFunc(data));
	chart.xAxis.call(chart.xAxisFunc);
	chart.yAxis.call(chart.yAxisFunc);
	chart.current.text(chart.currentTextFunc());
}

function setupChart(id, titleText, lineFuncY, yAxisFormat, currentTextFunc, ythreshhold) {
	var chart = makeSvg(id);
	
    // set the ranges
	var scaleX = d3.scaleTime()
		.range([0, chart.width]);
	var scaleY = d3.scaleLinear()
		.range([chart.height, 0])
		.domain([0, 1.0]);

	chart.svg.append("linearGradient")
		.attr("id", "value-gradient")
		.attr("gradientUnits", "userSpaceOnUse")
		.attr("x1", 0).attr("y1", scaleY(ythreshhold))
		.attr("x2", 0).attr("y2", scaleY(ythreshhold + 0.1))
		.selectAll("stop")
		.data([
			{offset: "0%", color: "yellow"},
			{offset: (ythreshhold * 100) + "%", color: "yellow"},
			{offset: (ythreshhold * 100) + "%", color: "red"},
			{offset: "100%", color: "red"}
		])
		.enter().append("stop")
			.attr("offset", function(d) {
				return d.offset;
			})
			.attr("stop-color", function(d) {
				return d.color;
			});
	// define the line
	var chartLineFunc = d3.line()
    	.x(function(d) { 
    		return scaleX(d.date); 
    	})
    	.y(function(d) { 
    		return scaleY(lineFuncY(d)); 
    	});

    var chartLine = chart.svg.select('path');

	if (chartLine.empty()) {
		chartLine = chart.svg.append('path')
			.attr("class", "line");
	}


	var yAxisFunc = d3.axisRight(scaleY)
		.tickSizeInner(5)
		.tickSizeOuter(0)
		.tickPadding(5)
		.ticks(3)
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

    var current = chart.svg.append("text")
      .attr("x", 0)
      .attr("y", 15)
      .attr('class', "title")
      .style("text-anchor", "start");

	charts[id] = {
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

function findNetworkMax() {
	var totalTrafficList = performanceMetrics.history.network.map(function(d) {
		return d.totalOutBound + d.totalInBound;
	})
	performanceMetrics.networkMax = d3.max(totalTrafficList);
	var totalServerTrafficList = performanceMetrics.history.serverTraffic.map(function(d) {
		return d.totalOutBound + d.totalInBound;
	})
	performanceMetrics.serverTrafficMax = d3.max(totalServerTrafficList);
}