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
 * Provides logging ability for the SAGE2 server
 *
 * @class node-logger
 * @module server
 * @submodule node-logger
 * @requires fs, os, path
 */

// require variables to be declared
"use strict";

var fs   = require('fs');     // to read and write files
var os   = require('os');     // to get the hostname
var path = require('path');   // to process filename

/**
 * Class for SAGE2 logging, saving JSON objects
 *
 * @class      SAGE2Logger
 */
class SAGE2Logger {

	/**
	 * Constructs the object
	 *
	 * @method     constructor
	 * @param      {Object}  options: path and name fields are required, append is optional
	 */
	constructor(options) {
		// Parse the options
		// filename for the log file
		this.filename = path.resolve(options.path);
		// A name set in every entry
		this.name  = options.name;
		// Append or overwrite the file (overwrite is default)
		let append = options.append || false;
		// Select the right file flag
		let flags  = append ? "a" : "w";
		// Create the file reading stream
		this.stream = fs.createWriteStream(this.filename, {
			flags:    flags,
			encoding: 'utf8',
			autoClose: true   // close the file automatically
		});
		// Get some info to add to each event
		this.hostname = os.hostname();
		// process ID of the server
		this.pid = process.pid;
		// creation time
		this.startDate = new Date();
		// version
		this.v = 1;
	}

	/**
	 * Log some data with a header and some data
	 *
	 * @method     info
	 * @param      {String}  header  a header added to the output
	 * @param      {Object}  data    The data itself
	 */
	log(header, data) {
		// Default data added to the output
		var defaults = {name: this.name, hostname: this.hostname,
			pid: this.pid, time: (new Date() - this.startDate) / 1000.0, v: this.v
		};
		// Merge the default information and the data
		var message = Object.assign({}, defaults, {header: header, msg: data});
		// Serialize the data and write it
		this.stream.write(JSON.stringify(message) + '\n');
	}

	/**
	 * Load the data from the file and return an array of events
	 *
	 * @method     load
	 * @param      {Function}  cb      Callback to be called with the data
	 */
	load(cb) {
		// An array containing the data to be returned
		var everything = [];
		// Create a line-by-line reader for the log file
		var lineReader = require('readline').createInterface({
			input: fs.createReadStream(this.filename)
		});

		// Get a new line
		lineReader.on('line', function (line) {
			// Parse the data and add it to the array
			everything.push(JSON.parse(line));
		});

		// When the file closes
		lineReader.on('close', function() {
			// Trigger the callback with the data
			cb(everything);
		});
	}

	// other output methods: for now, all the same
	info(header,  data) {
		this.log(header, data);
	}
	trace(header, data) {
		this.log(header, data);
	}
	debug(header, data) {
		this.log(header, data);
	}
	warn(header,  data) {
		this.log(header, data);
	}
	error(header, data) {
		this.log(header, data);
	}
	fatal(header, data) {
		this.log(header, data);
	}

}

// Example
// var mylog = new SAGE2Logger({name: "myapp", path:"t1.log"});
// if (0) {
// 	// create
// 	var count = 0;
// 	setInterval(function () {
// 		mylog.log("hi", {count: count, toto: 42});
// 		console.log('Count', count);
// 		count++;
// 	}, 10);
// } else {
// 	// load
// 	mylog.load(function(data) {
// 		console.log('Got it', data.length)
// 		console.log(data)
// 	})
// }

module.exports = SAGE2Logger;
