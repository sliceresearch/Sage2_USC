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
	var terminal3 = document.getElementById('terminal3');

	// Got a reply from the server
	wsio.on('initialize', function() {
		// tbd
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
			var gpuMem = getNiceNumber(data.graphics.controllers[0].vram * 1024 * 1024);
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

	wsio.on('displayHardwareInformation', function(data) {
		var msg = "";
		for (let i = 0; i < data.length; i++) {
			let disp = data[i];
			msg += '<span style="color:cyan;">Display ' + disp.clientID + ' </span>: ' + disp.system.manufacturer + ' ' +
				disp.system.model + '\n';
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
			var gpuMem = getNiceNumber(disp.graphics.controllers[0].vram * 1024 * 1024);
			// not very good on Linux (need to check nvidia tools)
			msg += 'GPU: ' + disp.graphics.controllers[0].vendor + ' ' +
				disp.graphics.controllers[0].model + ' ' +
				gpuMem.number + gpuMem.suffix + ' VRAM\n';
		}
		// Added content
		terminal2.innerHTML = msg;
		// automatic scrolling to bottom
		terminal2.scrollTop = terminal2.scrollHeight;
	});

	wsio.on('performanceData', function(data) {
		var msg = "";
		if (data) {
			msg += JSON.stringify(data, null, 4);
		}
		// Added content
		terminal3.textContent = msg;
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

