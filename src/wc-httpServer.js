


'use strict';

var url 	= require('url');
var fs 		= require('fs');
var mime 	= require('mime');

var utils 	= require('../src/wc-utils');    // provides utility functions

/**
 * SAGE HTTP request handlers for GET and POST
 *
 * @class HttpServer
 * @constructor
 * @param publicDirectory {String} folder to expose to the server
 */
function HttpServer(publicDirectory, debug) {
	this.publicDirectory = publicDirectory;
	this.getFuncs  = {};
	this.postFuncs = {};
	this.onrequest = this.onreq.bind(this);
	if(debug != null) { this.debug = debug }
	else { this.debug = true; }
}

/**
 * Handle general http requests.
 *
 * @method generalHandler
 * @param req {Object} request
 * @param res {Object} response
 */
HttpServer.prototype.onreq = function(req, res) {

	//global.printTimeCounter(req);

	if (req.method === "GET") {
		var reqURL = url.parse(req.url);
		var getName = decodeURIComponent(reqURL.pathname);

		//if(this.debug) { console.log("Request for:" + getName); }

		// redirect root path to index.html
		if (getName === "/") {
			this.redirect(res, "webcon.html");
			return;
		}

		var requestPath = this.publicDirectory + getName;
		//if(this.debug) { console.log("full request path:" + requestPath); }
		var stats = null;
		try{
			stats = fs.lstatSync(requestPath);
		} catch(e) {
			console.log('Error handling a web request:' + e);
		}
		if(stats != null) {

			//get cookies and see if it matches the webcon password
			var cookieList = detectCookies(req);
			var webconMatch = false;
			var wcApMatch = false;
			for (var i = 0; i < cookieList.length; i++) {
				if (cookieList[i].indexOf("webcon=") !== -1) {
					// We found it
					if (cookieList[i].indexOf(global.webconID) !== -1) {
						webconMatch = true;
					}
				}
				if (cookieList[i].indexOf("wcApLogin=") !== -1) {
					// We found it
					if (cookieList[i].indexOf(global.adminPanelId) !== -1) {
						wcApMatch = true;
					}
				}
			}
			if(global.webconID === -1) { console.log('http - Warning webconID hasnt been setup'); }
			if(global.adminPanelId === -1) { console.log('http - Warning adminPanelId hasnt been setup'); wcApMatch = true; }

			
			if( stats.isDirectory() ) {//force the page to webcon.html if a directory
				console.log('http - preventing folder access, redirecting to webcon');
				this.redirect(res, "webcon.html");
				return;
			}
			//if requesting a webpage that is not webcon or login force to webcon.html
			else if(
				requestPath.indexOf('htm') >= 0
				&& requestPath.indexOf('webcon') < 0
				&& requestPath.indexOf('wcAdminPanel') < 0
				&& requestPath.indexOf('Login') < 0
				) {
				console.log('http - preventing access to:' + requestPath + ', redirecting to webcon');
				this.redirect(res, "webcon.html");
				return;
			}
			//if bad credential and requesting a webpage that is not login
			else if(!webconMatch && requestPath.indexOf('webcon') > 0 ) {
				console.log('http - credential mismatch, redirecting to login');
				this.redirect(res, "wcLogin.html");
			}
			else if(!wcApMatch && requestPath.indexOf('wcAdminPanel') > 0 ) {
				console.log('http - credential mismatch, redirecting to login');
				this.redirect(res, "wcApLogin.html");
			}
			else {

				var header = {};
				header["Content-Type"] = mime.lookup(requestPath);
				header["Access-Control-Allow-Headers" ] = "Range";
				header["Access-Control-Expose-Headers"] = "Accept-Ranges, Content-Encoding, Content-Length, Content-Range";

				if (req.headers.origin !== undefined) {
					header['Access-Control-Allow-Origin' ]     = req.headers.origin;
					header['Access-Control-Allow-Methods']     = "GET";
					header['Access-Control-Allow-Headers']     = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
					header['Access-Control-Allow-Credentials'] = true;
				}

				var total = stats.size;
				var stream;
				if (typeof req.headers.range !== 'undefined') {
					var range = req.headers.range;
					var parts = range.replace(/bytes=/, "").split("-");
					var partialstart = parts[0];
					var partialend   = parts[1];

					var start = parseInt(partialstart, 10);
					var end = partialend ? parseInt(partialend, 10) : total-1;
					var chunksize = (end-start)+1;

					header["Content-Range"]  = "bytes " + start + "-" + end + "/" + total;
					header["Accept-Ranges"]  = "bytes";
					header["Content-Length"] = chunksize;

					res.writeHead(206, header);

					stream = fs.createReadStream(requestPath, {start: start, end: end});
					stream.pipe(res);
				}
				else {
					header["Content-Length"] = total;
					res.writeHead(200, header);
					stream = fs.createReadStream(requestPath);
					stream.pipe(res);
				}
			} //end else must be a directory
		} //end if has stats
		else {
			// File not found: 404 HTTP error, with link to index page
			res.writeHead(404, {"Content-Type": "text/html"});
			res.write("<h1>Page path not found</h1>\n\n");
			res.end();
			return;
		}
	}//end if req.method == get
	else {
		// File not found: 404 HTTP error, with link to index page
		res.writeHead(404, {"Content-Type": "text/html"});
		res.write("<h1>Not a get request</h1>\n\n");
		res.end();
		return;
	}

}


/**
 * Handle a HTTP redirect
 *
 * @method redirect
 * @param res {Object} response
 * @param aurl {String} destination URL
 */
HttpServer.prototype.redirect = function(res, aurl) {
	// 302 HTTP code for redirect
	res.writeHead(302, {'Location': aurl});
	res.end();
};


/**
 * Given a request, will attempt to detect all associated cookies.
 *
 * @method detectCookies
 * @param request {Object} the request that came from a client
 * @return {Object} containing the list of cookies in string format
 */
function detectCookies(request) {
	var cookieList = [];
	var allCookies = request.headers.cookie;

	var i = 0;
	if (allCookies != null) {
		while (allCookies.indexOf(';') !== -1) {
			cookieList.push(allCookies.substring(0, allCookies.indexOf(';')));
			cookieList[i] = cookieList[i].trim();
			allCookies    = allCookies.substring(allCookies.indexOf(';') + 1);
			i++;
		} // end while there is a ;
		cookieList.push(allCookies.trim());
	}
	return cookieList;
}


module.exports = HttpServer;


