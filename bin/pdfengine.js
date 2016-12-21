#!/usr/bin/env node

// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

/**
 * Send a command to a SAGE2 server
 *
 * ./sage_command.js <url> <command> [params]
 *
 * @class command
 * @module commands
 * @submodule command
 */

"use strict";

var path        = require('path');                // file path extraction and creation
var json5       = require('json5');               // JSON5 parsing

// custom node modules
var websocketIO = require('websocketio');   // creates WebSocket server and clients

var connection;
var command;
var wssURL;
var state = 0;
var appid = '';
var titleBarHeight = 50;
var bezelSize = 9;
var regionOffset = (bezelSize * 2); //arbitrary size
var tileWidth = 1920;
var tileHeight = 1080;
var apps = {};
// current goToPage request
var pageRequested = null;
// previous page (as goToPage request)
var prevPage = null;

var slots = {	1: {x: (regionOffset + (tileWidth + bezelSize) * 1), y: regionOffset - titleBarHeight}, 
		2: {x: (regionOffset + (tileWidth + bezelSize) * 3), y: regionOffset - titleBarHeight}, 
		3: {x: (regionOffset + (tileWidth + bezelSize) * 5), y: regionOffset - titleBarHeight}
};


function moveResize(remote,appNr,x,y,xw,yw) {
  console.log("moveResize "+appNr);
  var movecmd = "moveto "+appNr+" "+x+" "+y;
  var resizecmd = "resize "+appNr+" "+xw+" "+yw;
  sage2cmd(remote, movecmd);
  sage2cmd(remote, resizecmd);
}

function moveResizeApp(remote,app,x,y,xw,yw) {
  var movecmd = "moveto "+app.appid+" "+x+" "+y;
  var resizecmd = "resize "+app.appid+" "+xw+" "+yw;
  sage2cmd(remote,movecmd);
  sage2cmd(remote,resizecmd);
}

// pre: we have an up-to-date list of current apps
// toPage: whether we are going TO a page (===true) or leaving a page (===false)
function changePage(remote,req,toPage) {
        var fromPage = !toPage;
	console.log("changePage "+JSON.stringify(req)+" "+toPage);
	console.log("(previous) "+JSON.stringify(prevPage));

        if (toPage && pageMatch(req,"VxLab: RMIT 21stCentury ScopeVirtual Experiences Lab")) {
	}	
        if (fromPage && pageMatch(prevPage,"VxLab: RMIT 21stCentury ScopeVirtual Experiences Lab")) {
	}

	if (toPage && pageMatch(req,"Global Operations Visualization")) {
		console.log("GOV Lab");
		if (!appExists("Google Maps")) {
			sage2cmd(remote,"load gmaps-vxlab");
		}
        }
	if (fromPage && pageMatch(prevPage,"Global Operations Visualization")) {
		console.log("leaving GOV Lab");
		closeApp(remote,"Google Maps");
	}
	var nicolas = "nicolas-leap-motion-controls-robots-00061_1433301758186.mp4";
	var abhijay = "AbhijayMovieComplete.mp4";
	var withcan = "AMRIT-robots-with-can-00063.mp4";
	var realvirtual = "amritlab-can-demo-real-virtual-interact-00065.mp4";
	if (toPage && pageMatch(req,"AMRIT Lab")) {
		console.log("AMRIT Lab");
		openMedia(remote,"/user/videos/",nicolas,2);
		openMedia(remote,"/user/videos/",withcan,3);
		openMedia(remote,"/user/videos/",abhijay);
		openMedia(remote,"/user/videos/",realvirtual);
		//arrangeApps(remote);
	}
	if (fromPage && pageMatch(prevPage,"AMRIT Lab")) {
		console.log("leaving AMRIT Lab");
		closeApp(remote,nicolas);
		closeApp(remote,withcan);
		closeApp(remote,abhijay);
		closeApp(remote,realvirtual);
	}
	var studentsbaxter = "baxter-in-govlab-rviz-MAH08914.MP4";
	var baxtercon4 = "BaxterResearchRobotPlaysConnectFour.mp4";
	if (toPage && pageMatch(req,"Baxter")) {
		console.log("Baxter");
		openMedia(remote,"/user/videos/",studentsbaxter,2);
		openMedia(remote,"/user/videos/",baxtercon4,3);
        }
	if (fromPage && pageMatch(prevPage,"Baxter")) {
		closeApp(remote,studentsbaxter);
		closeApp(remote,baxtercon4);
	}
	var festo4diac="FESTO-4DIAC-pubsub.mp4";
	var festocaps="cap-feeding_FESTO.MOV";
	var festobottles="FESTO-bottle-feed.MOV";
	var festoar="20160524-augmented-reality-festo-student-project-demo-ar.mp4";
	var festoar2="SpatialAnalysisCapstone2016Sem2_2160p.mp4";
	var festophoto="FESTO-DSC08488.JPG";
	if (toPage && pageMatch(req,"FESTO")) {
		console.log("FESTO");
		openMedia(remote,"/user/videos/",festo4diac);
		openMedia(remote,"/user/videos/",festocaps,3);
		openMedia(remote,"/user/videos/",festoar);
		openMedia(remote,"/user/videos/",festobottles);
		openMedia(remote,"/user/videos/",festoar2);
		openMedia(remote,"/user/images/",festophoto,2);
        }
	if (fromPage && pageMatch(prevPage,"FESTO")) {
		closeApp(remote,festo4diac);
		closeApp(remote,festocaps);
		closeApp(remote,festoar);
		closeApp(remote,festobottles);
		closeApp(remote,festoar);
		closeApp(remote,festoar2);
		closeApp(remote,festophoto);
	}
	if (fromPage) {
		console.log("finished leaving: apps "+JSON.stringify(apps));
	}
}

// open if not open already
// where in ['slot','thumb']
function openMedia(remote,prefix,filename,slot) {
  console.log("open media: "+filename);
  if (appExists(filename)) {
    console.log("...already open");
    return;
  }
  var geom = "";
  if (slot!==null && slot!==undefined) {
    geom = slotOpenGeometry(slot); 
  } else {
    //console.log("apps "+JSON.stringify(apps));
    var appnr = Object.keys(apps).length;
    console.log("...open to thumbnail "+appnr);
    apps[appnr] = {data: filename, placeholder:true}; 
    geom = thumbnailOpenGeometry(appnr);
  }
  sage2cmd(remote,'open '+prefix+filename+geom);
}

function closeApp(remote,filename) {
  console.log("close media: "+filename);
  console.log("close media: "+JSON.stringify(apps));
  var appId = findAppId(filename);
  if (appId!==null) {
    sage2cmd(remote,'close '+appId);
  }
}

function sage2cmd(remote,cmd) {
  console.log("sage2... "+cmd);
  remote.emit('command',cmd);
}

function findAppId(txt) {
  var search = filter(apps,function(app) { return appHasName(app, txt); });
  if (search.length===0) return null;
  else {
    var app = search[0];
    console.log("findAppId "+txt+" "+JSON.stringify(app));
    return app.appid;
  }
}

function findAppNr(txt) {
  var app = findApp(txt)
  if (app === null) return null;
  else return app.appNr;
}

function findApp(txt) {
  var search = filter(apps,function(app) { return appHasName(app, txt); });
  if (search.length===0) return null;
  else return search[0];
}

function appExists(txt) {
  var result = contains(apps,function(app) { return appHasName(app, txt); });
  console.log("appExists "+txt+": "+result);
  return result;
}

function appHasName(app,txt) {
	// leave this in to find mysterious crasher...
	//console.log("appHasName "+JSON.stringify(app)+" "+txt+"?");
	var result = app.data.indexOf(txt) !== -1
	//console.log("..."+result);
	return result;
}

function pageMatch(req,txt) {
        if (req!==null) {
	  return req.startText.startsWith(txt);
	}
}

// assumes apps is up to date and guesses the next available slot position(!)
function thumbnailOpenGeometry(appnr) {
 	// predict the next thumbnail position(!)
	console.log("...thumbnail open geometry "+appnr);
	var thumbx = regionOffset;
	var thumby = regionOffset;
	if (appnr<2) {
	  thumbx = regionOffset;
	  thumby = (regionOffset + (tileHeight + bezelSize) * appnr);
   } else {
	  var xpos = appnr - 2;
	  thumbx = (regionOffset + (tileWidth + bezelSize) * xpos);
	  thumby = (regionOffset + (tileHeight + bezelSize) * 2);
	}
	console.log("thumbx "+thumbx);
	return " "+thumbx+" "+thumby+" "+(tileWidth + bezelSize - (2 * regionOffset))+" "+(tileHeight + bezelSize - (2 * regionOffset) - titleBarHeight);
}

function thumbnail(remote,appnr) {
	console.log("...thumbnail "+appnr);
	var app = apps[appnr];
	console.log("thumbnail app"+JSON.stringify(app));
	// FIXME: hack
        if (app.data.indexOf("201612-VxLab.pdf")!==-1) {
           console.log("skip pdf");
           return;
        }
	console.log("...app "+JSON.stringify(app));
	var thumbx = regionOffset;
	var thumby = regionOffset;
	if (appnr<2) {
	  thumbx = regionOffset;
	  thumby = (regionOffset + (tileHeight + bezelSize) * appnr);
   } else {
	  var xpos = appnr - 2;
	  thumbx = (regionOffset + (tileWidth + bezelSize) * xpos);
	  thumby = (regionOffset + (tileHeight + bezelSize) * 2);
	}
	console.log("thumbx "+thumbx);
	moveResize(remote,appnr,thumbx,thumby, (tileWidth + bezelSize - (2 * regionOffset)), (tileHeight + bezelSize - (2 * regionOffset) - titleBarHeight));
}

function contains(l,match) {
  var fl = filter(l,match);
  //console.log("contains filtered result ",fl.length);
  return fl.length>0;
}

function filter(l,match) {
        var filtered = [];
	Object.keys(l).forEach(function(key, index) {
	  var app = this[key];
	  //console.log("searching for match: "+key+" "+JSON.stringify(app));
	  var matched = match(app);
	  //console.log("matched? "+matched);
	  if (matched) {
	     //console.log("matched");
	     filtered.push(app);
	  }
	}, l);
	return filtered;
}

function bumpApps(remote) {
				var xw = (((tileWidth + bezelSize) * 2) - (2 * regionOffset));
				var yw = (((tileHeight + bezelSize) * 2) - titleBarHeight - (2 * regionOffset));
				// find slot 1 if any and move to slot 2
			        //var searchgeom = "["+xw+"x"+yw+" +"+slots[1].x+"+"+slots[1].y+"]";
			        //console.log("search for "+searchgeom);
				//Object.keys(apps).forEach(function(key, index) {
				//  var app = this[key];
				//  console.log("nr: "+key+" "+JSON.stringify(app));
				//  if (app.geometry===searchgeom) {
				//	console.log("...slot 1 to 2"+app.appid);
				//	var movecmd = "moveto "+app.appid+" "+slots[2].x+" "+slots[2].y;
				//	var resizecmd = "resize "+app.appid+" "+xw+" "+yw;
				//	console.log(movecmd);
				//	console.log(resizecmd);
				//	remote.emit('command', movecmd);
				//	remote.emit('command', resizecmd);
				//  }
				//}, apps);
				// find slot 2 if any and move to slot 3
			        var searchgeom = "["+xw+"x"+yw+" +"+slots[2].x+"+"+slots[2].y+"]";
				Object.keys(apps).forEach(function(key, index) {
				  var app = this[key];
				  //console.log("nr: "+key+" "+JSON.stringify(app));
				  if (app.geometry===searchgeom) {
					console.log("...slot 2 to 3"+app.appid);
					var movecmd = "moveto "+app.appid+" "+slots[3].x+" "+slots[3].y;
					var resizecmd = "resize "+app.appid+" "+xw+" "+yw;
					console.log(movecmd);
					console.log(resizecmd);
					remote.emit('command', movecmd);
					remote.emit('command', resizecmd);
				  }
				}, apps);
				// find slot 3 if any and move to indexed thumbnail slot
			        var searchgeom = "["+xw+"x"+yw+" +"+slots[3].x+"+"+slots[3].y+"]";
				Object.keys(apps).forEach(function(key, index) {
				  var app = this[key];
				  //console.log("nr: "+key+" "+JSON.stringify(app));
				  if (app.geometry===searchgeom) {
					thumbnail(remote,key);
				  }
				}, apps);
}

function selectApp(remote,appnr) {
				bumpApps(remote);
				// move to slot 2
				moveToSlot(remote,appnr,2);
}

// give the geometry needed to "open" an app at given slot
function slotOpenGeometry(slot) {
	var xw = (((tileWidth + bezelSize) * 2) - (2 * regionOffset));
	var yw = (((tileHeight + bezelSize) * 2) - titleBarHeight - (2 * regionOffset));
	return " "+slots[slot].x+" "+slots[slot].y+" "+xw+" "+yw;
}

function moveToSlot(remote,appnr,slot) {
	console.log("moveToSlot "+appnr);
	var xw = (((tileWidth + bezelSize) * 2) - (2 * regionOffset));
	var yw = (((tileHeight + bezelSize) * 2) - titleBarHeight - (2 * regionOffset));
	var selected = apps[appnr].appid;
	var movecmd = "moveto "+selected+" "+slots[slot].x+" "+slots[slot].y;
	var resizecmd = "resize "+selected+" "+xw+" "+yw;
	sage2cmd(remote, movecmd);
	sage2cmd(remote, resizecmd);
}

function arrangeApps(remote) {
	Object.keys(apps).forEach(function(key, index) {
		console.log("thumbnail "+key);
		thumbnail(remote,key);	
	}, apps);
}

// create the websocket connection and start the timer
function createRemoteConnection(wsURL) {
	var remote = new websocketIO(wsURL, false, function() {
		console.log("Client> connecting to ", wsURL);

		var clientDescription = {
			clientType: "commandline",
			requests: {
				config:  true,
				version: false,
				time:    false,
				console: true
			}
		};

		remote.onclose(function() {
			console.log("Connection closed");
		});

		remote.on('console', function(wsio, data) {
			// just to filter a bit the long outputs
			//if (data.length < 256) {
			// HACK: use start of second command output as signal that first command finished :-(
			if (data.startsWith('Sessions')) {
				//process.stdout.write(state+" "+data);
				console.log("App info complete");
				console.log("apps: "+JSON.stringify(apps));
				console.log("appid: "+appid);
				state = 2;
				//if (command==="arrange") {
				//	arrangeApps(remote);
				//} else {
				//	selectApp(remote);
				//}
				//setTimeout(function() { process.exit(0); }, 200);
				if (pageRequested !== null && pageRequested !== undefined) {
					console.log("pageRequested val "+JSON.stringify(pageRequested));
					if (prevPage !== null) {
					  console.log("leaving page");
					  changePage(remote,pageRequested,false);
					  prevPage = null;
					  setTimeout(function() {
					    remote.emit('command', "apps");
					    remote.emit('command', "sessions");
					  }, 500);
					} else {
					  console.log("arriving at page");
					  changePage(remote,pageRequested,true);
					  prevPage = pageRequested;
					  pageRequested = null;
					}
				}
				state = 0;
			}
			else if (state === 1) {
				process.stdout.write(state+" "+data);
				var ws = data.match(' *')[0];
				//console.log("ws: "+ws);
				var id = data.substr(ws+1,data.length).match(' *[0-9]*')[0];
				var idl = id.length;
				var dl = data.length;
				//console.log("id: '"+id+"' "+idl+" "+dl);
				//console.log("ws: "+ws.length);
				var rmdr = data.substring(ws.length+idl+2,dl);
				//console.log("rmdr: "+rmdr);
				var appid = rmdr.match('[^ ]*')[0];
				//console.log("appid: "+appid);
				apps[id] = {appid: appid, data:data};
				apps[id].geometry = data.match('\[[0-9]*x[0-9]* [+-]*[0-9]*[+-]*[0-9]*\]')[0];
			}
			else if (state === 0 && data.startsWith('Applications')) {
				process.stdout.write(state+" "+data);
				state = 1;
				// reset apps
				apps = {}
			}
		});

		remote.on('initialize', function(wsio, data) {
			console.log('Initialize> uniqueID', data.UID);
			remote.emit('command', "apps");
			remote.emit('command', "sessions");

			// Wait for 1sec to quit
			//setTimeout(function() { process.exit(0); }, 1000);
		});

                remote.on('goToPage', function(wsio, data) {
                        console.log('goToPage msg '+JSON.stringify(data));
			pageRequested = data;
			console.log("pageRequested set "+JSON.stringify(pageRequested));
			remote.emit('command', "apps");
			remote.emit('command', "sessions");
                });

		remote.on('setupSAGE2Version', function(wsio, data) {
			console.log('SAGE2> version', json5.stringify(data));
		});

		remote.on('setupDisplayConfiguration', function(wsio, data) {
			console.log('SAGE2> display configuration', data.totalWidth, data.totalHeight);
		});

		remote.emit('addClient', clientDescription);
	});

	remote.ws.on('error', function(err) {
		console.log('Client> error', err.errno);
		process.exit(0);
	});

	return remote;
}

// default URL
wssURL = "wss://localhost:443";

if (process.argv.length === 2) {
	console.log('');
	console.log('Usage> sage_command.js <url> <command> [paramaters]');
	console.log('');
	console.log('Example>     ./sage_command.js localhost:9090 load demo');
	console.log('');
	process.exit(0);
}

if (process.argv.length === 3 && ( (process.argv[2] === '-h') || (process.argv[2] === '--help') ) ) {
	console.log('');
	console.log('Usage> sage_command.js <url> <command> [parameters]');
	console.log('');
	console.log('Example>     ./sage_command.js localhost:9090 load demo');
	console.log('');
	process.exit(0);
}

// If there's an argument, use it as a url
//     wss://hostname:portnumber
if (process.argv.length >= 3) {
	wssURL = process.argv[2];
	if (wssURL.indexOf('wss://')>=0) {
		// all good
	} else if (wssURL.indexOf('ws://')>=0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('ws', 'wss');
	} else if (wssURL.indexOf('http://')>=0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('http', 'wss');
	} else if (wssURL.indexOf('https://')>=0) {
		console.log('Client> switching to wss:// protocol');
		wssURL = wssURL.replace('https', 'wss');
	} else {
		wssURL = 'wss://' + wssURL;
	}
}

if (process.argv.length === 4) {
	// Remove the first paramaters
	process.argv.splice(0, 3);
	// take all the rest
	command = process.argv.join(' ');
} else {
	// default command if none specified
	command = "help";
}

console.log('Client> sending command:', command);

// Create and go !
connection = createRemoteConnection(wssURL);
console.log('Starting>', connection.ws.url);
