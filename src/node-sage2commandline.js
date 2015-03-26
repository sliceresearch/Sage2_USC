"use strict";

var fs        = require('fs');             // file system
var path      = require('path');           // resolves directory paths
var program   = require('commander');      // parsing command-line arguments
var util      = require('util');           // node util


function initializeCommandLineParameters(version, printFunction) {
	program
		.version(version)
		.option('-i, --no-interactive',       'Non interactive prompt')
		.option('-f, --configuration <file>', 'Specify a configuration file')
		.option('-l, --logfile [file]',       'Specify a log file')
		.option('-q, --no-output',            'Quiet, no output')
		.option('-s, --session [name]',       'Load a session file (last session if omitted)')
		.option('-t, --track-users [file]',   'enable user interaction tracking (specified file indicates users to track)')
		.parse(process.argv);

	// Logging mechanism
	if (program.logfile) {
		var logname    = (program.logfile === true) ? 'sage2.log' : program.logfile;
		var log_file   = fs.createWriteStream(path.resolve(logname), {flags: 'w+'});
		var log_stdout = process.stdout;
		var aLine, args;

		// Redirect console.log to a file and still produces an output or not
		if (program.output === false) {
			console.log = function(d) {
				aLine = util.format(d) + '\n';
				log_file.write(aLine);
				printFunction('console', aLine, 'receivesConsoleMessages');
				program.interactive = undefined;
			};
		} else {
			console.log = function() {
				args = Array.prototype.slice.call(arguments);
				if ( args.length === 1 && typeof args[0] === 'string') {
					aLine = args.toString() + '\n';
					log_stdout.write(aLine);
					printFunction('console', aLine, 'receivesConsoleMessages');
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
					printFunction('console', aLine, 'receivesConsoleMessages');
				}
			};
		}
	}
	else if (program.output === false) {
		program.interactive = undefined;
		console.log = function() {
			// disable print
		};
	}

	return program;
}

module.exports.initializeCommandLineParameters = initializeCommandLineParameters;
