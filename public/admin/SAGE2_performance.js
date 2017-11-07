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
	var terminal2 = document.getElementById('terminal2');
	var heading1  = document.getElementById('serverheading');
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

	// Server sends hardware and performance data
	wsio.on('serverHardwareInformation', function(data) {
		var msg = "";
		if (data) {
			performanceMetrics.staticInformation = data;
			msg += 'System: ' + data.system.manufacturer + ' ' +
				data.system.model + '\n';
			msg += 'Hostname: ' + data.hostname + '\n';
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
			// iterates over the GPU list
			for (let i = data.graphics.controllers.length - 1; i >= 0; i--) {
				let gpu = data.graphics.controllers[i];
				let gpuMem = getNiceNumber(gpu.vram);
				msg += 'GPU: ' + gpu.vendor + ' ' + gpu.model + ' ' +
					gpuMem.number + gpuMem.suffix + ' VRAM\n';
			}
			// if there's no GPU recognized
			if (data.graphics.controllers.length === 0) {
				msg += 'GPU: -\n';
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
		terminal1.textContent += msg;
		// automatic scrolling to bottom
		terminal1.scrollTop    = terminal1.scrollHeight;
	});

	wsio.on('displayHardwareInformation', function(data) {
		if (data.length > 0) {
			var msg = "";
			for (let i = 0; i < data.length; i++) {
				let disp = data[i];
				msg += '<span style="color:cyan;">Display ' + disp.clientID + ' </span>: ' + disp.system.manufacturer + ' ' +
					disp.system.model + '\n';
				msg += 'Hostname: ' + disp.hostname + '\n';
				msg += 'OS: ' + disp.os.platform + ' ' +
					disp.os.arch + ' ' + disp.os.distro + ' ' + disp.os.release + '\n';
				msg += 'CPU: ' + disp.cpu.manufacturer + ' ' + disp.cpu.brand + ' ' +
					disp.cpu.speed + 'Ghz ' + disp.cpu.cores + 'cores\n';
				// Sum up all the memory banks
				var totalMem = disp.memLayout.reduce(function(sum, value) {
					return sum + value.size;
				}, 0);
				var memInfo = getNiceNumber(totalMem);
				msg += 'RAM: ' + memInfo.number + memInfo.suffix + '\n';
				var gpuMem = getNiceNumber(disp.graphics.controllers[0].vram);
				// not very good on Linux (need to check nvidia tools)
				msg += 'GPU: ' + disp.graphics.controllers[0].vendor + ' ' +
					disp.graphics.controllers[0].model + ' ' +
					gpuMem.number + gpuMem.suffix + ' VRAM\n';

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
		clients.hardware = data;

	});

	wsio.on('performanceData', function(data) {
		if (Object.prototype.toString.call(data.cpuLoad) === '[object Array]') {
			// History has been sent
			saveData('cpuLoad', data.cpuLoad, true);
			saveData('memUsage', data.memUsage, true);
			saveData('network', data.network, true);
			saveData('serverLoad', data.serverLoad, true);
			saveData('serverTraffic', data.serverTraffic, true);
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

			findNetworkMax();
			updateLineChart('cpuload', performanceMetrics.history.cpuLoad);
			updateLineChart('serverload', performanceMetrics.history.serverLoad);
			updateLineChart('memusage', performanceMetrics.history.memUsage);
			updateLineChart('servermem', performanceMetrics.history.serverLoad);
			updateLineChart('servertraffic', performanceMetrics.history.serverTraffic);
			updateLineChart('systemtraffic', performanceMetrics.history.network);

			if (data.displayPerf !== null && data.displayPerf !== undefined && data.displayPerf.length > 0) {
				clients.performanceMetrics = data.displayPerf;
				clients.performanceMetrics.sort(function(a, b) {
					return a.clientID - b.clientID;
				});
				clients.history.push(...clients.performanceMetrics);
				var durationAgo = Date.now() - durationInMinutes * (60 * 1000);
				removeObjectsFromArrayOnPropertyValue(clients.history, 'date', durationAgo, 'lt');
				if (clients.performanceMetrics.length > clients.hardware.length) {
					wsio.emit("requestClientUpdate");
				}
			} else {
				clients.performanceMetrics = [];
				var smDiv = document.getElementById('smallmultiplediv');
				smDiv.style.height = 0 + 'px';
				var displayMetricDiv = document.getElementById('displaypanecontainer');
				displayMetricDiv.style.height = 0 + 'px';
			}
			cleanUpSelectedDisplayList();
			drawDisplaySM();
			showDisplayClientsHistory();
		}
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
	} else {
		// Current value
		performanceMetrics[metric] = data;
		// Add data to the historic list
		performanceMetrics.history[metric].push(data);

		var durationAgo = Date.now() - durationInMinutes * (60 * 1000);
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
		return mem.number + mem.suffix;
	};

	var yAxisFormatNetworkSystem = function(d) {
		var mem = getNiceNumber(d * performanceMetrics.networkMax, true);
		return mem.number + mem.suffix;
	};

	var yAxisFormatSAGE2Memory = function(d) {
		var mem = getNiceNumber(d * performanceMetrics.sage2MemoryMax, true);
		return mem.number + mem.suffix;
	};

	var currentCPULoadText = function() {
		var cpuLoad = performanceMetrics.cpuLoad;
		return "Current: " + getPercentString(cpuLoad.load, cpuLoad.idle) + "%";
	};
	setupLineChart('cpuload', 'CPU Load', function(d) {
		return d.load / (d.load + d.idle);
	}, yAxisFormatLoad, currentCPULoadText, 0.5);


	var currentMemUsageText = function() {
		var memUsage = performanceMetrics.memUsage;
		return "Current: " + formatMemoryString(memUsage.used, memUsage.total - memUsage.used);
	};
	setupLineChart('memusage', 'System Memory', function(d) {
		return d.used / (d.used + d.free);
	}, yAxisFormatMemory, currentMemUsageText, 0.7);

	var currentServerLoadText = function() {
		var serverLoad = performanceMetrics.serverLoad;
		return "Current: " + d3.format('3.0f')(serverLoad.cpuPercent) + "%";
	};
	setupLineChart('serverload', 'SAGE2 Load', function(d) {
		return d.cpuPercent / 100;
	}, yAxisFormatLoad, currentServerLoadText, 0.5);

	var currentServerMemText = function() {
		var memUsage = performanceMetrics.memUsage;
		var servermem = performanceMetrics.serverLoad.memResidentSet;
		return "Current: " + formatMemoryString(servermem, memUsage.total - servermem);
	};
	setupLineChart('servermem', 'SAGE2 Memory', function(d) {
		return d.memResidentSet / performanceMetrics.sage2MemoryMax;
	}, yAxisFormatSAGE2Memory, currentServerMemText, 0.7);

	var currentServerTrafficText = function() {
		var serverTraffic = performanceMetrics.serverTraffic;
		var currentTraffic = getNiceNumber(serverTraffic.totalOutBound + serverTraffic.totalInBound, true);
		return "Current: " + currentTraffic.number + currentTraffic.suffix;
	};
	setupLineChart('servertraffic', 'SAGE2 Traffic', function(d) {
		return (d.totalOutBound + d.totalInBound) / performanceMetrics.serverTrafficMax;
	}, yAxisFormatNetworkServer, currentServerTrafficText, 0);

	var currentSystemTrafficText = function() {
		var network = performanceMetrics.network;
		var currentTraffic = getNiceNumber(network.totalOutBound + network.totalInBound, true);
		return "Current: " + currentTraffic.number + currentTraffic.suffix;
	};
	setupLineChart('systemtraffic', 'System Traffic', function(d) {
		return (d.totalOutBound + d.totalInBound) / performanceMetrics.networkMax;
	}, yAxisFormatNetworkSystem, currentSystemTrafficText, 0);

	colors.push(...d3.schemeCategory20);
	colors.push(...d3.schemeCategory20b);
}


function findNetworkMax() {
	var totalTrafficList = performanceMetrics.history.network.map(function(d) {
		return d.totalOutBound + d.totalInBound;
	});
	performanceMetrics.networkMax = getNextPowerOfTen(d3.max(totalTrafficList));
	var totalServerTrafficList = performanceMetrics.history.serverTraffic.map(function(d) {
		return d.totalOutBound + d.totalInBound;
	});
	performanceMetrics.serverTrafficMax = getNextPowerOfTen(d3.max(totalServerTrafficList));

	var totalSage2MemoryList = performanceMetrics.history.serverLoad.map(function(d) {
		return d.memResidentSet;
	});
	performanceMetrics.sage2MemoryMax = getNextPowerOfTen(d3.max(totalSage2MemoryList));
}


function removeObjectsFromArrayOnPropertyValue(array, property, value, condition) {
	// Current value
	var filterFunc;
	switch (condition) {
		case 'lt':
			filterFunc = function(d) {
				return d[property] < value;
			};
			break;
		case 'gt':
			filterFunc = function(d) {
				return d[property] > value;
			};
			break;
		case 'lte':
			filterFunc = function(d) {
				return d[property] <= value;
			};
			break;
		case 'gte':
			filterFunc = function(d) {
				return d[property] >= value;
			};
			break;
		case 'eq':
		default:
			filterFunc = function(d) {
				return d[property] === value;
			};
			break;
	}
	var keys = array.map(function(d, i) {
		var obj = {
			arrIdx: i
		};
		obj[property] = d[property];
		return obj;
	}).filter(filterFunc);
	for (var i = 0; i < keys.length; i++) {
		array.splice(keys[i].arrIdx, 1);
	}
	if (keys.length > 0) {
		return true;
	}
	return false;
}



function getNewColor(colorMap) {
	var usedList = Object.keys(colorMap);
	var len = usedList.length;
	return colors[len % colors.length];
}


function checkForNegatives(obj) {
	for (var k in obj) {
		if (obj.hasOwnProperty(k)) {
			if (Object.prototype.toString.call(obj[k]) == '[object Number]' && obj[k] < 0) {
				return true;
			}
		}
	}
	return false;
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


function buttonClicked (d, i) {
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
