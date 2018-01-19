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

/*global SAGE2_init: true, d3: true, drawDisplaySM: true, showDisplayClientsHistory: true,
  setupLineChart: true, charts: true */


/**
 * Global variables
 */

//One object that holds all performance related information
var performanceMetrics = {
	staticInformation: null,
	cpuLoad: null,
	serverLoad: null,
	serverTraffic: null,
	network: null,
	memUsage: null,
	movingAvg1Minute: {
		cpuLoad: null,
		cpuCoresLoad: null,
		serverLoad: null,
		serverTraffic: null,
		network: null,
		memUsage: null
	},
	movingAvgEntireDuration: {
		cpuLoad: null,
		serverLoad: null,
		serverTraffic: null,
		network: null,
		memUsage: null
	},
	//Historical data for establishing time line
	history: {
		cpuLoad: [],
		serverLoad: [],
		serverTraffic: [],
		network: [],
		memUsage: []
	}
};

var clients = {
	hardware: [],
	performanceMetrics: [],
	history: []
};

var durationInMinutes = 5;
// default to 2 second - 'normal'
var samplingInterval  = 2;

var clientColorMap = {};
var selectedDisplayClientIDList = [];
var colors = [];
var displayConfig = null;


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
	var heading1  = document.getElementById('serverheading');
	// Got a reply from the server
	wsio.on('initialize', function() {
		colors.push(...d3.schemeCategory20);
		colors.push(...d3.schemeCategory20b);
		initializeCharts();
	});

	// Server sends the SAGE2 version
	wsio.on('setupSAGE2Version', function(data) {
		console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
	});

	// Server sends the wall configuration
	wsio.on('setupDisplayConfiguration', function(config) {
		console.log(config);
		if (displayConfig === null) {
			displayConfig = config;
			if (terminal1.textContent.length > 0) {
				var dispRes = getDisplayResolutionInfo();
				var msg = terminal1.textContent;
				msg += '\n';
				msg += 'Display Config \n';
				msg += 'Layout:    ' + dispRes.layout + '\n';
				msg += 'Total res: ' + dispRes.resolution + ' pixels' + '\n';
				terminal1.textContent = msg;
			}
		}
	});

	// Server sends hardware and performance data
	wsio.on('serverHardwareInformation', function(data) {
		var msg = "";
		if (data) {
			performanceMetrics.staticInformation = data;
			msg += 'System:    ' + data.system.manufacturer + ' ' +
				data.system.model + '\n';
			msg += 'Name:      ' + data.hostname + '\n';
			msg += 'OS:        ' + data.os.platform + ' ' +
				data.os.arch + ' ' + data.os.distro + ' ' + data.os.release + '\n';
			msg += 'CPU:       ' + data.cpu.manufacturer + ' ' + data.cpu.brand + ' ' +
				data.cpu.speed + 'Ghz ' + data.cpu.cores + 'cores\n';
			// Sum up all the memory banks
			var totalMem = data.memLayout.reduce(function(sum, value) {
				return sum + value.size;
			}, 0);
			var memInfo = getNiceNumber(totalMem);
			msg += 'RAM:       ' + memInfo.number + memInfo.suffix + '\n';
			// iterates over the GPU list
			for (let i = data.graphics.controllers.length - 1; i >= 0; i--) {
				let gpu = data.graphics.controllers[i];
				let gpuMem = getNiceNumber(gpu.vram);
				msg += 'GPU:       ' + gpu.vendor + ' ' + gpu.model + ' ' +
					gpuMem.number + gpuMem.suffix + ' VRAM\n';
			}
			// if there's no GPU recognized
			if (data.graphics.controllers.length === 0) {
				msg += 'GPU:    -\n';
			}
			var dispRes = getDisplayResolutionInfo();
			if (dispRes !== null) {
				msg += '\n';
				msg += 'Display Config \n';
				msg += 'Layout:    ' + dispRes.layout + '\n';
				msg += 'Total res: ' + dispRes.resolution + ' pixels' + '\n';
			}
			// Set the name of the server in the page
			if (heading1) {
				if (data.servername.length > 0) {
					heading1.textContent = 'Server: ' + data.servername + ' (' + data.serverhost + ')';
				} else {
					heading1.textContent = 'Server: ' + data.serverhost;
				}
			}
		}
		// Added content
		terminal1.textContent = msg;
		// automatic scrolling to bottom
		//terminal1.scrollTop    = terminal1.scrollHeight;
	});

	wsio.on('addDisplayHardwareInformation', function(data) {
		if (Array.isArray(data) === true) {
			clients.hardware = data;
		} else {
			console.log(data);
			clients.hardware.push(data);
		}
		showDisplayHardwareInformation();
	});
	wsio.on('removeDisplayHardwareInformation', function(data) {
		if (data.id !== null && data.id !== undefined) {
			var closedDisplay = clients.hardware.findIndex(function(d) {
				return d.id === data.id;
			});
			if (closedDisplay > -1) {
				clients.hardware.splice(closedDisplay, 1);
			}
		}
		showDisplayHardwareInformation();
	});

	wsio.on('performanceData', function(data) {
		if (Array.isArray(data.cpuLoad) === true) {
			// History has been sent
			saveData('cpuLoad', data.cpuLoad, true);
			saveData('memUsage', data.memUsage, true);
			saveData('network', data.network, true);
			saveData('serverLoad', data.serverLoad, true);
			saveData('serverTraffic', data.serverTraffic, true);
			clients.history = data.clients;
		} else {
			// Current values
			if (data.durationInMinutes) {
				durationInMinutes = data.durationInMinutes;
			}

			if (data.samplingInterval) {
				samplingInterval = data.samplingInterval;
			}

			saveData('cpuLoad', data.cpuLoad);
			saveData('memUsage', data.memUsage);
			saveData('network', data.network);
			saveData('serverLoad', data.serverLoad);
			saveData('serverTraffic', data.serverTraffic);
			if (displayConfig === null) {
				return;
			}
			if (data.displayPerf !== null && data.displayPerf !== undefined && data.displayPerf.length > 0) {
				clients.performanceMetrics = data.displayPerf;
				var now = clients.performanceMetrics[0].date;
				clients.performanceMetrics.sort(function(a, b) {
					return a.clientID - b.clientID;
				});
				clients.history.push(...clients.performanceMetrics);
				var durationAgo = now - durationInMinutes * (60 * 1000);
				removeObjectsFromArrayOnPropertyValue(clients.history, 'date', durationAgo, 'lt');
				if (clients.performanceMetrics.length > clients.hardware.length) {
					wsio.emit("requestClientUpdate");
				} else if (clients.performanceMetrics.length < displayConfig.displays.length) {
					flagOfflineDisplayClients();
				}
				if (displayConfig.displays.length > clients.hardware.length) {
					flagMissingDisplayClients();
				}
			} else {
				clients.performanceMetrics = [];
				var smDiv = document.getElementById('smallmultiplediv');
				smDiv.style.height = 0 + 'px';
				var displayMetricDiv = document.getElementById('displaypanecontainer');
				displayMetricDiv.style.height = 0 + 'px';
			}

			findMaxValues();
			initializeCharts();
			drawCharts();
		}

		if (performanceMetrics.staticInformation === null ||
				performanceMetrics.staticInformation === undefined) {
			wsio.emit("requestClientUpdate");
		}
	});

	// Socket close event (ie server crashed)
	wsio.on('close', function(evt) {
		//showSAGE2Message("Server offline");
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

function flagMissingDisplayClients() {
	var data = clients.performanceMetrics;
	data.forEach(el => {
		var match = clients.hardware.find(function(d) {
			return d.clientID === el.clientID;
		});
		if (match === null || match === undefined) {
			el.status = 'missing';
		}
	});
}

function flagOfflineDisplayClients() {
	var data = displayConfig.displays;
	data.forEach(function (el, i) {
		var match = clients.performanceMetrics.find(function(d) {
			return d.clientID === i;
		});
		if (match === null || match === undefined) {
			var clientPerfEntry = {
				clientID: i,
				id: null,
				status: 'off'
			};

			clients.performanceMetrics.push(clientPerfEntry);
		}
	});
	clients.performanceMetrics.sort(function(a, b) {
		return a.clientID - b.clientID;
	});
}

function getDisplayResolutionInfo() {
	var cfg = displayConfig;
	if (cfg !== null) {
		var lyt = cfg.layout.rows + " X " + cfg.layout.columns;
		var res = cfg.totalWidth + " X " + cfg.totalHeight;
		return {layout: lyt, resolution: res};
	}
	return null;
}

function drawCharts() {
	updateLineChart('cpuload', performanceMetrics.history.cpuLoad);
	updateLineChart('serverload', performanceMetrics.history.serverLoad);
	updateLineChart('memusage', performanceMetrics.history.memUsage);
	updateLineChart('servermem', performanceMetrics.history.serverLoad);
	updateLineChart('servertraffic', performanceMetrics.history.serverTraffic);
	updateLineChart('systemtraffic', performanceMetrics.history.network);

	cleanUpSelectedDisplayList();
	drawDisplaySM();
	showDisplayClientsHistory();
}


function handlePageResize() {
	// body.style.webkitTransform = "scale(" + scaleFactor + ")";
	// body.style.mozTransform    = "scale(" + scaleFactor + ")";
	// body.style.transform       = "scale(" + scaleFactor + ")";

	d3.selectAll('svg')
		.attr("width", function(d) {
			return this.parentNode.clientWidth;
		})
		.attr("height", function(d) {
			return this.parentNode.clientHeight;
		})
		.attr("viewbox", function(d) {
			var width = this.parentNode.clientWidth;
			var height = this.parentNode.clientHeight;
			//console.log(this.parentNode.id, width);
			return "0, 0, 1000, " + parseInt(1000 * (height / width));
		});
	initializeCharts();
	drawCharts();
}

//
// Show error message
// if time given as parameter in seconds, close after delay
//
function showSAGE2Message(message, delay) {
	// Display server offline message
}


function showDisplayHardwareInformation() {
	var terminal2 = document.getElementById('terminal2');
	var data = clients.hardware;
	if (data.length > 0) {
		var msg = "";
		for (let i = 0; i < data.length; i++) {
			let disp = data[i];
			msg += '<span style="color:cyan;">Display ' + disp.clientID + ' </span>: ' + disp.system.manufacturer + ' ' +
				disp.system.model + '\n   ';
			msg += 'Name:  ' + disp.hostname + '\n   ';
			msg += 'OS:    ' + disp.os.platform + ' ' +
				disp.os.arch + ' ' + disp.os.distro + ' ' + disp.os.release + '\n   ';
			msg += 'CPU:   ' + disp.cpu.manufacturer + ' ' + disp.cpu.brand + ' ' +
				disp.cpu.speed + 'Ghz ' + disp.cpu.cores + 'cores\n   ';
			// Sum up all the memory banks
			var totalMem = disp.memLayout.reduce(function(sum, value) {
				return sum + value.size;
			}, 0);
			var memInfo = getNiceNumber(totalMem);
			msg += 'RAM:   ' + memInfo.number + memInfo.suffix + '\n   ';
			var gpuMem = getNiceNumber(disp.graphics.controllers[0].vram);
			// not very good on Linux (need to check nvidia tools)
			msg += 'GPU:   ' + disp.graphics.controllers[0].vendor + ' ' +
				disp.graphics.controllers[0].model + ' ' +
				gpuMem.number + gpuMem.suffix + ' VRAM\n   ';
			if (displayConfig !== null) {
				msg += 'Res:   ' + displayConfig.resolution.width + ' X ' +
					displayConfig.resolution.height + ' pixels' + '\n';
			}
			// Assign colors to display clients
			if (clientColorMap.hasOwnProperty(disp.id) === false) {
				clientColorMap[disp.id] = getNewColor(clientColorMap);
			}
		}
		// Added content
		terminal2.innerHTML = msg;
		// automatic scrolling to bottom
		terminal2.scrollTop = terminal2.scrollHeight;
	} else {
		terminal2.innerHTML = 'No Electron Display Client active.';
	}
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
	while (number >= base) {
		number = number / base;
		idx = idx + 1;  // For every 1000 or 1024, a new suffix is chosen
	}
	return {number: number.toFixed(0), suffix: suffix[idx]};
}


/**
  * Helper function to get the next power of ten closest to a number
  *
  * @method getNextPowerOfTen
  * @param {number} number - some number
  */
function getNextPowerOfTen(number) {
	var powerOfTen = 1;
	while (number >= powerOfTen) {
		powerOfTen = powerOfTen * 10;
	}
	return powerOfTen;
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
function saveData(metric, data, history) {
	// Number of samples in the history
	// time in seconds
	if (history === true) {
		performanceMetrics.history[metric] = data;
	} else if (data !== null) {
		// Current value
		performanceMetrics[metric] = data;
		var now = data.date;
		// Add data to the historic list
		performanceMetrics.history[metric].push(data);

		var durationAgo = now - durationInMinutes * (60 * 1000);
		removeObjectsFromArrayOnPropertyValue(performanceMetrics.history[metric], "date", durationAgo, 'lt');
	}
}

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


function initializeCharts() {

	var yAxisFormatLoad = function(d) {
		return (d * 100) + "%";
	};

	var yAxisFormatMemory = function(d) {
		var mem = getNiceNumber(d
			* (performanceMetrics.memUsage.used + performanceMetrics.memUsage.free));
		return mem.number + mem.suffix;
	};

	var yAxisFormatNetworkServer = function(d) {
		var mem = getNiceNumber(d * performanceMetrics.serverTrafficMax, true);
		return mem.number + mem.suffix + "ps";
	};

	var yAxisFormatNetworkSystem = function(d) {
		var mem = getNiceNumber(d * performanceMetrics.networkMax, true);
		return mem.number + mem.suffix + "ps";
	};

	var yAxisFormatSAGE2Memory = function(d) {
		var mem = getNiceNumber(d * performanceMetrics.sage2MemoryMax, true);
		return mem.number + mem.suffix;
	};

	var currentCPULoadText = function() {
		if (performanceMetrics.cpuLoad) {
			var cpuLoad = performanceMetrics.cpuLoad;
			return getPercentString(cpuLoad.load, cpuLoad.idle) + "%";
		} else {
			return "";
		}
	};
	setupLineChart('cpuload', 'CPU Load', function(d) {
		return d.load / (d.load + d.idle);
	}, yAxisFormatLoad, currentCPULoadText, 0.5);


	var currentMemUsageText = function() {
		if (performanceMetrics.memUsage) {
			var memUsage = performanceMetrics.memUsage;
			return formatMemoryString(memUsage.used, memUsage.total - memUsage.used);
		} else {
			return "";
		}
	};
	setupLineChart('memusage', 'System Memory', function(d) {
		return d.used / (d.used + d.free);
	}, yAxisFormatMemory, currentMemUsageText, 0.7);

	var currentServerLoadText = function() {
		if (performanceMetrics.serverLoad) {
			var serverLoad = performanceMetrics.serverLoad;
			return d3.format('3.0f')(serverLoad.cpuPercent) + "%";
		} else {
			return "";
		}
	};
	setupLineChart('serverload', 'SAGE2 Load', function(d) {
		return d.cpuPercent / 100;
	}, yAxisFormatLoad, currentServerLoadText, 0.5);

	var currentServerMemText = function() {
		if (performanceMetrics.memUsage) {
			var memUsage = performanceMetrics.memUsage;
			var servermem = performanceMetrics.serverLoad.memResidentSet;
			return formatMemoryString(servermem, memUsage.total - servermem);
		} else {
			return "";
		}
	};
	setupLineChart('servermem', 'SAGE2 Memory', function(d) {
		return d.memResidentSet / performanceMetrics.sage2MemoryMax;
	}, yAxisFormatSAGE2Memory, currentServerMemText, 0);

	var currentServerTrafficText = function() {
		if (performanceMetrics.serverTraffic) {
			var serverTraffic = performanceMetrics.serverTraffic;
			var currentTraffic = getNiceNumber(serverTraffic.totalOutBound + serverTraffic.totalInBound, true);
			return currentTraffic.number + currentTraffic.suffix + "ps";
		} else {
			return "";
		}
	};
	setupLineChart('servertraffic', 'SAGE2 Traffic', function(d) {
		return (d.totalOutBound + d.totalInBound) / performanceMetrics.serverTrafficMax;
	}, yAxisFormatNetworkServer, currentServerTrafficText, 0);

	var currentSystemTrafficText = function() {
		if (performanceMetrics.network) {
			var network = performanceMetrics.network;
			var currentTraffic = getNiceNumber(network.totalOutBound + network.totalInBound, true);
			return currentTraffic.number + currentTraffic.suffix + "ps";
		} else {
			return "";
		}
	};
	setupLineChart('systemtraffic', 'System Traffic', function(d) {
		return (d.totalOutBound + d.totalInBound) / performanceMetrics.networkMax;
	}, yAxisFormatNetworkSystem, currentSystemTrafficText, 0);
}


function findMaxValues() {
	var totalTrafficList = performanceMetrics.history.network.filter(function(d) {
		return d !== null && d !== undefined;
	}).map(function(d) {
		return d.totalOutBound + d.totalInBound;
	});
	performanceMetrics.networkMax = getNextPowerOfTen(d3.max(totalTrafficList));
	var totalServerTrafficList = performanceMetrics.history.serverTraffic.filter(function(d) {
		return d !== null && d !== undefined;
	}).map(function(d) {
		return d.totalOutBound + d.totalInBound;
	});
	performanceMetrics.serverTrafficMax = getNextPowerOfTen(d3.max(totalServerTrafficList));

	var totalSage2MemoryList = performanceMetrics.history.serverLoad.filter(function(d) {
		return d !== null && d !== undefined;
	}).map(function(d) {
		return d.memResidentSet;
	});
	performanceMetrics.sage2MemoryMax = getNextPowerOfTen(d3.max(totalSage2MemoryList));

	var totalClientMemoryList = clients.history.filter(function(d) {
		return d !== null && d !== undefined;
	}).map(function(d) {
		var mem = d.memUsage;
		return mem.used + mem.free;
	});
	clients.systemMemoryMax = d3.max(totalClientMemoryList);

	var totClientDisplayMemList = clients.history.filter(function(d) {
		return d !== null && d !== undefined;
	}).map(function(d) {
		var clientLoad = d.clientLoad;
		return clientLoad.memResidentSet;
	});
	clients.displayMemoryMax = getNextPowerOfTen(d3.max(totClientDisplayMemList));
}


function removeObjectsFromArrayOnPropertyValue(array, property, value, condition) {
	// Current value
	var mapFunc;
	switch (condition) {
		case 'lt':
			mapFunc = function(d) {
				if ((d !== null) && (d !== undefined)) {
					return d[property] < value;
				} else {
					return false;
				}
			};
			break;
		case 'gt':
			mapFunc = function(d) {
				if ((d !== null) && (d !== undefined)) {
					return d[property] > value;
				} else {
					return false;
				}
			};
			break;
		case 'lte':
			mapFunc = function(d) {
				if ((d !== null) && (d !== undefined)) {
					return d[property] <= value;
				} else {
					return false;
				}
			};
			break;
		case 'gte':
			mapFunc = function(d) {
				if ((d !== null) && (d !== undefined)) {
					return d[property] >= value;
				} else {
					return false;
				}
			};
			break;
		case 'eq':
		default:
			mapFunc = function(d) {
				if ((d !== null) && (d !== undefined)) {
					return d[property] === value;
				} else {
					return false;
				}
			};
			break;
	}
	var results = array.map(mapFunc);
	var count = 0;
	for (var i = results.length - 1; i >= 0; i--) {
		if (results[i] === true) {
			array.splice(i, 1);
			count++;
		}
	}
	return count;
}



function getNewColor(colorMap) {
	var usedList = Object.keys(colorMap);
	var len = usedList.length;
	return colors[len % colors.length];
}


function checkForNegatives(obj) {
	for (var k in obj) {
		if (obj.hasOwnProperty(k)) {
			if (typeof obj[k] === 'number' && isNaN(obj[k]) === false && obj[k] < 0) {
				return true;
			}
		}
	}
	return false;
}


function updateLineChart(chartId, data, key, filterlist) {
	data = data.filter(function(d) {
		return d !== null && d !== undefined;
	});
	var now = performanceMetrics.cpuLoad.date;
	var entireDurationInMilliseconds = durationInMinutes * 60 * 1000;
	var timeDomain = [now - entireDurationInMilliseconds, now];
	var chart = charts[chartId];
	chart.scaleX.domain(timeDomain);
	chart.xAxis.call(chart.xAxisFunc);
	chart.yAxis.call(chart.yAxisFunc);
	if (chart.currentTextFunc) {
		chart.title.text(chart.titleText + ": " + chart.currentTextFunc());
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




function showDisplayClientsHistory(clicked) {
	var clientsHistoryDiv = document.getElementById('displaypanecontainer');

	if (selectedDisplayClientIDList.length > 0) {
		var yAxisFormatLoad = function(d) {
			return (d * 100) + "%";
		};
		var yAxisFormatMemory = function(d) {
			var mem = getNiceNumber(d * clients.systemMemoryMax);
			return mem.number + mem.suffix;
		};
		var yAxisFormatDisplayMemory = function(d) {
			var mem = getNiceNumber(d * clients.displayMemoryMax, true);
			return mem.number + mem.suffix;
		};
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
			return client.memResidentSet / clients.displayMemoryMax;
		}, yAxisFormatDisplayMemory, null, 0.7, true);

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


function buttonClicked (d, i) {
	if (d.status === 'off' || d.status === 'missing') {
		return;
	}
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
	showDisplayClientsHistory(true);
}

function cleanUpSelectedDisplayList () {
	var currentList = clients.performanceMetrics;
	if (currentList.length === 0) {
		selectedDisplayClientIDList = [];
		return;
	}

	for (var i = 0; i < selectedDisplayClientIDList.length; i++) {
		var sdisplayid = selectedDisplayClientIDList[i];
		var result = currentList.find(function(d) {
			return d.id === sdisplayid;
		});
		if (result === null || result === undefined) {
			selectedDisplayClientIDList.splice(i, 1);
		}
	}
}


