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

// built-in path module
var path    = require('path');
// load modules from the server's folder
var request = require(path.join(module.parent.exports.dirname, 'request'));  // HTTP client request
var $       = require(path.join(module.parent.exports.dirname, 'cheerio'));  // HTML parsing, jquery style


function processRequest(wsio, data, config) {
	var aURL = data.query.url;
	request(aURL, function(error, response, body) {
		if (!error && response.statusCode == 200) {

			var parsedHTML = $.load(body);
			// query for all elements with class 'strip' and loop over them
			var results = [];

			// 2016 method
			// parsedHTML('.strip').map(function(i, foo) {
			// 	var elt = $(foo);
			// 	results.push(elt.attr('src'));
			// });
			// var bigImage = results.splice(-1)[0];

			// 2017 method
			parsedHTML('.item-comic-image').map(function(i, foo) {
				var elt = $(foo).find('img');
				results.push(elt.attr('src'));
			});
			var bigImage = results.splice(-1)[0];

			request({url: bigImage, encoding: 'base64'}, function(err, resp, img) {
				if (data.broadcast === true) {
					// get the broadcast function from main module
					// send the data to all display nodes
					module.parent.exports.broadcast('broadcast',
						{app: data.app, func: data.func, data: {image: img, url: bigImage, err: null}});
				} else {
					// send data to the master display node
					wsio.emit('broadcast', {app: data.app, func: data.func,
						data: {image: img, url: bigImage, err: null}});
				}
			});
		}
	});

}

module.exports = processRequest;

