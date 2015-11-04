// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

// npm registry: built-in or defined in package.json
var fs          = require('fs');                  // filesystem access
var http        = require('http');                // http server
var https       = require('https');               // https server
var os          = require('os');                  // operating system access
var path        = require('path');                // file path extraction and creation
var json5       = require('json5');               // JSON5 parsing
var request     = require('request');             // external http requests

// custom node modules
var websocketIO = require('websocketio');   // creates WebSocket server and clients
var connection;
var imageFilename;
var uploadCount;
var wssURL;

//delay between each uploads (ms)
var delayUpload = 300;

// Bound random number
function randomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function postForm(formData, callback) {
	var httpsURL = wssURL.replace('wss', 'https');
	// Post a request to the server (simulating the form upload)
	request.post({url: httpsURL + "/upload", formData: formData, strictSSL: false},
		function optionalCallback(err, httpResponse, body) {
			callback(err);
		}
	);
}

function uploadPictures(count) {
	// initialize the counter
	if (count === undefined) count = uploadCount;
	if (count === 0) {
		process.exit();
		return;
	}

	// Filling up the form structure
	var formData = {
		file0: {
			value:  fs.createReadStream(__dirname + '/' + imageFilename),
			options: {
				filename:    imageFilename,
				contentType: 'image/jpg'
			}
		}
	};

	postForm(formData, function(err) {
		if (err) return console.error('Upload> failed:', err);
		console.log('Upload> success for', count);
		setTimeout(function() { connection.emit('tileApplications'); uploadPictures(count-1); }, delayUpload);			
	});
}

// create the websocket connection and start the timer
function createRemoteConnection(wsURL) {
	var remote = new websocketIO(wsURL, false, function() {
		console.log("connected to ", wsURL);

		var clientDescription = {
			clientType: "uploader",
			requestsServerFiles: false,
			uploadsContent: true,
			requestsServerFiles: true,
			sendsWebContentToLoad: true,
			receivesDisplayConfiguration: true
		};
		remote.emit('addClient', clientDescription);
	});

	remote.onclose(function() {
		console.log("Remote site now offline");
	});

	remote.on('initialize', function(wsio, data) {
		console.log('Initialize> uniqueID', data.UID);
		uploadPictures();
	});

	remote.on('setupSAGE2Version', function(wsio, data) {
		console.log('SAGE2Version', json5.stringify(data));
	});

	remote.on('setupDisplayConfiguration', function(wsio, data) {
		console.log('setupDisplayConfiguration', data.totalWidth, data.totalHeight);
	});

	return remote;
}

// default URL
wssURL        = "wss://localhost:443";
imageFilename = "note.jpg";
uploadCount   = 100;

// If there's an argument, use it as a url
//     wss://hostname:portnumber
if (process.argv.length >= 3) {
	wssURL = process.argv[2];
}
if (process.argv.length >= 4) {
	imageFilename = process.argv[3];
}
if (process.argv.length >= 5) {
	uploadCount = parseInt(process.argv[4], 10);
}

console.log('Client> Connecting to server', wssURL);
console.log('Client> uploading', imageFilename, ' ', uploadCount, 'times');

// Create and go !
connection = createRemoteConnection(wssURL);

