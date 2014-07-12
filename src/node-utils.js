// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var SAGE2_version = require('../package.json').version;
var ChildProcess = require('child_process');
var path   = require('path');
var sprint = require('sprint');

function runCommand(cmd, callb) {
	var dirroot = path.resolve(__dirname, '..');
	var mychild = ChildProcess.exec(cmd, { cwd:  dirroot, timeout: 2000}, function (err, sout, serr) {
		if (err) callb(null);
		else callb(sout.split('\n').join(''));
	});
}

function getShortVersion() {
	return SAGE2_version;
}

function getFullVersion(cb) {
	var fullVersion = getShortVersion();
	runCommand('git rev-parse --abbrev-ref HEAD', function (branch) {
		fullVersion += '-' + branch;
		runCommand('git rev-parse --short HEAD', function (hash) {
			fullVersion += '-' + hash;
			runCommand('git show -s --format=%ci ' + hash, function (adate) {
				var ad = new Date(adate);
				sname = sprint("(%4d/%02d/%02d)", ad.getFullYear(), ad.getMonth()+1, ad.getDate() );
				fullVersion += ' ' + sname;
				cb(fullVersion);
			});
		});
	});
}


exports.getShortVersion = getShortVersion;
exports.getFullVersion  = getFullVersion;
