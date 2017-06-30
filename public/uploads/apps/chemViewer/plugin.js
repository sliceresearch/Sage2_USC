// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

"use strict";

// built-in path module
var path    = require('path');
// load modules from the server's folder
var request = require(path.join(module.parent.exports.dirname, 'request'));  // HTTP client request


function processRequest(wsio, data, config) {
	var aURL = data.query.url;
	var molName = data.query.name;

	request({url: aURL}, function(err, resp, mol) {
		if (data.broadcast === true) {
			var errorMsg = null;
			if (mol.startsWith("HEADER")) {
				console.log("PDB>		valid PDB file found", molName);
			} else if (mol.startsWith("<!")) {
				console.log("PDB>		PDB file not found", molName);
				errorMsg = "Molecule not found";
			} else if (mol.match(/.+/)) {
				console.log("MOL>		MOL file found", molName);
			} else {
				console.log("MOL>		MOL file not found", molName);
				errorMsg = "Molecule not found";
			}

			// get the broadcast function from main module
			// send the data to all display nodes
			module.parent.exports.broadcast('broadcast', {
				app: data.app, func: data.func, data: {
					data: mol, name: molName, err: errorMsg}
			});
		} else {
			// send data to the master display node
			wsio.emit('broadcast', {app: data.app, func: data.func,
				data: {data: mol, name: molName, err: errorMsg}});
		}
	});
}

module.exports = processRequest;

