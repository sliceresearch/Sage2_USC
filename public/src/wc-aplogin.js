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

/**
 * SAGE2 Session page code
 *
 * @module client
 * @submodule SAGE2_Session
 * @class SAGE2_Session
 */


var pageRedirect  = null;

/**
 * Entry point of the application
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// Set callback on the text box
	document.getElementById('sessionValue').addEventListener('keydown', keyDownDKHandler, false);
	// Put focus in the box
	document.getElementById('sessionValue').focus();

	var foundPassword = false;
	var foundHash     = false;
	var sessionParam  = null;
	var hashParam     = null;

	// Decode the URL into parameters
	//    (getParameterByName function in SAGE2_runtime)
	var session = getParameterByName("session");
	var page    = getParameterByName("page");
	var hash    = getParameterByName("hash");

	// Is there a session value
	if (session !== "") {
		document.getElementById('sessionValue').value = session;
		foundPassword = true;
		sessionParam  = session;
	}
	// Is there a page value
	if (page !== "") {
		pageRedirect = page;
	}
	// Is there a hash value
	if (hash !== "") {
		hashParam = hash;
		foundHash = true;
	}

	// If no page specified, go the UI
	if (pageRedirect == null) {
		pageRedirect = "wcAdminPanel.html";
	}

	// If everything good, redirect
	if (foundPassword || foundHash) {
		processAndRedirect(sessionParam, pageRedirect,  hashParam);
	}
}


function keyDownDKHandler(event) {
	if (event.target === document.getElementById('sessionValue') &&
		(event.keyCode === 13 || event.which === 13)) {
		processAndRedirect(document.getElementById('sessionValue').value, pageRedirect, null);
	}
}

function processAndRedirect(session, location, hash) {
	if (hash == null) {
		hash = md5(session);
	}
	document.cookie      = "wcApLogin=" + hash;
	window.location.href = location;
}

function buttonSubmit() {
	processAndRedirect(document.getElementById('sessionValue').value, pageRedirect, null);
}


/**
 * Extract the parameter value from the current URL (?clientID=0&param=4)
 *
 * @method getParameterByName
 * @param name {String} parameter to search for
 * @return {String} null or the value found
 */
function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]"); // jshint ignore:line
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
	var results = regex.exec(location.search);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
