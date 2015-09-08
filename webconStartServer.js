


//---------------------------------------------------------------------------Imports
var http 			= require('http');
var sys				= require('sys');
var path 			= require('path');
var fs 				= require('fs');
var json5        	= require('json5');            // format that allows comments
var exec 			= require('child_process').exec;
var spawn 			= require('child_process').spawn;

var md5				= require('./src/md5');                   // return standard md5 hash of given param
var httpServer   	= require('./src/wc-httpServer');
var WebSocketIO		= require('./src/wc-wsio');
var utils			= require('./src/wc-utils');

//---------------------------------------------------------------------------Variable setup
var hostAddress		= "127.0.0.1";
var hostPort		= 9001;
var httpServerApp	= new httpServer("public");
var mainServer		= null;
var wsioServer		= null;
var clients			= [];
var sageServerExec	= null;
var sageServerChromeBrowsers = [];
var isWindows		= true;

//node.js has a special variable called "global" which is visible throughout the other files.


//---------------------------------------------------------------------------Code start

//create http listener

mainServer = http.createServer( httpServerApp.onrequest ).listen(hostPort);
console.log('--SAGE2 web control starting--');
console.log('Server listening to port:'+hostPort);


//create ws listener
wsioServer = new WebSocketIO.Server( { server: mainServer } );
wsioServer.onconnection(openWebSocketClient);

//create timer counter in global. 
global.timeCounter = 0;



var pwdFileLocation = "keys/webconPasswd.json";
var jsonString;
if( utils.fileExists(pwdFileLocation) ) {
	jsonString = fs.readFileSync( pwdFileLocation, "utf8" );
	jsonString = json5.parse(jsonString);
}
else {
	console.log('Webcon password has not been setup, it will not be possible to access.');
	jsonString = { pwd: -1 }; 
}
global.webconID = jsonString.pwd;
pwdFileLocation = "keys/configPasswd.json";
if( utils.fileExists(pwdFileLocation) ) {
	jsonString = fs.readFileSync( pwdFileLocation, "utf8" );
	jsonString = json5.parse(jsonString);
}
else {
	console.log('Admin Panel password has not been setup, launching the first time config.');
	console.log();
	jsonString = { pwd: -1 }; 

	//should launch a browser on windows pointed at the config location.
}
global.adminPanelId = jsonString.pwd;


console.log('The webconID hash is:' + global.webconID);
console.log('The adminPanelId hash is:' + global.adminPanelId);

//Test to create something that happens at an interval
setInterval( function () {
		global.timeCounter++;
		//console.log(global.timeCounter * 5);
	}
	, 5000);


//testing file read
// var confContents = fs.readFileSync( "config/default-cfg.json", "utf8" );
// console.log("Read file:");
// console.log(confContents);




//---------------------------------------------------------------------------Function definitions


global.printTimeCounter = function printTimeCounter (req) {
	console.log ( "Request at time:" + global.timeCounter );
	//console.log ( req );
}


function openWebSocketClient(wsio) {
	wsio.onclose(closeWebSocketClient);
	wsio.on('addClient', wsAddClient);
}



function closeWebSocketClient(wsio) {
	console.log( ">Disconnect" + wsio.id + " (" + wsio.clientType + " " + wsio.clientID+ ")");

	removeElement(clients, wsio);
} //end closeWebSocketClient


/*
Params
wsio is the websocket that was used.
data is the sent packet, usually in json format.
*/
function wsAddClient(wsio, data) {

	clients.push(wsio);
	setupListeners(wsio);

	wsio.emit('serverAccepted', {} );
}

/*
When receiving a packet of the named type, call the function.
*/
function setupListeners(wsio) {
	
	wsio.on('consoleLog',      		wsConsoleLog);
	wsio.on('convertTomd5',      	wsConvertTomd5);
	wsio.on('newConfigSettings',    wsNewConfigSettings);


	//should be functions to keep
	wsio.on('giveClientConfiguration',		wsGiveClientConfiguration);
	wsio.on('giveServerConfiguration',		wsGiveServerConfiguration);
	wsio.on('setMeetingId',					wsSetMeetingId);
	wsio.on('startSage',					wsStartSage);
	wsio.on('stopSage',						wsStopSage);

	//unique for admin panel
	wsio.on('setWebControllerPwd',			wsSetWebControllerPwd);
	wsio.on('setConfigurationPagePwd',		wsSetConfigurationPagePwd);


} //end setupListeners



function executeConsoleCommand( cmd ) {
	var child;
	child = exec(cmd, function (error, stdout, stderr) {
		sys.print('stdout: ' + stdout);
		sys.print('stderr: ' + stderr);
		if (error !== null) {
			console.log('Command> exec error: ' + error);
		}
	});
	return child;
}

function executeScriptFile( file ) {

	output = "";

    file = path.normalize(file); // convert Unix notation to windows
    console.log('Launching script ', file);

    var proc = spawn(file, []);

    proc.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
            output = output + data;
    });
    proc.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
    });
    proc.on('exit', function (code) {
        console.log('child process exited with code ' + code);
        //if (socket) socket.emit('return', {status: true, stdout: output});
    });



    console.log("Setting up delayed process kill");

    setTimeout( function(){ proc.kill(); console.log("\nKilling process"); }, 6000);



    return proc;
}


//---------------------------------------------------------------------------websocket listener functions



function wsConsoleLog(wsio, data) {
	console.log('---wsConsoleLog:' + data.comment);
	//executeConsoleCommand( "echo wsConsoleLog activating executeConsoleCommand" );
	
	//executeConsoleCommand( "open -a TextEdit.app" );

	executeScriptFile( "script/testScript" );
} //end class

function wsConvertTomd5(wsio, data) {
	var conversion = md5.getHash( data.phrase );
	wsio.emit('convertedMd5', { md5: conversion });
} //end class



function wsNewConfigSettings(wsio, data) {
	var jsonString = json5.stringify(data);
	var confLocation = "config/default-cfg.json";
	var jsonString = json5.stringify(data);
	var confLocation = "config/default-cfg.json";
	fs.writeFileSync( confLocation, jsonString);
	fs.writeFileSync( confLocation, jsonString);

} //end class



function wsGiveClientConfiguration(wsio, data) {

	var confLocation = "config/default-cfg.json";
	var confContents = fs.readFileSync( confLocation, "utf8" );
	confContents = json5.parse(confContents);

	wsio.emit( 'giveClientConfiguration', confContents );

	//check if password files exist.

	var pwdFileLocation = "keys/passwd.json";
	if( ! utils.fileExists(pwdFileLocation) ) { wsio.emit('noWebId', {}); }
	pwdFileLocation = "keys/webconPasswd.json";
	if( ! utils.fileExists(pwdFileLocation) ) { wsio.emit('noWebconPwd', {}); }
	pwdFileLocation = "keys/configPasswd.json";
	if( ! utils.fileExists(pwdFileLocation) ) {
		wsio.emit('noConfigPwd', {
			message: 'This page is accessible due to 1st time config. To revisit a password is needed, entry is at the bottom. If revisiting bookmarking this page is recommended.'
		});
		wsSetConfigurationPagePwd(wsio, { password: 'unobtainiumpasswordbecausemd5hashingcantmatchthis', silent:'shh' });
	}


} //wsGiveClientConfiguration

function wsGiveServerConfiguration(wsio, data) {
	//!!!! ASSUMPTION !!!!
	//the numberical values being sent are already correctly type casted.

	//first grab original configuration
	//reasoning is to maintain fields.
	var confLocation = "config/default-cfg.json";
	var confContents = fs.readFileSync( confLocation, "utf8" );
	confContents = json5.parse(confContents);

	confContents.host = data.host;
	confContents.port = data.port;
	confContents.index_port = data.index_port;
	//confContents.register_site = true;
	confContents.resolution.width = data.resolution.width;
	confContents.resolution.height = data.resolution.height;

	//if the layout changed.
	if(  (confContents.layout.rows != data.layout.rows)  ||  (confContents.layout.columns = data.layout.columns)  ) {
		confContents.layout.rows = data.layout.rows;
		confContents.layout.columns = data.layout.columns;
		
		//diplays loop
		confContents.displays = [];
		var d = {};
		for(var r = 0; r < confContents.layout.rows; r++) {
			for(var c = 0; c < confContents.layout.columns; c++) {
				d.row = r;
				d.column = c;
				confContents.displays.push(d);
			}
		}

	} //end if the layout changed


	confContents.alternate_hosts = data.alternate_hosts; //translation of dependencies.
	confContents.remote_sites = data.remote_sites; 
	if(data.dependencies.ImageMagick != null) { confContents.dependencies.ImageMagick = data.dependencies.ImageMagick;  } 
	if(data.dependencies.FFMpeg != null) { confContents.dependencies.FFMpeg = data.dependencies.FFMpeg;  } 



	confContents = json5.stringify(confContents);
	fs.writeFileSync( confLocation, confContents);


	wsio.emit('configurationSet');

} //wsGiveServerConfiguration

function wsSetMeetingId(wsio, data) {
	//var conversion = md5.getHash( data.password );
	var jsonString = { "pwd": data.password};
	//jsonString = json5.stringify(jsonString);
	jsonString = '{ "pwd" : "' + data.password +'" }';
	var pwdFileLocation = "keys/passwd.json";
	console.log('meetingID save double checking:' + jsonString);
	fs.writeFileSync( pwdFileLocation, jsonString);
	console.log();
	wsio.emit('alertClient', { message: 'The meetingID has been set' });
} //wsSetMeetingId

function wsSetWebControllerPwd(wsio, data) {
	//var conversion = md5.getHash( data.password );
	var jsonString = { "pwd": data.password};
	//jsonString = json5.stringify(jsonString);
	jsonString = '{ "pwd" : "' + data.password +'" }';
	var pwdFileLocation = "keys/webconPasswd.json";
	console.log('webcontroller pwd save double checking:' + jsonString);
	fs.writeFileSync( pwdFileLocation, jsonString);
	console.log();
	wsio.emit('alertClient', { message: 'The webcontroller password has been set' });

	global.webconID = data.password;
} //wsSetWebControllerPwd

function wsSetConfigurationPagePwd(wsio, data) {
	//var conversion = md5.getHash( data.password );
	var jsonString = { "pwd": data.password};
	//jsonString = json5.stringify(jsonString);
	jsonString = '{ "pwd" : "' + data.password +'" }';
	var pwdFileLocation = "keys/configPasswd.json";
	console.log('setConfigurationPagePwd save double checking:' + jsonString);
	fs.writeFileSync( pwdFileLocation, jsonString);
	console.log();
	if(data.silent !== 'shh') { wsio.emit('alertClient', { message: 'The configuration page password has been set' }); }

	global.adminPanelId = data.password;
} //wsSetConfigurationPagePwd


function wsStartSage(wsio, data) {
	if(sageServerExec == null ) {
		console.log();
		console.log();
		console.log('Attempting to start sage');
		sageServerExec = executeConsoleCommand('node server.js');
		sageServerExec.on('close', function (code, signal) {
			console.log('child triggered close event, signal:'+signal);
			//sageServerExec.disconnect();
			});
		sageServerExec.on('exit', function (code, signal) { console.log('child triggered exit event, signal:'+signal); });
		sageServerExec.on('disconnect', function (code, signal) { console.log('child trigged disconnect event, signal:'+signal); });
		console.log('Should have started sage, pid:' + sageServerExec.pid);
		console.log();
		console.log();

		//start the browsers
		//if(isWindows) { windowsStartChromeBrowsers(); }
		//else { macStartChromeBrowsers(); }
		
		executeConsoleCommand('wcWinStart.bat');

		wsio.emit( 'displayOverlayMessage', {message: 'SAGE2 is starting'} );
	}
	else {
		console.log();
		console.log();
		console.log('Request to sage was denied, already an active instance.');
		console.log();
		console.log();
		wsio.emit( 'displayOverlayMessage', {message: 'SAGE2 is already running.'} );
	}
}

function windowsStartChromeBrowsers() {
	//open the config file to determine how to start the browsers.
	var confLocation = "config/default-cfg.json";
	var confContents = fs.readFileSync( confLocation, "utf8" );
	confContents = json5.parse(confContents);

	var chromeBrowser;
	var command;
	var wx, wy, wWidth, wHeight, wNum;

	wWidth = confContents.resolution.width;
	wHeight = confContents.resolution.height;

	var pwdFileLocation = "keys/passwd.json";
	var jsonString
	var hasPassword = false;
	
	if( utils.fileExists(pwdFileLocation) ) {
		jsonString = fs.readFileSync( pwdFileLocation, "utf8" );
		jsonString = json5.parse(jsonString);
	}
	else {  jsonString = { pwd: null };  }
	
	if(jsonString.pwd != null) { hasPassword = true; }


	for(var r = 0; r < confContents.layout.rows; r++) {
		for(var c = 0; c < confContents.layout.columns; c++) {

			wx = c * confContents.resolution.width;
			wy = r * confContents.resolution.height;
			wNum = (c + (r * confContents.layout.columns) + 1);
			
			command = 'start "" "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"';
			command += ' --new-window';
			command += ' --no-first-run';
			//command += ' --start-fullscreen';
			command += ' --user-data-dir=c:\\cdd\\d' + wNum;
			command += ' --window-size=' + 600 + ',' + 600;
			command += ' --window-position=' + ( 4000 * ( wNum - 1 ) + 10 ) + ',' + 10;
			
			if(!hasPassword) {
				command += ' --app=https://canoe-lava-2.manoa.hawaii.edu/display.html?clientID=' + (wNum-1);
			}
			else {
				command += ' --app=https://canoe-lava-2.manoa.hawaii.edu/session.html?hash='+
				jsonString.pwd + '?page=display.html?clientID=' + (wNum-1);
			}
			executeConsoleCommand( command );

		}
	}
	console.log('Browser script started');

} //end windowsStartChromeBrowsers

function macStartChromeBrowsers() {
	//open the config file to determine how to start the browsers.
	var confLocation = "config/default-cfg.json";
	var confContents = fs.readFileSync( confLocation, "utf8" );
	confContents = json5.parse(confContents);

	var chromeBrowser;
	var command;
	var wx, wy, wWidth, wHeight, wNum;

	wWidth = confContents.resolution.width;
	wHeight = confContents.resolution.height;

	//step 1 is write the script file.
	var fullScript = '';


	for(var r = 0; r < confContents.layout.rows; r++) {
		for(var c = 0; c < confContents.layout.columns; c++) {

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

			command += 'osascript 	-e \'tell application "Google Chrome"\' \\';
			command += '\n';
			command += "-e 'set bounds of front window to {"+
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
	fs.writeFileSync( scriptLocation, fullScript);

	chromeBrowser = executeConsoleCommand( './script/macBrowserStart' );
	console.log('Browser script started with pid:' + chromeBrowser.pid);


	// for(var r = 0; r < confContents.layout.rows; r++) {
	// 	for(var c = 0; c < confContents.layout.columns; c++) {
			
	// 		command = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
	// 		command += ' --window-size=' + confContents.resolution.width + ',' + confContents.resolution.height;
	// 		command += ' --window-position=' + ( c * confContents.resolution.width ) + ',' + ( c * confContents.resolution.width );
	// 		command += ' --app=http://google.com/' + (c + (r * confContents.layout.columns) + 1);
	// 		command += ' &';

	// 		console.log('Attempting to launch display:' + command  );

	// 		//need to account for display and clientID and potentially password with session.html


	// 		chromeBrowser =  executeConsoleCommand(  command  );
	// 		sageServerChromeBrowsers.push(chromeBrowser);

	// 		console.log('Result:' + chromeBrowser.pid  );
	// 	}
	// }



} //end macStartChromeBrowsers

function wsStopSage(wsio, data) {
	if(sageServerExec !== null) {
		var killval = sageServerExec.kill();
		console.log('kill value:' + killval);
		console.log('pid:' + sageServerExec.pid);
		if(killval === true) {
			sageServerExec = null;
		}
	}
	
	if(!isWindows) {
		while(sageServerChromeBrowsers.length > 0) {
			if( sageServerChromeBrowsers.shift().kill() === false) {
				console.log('Tried to kill browser, but failed');
			}
		}
		executeConsoleCommand('pkill Chrome');
	}
	else { //is windows
		//executeConsoleCommand('taskkill /im chrome.exe');
		executeConsoleCommand('taskkill /im firefox* /t' );
	}

	wsio.emit( 'displayOverlayMessage', { message: 'SAGE2 stop command sent' } );
}


//---------------------------------------------------------------------------Utility functions



function removeElement(list, elem) {
	if(list.indexOf(elem) >= 0){
		moveElementToEnd(list, elem);
		list.pop();
	}
}

function moveElementToEnd(list, elem) {
	var i;
	var pos = list.indexOf(elem);
	if(pos < 0) return;
	for(i=pos; i<list.length-1; i++){
		list[i] = list[i+1];
	}
	list[list.length-1] = elem;
}
