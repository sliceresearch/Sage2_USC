// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2017

/**
 * @module PerformanceManager
 */

"use strict";

// module to retrieve hardware, system and OS information
var sysInfo = require('systeminformation');
// pretty formating a la sprintf
var sprint  = require('sprint');

// SAGE2 module: for log function
var sageutils = require('../src/node-utils');

/**
  * @class PerformanceManager
  * @constructor
  */

function PerformanceManager() {
	// Temporary placeholder that collects network data between calls to collectMetrics
	this.trafficData = {
		date: Date.now(),
		totalOutBound: 0,
		totalInBound: 0
	};

	// One object that holds all performance related information
	this.performanceMetrics = {
		staticInformation: null,
		cpuLoad: null,
		serverProcessLoad: null,
		network: null,
		memUsage: null,
		movingAvg1Minute: {
			cpuLoad: null,
			cpuCoresLoad: null,
			serverProcessLoad: null,
			network: null,
			memUsage: null
		},
		movingAvgEntireDuration: {
			cpuLoad: null,
			serverProcessLoad: null,
			network: null,
			memUsage: null
		},
		// Historical data for establishing time line
		history: {
			cpuLoad: [],
			serverProcessLoad: [],
			network: [],
			memUsage: []
		}
	};

	// Array to store display client data
	this.clientsInformation = [];

	// Get the basic information of the system
	sysInfo.getStaticData(function(data) {
		this.performanceMetrics.staticInformation = data;
		// fix on some system with no memory layout
		if (data.memLayout.length === 0) {
			sysInfo.mem(function(mem) {
				this.performanceMetrics.staticInformation.memLayout[0] = {size: mem.total};
			}.bind(this));
		}
	}.bind(this));


	this.durationInMinutes = 5;
	// default to 2 second - 'normal'
	this.samplingInterval  = 2;

	// Loop handle is used to clear the interval and restart when sampling rate is changed
	// samplingInterval in seconds
	this.loopHandle = setInterval(this.collectMetrics.bind(this),
		this.samplingInterval * 1000);
}

/**
 * Adds data for a display client.
 *
 * @method     addDisplayClient
 * @param      {<type>}  idx     The client ID
 * @param      {<type>}  data    The data
 */
PerformanceManager.prototype.addDisplayClient = function(idx, data) {
	// the clientID to the data
	data.clientID = idx;
	// store the info into the array
	this.clientsInformation.push(data);

	// send the displays specifics
	module.parent.exports.broadcast('displayHardwareInformation',
		this.clientsInformation
	);
};

/**
 * Send a new monitoring client all the specifics
 *
 * @method     updateClient
 * @param      {Object}  wsio    client's websocket
 */
PerformanceManager.prototype.updateClient = function(wsio) {
	// send the server specifics
	wsio.emit('serverHardwareInformation',
		this.performanceMetrics.staticInformation
	);
	// send the displays specifics
	wsio.emit('displayHardwareInformation',
		this.clientsInformation
	);
};

/**
  * Sets sampling interval to 1, 2 or 5 seconds and restarts the sampling loop
  * values 'often|slow|normal', every other value defaults to 'normal'
  *
  * @method setSamplingInterval
  * @param {string} interval - Interval specified as a user friendly string
  */
PerformanceManager.prototype.setSamplingInterval = function(interval) {
	// Set sampling interval in seconds to 1, 2, or 5
	switch (interval) {
		case 'often':
			this.samplingInterval = 1;
			break;
		case 'slow':
			this.samplingInterval = 5;
			break;
		case 'normal':
		default:
			this.samplingInterval = 2;
			break;
	}
	// clear the previous callback
	clearInterval(this.loopHandle);
	// set the new frequency
	this.loopHandle = setInterval(this.collectMetrics.bind(this),
		this.samplingInterval * 1000);
	sageutils.log('Perf', 'Sampling interval set to', this.samplingInterval, 'second');
};

/**
  * Retrieves the network traffic data and resets the place holder
  *
  * @method getTrafficData
  */
PerformanceManager.prototype.getTrafficData = function() {
	var temp = this.trafficData;
	// reset the data structure
	this.trafficData = {
		date: Date.now(),
		totalOutBound: 0,
		totalInBound: 0
	};
	return temp;
};



/**
  * Gets current CPU load and adds it to a list collected over time
  ** also computes moving averages of 1 minute and a longer duration (5 minutes)
  *
  * @method collectCPULoad
  * @param {object} data - CPU load data
  */
PerformanceManager.prototype.collectCPULoad = function(data) {
	// Extract cores specific load and idle times in # of ticks
	var cores = data.cpus.map(function(d, i) {
		return {
			load: d.raw_load,
			idle: d.raw_load_idle
		};
	});
	// Extract overall CPU load and idle times in # of ticks
	var load = {
		date: Date.now(), // Mark the time for creating a time line
		load: data.raw_currentload,
		idle: data.raw_currentload_idle,
		loadp: data.currentload,
		idlep: data.currentload_idle,
		cores: cores     // Store the previously extracted cores information
	};

	this.saveData('cpuLoad', load);

	// Creating empty objects to store moving averages for 1 minute and entire duration
	// as specified by this.durationInMinutes
	var load1Minute = {
		load: 0,
		idle: 0,
		cores: data.cpus.map(function(d) {
			return {
				load: 0,
				idle: 0
			};
		})
	};

	var loadEntireDuration = {
		load: 0,
		idle: 0,
		cores: data.cpus.map(function(d) {
			return {
				load: 0,
				idle: 0
			};
		})
	};

	// Counter for entries in 1 minute
	var minuteEntries = 0;

	// One minute ago from when the latest data that was recorded
	// in milliseconds
	var oneMinuteAgo = load.date - (60 * 1000);

	// Compute sum of all entries
	this.performanceMetrics.history.cpuLoad.forEach(el => {
		loadEntireDuration.load += el.load;
		loadEntireDuration.idle += el.idle;
		loadEntireDuration.cores = loadEntireDuration.cores.map(function(d, i) {
			return {
				load: d.load + el.cores[i].load,
				idle: d.idle + el.cores[i].idle
			};
		});
		if (el.date > oneMinuteAgo) {
			load1Minute.load += el.load;
			load1Minute.idle += el.idle;
			load1Minute.cores = load1Minute.cores.map(function(d, i) {
				return {
					load: d.load + el.cores[i].load,
					idle: d.idle + el.cores[i].idle
				};
			});
			minuteEntries++;
		}
	});

	// Compute average by dividing by number of entries in the sum
	load1Minute.load /= minuteEntries;
	load1Minute.idle /= minuteEntries;
	load1Minute.cores = load1Minute.cores.map(function(d, i) {
		return {
			load: d.load / minuteEntries,
			idle: d.idle / minuteEntries
		};
	});
	// 1min moving average
	this.performanceMetrics.movingAvg1Minute.cpuLoad = load1Minute;
	var entireDurationEntries = this.performanceMetrics.history.cpuLoad.length;
	loadEntireDuration.load /= entireDurationEntries;
	loadEntireDuration.idle /= entireDurationEntries;
	loadEntireDuration.cores = loadEntireDuration.cores.map(function(d, i) {
		return {
			load: d.load / entireDurationEntries,
			idle: d.idle / entireDurationEntries
		};
	});
	// Entire duration moving average
	this.performanceMetrics.movingAvgEntireDuration.cpuLoad = loadEntireDuration;
};


/**
  * Gets current Server process load and adds it to a list collected over time
  * also computes moving averages of 1 minute and a longer duration (5 minutes)
  *
  * @method collectServerProcessLoad
  * @param {object} data - processes load data list
  */
PerformanceManager.prototype.collectServerProcessLoad = function(data) {
	// Filter process information of server from the list
	var serverProcess = data.list.filter(function(d) {
		return parseInt(d.pid) === parseInt(process.pid);
	});
	if (serverProcess.length === 1) {
		serverProcess = serverProcess[0];
	}
	var serverLoad = {
		date: Date.now(),
		cpuPercent: serverProcess.pcpu,
		memPercent: serverProcess.pmem,
		memVirtual: serverProcess.mem_vsz * 1024,
		memResidentSet: serverProcess.mem_rss * 1024
	};

	this.saveData('serverProcessLoad', serverLoad);

	// Creating empty objects to store moving averages for 1 minute and
	// entire duration as specified by this.durationInMinutes
	var serverLoad1Minute = {
		cpuPercent: 0,
		memPercent: 0,
		memVirtual: 0,
		memResidentSet: 0
	};

	var serverLoadEntireDuration = {
		cpuPercent: 0,
		memPercent: 0,
		memVirtual: 0,
		memResidentSet: 0
	};

	this.computeMovingAverages('serverProcessLoad',
		serverLoad1Minute, serverLoadEntireDuration);
};


/**
  * Computes moving averages (1 minute and a longer duration)
  *
  * @method computeMovingAverages
  * @param {string} metric - metric for which averages are to be computed
  * @param {object} oneMinute - placeholder object for one minute average
  * @param {object} entireDuration - placeholder object for longer duration average
  */
PerformanceManager.prototype.computeMovingAverages = function(metric, oneMinute, entireDuration) {
	// Counter for entries in 1 minute
	var minuteEntries = 0;
	// One minute ago from when the latest data that was recorded
	// in milliseconds
	var oneMinuteAgo = Date.now() - (60 * 1000);

	var property;
	// Compute sum of all entries
	this.performanceMetrics.history[metric].forEach(el => {
		for (property in entireDuration) {
			if (entireDuration.hasOwnProperty(property)) {
				entireDuration[property] = entireDuration[property] + parseInt(el[property]);
				if (el.date > oneMinuteAgo) {
					oneMinute[property] = oneMinute[property] + parseInt(el[property]);
					minuteEntries = minuteEntries + 1;
				}
			}
		}
	});

	// Compute average by dividing by number of entries in the sum
	var entireDurationEntries = this.performanceMetrics.history[metric].length;
	for (property in entireDuration) {
		if (entireDuration.hasOwnProperty(property)) {
			entireDuration[property] = entireDuration[property] / entireDurationEntries;
			oneMinute[property] = oneMinute[property] / minuteEntries;
		}
	}

	// 1min moving average
	this.performanceMetrics.movingAvg1Minute[metric] = oneMinute;
	// Entire duration moving average
	this.performanceMetrics.movingAvgEntireDuration[metric] = entireDuration;
};

/**
  * Gets current server process load and adds it to a list collected over time
  * also computes moving averages of 1 minute and a longer duration (5 minutes)
  *
  * @method collectMemoryUsage
  * @param {object} data - memory usage data
  */
PerformanceManager.prototype.collectMemoryUsage = function(data) {
	var memUsage = {
		date: Date.now(),
		total:  data.total,  // total memory in bytes
		used:   data.used,   // incl. buffers/cache
		free:   data.free,
		active: data.active  // used actively (excl. buffers/cache)
	};
	this.saveData('memUsage', memUsage);

	// Creating empty objects to store moving averages for 1 minute
	// and entire duration as specified by this.durationInMinutes
	var memUsage1Minute = {
		used: 0,
		free: 0,
		active: 0
	};
	var memUsageEntireDuration = {
		used: 0,
		free: 0,
		active: 0
	};
	this.computeMovingAverages('memUsage', memUsage1Minute, memUsageEntireDuration);
};


/**
  * Calls all metric collection functions to gather data
  *
  * @method collectMetrics
  */
PerformanceManager.prototype.collectMetrics = function() {
	// CPU Load
	sysInfo.currentLoad(this.collectCPULoad.bind(this));

	// Server Load
	sysInfo.processes(this.collectServerProcessLoad.bind(this));

	// Memory usage
	sysInfo.mem(this.collectMemoryUsage.bind(this));

	// Network traffic
	// this.performanceMetrics.network = this.getTrafficData();
	// this.performanceMetrics.history.network.push(this.performanceMetrics.network);
	// if (this.performanceMetrics.history.network.length > samplesInDuration) {
	// 	this.performanceMetrics.history.network.splice(0, this.performanceMetrics.history.network.length - samplesInDuration);
	// }

	// Disk Usage

	// Send some of the data to the performance pages
	// (use the broadcast function from the server)
	module.parent.exports.broadcast('performanceData', {
		cpuLoad:    this.performanceMetrics.cpuLoad,
		serverLoad: this.performanceMetrics.serverProcessLoad,
		memLoad:    this.performanceMetrics.memUsage
	});
};


/**
  * Saves metric data into current value placeholder and history list
  *
  * @method saveData
  * @param {string} metric - metric for which data is being saved
  * @param {object} data - current metric values obtained
  */
PerformanceManager.prototype.saveData = function(metric, data) {
	// Number of samples in the history
	// time in seconds
	var samplesInDuration = this.durationInMinutes * 60 * (1.0 / this.samplingInterval);

	// Current value
	this.performanceMetrics[metric] = data;
	// Add data to the historic list
	this.performanceMetrics.history[metric].push(data);

	if (this.performanceMetrics.history[metric].length > samplesInDuration) {
		// Prune samples that are older than the set duration
		this.performanceMetrics.history[metric].splice(0,
			this.performanceMetrics.history[metric].length - samplesInDuration);
	}
};

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
	return sprint("%3.0f", percent);
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
		suffix = ['', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb'];
	} else {
		suffix = ['', 'KB', 'MB', 'GB', 'TB', 'PB'];
	}
	while (number > base) {
		number = number / base;
		idx = idx + 1;  // For every 1000 or 1024, a new suffix is chosen
	}
	return {number: number.toFixed(0), suffix: suffix[idx]};
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
	usedPercent = sprint('%3.0f', usedPercent);
	var printString;
	if (short === true) {
		printString = usedPercent;
	} else {
		printString = usedPercent + "% ("  + used.number + used.suffix + ") of " +
			total.number + total.suffix;
	}
	return printString;
}

/**
 * Print a summary of the hardware that the server is running on
 *
 * @method     printServerHardware
 */
PerformanceManager.prototype.printServerHardware = function() {
	var data = this.performanceMetrics.staticInformation;

	// make sure the data has been produced
	if (data) {
		sageutils.log('HW', 'System:', data.system.manufacturer, data.system.model);
		sageutils.log('HW', 'OS:', data.os.platform,
			data.os.arch, data.os.distro, data.os.release);
		sageutils.log('HW', 'CPU:', data.cpu.manufacturer, data.cpu.brand,
			data.cpu.speed + 'Ghz', data.cpu.cores + 'cores');
		// Sum up all the memory banks
		var totalMem = data.memLayout.reduce(function(sum, value) {
			return sum + value.size;
		}, 0);
		var memInfo = getNiceNumber(totalMem);
		sageutils.log('HW', 'RAM:', memInfo.number + memInfo.suffix);
		var gpuMem = getNiceNumber(data.graphics.controllers[0].vram * 1024 * 1024);
		// not very good on Linux (need to check nvidia tools)
		sageutils.log('HW', 'GPU:', data.graphics.controllers[0].vendor,
			data.graphics.controllers[0].model,
			gpuMem.number + gpuMem.suffix + ' VRAM');
	}
};

/**
  * Prints different performance metrics to the console
  *
  * @method printMetrics
  */
PerformanceManager.prototype.printMetrics = function() {
	var serverLoad = this.performanceMetrics.serverProcessLoad;
	var serverLoad1MinuteAvg = this.performanceMetrics.movingAvg1Minute.serverProcessLoad;
	var serverLoadEntireDurationAvg = this.performanceMetrics.movingAvgEntireDuration.serverProcessLoad;

	sageutils.log('Perf', "");
	sageutils.log('Perf', "SAGE2 Server");
	sageutils.log('Perf', "------------");
	sageutils.log('Perf', "Load");
	var cpup   = sprint('%3.0f', serverLoad.cpuPercent);
	var cpup1m = sprint('%3.0f', serverLoad1MinuteAvg.cpuPercent);
	var cpupdm = sprint('%3.0f', serverLoadEntireDurationAvg.cpuPercent);

	// Process load
	var printString = "Current: " + cpup + "%\t\t\tAverage (1 min): " + cpup1m + "%"
		+ "\tAverage (" + this.durationInMinutes + " min): " + cpupdm + "%";
	sageutils.log('Perf', printString);

	// Memory load
	sageutils.log('Perf', "Memory");
	var memUsage  = this.performanceMetrics.memUsage;
	var totalMem  = memUsage.used + memUsage.free;
	var memServer = serverLoad.memResidentSet;
	var memServer1m = serverLoad1MinuteAvg.memResidentSet;
	var memServerdm = serverLoadEntireDurationAvg.memResidentSet;
	printString = "Current: " + formatMemoryString(memServer, totalMem - memServer)
		+ "\tAverage (1 min): " + formatMemoryString(memServer1m, totalMem - memServer1m, true) + "%"
		+ "\tAverage (" + this.durationInMinutes + " min): "
		+ formatMemoryString(memServerdm, totalMem - memServerdm, true) + "%";
	sageutils.log('Perf', printString);
	sageutils.log('Perf', "");

	// System load
	sageutils.log('Perf', "System");
	sageutils.log('Perf', "------");

	// CPU load
	sageutils.log('Perf', "Load");
	var cpuLoad = this.performanceMetrics.cpuLoad;
	var cpuLoad1MinuteAvg = this.performanceMetrics.movingAvg1Minute.cpuLoad;
	var cpuLoadEntireDurationAvg = this.performanceMetrics.movingAvgEntireDuration.cpuLoad;
	printString = "Current: " + getPercentString(cpuLoad.load, cpuLoad.idle) + "%"
		+ "\t\t\tAverage (1 min): " + getPercentString(cpuLoad1MinuteAvg.load, cpuLoad1MinuteAvg.idle) + "%"
		+ "\tAverage (" + this.durationInMinutes + " min): "
		+ getPercentString(cpuLoadEntireDurationAvg.load, cpuLoadEntireDurationAvg.idle) + "%";
	sageutils.log('Perf', printString);

	// Memory
	sageutils.log('Perf', "Memory");
	memUsage = this.performanceMetrics.memUsage;
	var memUsage1MinuteAvg = this.performanceMetrics.movingAvg1Minute.memUsage;
	var memUsageEntireDurationAvg = this.performanceMetrics.movingAvgEntireDuration.memUsage;
	printString = "Current: " + formatMemoryString(memUsage.used, memUsage.total - memUsage.used)
		+ "\tAverage (1 min): " + getPercentString(memUsage1MinuteAvg.used, memUsage1MinuteAvg.free) + "%"
		+ "\tAverage (" + this.durationInMinutes + " min): "
		+ getPercentString(memUsageEntireDurationAvg.used, memUsageEntireDurationAvg.free) + "%";
	sageutils.log('Perf', printString);
	sageutils.log('Perf', "");
};

// export the PerformanceManager class
module.exports = PerformanceManager;
