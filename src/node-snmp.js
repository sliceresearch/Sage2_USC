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
var snmp = require('net-snmp');
function snmpManager () {
	this.session = null;
}

function convertToString(varbind) {
	for (var i in varbind) {
		if (varbind.hasOwnProperty(i)) {
			if (varbind[i] instanceof Buffer) {
				varbind[i] = varbind[i].toString('utf8');
			}
		}
	}
	return varbind;
}

snmpManager.prototype.process = function(request, requestNumber, appId, data, callback) {
	switch (request) {
		case "createSession":
			data.host = data.host || "localhost";
			data.community = data.community || "public";

			/*var options = {
			    port: 161,
			    retries: 1,
			    timeout: 5000,
			    transport: "udp4",
			    trapPort: 162,
			    version: snmp.Version2c
			};*/

			// TO DO: Create session per app
			try {
				this.session = snmp.createSession(data.host, data.community);
				callback({request: request, appId: appId, requestNumber: requestNumber, error: null, data: "session created"});
			} catch (e) {
				callback({request: request, requestNumber: requestNumber, appId: appId, error: e, data: null});
			}
			break;

		case "get":
			this.session.get(data, function(error, varbinds) {
				if (error) {
					callback({request: request, requestNumber: requestNumber, appId: appId, error: error, data: null});
				} else {
					for (var i = 0; i < varbinds.length; i++) {
						var temp = snmp.isVarbindError(varbinds[i]);
						if (temp) {
							varbinds[i] = temp;
						}
						//varbinds[i] = convertToString(varbinds[i]);
					}
					callback({request: request, requestNumber: requestNumber, appId: appId, error: null, data: varbinds});
				}
			});
			break;
		case "getTable":
			if (data instanceof Array) {
				data = data[0];
			}
			this.session.table(data, function(error, varbinds) {
				if (error) {
					callback({request: request, requestNumber: requestNumber, appId: appId, error: error, data: null});
				} else {
					for (var i in varbinds) {
						if (varbinds.hasOwnProperty(i)) {
							var temp = snmp.isVarbindError(varbinds[i]);
							if (temp) {
								varbinds[i] = temp;
							}
							//console.log("Name:" varbinds[1][2].data
							varbinds[i] = convertToString(varbinds[i]);
						}
					}
					callback({request: request, requestNumber: requestNumber, appId: appId, error: null, data: varbinds});
				}
			});
			break;
		case "getTableColumns":
			if (data instanceof Array) {
				data = data[0];
			}
			this.session.tableColumns(data.oid, data.columns, function(error, varbinds) {
				if (error) {
					callback({request: request, requestNumber: requestNumber, appId: appId, error: error, data: null});
				} else {
					for (var i in varbinds) {
						if (varbinds.hasOwnProperty(i)) {
							var temp = snmp.isVarbindError(varbinds[i]);
							if (temp) {
								varbinds[i] = temp;
							}
							//console.log("Name:" varbinds[1][2].data
							varbinds[i] = convertToString(varbinds[i]);
						}
					}
					callback({request: request, requestNumber: requestNumber, appId: appId, error: null, data: varbinds});
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
