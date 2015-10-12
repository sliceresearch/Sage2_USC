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

var api = {
	consumerKey: "fuyVLmYL4QMG8dhg4UDxiGYKK",
	consumerSecret: "XPf8AxHF6l3VjNqJzWpIiy4t1B1nEun8kWbXdXHfMKhhNUK7ox",
	accessToken: "213878544-eLXXES5ufR2XU2jI7SDAVnd4tgAwr5MqpE9S5gLZ",
	accessSecret: "pjTo8R9ncGKVIqGOqX17nUAQNHLw2CWaWwP78MtT0Tv8x"
};

function processRequest(wsio, data, config) {
	if (twitter === undefined) {
		// twitter api
		var Twit = require('twit');
		console.log(sageutils.header('RPC') + 'building twitter object');
		twitter = new Twit({
			consumer_key:         api.consumerKey,
			consumer_secret:      api.consumerSecret,
			access_token:         api.accessToken,
			access_token_secret:  api.accessSecret
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
