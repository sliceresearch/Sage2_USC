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
var exec   = require('child_process').exec;
var path   = require('path');
var sprint = require('sprint');

function getShortVersion() {
	return SAGE2_version;
}

function getFullVersion(callback) {
	var fullVersion = {base: "", branch: "", commit: "", date: ""};
	fullVersion.base = getShortVersion();
	
	var dirroot = path.resolve(__dirname, '..');
	var cmd = "git log --date=\"short\" --format=\"%d|%h|%ad\" -n 1";
	exec(cmd, { cwd:  dirroot, timeout: 2000}, function(err, stdout, stderr) {
		if(err) callback(null);
		
		var result = stdout.replace(/\r?\n|\r/g, "");
		var parse = result.split("|");
		var branchList = parse[0].split(",");
		var branch = branchList[branchList.length-1];
		
		fullVersion.branch = branch.substring(1, branch.length-1);
		fullVersion.commit = parse[1];
		fullVersion.date = parse[2].replace(/-/g, "/");
		
		callback(fullVersion);
	});
}


exports.getShortVersion = getShortVersion;
exports.getFullVersion  = getFullVersion;
