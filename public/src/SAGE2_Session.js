// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

/* global md5 */

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
 * When the page loads, go!
 *
 */
window.addEventListener('load', function(event) {
	SAGE2_init();
});


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
	var mouse	= getParameterByName("mouse");

	// Is there a session value
	if (session !== "") {
		document.getElementById('sessionValue').value = session;
		foundPassword = true;
		sessionParam  = session;
	}
	// Is there a page value
	if (page !== "") {
		if(mouse)
			page += '&mouse=' + mouse;
		pageRedirect = page;
	}
	// Is there a hash value
	if (hash !== "") {
		hashParam = hash;
		foundHash = true;
	}

	// If no page specified, go the UI
	if (pageRedirect == null) {
		pageRedirect = "index.html";
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

function processAndRedirect(session, relocation, hash) {
	if (hash == null) {
		hash = md5(session);
	}

	// Adding the cookie to the HTTP header
	// (SAGE2 runtime function)
	addCookie('session', hash);

	// redirect to the asked page
	window.location.href = relocation;
}

function buttonSubmit() {
	processAndRedirect(document.getElementById('sessionValue').value, pageRedirect, null);
}
