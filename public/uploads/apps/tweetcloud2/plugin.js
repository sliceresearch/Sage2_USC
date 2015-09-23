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

var sageutils = require('../../../../src/node-utils');            // provides the current version number

var twitter;

function processRequest(wsio, data, config) {
		if (config.apis !== undefined &&
				config.apis.twitter !== undefined &&
				twitter === undefined) {
			// twitter api
			var Twit = require('twit');
			console.log(sageutils.header('RPC') + 'building twitter object');
			twitter = new Twit({
				consumer_key:         config.apis.twitter.consumerKey,
				consumer_secret:      config.apis.twitter.consumerSecret,
				access_token:         config.apis.twitter.accessToken,
				access_token_secret:  config.apis.twitter.accessSecret
			});
		}

		if (twitter === null) {
			if (data.broadcast === true) {
				broadcast('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: null,
					err: {message: "Twitter API not enabled in SAGE2 configuration"}}});
			} else {
				wsio.emit('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: null,
					err: {message: "Twitter API not enabled in SAGE2 configuration"}}});
			}
			return;
		}

		console.log(sageutils.header('RPC') + 'searchTweets');

		twitter.get('search/tweets', data.query, function(err, info, response) {
			if (data.broadcast === true) {
				broadcast('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: info, err: err}});
			} else {
				wsio.emit('broadcast', {app: data.app, func: data.func, data: {query: data.query, result: info, err: err}});
			}
		});
}

module.exports = processRequest;
