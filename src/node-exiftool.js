// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


// Inspired by: https://github.com/nathanpeck/exiftool

var fs           = require('fs');
var ChildProcess = require('child_process');
// try to use spawnSync (node >= v12 ) or emulation
var spawnSync    = ChildProcess.spawnSync; // || require('spawn-sync');


// Processes a filename
function fileSpawn(filename, done) {
	// The dash specifies to read data from stdin
	var exif = ChildProcess.spawn('exiftool', ['-json', filename]);

	//Check for error because of the child process not being found / launched
	exif.on('error', function (err) {
		done('Fatal Error: Unable to load exiftool. ' + err);
	});

	// Read the binary data back
	var response = '';
	var errorMessage = '';
	exif.stdout.on("data", function (data) {
		response += data;
	});

	// Read an error response back and deal with it.
	exif.stderr.on("data", function (data) {
		errorMessage += data.toString();
	});

	// Handle the response to the callback to hand the metadata back.
	exif.on("close", function () {
		if (errorMessage) {
			done(errorMessage);
		}
		else {
			var metadata = JSON.parse(response);
			done(null, metadata[0]);
		}
	});
}

// Processes a filename
function file(filename, done) {
	ChildProcess.exec('exiftool -json \"' + filename + '\"', function (error, stdout, stderr) {
		if (error !== null) {
			done(stderr);
		}
		else {
			var metadata = JSON.parse(stdout);
			done(null, metadata[0]);
		}
	});
}


// Processes a filename
//    watch for non-escaped filename when using spawn-sync.spawnSync
//    node v12 is good
//
function fileSync(filename) {
	result = spawnSync('exiftool', ['-json', filename]);
	// Note, status code will always equal 0 if using busy waiting fallback
	if (result.statusCode && result.statusCode !== 0) {
		return {err:'Fatal Error: Unable to load exiftool. ' + result.stderr, metadata:null};
	} else {
		if (result.stdout.length!==0) {
			var metadata = JSON.parse(result.stdout);
			return {err:null, metadata:metadata[0]};			
		} else {
			return {err:result.stderr.toString(), metadata:null};
		}
	}
}

// Takes a binary buffer
function bufferSync(source) {
	var result = spawnSync('exiftool',
							['-json', '-'],
							{input: source, encoding:null});

	// Note, status code will always equal 0 if using busy waiting fallback
	if (result.statusCode && result.statusCode !== 0) {
		return {err:'Fatal Error: Unable to load exiftool. ' + result.stderr, metadata:null};
	} else {
		var metadata = JSON.parse(result.stdout);
		return {err:null, metadata:metadata[0]};
	}
}


// Takes a binary buffer
function buffer(source, done) {
	// The dash specifies to read data from stdin
	var exif = ChildProcess.spawn('exiftool', ['-json', '-']);

	//Check for error because of the child process not being found / launched
	exif.on('error', function (err) {
		done('Fatal Error: Unable to load exiftool. ' + err);
	});

	// Read the binary data back
	var response = '';
	var errorMessage = '';
	exif.stdout.on("data", function (data) {
		response += data;
	});

	// Read an error response back and deal with it.
	exif.stderr.on("data", function (data) {
		errorMessage += data.toString();
	});

	// Handle the response to the callback to hand the metadata back.
	exif.on("close", function () {
		if (errorMessage) {
			done(errorMessage);
		}
		else {
			var metadata = JSON.parse(response);
			done(null, metadata[0]);
		}
	});

	// Give the source binary data to the process
	exif.stdin.write(source);
	exif.stdin.end();

	return exif;
}

exports.file       = file;
exports.buffer     = buffer;
exports.fileSync   = fileSync;
exports.fileSpawn  = fileSpawn;
exports.bufferSync = bufferSync;

/*

// testing: fileSync
var fs=require('fs');
var e=require('./src/node-exiftool');
var d = e.fileSync('public_HTTPS/images/screen.png');


// testing: file
var e=require('./src/node-exiftool');
e.file('public_HTTPS/images/screen.png', function(err, data){console.log(data);});

// testing: bufferSync
var fs=require('fs');
var e=require('./src/node-exiftool');
var buf=fs.readFileSync('public_HTTPS/images/screen.png');
var d = e.bufferSync(buf);

// testing: buffer
var fs=require('fs');
var e=require('./src/node-exiftool');
var buf=fs.readFileSync('public_HTTPS/images/screen.png');
var d = e.buffer(buf, function(err, data){console.log(data);});

*/
