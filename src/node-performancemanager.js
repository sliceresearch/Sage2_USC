// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 * @module filebuffer
 */

"use strict";

var sysInfo = require('systeminformation');

/**
  * @class PerformanceManager
  * @constructor
  */

function PerformanceManager() {
	//Flags
	this.debugSocketsNotOpen = true;
	this.profilingStarted = false;
	//Handles
	this.debugSockets = [];
	this.webSocketDebuggerUrls = [];
	this.clientProfiles = {};

	//Data elements

	//Temporary placeholder that collects network data between calls to collectMetrics
	this.trafficData = {
		date: Date.now(),
		totalOutBound: 0,
		totalInBound: 0
	};

	//One object that holds all performance related information
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
		//Historical data for establishing time line
		history: {
			cpuLoad: [],
			serverProcessLoad: [],
			network: [],
			memUsage: []
		}
	};

	sysInfo.getStaticData(function(data) {
		this.performanceMetrics.staticInformation = data;
	}.bind(this));


	this.durationInMinutes = 5;
	this.samplingInterval = 1; // 1 second
	//Loop handle is used to clear the interval and restart when sampling rate is changed
	this.loopHandle = setInterval(this.collectMetrics.bind(this), this.samplingInterval * 1000); //1000ms = 1s
}

/**
  * Sets sampling interval to 1, 2, or 4 seconds and restarts the sampling loop
  *
  * @method setSamplingInterval
  * @param {string} interval - Interval specified as a user friendly string
  */
PerformanceManager.prototype.setSamplingInterval = function(interval) {
	//Set sampling interval in seconds to 1, 2, or 4
	switch (interval) {
		case 'often':
			this.samplingInterval = 1;
			break;
		case 'slow':
			this.samplingInterval = 4;
			break;
		case 'normal':
		default:
			this.samplingInterval = 2;
			break;
	}
	clearInterval(this.loopHandle);
	this.loopHandle = setInterval(this.collectMetrics.bind(this), this.samplingInterval * 1000);
	console.log('Sampling interval set to ' + this.samplingInterval + ' second');
};

/**
  * Retrieves the network traffic data and resets the place holder
  *
  * @method getTrafficData
  */

PerformanceManager.prototype.getTrafficData = function() {
	var temp = this.trafficData;
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
		cores: cores // Store the previously extracted cores information
	};

	this.saveData('cpuLoad', load);

	//Creating empty objects to store moving averages for 1 minute and entire duration
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

	var minuteEntries = 0; // Counter for entries in 1 minute

	// One minute ago from when the latest data that was recorded
	var oneMinuteAgo = load.date - 60000; // 60000ms = 1 min

	//Compute sum of all entries
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

	//Compute average by dividing by number of entries in the sum
	load1Minute.load /= minuteEntries;
	load1Minute.idle /= minuteEntries;
	load1Minute.cores = load1Minute.cores.map(function(d, i) {
		return {
			load: d.load / minuteEntries,
			idle: d.idle / minuteEntries
		};
	});
	this.performanceMetrics.movingAvg1Minute.cpuLoad = load1Minute; // 1min moving average
	var entireDurationEntries = this.performanceMetrics.history.cpuLoad.length;
	loadEntireDuration.load /= entireDurationEntries;
	loadEntireDuration.idle /= entireDurationEntries;
	loadEntireDuration.cores = loadEntireDuration.cores.map(function(d, i) {
		return {
			load: d.load / entireDurationEntries,
			idle: d.idle / entireDurationEntries
		};
	});
	this.performanceMetrics.movingAvgEntireDuration.cpuLoad = loadEntireDuration; // Entire duration moving average
};


/**
  * Gets current Server process load and adds it to a list collected over time
  ** also computes moving averages of 1 minute and a longer duration (5 minutes)
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
		memVirtual: serverProcess.mem_vsz * 1000,
		memResidentSet: serverProcess.mem_rss * 1000
	};

	this.saveData('serverProcessLoad', serverLoad);

	//Creating empty objects to store moving averages for 1 minute and entire duration
	// as specified by this.durationInMinutes
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

	this.computeMovingAverages('serverProcessLoad', serverLoad1Minute, serverLoadEntireDuration);
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
	var minuteEntries = 0; // Counter for entries in 1 minute

	// One minute ago from when the latest data that was recorded
	var oneMinuteAgo = Date.now() - 60000; // 60000ms = 1 min

	var property;
	//Compute sum of all entries
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

	//Compute average by dividing by number of entries in the sum
	var entireDurationEntries = this.performanceMetrics.history[metric].length;
	for (property in entireDuration) {
		if (entireDuration.hasOwnProperty(property)) {
			entireDuration[property] = entireDuration[property] / entireDurationEntries;
			oneMinute[property] = oneMinute[property] / minuteEntries;
		}
	}

	this.performanceMetrics.movingAvg1Minute[metric] = oneMinute; // 1min moving average
	this.performanceMetrics.movingAvgEntireDuration[metric] = entireDuration; // Entire duration moving average
};

/**
  * Gets current Server process load and adds it to a list collected over time
  ** also computes moving averages of 1 minute and a longer duration (5 minutes)
  *
  * @method collectMemoryUsage
  * @param {object} data - memory usage data
  */
PerformanceManager.prototype.collectMemoryUsage = function(data) {
	var memUsage = {
		date: Date.now(),
		used: data.used,
		free: data.free,
		active: data.active // Used - active = used by buff & cache  
	};

	this.saveData('memUsage', memUsage);

	//Creating empty objects to store moving averages for 1 minute and entire duration
	// as specified by this.durationInMinutes
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
	//this.performanceMetrics.network = this.getTrafficData();
	//this.performanceMetrics.history.network.push(this.performanceMetrics.network);
	//if (this.performanceMetrics.history.network.length > samplesInDuration) {
	//	this.performanceMetrics.history.network.splice(0, this.performanceMetrics.history.network.length - samplesInDuration);
	//}

	// Disk Usage
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
	var samplesInDuration = this.durationInMinutes * 60 * (1.0 / this.samplingInterval); // 60 seconds in a minute

	this.performanceMetrics[metric] = data; // Current
	this.performanceMetrics.history[metric].push(data); // Historic list

	if (this.performanceMetrics.history[metric].length > samplesInDuration) {
		// Prune samples that are older than the set duration
		this.performanceMetrics.history[metric].splice(0, this.performanceMetrics.history[metric].length - samplesInDuration);
	}
};

/**
  * Helper function to get a percentage value
  *
  * @method getPercentString
  * @param {number} val - one part(of a total) for which percentage is to be computed
  * @param {number} remaining - remaining part (of the total)
  */
function getPercentString (val, remaining) {
	val = parseInt(val); //Rounding off
	remaining = parseInt(remaining);
	var percent = val * 100 / (val + remaining);
	return percent.toFixed(1);
}

/**
  * Helper function to convert a number to shorter format with  
  ** appropriate suffix determined (K for Kilo and so on) 
  * 
  * @method getNiceNumber
  * @param {number} number - large number
  */
function getNiceNumber(number) {
	var suffix = ['', 'K', 'M', 'G', 'T', 'P'];
	var idx = 0;
	while (number > 1000) {
		number = number / 1000;
		idx = idx + 1; // For every 1000, a new suffix is chosen
	}
	return {number: number.toFixed(1), suffix: suffix[idx]};
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
	used = getNiceNumber(used);
	total = getNiceNumber(total);
	usedPercent = usedPercent.toFixed(1);
	var printString;
	if (short === true) {
		printString = usedPercent;
	} else {
		printString = usedPercent + "% ("  + used.number + used.suffix + "B) of " + total.number + total.suffix + "B";
	}
	return printString;
}

/**
  * Prints different performance metrics to the console
  *
  * @method printMetrics
  */
PerformanceManager.prototype.printMetrics = function() {
	var serverLoad = this.performanceMetrics.serverProcessLoad;
	var serverLoad1MinuteAvg = this.performanceMetrics.movingAvg1Minute.serverProcessLoad;
	var serverLoadEntireDurationAvg = this.performanceMetrics.movingAvgEntireDuration.serverProcessLoad;

	console.log("");
	console.log("\tSAGE2 Server");
	console.log("\t------------");
	console.log("");
	console.log("\tLoad");
	console.log("");
	var cpup = parseFloat(serverLoad.cpuPercent).toFixed(1);
	var cpup1m = parseFloat(serverLoad1MinuteAvg.cpuPercent).toFixed(1);
	var cpupdm = parseFloat(serverLoadEntireDurationAvg.cpuPercent).toFixed(1);

	var printString = "\tCurrent: " + cpup + "%\t\t\t\tAverage(1 min): " + cpup1m + "%"
		+ "\t\tAverage(" + this.durationInMinutes + " min): " + cpupdm + "%";
	console.log(printString);
	console.log("");
	console.log("");
	console.log("\tMemory");
	console.log("");
	var memUsage = this.performanceMetrics.memUsage;
	var totalMem = memUsage.used + memUsage.free;
	var memServer = serverLoad.memResidentSet;
	var memServer1m = serverLoad1MinuteAvg.memResidentSet;
	var memServerdm = serverLoadEntireDurationAvg.memResidentSet;
	printString = "\tCurrent: " + formatMemoryString(memServer, totalMem - memServer)
		+ "\tAverage(1 min): " + formatMemoryString(memServer1m, totalMem - memServer1m, true) + "%"
		+ "\t\tAverage(" + this.durationInMinutes + " min): "
		+ formatMemoryString(memServerdm, totalMem - memServerdm, true) + "%";
	console.log(printString);
	console.log("");
	console.log("");
	console.log("\tSystem");
	console.log("\t------");
	console.log("");
	console.log("\tLoad");
	console.log("");
	var cpuLoad = this.performanceMetrics.cpuLoad;
	var cpuLoad1MinuteAvg = this.performanceMetrics.movingAvg1Minute.cpuLoad;
	var cpuLoadEntireDurationAvg = this.performanceMetrics.movingAvgEntireDuration.cpuLoad;
	printString = "\tCurrent: " + getPercentString(cpuLoad.load, cpuLoad.idle) + "%"
		+ "\t\t\t\tAverage(1 min): " + getPercentString(cpuLoad1MinuteAvg.load, cpuLoad1MinuteAvg.idle) + "%"
		+ "\t\tAverage(" + this.durationInMinutes + " min): "
		+ getPercentString(cpuLoadEntireDurationAvg.load, cpuLoadEntireDurationAvg.idle) + "%";

	console.log(printString);
	console.log("");
	console.log("");
	console.log("\tMemory");
	console.log("");
	memUsage = this.performanceMetrics.memUsage;
	var memUsage1MinuteAvg = this.performanceMetrics.movingAvg1Minute.memUsage;
	var memUsageEntireDurationAvg = this.performanceMetrics.movingAvgEntireDuration.memUsage;
	printString = "\tCurrent: " + formatMemoryString(memUsage.used, memUsage.free)
		+ "\tAverage(1 min): " + getPercentString(memUsage1MinuteAvg.used, memUsage1MinuteAvg.free) + "%"
		+ "\t\tAverage(" + this.durationInMinutes + " min): "
		+ getPercentString(memUsageEntireDurationAvg.used, memUsageEntireDurationAvg.free) + "%";
	console.log(printString);
	console.log("");
	console.log("");
};

module.exports = PerformanceManager;
