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

var fs        = require('fs');             // file system
var path      = require('path');           // resolves directory paths
var commander = require('commander');      // parsing command-line arguments
var util      = require('util');           // node util


function initializeCommandLineParameters(version, printFunction) {
	commander
		.version(version)
		.option('-i, --no-interactive',       'Non interactive prompt')
		.option('-f, --configuration <file>', 'Specify a configuration file')
		.option('-l, --logfile [file]',       'Specify a log file')
		.option('-q, --no-output',            'Quiet, no output')
		.option('-s, --session [name]',       'Load a session file (last session if omitted)')
		.option('-t, --track-users [file]',   'enable user interaction tracking (specified file indicates users to track)')
		.parse(process.argv);

	// Logging mechanism
	if (commander.logfile) {
		var logname    = (commander.logfile === true) ? 'sage2.log' : commander.logfile;
		var log_file   = fs.createWriteStream(path.resolve(logname), {flags: 'w+'});
		var log_stdout = process.stdout;
		var aLine, args;

		// Redirect console.log to a file and still produces an output or not
		if (commander.output === false) {
			commander.interactive = undefined;
			console.log = function(d) {
				aLine = util.format(d) + '\n';
				log_file.write(aLine);
				printFunction(aLine);
			};
		} else {
			console.log = function() {
				args = Array.prototype.slice.call(arguments);
				if ( args.length === 1 && typeof args[0] === 'string') {
					aLine = args.toString() + '\n';
					log_stdout.write(aLine);
					printFunction(aLine);
				}
				else {
					var i = 0;
					var s = "";
					args = [util.format.apply(util.format, Array.prototype.slice.call(arguments))];
					while (i < args.length) {
						if (i === 0)
							s = args[i];
						else
							s += " " + args[i];
						i++;
					}
					aLine = s + '\n';
					log_stdout.write(aLine);
					log_file.write(aLine);
					printFunction(aLine);
				}
			};
		}
	}
	else if (commander.output === false) {
		commander.interactive = undefined;
		console.log = function() {
			// disable print
		};
	}

	return commander;
}

module.exports.initializeCommandLineParameters = initializeCommandLineParameters;
