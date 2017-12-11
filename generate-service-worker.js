// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

/**
 * Generate a pre-caching service worker
 *
 * @class generate-service-worker
 * @module server
 * @submodule generate-service-worker.js`
 * @requires sw-precache
 */

"use strict";

var path = require('path');
var swPrecache = require('sw-precache');

var rootDir = 'public';

function generate() {
	swPrecache.write(path.join(rootDir, 'service-worker.js'), {
		cacheId: "SAGE2",
		handleFetch: true,
		logger: function() {},
		verbose: false,
		staticFileGlobs: [
			rootDir + '/favicon.ico',
			rootDir + '/css/*.css',
			rootDir + '/css/Arimo*.woff',
			rootDir + '/css/Arimo*.woff2',
			rootDir + '/images/blank.png',
			rootDir + '/images/*.svg',
			rootDir + '/images/ui/*.svg',
			rootDir + '/images/radialMenu/*.svg',
			rootDir + '/images/appUi/*.svg',
			rootDir + '/images/icons/*.png',
			// HTML pages
			rootDir + 'audioManager.html',
			rootDir + 'index.html',
			rootDir + 'display.html',
			rootDir + 'sageUI.html',
			// not caching session.html
			rootDir + '/lib/webix/webix.js',
			rootDir + '/lib/webix/webix.css',
			rootDir + '/lib/webix/skins/compact.css',
			rootDir + '/lib/moment.min.js',
			rootDir + '/src/*.js'
		],
		stripPrefix: rootDir
	}, function() {
		// console.log('ServiceWorker>	Cache generated');
	});
}

module.exports = generate;

