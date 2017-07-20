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
 * Metadata processing using ExifTool
 *   ExifTool by Phil Harvey: http://www.sno.phy.queensu.ca/~phil/exiftool/
 *
 * @module server
 * @submodule exiftool
 * @class exiftool
 */

// Inspired by: https://github.com/nathanpeck/exiftool

// require variables to be declared
'use strict';

var ChildProcess = require('child_process');

// try to use spawnSync (node >= v12 ) or emulation
var spawnSync    = ChildProcess.spawnSync; // || require('spawn-sync');

/**
 * Process a file, using spawn method
 *
 * @method fileSpawn
 * @param filename {String} name of the file to be tested
 * @param done {Function} executed when done, done(error, metadata)
 */
function fileSpawn(filename, done) {
	// The dash specifies to read data from stdin
	var exif = ChildProcess.spawn('exiftool', ['-json', '-m', '-filesize#', '-all', filename]);

	// Check for error because of the child process not being found / launched
	exif.on('error', function(err) {
		done('Fatal Error: Unable to load exiftool. ' + err);
	});

	// Read the binary data back
	var response = '';
	var errorMessage = '';
	exif.stdout.on("data", function(data) {
		response += data;
	});

	// Read an error response back and deal with it.
	exif.stderr.on("data", function(data) {
		errorMessage += data.toString();
	});

	// Handle the response to the callback to hand the metadata back.
	exif.on("close", function() {
		if (errorMessage) {
			done(errorMessage);
		} else {
			var metadata = JSON.parse(response);
			done(null, metadata[0]);
		}
	});
}

/**
 * Process a file, using exec method
 *
 * @method file
 * @param filename {String} name of the file to be tested
 * @param done {Function} executed when done, done(error, metadata)
 */
function file(filename, done) {
	// Spawn an exiftool process
	var exif = ChildProcess.spawn('exiftool', ['-m', '-json', '-filesize#', '-all', filename]);

	// Check for error because of the child process not being found / launched
	exif.on('error', function(err) {
		done('Fatal Error: Unable to load exiftool. ' + err);
	});

	// Read the binary data back
	var response = '';
	var errorMessage = '';
	exif.stdout.on("data", function(data) {
		response += data;
	});

	// Read an error response back and deal with it.
	exif.stderr.on("data", function(data) {
		errorMessage += data.toString();
	});

	exif.on("close", function() {
		if (errorMessage) {
			done(errorMessage);
		} else {
			try {
				var metadata = JSON.parse(response);
				if ('SourceFile' in metadata[0]) {
					if (metadata[0].Error) {
						// if there was an error because unknown file type, delete it
						delete metadata[0].Error;
					}
					// Add a dummy type if needed
					if (!metadata[0].MIMEType) {
						metadata[0].MIMEType = 'text/plain';
					}
					if (!metadata[0].FileType) {
						metadata[0].FileType = 'text/plain';
					}
					done(null, metadata[0]);
				} else {
					// unknown data
					done('EXIF: Error parsing JSON for ' + filename);
				}
			} catch (e) {
				done('EXIF: Error parsing JSON for ' + filename);
			}
		}
	});

	return exif;
}


/**
 * Process a file synchronously
 *   watch for non-escaped filename when using spawn-sync.spawnSync
 *   node v12 is good
 *
 * @method fileSync
 * @param filename {String} name of the file to be tested
 * @return {Object} return object as {err:String, metadata:Object)
 */
function fileSync(filename) {
	var result = spawnSync('exiftool', ['-json', '-m', '-filesize#', '-all', filename]);
	// Note, status code will always equal 0 if using busy waiting fallback
	if (result.statusCode && result.statusCode !== 0) {
		return {err: 'Fatal Error: Unable to load exiftool. ' + result.stderr, metadata: null};
	}
	if (result.stdout.length !== 0) {
		var metadata = JSON.parse(result.stdout);
		return {err: null, metadata: metadata[0]};
	}
	return {err: result.stderr.toString(), metadata: null};
}

/**
 * Process a buffer synchronously
 *
 * @method bufferSync
 * @param source {Buffer} file content to be processed
 * @return {Object} return object as {err:String, metadata:Object)
 */
function bufferSync(source) {
	var result = spawnSync('exiftool',
		['-json', '-m', '-filesize#', '-all', '-'],
		{input: source, encoding: null});

	// Note, status code will always equal 0 if using busy waiting fallback
	if (result.statusCode && result.statusCode !== 0) {
		return {err: 'Fatal Error: Unable to load exiftool. ' + result.stderr, metadata: null};
	}
	var metadata = JSON.parse(result.stdout);
	return {err: null, metadata: metadata[0]};
}

/**
 * Process a buffer
 *
 * @method buffer
 * @param source {Buffer} file content to be processed
 * @param callback {Function} executed when done, done(error, metadata)
 */
function buffer(source, callback) {
	// The dash specifies to read data from stdin
	var exif = ChildProcess.spawn('exiftool', ['-json', '-m', '-filesize#', '-all', '-'], {stdin: 'pipe'});

	// Check for error because of the child process not being found / launched
	exif.on('error', function(err) {
		callback('Fatal Error: Unable to load exiftool. ' + err);
	});

	// Read the binary data back
	var response = '';
	var errorMessage = '';
	exif.stdout.on("data", function(data) {
		response += data;
	});

	// Read an error response back and deal with it.
	exif.stderr.on("data", function(data) {
		errorMessage += data.toString();
	});

	exif.on("close", function() {
		if (errorMessage) {
			callback(errorMessage);
		} else {
			var metadata = JSON.parse(response);
			callback(null, metadata[0]);
		}
	});

	exif.stdin.on('error', function(err) {
		console.log('Error in stdin - IGNORED', err);
	});

	var curr = 0;
	var done = false;
	while (!done) {
		// Give the source binary data to the process
		var status = exif.stdin.write(source.slice(curr, Math.min(curr + 16 * 1024, source.length)));
		curr += 16 * 1024;
		done  = status;
		if (curr >= source.length) {
			done = true;
		}
	}

	exif.stdin.end(function() {
		// nothing
	});

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
