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
 * Provides utility functions for the SAGE2 server
 *
 * @class node-utils
 * @module node-utils
 * @requires package.json, child_process, path
 */

var SAGE2_version = require('../package.json').version;
var exec   = require('child_process').exec;
var path   = require('path');


/**
 * Base version comes from evaluating the package.json file
 *
 * @method getShortVersion
 * @return {String} version number as x.x.x
 */
function getShortVersion() {
	return SAGE2_version;
}

/**
 * Full version is processed from git information
 *
 * @method getFullVersion
 * @param callback {Function} function to be run when finished, parameter is an object containing base, branch, commit and date fields
 */
function getFullVersion(callback) {
	var fullVersion  = {base: "", branch: "", commit: "", date: ""};
	// get the base version from package.json file
	fullVersion.base = getShortVersion();

	// get to the root folder of the sources
	var dirroot = path.resolve(__dirname, '..');
	var cmd1 = "git rev-parse --abbrev-ref HEAD";
	exec(cmd1, { cwd: dirroot, timeout: 3000}, function(err, stdout, stderr) {
		if(err) { callback(fullVersion); return; }
		
		var branch = stdout.substring(0, stdout.length-1);
		var cmd2 = "git log --date=\"short\" --format=\"%h|%ad\" -n 1";
		exec(cmd2, { cwd: dirroot, timeout: 3000}, function(err, stdout, stderr) {
			if(err) { callback(fullVersion); return; }
		
			// parsing the results
			var result = stdout.replace(/\r?\n|\r/g, "");
			var parse = result.split("|");
		
			// filling up the object
			fullVersion.branch = branch; //branch.substring(1, branch.length-1);
			fullVersion.commit = parse[0];
			fullVersion.date   = parse[1].replace(/-/g, "/");
		
			// return the object in the callback paramter
			callback(fullVersion);
		});
	});
}

/**
 * Utility function to compare two strings independently of case.
 * Used for sorting
 *
 * @method compareString
 * @param a {String} first string
 * @param b {String} second string
 */
function compareString(a, b) {
	var nA = a.toLowerCase();
	var nB = b.toLowerCase();
	if (nA < nB) return -1;
	else if(nA > nB) return 1;
	return 0;
}

/**
 * Utility function to compare two objects based on filename independently of case.
 * Needs a .exif.FileName field
 * Used for sorting
 *
 * @method compareFilename
 * @param a {Object} first object
 * @param b {Object} second object
 */
function compareFilename(a, b) {
	var nA = a.exif.FileName.toLowerCase();
	var nB = b.exif.FileName.toLowerCase();
	if (nA < nB) return -1;
	else if(nA > nB) return 1;
	return 0;
}

/**
 * Utility function to compare two objects based on title independently of case.
 * Needs a .exif.metadata.title field
 * Used for sorting
 *
 * @method compareTitle
 * @param a {Object} first object
 * @param b {Object} second object
 */
function compareTitle(a, b) {
	var nA = a.exif.metadata.title.toLowerCase();
	var nB = b.exif.metadata.title.toLowerCase();
	if (nA < nB) return -1;
	else if(nA > nB) return 1;
	return 0;
}

exports.getShortVersion = getShortVersion;
exports.getFullVersion  = getFullVersion;

exports.compareString   = compareString;
exports.compareFilename = compareFilename;
exports.compareTitle    = compareTitle;
