// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization
// and Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

/**
 * @module webController
 */


// Imports
var http			= require('http');
var path			= require('path');
var fs				= require('fs');
var json5			= require('json5');               // format that allows comments
var exec			= require('child_process').exec;
// var spawn			= require('child_process').spawn;
var os				= require('os');                  // used to determine if needs to auto shutdown.
var WebSocketIO		= require('websocketio');

var md5				= require('./src/md5');           // return standard md5 hash of given param
var utils			= require('./src/wc-utils');
var sageutils		= require('./src/node-utils');
var HttpServer		= require('./src/wc-httpServer');

// Variable setup
var hostPort		= 9001;
var httpServerApp	= new HttpServer("public");
var mainServer		= null;
var wsioServer		= null;
var clients			= [];
var sageServerExec	= null;
var isWindows		= true;

var sageServerChromeBrowsers = [];

// setup location of configuration and keys to use

var userDocPath = path.join(sageutils.getHomeDirectory(), "Documents", "SAGE2_Media", "/");
var wcPathToConfigFile         = userDocPath + 'webconGenerated-cfg.json';
var wcPathToWebconPwdFile      = userDocPath + 'webconPasswd.json';
var wcPathToAdminPanelPwdFile  = userDocPath + 'adminPanelPasswd.json';
var wcPathToSageUiPwdFile      = userDocPath + 'passwd.json';
var wcCommandNodeServer        = 'wcss.bat ' + wcPathToConfigFile;
var wcCommandStartDisplay      = 'wcss.bat displayLaunch';
var wcPathToWindowsCertMaker   = 'keys/GO-windows.bat';


// Code start


// Detect if this is a windows machine
// Cancel out on non-windows machines
// Support so far only for windows.
var platform = os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "Mac OS X" : "Linux";

if (platform !== "Windows") {
	console.log("Sorry, currently the web controller only works with Windows.");
	console.log("Shutting down...");
	process.exit(1);
}



// create http listener

mainServer = http.createServer(httpServerApp.onrequest).listen(hostPort);
console.log('--SAGE2 web control starting--');
console.log('Server listening to port:' + hostPort);


// create websocket listener
wsioServer = new WebSocketIO.Server({ server: mainServer });
wsioServer.onconnection(openWebSocketClient);

// create timer counter in global.
global.timeCounter = 0;


// Check if a password for the webcontroller exists.
var jsonString;
if (utils.fileExists(wcPathToWebconPwdFile)) {
	jsonString = fs.readFileSync(wcPathToWebconPwdFile, "utf8");
	jsonString = json5.parse(jsonString);
} else {
	console.log('Webcon password has not been setup, it will not be possible to access.');
	jsonString = { pwd: -1 };
}
// either way set the value, as it can be edited later.
global.webconID = jsonString.pwd;


// This is slightly more important as it will check if the admin panel password exists
// If not, allow one time access.
if (utils.fileExists(wcPathToAdminPanelPwdFile)) {
	jsonString = fs.readFileSync(wcPathToAdminPanelPwdFile, "utf8");
	jsonString = json5.parse(jsonString);
} else {
	console.log('Admin Panel password has not been setup, launching the first time config.');
	console.log();
	jsonString = { pwd: -1 };
	executeConsoleCommand('"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" ' +
		'https://bitbucket.org/sage2/sage2/wiki/Install%20(Windows%20Binary) ' +
		'http://localhost:9001/wcAdminPanel.html');
}
// set the password
global.adminPanelId = jsonString.pwd;


// now check if the config file doesn't exist.
if (!utils.fileExists(wcPathToConfigFile)) {
	console.log('Config file not detected. Created a default.');
	// no exist means grab the existing default win and copy over.
	var tcc = fs.readFileSync('config/defaultWin-cfg.json', "utf8");
	fs.writeFileSync(wcPathToConfigFile, tcc);
}

var ccfaddress = fs.readFileSync(wcPathToConfigFile, "utf8");
ccfaddress = json5.parse(ccfaddress);

console.log('The webconID hash is:' + global.webconID);
console.log('The adminPanelId hash is:' + global.adminPanelId);
console.log();
console.log();
console.log('=====================================================================');
console.log('Closing this window prevents access to the web controller for SAGE2');
console.log('=====================================================================');
console.log('|To Access the web controller from a browser on this computer:');
console.log('|     localhost:9001');
console.log('|');
console.log('|');
console.log('|To Access from another computer use address:');
console.log('|     '+ccfaddress.host+':9001');
console.log();
console.log();


// Test to create something that happens at an interval
setInterval(function() {
	global.timeCounter++;
}, 5000);


// Function definitions

/**
 * Description of the function
 *
 * @method nameOfFunction
 * @param param1 {type} description
 * @return {type} description
 */

global.printTimeCounter = function printTimeCounter(req) {
	console.log ("Request at time:" + global.timeCounter);
}


function openWebSocketClient(wsio) {
	wsio.onclose(closeWebSocketClient);
	wsio.on('addClient', wsAddClient);
}



function closeWebSocketClient(wsio) {
	console.log(">Disconnect" + wsio.id + " (" + wsio.clientType + " " + wsio.clientID + ")");

	removeElement(clients, wsio);
}


/*
	Params
	wsio is the websocket that was used.
	data is the sent packet, usually in json format.
*/
function wsAddClient(wsio, data) {

	clients.push(wsio);
	setupListeners(wsio);

	wsio.emit('serverAccepted', {});
}

/*
	When receiving a packet of the named type, call the function.
*/
function setupListeners(wsio) {
	wsio.on('consoleLog',   wsConsoleLog);
	wsio.on('convertTomd5', wsConvertTomd5);

	// Exclusive to the webcon
	wsio.on('startSage', wsStartSage);
	wsio.on('stopSage',  wsStopSage);

	// Shared
	wsio.on('setMeetingId', wsSetMeetingId);

	// Unique for admin panel
	wsio.on('giveClientConfiguration', wsGiveClientConfiguration);
	wsio.on('giveServerConfiguration', wsGiveServerConfiguration);
	wsio.on('setWebControllerPwd',     wsSetWebControllerPwd);
	wsio.on('setConfigurationPagePwd', wsSetConfigurationPagePwd);
}


function executeConsoleCommand(cmd) {
	var child;
	child = exec(cmd, function(error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('Command> exec error: ' + error);
		}
	});
	return child;
}

/* Never called
function executeScriptFile(file) {
	output = "";

	file = path.normalize(file); // convert Unix notation to windows
	console.log('Launching script ', file);

	var proc = spawn(file, []);

	proc.stdout.on('data', function(data) {
		console.log('stdout: ' + data);
		output = output + data;
	});
	proc.stderr.on('data', function(data) {
		console.log('stderr: ' + data);
	});
	proc.on('exit', function(code) {
		console.log('child process exited with code ' + code);
	});

	console.log("Setting up delayed process kill");

	setTimeout(function() {
		proc.kill();
		console.log("\nKilling process");
	}, 6000);

	return proc;
}
*/

// Websocket listener functions


function wsConsoleLog(wsio, data) {
	console.log('---wsConsoleLog:' + data.comment);
}

function wsConvertTomd5(wsio, data) {
	var conversion = md5.getHash(data.phrase);
	wsio.emit('convertedMd5', { md5: conversion });
}


function wsGiveClientConfiguration(wsio, data) {
	var confContents = fs.readFileSync(wcPathToConfigFile, "utf8");
	confContents = json5.parse(confContents);

	wsio.emit('giveClientConfiguration', confContents);

	// check if password files exist.

	if (!utils.fileExists(wcPathToSageUiPwdFile)) {
		wsio.emit('noWebId', {});
	}
	if (!utils.fileExists(wcPathToWebconPwdFile)) {
		wsio.emit('noWebconPwd', {});
	}
	if (!utils.fileExists(wcPathToAdminPanelPwdFile)) {
		wsio.emit('noConfigPwd', {
			message: 'This page is accessible due to 1st time config. To revisit a password is needed, ' +
			'entry is at the bottom. If revisiting bookmarking this page is recommended.'
		});
		wsSetConfigurationPagePwd(wsio, {
			password: 'unobtainiumpasswordbecausemd5hashingcantmatchthis', silent: 'shh'
		});
	}


}

function wsGiveServerConfiguration(wsio, data) {
	// !!!! ASSUMPTION !!!!
	// the numberical values being sent are already correctly type casted.

	var needToGenerateCerts = false;

	// first grab original configuration
	// reasoning is to maintain fields.
	var confContents = fs.readFileSync(wcPathToConfigFile, "utf8");
	confContents = json5.parse(confContents);

	if (confContents.host != data.host) {
		needToGenerateCerts = true;
	}
	confContents.host = data.host;
	confContents.port = data.port;
	confContents.index_port = data.index_port;

	// background setting
	if (data.background.used) {
		confContents.background = {};
		confContents.background.clip = data.background.clip;
		if (data.background.color) { confContents.background.color = data.background.color; }
		if (data.background.image) {
			confContents.background.image = {};
			confContents.background.image.url = data.background.image.url;
			confContents.background.image.style = data.background.image.style;
		}
		if (data.background.watermark) {
			confContents.background.watermark = {};
			confContents.background.watermark.svg = data.background.watermark.svg;
			confContents.background.watermark.color = data.background.watermark.color;
		}

	}

	confContents.resolution.width = data.resolution.width;
	confContents.resolution.height = data.resolution.height;

	// if the layout changed.
	if ((confContents.layout.rows != data.layout.rows) ||
		(confContents.layout.columns != data.layout.columns)) {

		confContents.layout.rows = data.layout.rows;
		confContents.layout.columns = data.layout.columns;

		// diplays loop
		confContents.displays = [];
		var d = {};
		for (var r = 0; r < confContents.layout.rows; r++) {
			for (var c = 0; c < confContents.layout.columns; c++) {
				d.row = r;
				d.column = c;
				confContents.displays.push(d);
			}
		}

	}

	if (confContents.alternate_hosts.length !== data.alternate_hosts.length) {
		needToGenerateCerts = true;
	} else {
		for (var i = 0; (i < confContents.alternate_hosts.length) && (i < data.alternate_hosts.length) ; i++) {
			if (confContents.alternate_hosts[i] != data.alternate_hosts[i]) {
				needToGenerateCerts = true;
			}
		}
	}
	confContents.alternate_hosts = data.alternate_hosts; // translation of dependencies.
	confContents.remote_sites = data.remote_sites;
	if (data.dependencies.ImageMagick != null) {
		confContents.dependencies.ImageMagick = data.dependencies.ImageMagick;
	}
	if (data.dependencies.FFMpeg != null) {
		confContents.dependencies.FFMpeg = data.dependencies.FFMpeg;
	}

	confContents = json5.stringify(confContents);
	fs.writeFileSync(wcPathToConfigFile, confContents);

	wsio.emit('configurationSet');

	if (needToGenerateCerts) {
		console.log();
		console.log();
		console.log('---There is a difference between host names / alternate_hosts need to generate new certs--');

		confContents = "REM Must be run as administrator\n";
		confContents += "pushd %~dp0\n";
		// using the data object because cc just got stringified.
		confContents += "call init_webserver.bat " + data.host + "\n";
		for (var i = 0; i < data.alternate_hosts.length; i++) {
			confContents += "call init_webserver.bat " + data.alternate_hosts[i] + "\n";
		}
		fs.writeFileSync(wcPathToWindowsCertMaker, confContents);
		executeConsoleCommand('"' + wcPathToWindowsCertMaker + '"');
	}


}

function wsSetMeetingId(wsio, data) {
	var jsonString = { pwd: data.password};
	jsonString = '{ "pwd" : "' + data.password + '" }';
	console.log('meetingID save double checking:' + jsonString);
	fs.writeFileSync(wcPathToSageUiPwdFile, jsonString);
	console.log();
	wsio.emit('alertClient', { message: 'The meetingID has been set' });
	wsio.emit('displayOverlayMessage', { message: 'The meetingID has been set' });
}

function wsSetWebControllerPwd(wsio, data) {
	var jsonString = { pwd: data.password};
	jsonString = '{ "pwd" : "' + data.password + '" }';
	console.log('webcontroller pwd save double checking:' + jsonString);
	fs.writeFileSync(wcPathToWebconPwdFile, jsonString);
	console.log();
	wsio.emit('alertClient', { message: 'The webcontroller password has been set' });

	global.webconID = data.password;

	// write the startup file.
	// C:\Users\Kiyoji\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup

	var startFilePath = sageutils.getHomeDirectory() +
		"/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup/startWebCon.bat";
	console.log("Startup script doesn't exist, adding to:" + startFilePath);

	var sfpContents = 'cd "' + __dirname + '"\n';
	sfpContents += 'set PATH=%CD%\\bin;%PATH%;\n';
	sfpContents += 'node webconStartServer.js';
	fs.writeFileSync(startFilePath, sfpContents);

}

function wsSetConfigurationPagePwd(wsio, data) {
	var jsonString = { pwd: data.password};
	jsonString = '{ "pwd" : "' + data.password + '" }';
	console.log('setConfigurationPagePwd save double checking:' + jsonString);
	fs.writeFileSync(wcPathToAdminPanelPwdFile, jsonString);
	console.log();
	if (data.silent !== 'shh') {
		wsio.emit('alertClient', {message: 'The configuration page password has been set'});
	}

	global.adminPanelId = data.password;
}


function wsStartSage(wsio, data) {
	if (sageServerExec == null) {
		console.log();
		console.log();
		console.log('Attempting to start sage with command:' + wcCommandNodeServer);
		sageServerExec = executeConsoleCommand(wcCommandNodeServer);
		sageServerExec.on('close', function(code, signal) {
			console.log('child triggered close event, signal:' + signal);
		});
		sageServerExec.on('exit', function(code, signal) {
			console.log('child triggered exit event, signal:' + signal);
		});
		sageServerExec.on('disconnect', function(code, signal) {
			console.log('child trigged disconnect event, signal:' + signal);
		});
		console.log('Should have started sage, pid:' + sageServerExec.pid);
		console.log();
		console.log();

		executeConsoleCommand(wcCommandStartDisplay);

		wsio.emit('displayOverlayMessage', {message: 'SAGE2 is starting'});
	} else {
		console.log();
		console.log();
		console.log('Request to sage was denied, already an active instance.');
		console.log();
		console.log();
		wsio.emit('displayOverlayMessage', {message: 'SAGE2 is already running.'});
	}
}


function wsStopSage(wsio, data) {
	if (sageServerExec !== null) {
		var killval = sageServerExec.kill();
		console.log('kill value:' + killval);
		console.log('pid:' + sageServerExec.pid);
		// This might cause problems later. Not really sure
		sageServerExec = null;
	}

	if (!isWindows) {
		while (sageServerChromeBrowsers.length > 0) {
			if (sageServerChromeBrowsers.shift().kill() === false) {
				console.log('Tried to kill browser, but failed');
			}
		}
		executeConsolCommand('pkill Chrome');
	} else {
		// it tis windows
		// executeConsoleCommand('taskkill /im chrome.exe');
		executeConsoleCommand('taskkill /im firefox* /t');
	}

	wsio.emit('displayOverlayMessage', { message: 'SAGE2 stop command sent' });
}



/* Never called
function windowsStartChromeBrowsers() {
	// open the config file to determine how to start the browsers.
	var confLocation = "config/default-cfg.json";
	var confContents = fs.readFileSync(confLocation, "utf8");
	confContents = json5.parse(confContents);

	var chromeBrowser;
	var command;
	var wx, wy, wWidth, wHeight, wNum;

	wWidth = confContents.resolution.width;
	wHeight = confContents.resolution.height;

	var jsonString
	var hasPassword = false;

	if (utils.fileExists(wcPathToSageUiPwdFile)) {
		jsonString = fs.readFileSync(wcPathToSageUiPwdFile, "utf8");
		jsonString = json5.parse(jsonString);
	} else {  jsonString = { pwd: null };  }

	if (jsonString.pwd != null) { hasPassword = true; }


	for (var r = 0; r < confContents.layout.rows; r++) {
		for (var c = 0; c < confContents.layout.columns; c++) {

			wx = c * confContents.resolution.width;
			wy = r * confContents.resolution.height;
			wNum = (c + (r * confContents.layout.columns) + 1);

			command = 'start "" "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"';
			command += ' --new-window';
			command += ' --no-first-run';
			// command += ' --start-fullscreen';
			command += ' --user-data-dir=c:\\cdd\\d' + wNum;
			command += ' --window-size=' + 600 + ',' + 600;
			command += ' --window-position=' + (4000 * (wNum - 1) + 10) + ',' + 10;

			if (!hasPassword) {
				command += ' --app=https://canoe-lava-2.manoa.hawaii.edu/display.html?clientID=' + (wNum - 1);
			} else {
				command += ' --app=https://canoe-lava-2.manoa.hawaii.edu/session.html?hash=' +
				jsonString.pwd + '?page=display.html?clientID=' + (wNum - 1);
			}
			executeConsoleCommand(command);
		}
	}
	console.log('Browser script started');

}
*/

/* Never called
function macStartChromeBrowsers() {
	// open the config file to determine how to start the browsers.
	var confLocation = "config/default-cfg.json";
	var confContents = fs.readFileSync(confLocation, "utf8");
	confContents = json5.parse(confContents);

	var chromeBrowser;
	var command;
	var wx, wy, wWidth, wHeight, wNum;

	wWidth = confContents.resolution.width;
	wHeight = confContents.resolution.height;

	// step 1 is write the script file.
	var fullScript = '';

	for (var r = 0; r < confContents.layout.rows; r++) {
		for (var c = 0; c < confContents.layout.columns; c++) {

			wx = c * confContents.resolution.width;
			wy = r * confContents.resolution.height;
			wNum = (c + (r * confContents.layout.columns) + 1);

			command = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
			command += ' --window-size=' + wWidth + ',' + wHeight;
			command += ' --window-position=' + wx + ',' + wy;
			command += ' --app=http://google.com/' + wNum;
			command += ' &';

			command += '\n\n';

			command += 'sleep 2\n\n';

			command += 'osascript -e \'tell application "Google Chrome"\' \\';
			command += '\n';
			command += "-e 'set bounds of front window to {" +
						(wx) + ", " +
						(wy) + ", " +
						(wx + wWidth) + "," +
						(wy + wHeight)  + "}' \\";
			command += '\n';
			command += "-e 'end tell'";
			command += '\n';
			command += 'sleep 2\n\n';

			fullScript += command;

		}
	}

	var scriptLocation = "script/macBrowserStart";
	fs.writeFileSync(scriptLocation, fullScript);

	// chromeBrowser = executeConsoleCommand('./script/macBrowserStart');
	// console.log('Browser script started with pid:' + chromeBrowser.pid);

	// for(var r = 0; r < confContents.layout.rows; r++) {
	// 	for(var c = 0; c < confContents.layout.columns; c++) {
	// 		command = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
	// 		command += ' --window-size=' + confContents.resolution.width + ',' + confContents.resolution.height;
	// 		command += ' --window-position=' + ( c * confContents.resolution.width ) + ',' + ( c * confContents.resolution.width );
	// 		command += ' --app=http://google.com/' + (c + (r * confContents.layout.columns) + 1);
	// 		command += ' &';
	// 		console.log('Attempting to launch display:' + command  );
	// 		// need to account for display and clientID and potentially password with session.html
	// 		chromeBrowser =  executeConsoleCommand(  command  );
	// 		sageServerChromeBrowsers.push(chromeBrowser);
	// 		console.log('Result:' + chromeBrowser.pid  );
	// 	}
	// }

}
*/

// Utility functions

function removeElement(list, elem) {
	if (list.indexOf(elem) >= 0) {
		moveElementToEnd(list, elem);
		list.pop();
	}
}

function moveElementToEnd(list, elem) {
	var i;
	var pos = list.indexOf(elem);
	if (pos < 0) {
		return;
	}
	for (i = pos; i < list.length - 1; i++) {
		list[i] = list[i + 1];
	}
	list[list.length - 1] = elem;
}
