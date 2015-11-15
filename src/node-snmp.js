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
 * Implements sticky notes for SAGE2
 *
 * @module server
 * @submodule stickyitems
 */

// require variables to be declared
"use strict";

/**
 * Implements sticky notes for SAGE2
 *
 * @class StickyItems
 * @constructor
 * @return {Object} an object representing....
 */
var snmp = require('snmp-native');

function snmpManager (){
	this.session = null;
}

snmpManager.prototype.process = function(request, appId, data, callback){
	switch(request){
		case "createSession":
			data.host = data.host || "localhost";
			data.community = data.community || "public";
			var options = {
			    timeouts: [600000, 600000, 600000, 600000],
			    host: data.host, 
			    port: 161, 
			    community: data.community
			};

			// TO DO: Create session per app
			try{
				this.session = new snmp.Session(options);
				callback({request:request, appId: appId, error: null, data:"session created"});	
			}
			catch(e){
				callback({request:request, appId: appId, error:e, data:null});	
			}
			
			break;

		case "get":
			this.session.get({oid:data}, function(error, varbinds){
				if (error) {
			       	callback({request:request, appId: appId, error:error, data:null});
			    } else {
			        callback({request:request, appId: appId, error:null, data:varbinds});
			    }
			});
			break;

		case "closeSession":
			this.session.close();
			break;
		default:
			console.log("snmpManager does not support request:" + request);
			break;
	}

};

module.exports = snmpManager;