// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

/**
 * SAGE2 Session page code
 *
 * @module client
 * @submodule SAGE2_Session
 * @class SAGE2_Session
 */


/**
 * Entry point of the application
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	document.getElementById('sessionValue').addEventListener('keydown', keyDownDKHandler,    false);
	document.getElementById('sessionValue').focus();

	var nameAndValue;
	var i;
	var allParams     = window.location.search.substring(1);
	var paramArray    = allParams.split("&");
	var foundPassword = false;
	var foundHash     = false;
	var pageRedirect  = null;
	var sessionParam  = null;
	var hashParam     = null;

	for (i=0; i<paramArray.length; i++) {
		nameAndValue = paramArray[i].split("=");
		if (typeof nameAndValue[0] === "string" && nameAndValue[0] === "session" ) {
			document.getElementById('sessionValue').value = nameAndValue[1];
			foundPassword = true;
			sessionParam  = nameAndValue[1];
		}
		if (typeof nameAndValue[0] === "string" && nameAndValue[0] === "page" ) {
			pageRedirect = nameAndValue[1] + "=" + nameAndValue[2];
		}
		if (typeof nameAndValue[0] === "string" && nameAndValue[0] === "hash" ) {
			hashParam = nameAndValue[1];
			foundHash = true;
		}
	}
	if (pageRedirect == null) {
		pageRedirect = "index.html";
	}
	if (foundPassword || foundHash ) {
		processAndRedirect(sessionParam, pageRedirect,  hashParam);
	}
}


function keyDownDKHandler(event) {
	if (event.target === document.getElementById('sessionValue') &&
		(event.keyCode === 13 || event.which === 13)) {
		processAndRedirect(document.getElementById('sessionValue').value, "index.html", null);
	}
}

function processAndRedirect(session, location, hash) {
	if (hash == null) {
		hash = md5(session);
	}
	document.cookie      = "session=" + hash;
	window.location.href = location;
}

function buttonSubmit() {
	processAndRedirect(document.getElementById('sessionValue').value, "index.html", null);
}
