
"use strict";


var fs     = require('fs');                  // filesystem access



/**
 * Test if file is exists and readable
 *
 * @method fileExists
 * @param filename {String} name of the file to be tested
 * @return {Bool} true if readable
 */
function fileExists(filename) {
	if (process.version.indexOf('0.10.') > 0 || process.version.indexOf('0.11.') > 0 ) {
		return fs.existsSync(filename);
	} else {
		// Versions 1.x or above
		try {
			fs.accessSync(filename, fs.R_OK);
			return true;
		} catch (err) {
			return false;
		}
	}
}


exports.fileExists = fileExists;






