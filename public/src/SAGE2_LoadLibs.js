// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-16

/**
 * Library loader allowing for versioning of libraries used by applications
 *
 * @module client
 * @submodule SAGE2_runtime
 * @class SAGE2_runtime
 */

/* global require */

let d3; // global d3 of version 3 because old apps and stuff want it

// declare global SAGE2 library loader
var SAGE2_LibLoader = {};

(function() {
	// libraries local to this script
	let lib = {};

	// export a library into a local app variable
	SAGE2_LibLoader.import = function(library, version) {
		// check for library parameter and that lib contains this library
		if (library && lib[library]) {
			// check for version param and that library contains this version
			if (version && lib[library][version]) {
				return lib[library][version];
			} else {
				// if no version parameter, return latest version
				return lib[library].latest;
			}
		}
		// otherwise return null
		return null;
	};

	// get all versions of a specified libraru
	SAGE2_LibLoader.versions = function(library) {
		if (library && lib[library]) {
			// check for version param and that library contains this version
			return Object.keys(lib[library]);
		}
		// otherwise return null
		return null;
	};

	require.config({
		baseUrl: "lib",
		paths: {
			d3v3: "d3.v3.min",
			d3v4: "d3.v4.min"
		}
	});

	require(["d3v3", "d3v4"], function (d3v3, d3v4) {

		lib.d3 = {};

		lib.d3.v3 = d3v3;
		lib.d3.v4 = d3v4;
		lib.d3.latest = d3v4;

		d3 = lib.d3.v4;

		console.log("d3.v3 & d3.v4 loaded");

		window.define = null;
	});

}());


