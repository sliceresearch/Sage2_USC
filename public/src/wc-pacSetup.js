// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

"use strict";



// ---------------------------------------------------------------------------Variable setup
var wsio = null;

var debug = true;
// ---------------------------------------------------------------------------Code start



// ---------------------------------------------------------------------------functions


/**
Setup of websockets.
 */
function initialize() {

	if (debug) {
		console.log("Initializing client");
	}

	// fix the image size since it requires pixels.
	setSageLogoSize();

	// Create a connection to server
	wsio = new WebsocketIO();
	if (debug) {console.log("Websocket status:" + wsio);}
	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config: true,
				version: false,
				time: false,
				console: false
			}
		};
		wsio.emit('addClient', clientDescription);
	});

	wsio.on('close', function(evt) {

	});

	// might want this to create listeners.
	// var sage2UI = document.getElementById('sage2UI');
	// window.addEventListener('drop',     preventDefault, false);
	// sage2UI.addEventListener('drop',      fileDrop,       false);
	// document.addEventListener('keydown',    noBackspace,  false);

} // end initialize


function setSageLogoSize() {
	var workingDiv = document.getElementById('sageLogo');
	var logoWidth = 800;
	var logoHeight = 257;
	var width = window.innerWidth;
	var height = window.innerHeight;
	width = width / 2;    // 50%
	height = height * .1; // 10%

	var ratio = width / logoWidth;
	if ((ratio * logoHeight) <= height) {
		height = ratio * logoHeight;
	} else {
		ratio = height / logoHeight;
		width = ratio * logoWidth;
	}

	workingDiv.style.left = (window.innerWidth / 2 - width / 2) + 'px';
	workingDiv.style.top  = window.innerHeight * .05 + 'px';
	workingDiv.style.position = 'absolute';
	workingDiv.width  = width;
	workingDiv.height = height;
}




function setupListeners() {
	wsio.on('serverAccepted', function(data) {
		console.log('---Has been accepted by server---');
		console.dir(data);
	});

	wsio.on('serverPingBack', function(data) {
		console.log('Recieved a ping back from the server');
		console.dir(data);
	});

	wsio.on('convertedMd5' , wsConvertedMd5) ;
	wsio.on('configContents' , wsConfigContents) ;

	wsio.on('giveClientConfiguration', wsGiveClientConfiguration);
	wsio.on('passwordCheckResult',     wsPasswordCheckResult);
	wsio.on('displayOverlayMessage',   wsDisplayOverlayMessage);
	wsio.on('passwordSet', function(data) {
		console.log('The password has been confirmed to be set by server');
	});
	wsio.on('configurationSet', function(data) {
		console.log('The configuration file has been confirmed to be updated by server');
	});
}

function wsConvertedMd5(data) {
	var resultDiv = document.getElementById('md5result');

	resultDiv.innerHTML = 'Result: ' + data.md5;
}


function wsConfigContents(data) {
	var workingDiv = document.getElementById('confPort');
	workingDiv.value = data.port;
	workingDiv = document.getElementById('confResolutionWidth');
	workingDiv.value = data.rWidth;
	workingDiv = document.getElementById('confResolutionHeight');
	workingDiv.value = data.rHeight;
	workingDiv = document.getElementById('confLayoutRows');
	workingDiv.value = data.lRows;
	workingDiv = document.getElementById('confLayoutColumns');
	workingDiv.value = data.lColumns;
}

function wsGiveClientConfiguration(data) {
	var workingDiv;

	workingDiv = document.getElementById('cfgHost');
	workingDiv.value = data.host;

	workingDiv = document.getElementById('cfgPortDefault');
	workingDiv.value = data.index_port;

	workingDiv = document.getElementById('cfgPortSecure');
	workingDiv.value = data.port;

	workingDiv = document.getElementById('cfgRwidth');
	workingDiv.value = data.resolution.width;

	workingDiv = document.getElementById('cfgRheight');
	workingDiv.value = data.resolution.height;

	workingDiv = document.getElementById('cfgLrows');
	workingDiv.value = data.layout.rows;

	workingDiv = document.getElementById('cfgLcolumns');
	workingDiv.value = data.layout.columns;



	for (var i = 0; i < data.alternate_hosts.length; i++) {
		workingDiv = document.getElementById('cfgAH' + (i + 1));
		if (workingDiv == null) { addAlternativeHostEntry(); }
	}
	for (var i = 0; i < data.alternate_hosts.length; i++) {
		workingDiv = document.getElementById('cfgAH' + (i + 1));
		if (workingDiv == null) {
			console.log('error adding alternate_hosts');
		} else {
			workingDiv.value = data.alternate_hosts[i];
		}
	}


	for (var i = 0; i < data.remote_sites.length; i++) {
		workingDiv = document.getElementById('cfgRS' + (i + 1) + 'name');
		if (workingDiv == null) {
			addRemoteSiteEntry();
		}
	}
	for (var i = 0; i < data.remote_sites.length; i++) {
		workingDiv = document.getElementById('cfgRS' + (i + 1) + 'name');
		if (workingDiv == null) {
			console.log('error adding alternate_hosts');
		} else {
			workingDiv.value = data.remote_sites[i].name;
		}
		workingDiv = document.getElementById('cfgRS' + (i + 1) + 'host');
		workingDiv.value = data.remote_sites[i].host;
		workingDiv = document.getElementById('cfgRS' + (i + 1) + 'port');
		workingDiv.value = data.remote_sites[i].port;
		workingDiv = document.getElementById('cfgRS' + (i + 1) + 'secure');
		workingDiv.value = data.remote_sites[i].secure;
	}

	workingDiv = document.getElementById('cfgDependencyIM');
	workingDiv.value = data.dependencies.ImageMagick;

	workingDiv = document.getElementById('cfgDependencyFFM');
	workingDiv.value = data.dependencies.FFMpeg;

} // end wsGiveClientConfiguration



function wsPasswordCheckResult(data) {
	var workingDiv;
	workingDiv = document.getElementById('checkPasswordResult');
	if (data.result === true) {
		workingDiv.innerHTML = "Result: True";
	} else {
		workingDiv.innerHTML = "Result: False";
	}
} // end wsPasswordCheckResult


function wsDisplayOverlayMessage(data) {
	console.log('Displaying message from server:' + data.message);
	var workingDiv;
	workingDiv = document.getElementById('overlayDiv');
	workingDiv.className = 'showExpand';

	workingDiv = document.getElementById('overlayMessage');
	workingDiv.innerHTML = data.message;

} // end wsDisplayOverlayMessage


