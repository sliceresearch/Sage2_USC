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
 * SAGE2 HTTP handlers
 *
 * @module server
 * @submodule httpserver
 * @requires node-utils
 */

// require variables to be declared
"use strict";

var fs   = require('fs');
var path = require('path');
var url  = require('url');
var mime = require('mime');
var zlib = require('zlib');  // to enable HTTP compression

var sageutils = require('../src/node-utils');    // provides utility functions

/**
 * SAGE HTTP request handlers for GET and POST
 *
 * @class HttpServer
 * @constructor
 * @param publicDirectory {String} folder to expose to the server
 */
function HttpServer(publicDirectory) {
	this.publicDirectory = publicDirectory;
	this.getFuncs  = {};
	this.postFuncs = {};
	this.onrequest = this.onreq.bind(this);

	// Update the cache file
	var fileCache = path.join(publicDirectory, "sage2.appcache");
	fs.readFile(fileCache, 'utf8', function(err, data) {
		if (err) { console.log('Error reading', fileCache); return; }
		// Change the date in comment, force to flush the cache
		var result = data.replace(/# SAGE@start .*/, "# SAGE@start " + Date());
		// write the resulting content
		fs.writeFileSync(fileCache, result, 'utf8');
	});
}


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

/**
 * Handle a HTTP redirect
 *
 * @method redirect
 * @param res {Object} response
 * @param aurl {String} destination URL
 */
HttpServer.prototype.redirect = function(res, aurl) {
	// 302 HTTP code for redirect
	res.writeHead(302, {Location: aurl});
	res.end();
};

/**
 * Main router and trigger the GET and POST handlers
 *
 * @method onreq
 * @param req {Object} request
 * @param res {Object} response
 */
HttpServer.prototype.onreq = function(req, res) {
	var stream;
	var i;

	if (req.method === "GET") {
		var reqURL  = url.parse(req.url);
		var getName = decodeURIComponent(reqURL.pathname);
		if (getName in this.getFuncs) {
			this.getFuncs[getName](req, res);
			return;
		}

		// redirect root path to index.html
		if (getName === "/") {
			this.redirect(res, "index.html");
			return;
		}

		// Get the actual path of the file
		var pathname;

		// //////////////////////
		// Routes
		// //////////////////////

		// API call: /config
		if (getName.indexOf('/config/') === 0) {
			// if trying to access config files, add the correct path
			pathname = path.join(this.publicDirectory, '..', getName);
		} else if (getName.lastIndexOf('/images/', 0) === 0 ||
				getName.lastIndexOf('/shaders/', 0) === 0 ||
				getName.lastIndexOf('/css/', 0) === 0 ||
				getName.lastIndexOf('/lib/', 0) === 0 ||
				getName.lastIndexOf('/src/', 0) === 0) {
			// Sources folders: bypass the search
			pathname = path.join(this.publicDirectory, getName);
		} else {
			// Then search in the various media folders
			// pathname: result of the search
			pathname = null;
			// walk through the list of folders
			for (var f in global.mediaFolders) {
				// Get the folder object
				var folder = global.mediaFolders[f];
				// Look for the folder url in the request
				var pubdir = getName.split(folder.url);
				if (pubdir.length === 2) {
					// convert the URL into a path
					var suburl = path.join('.', pubdir[1]);
					pathname   = url.resolve(folder.path, suburl);
					pathname   = decodeURIComponent(pathname);
					break;
				}
			}
			// if everything fails, look in the default public folder
			if (!pathname) {
				pathname = path.join(this.publicDirectory, getName);
			}
		}

		// //////////////////////
		// Are we trying to session management
		// //////////////////////
		if (global.__SESSION_ID) {
			// if the request is for an HTML page (no security check otherwise)
			//    and it is not session.html
			if (path.extname(pathname) === ".html" &&
				(getName.indexOf("/session.html") !== 0)) {
				// Get the cookies from the request header
				var cookieList = detectCookies(req);
				// Go through the list of cookies
				var sessionMatch = false;
				for (i = 0; i < cookieList.length; i++) {
					if (cookieList[i].indexOf("session=") !== -1) {
						// We found it
						if (cookieList[i].indexOf(global.__SESSION_ID) !== -1) {
							sessionMatch = true;
						}
					}
				}
				// If no match, go back to password page
				if (!sessionMatch) {
					this.redirect(res, "session.html?page=" + req.url.substring(1));
				}
			}
		}

		// redirect a folder path to its containing index.html
		if (sageutils.fileExists(pathname)) {
			var stats = fs.lstatSync(pathname);
			if (stats.isDirectory()) {
				this.redirect(res, getName + "/index.html");
				return;
			} else {
				var header = {};
				header["Content-Type"] = mime.lookup(pathname);
				header["Access-Control-Allow-Headers" ] = "Range";
				header["Access-Control-Expose-Headers"] = "Accept-Ranges, Content-Encoding, Content-Length, Content-Range";

				if (req.headers.origin !== undefined) {
					header['Access-Control-Allow-Origin' ]     = req.headers.origin;
					header['Access-Control-Allow-Methods']     = "GET";
					header['Access-Control-Allow-Headers']     = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
					header['Access-Control-Allow-Credentials'] = true;
				}

				// Useful Cache-Control response headers include:
				// max-age=[seconds] — specifies the maximum amount of time that a representation will be considered fresh.
				// s-maxage=[seconds] — similar to max-age, except that it only applies to shared (e.g., proxy) caches.
				// public — marks authenticated responses as cacheable;
				// private — allows caches that are specific to one user (e.g., in a browser) to store the response
				// no-cache — forces caches to submit the request to the origin server for validation before releasing
				//  a cached copy, every time.
				// no-store — instructs caches not to keep a copy of the representation under any conditions.
				// must-revalidate — tells caches that they must obey any freshness information you give them about a representation.
				// proxy-revalidate — similar to must-revalidate, except that it only applies to proxy caches.
				//
				// For example:
				// Cache-Control: max-age=3600, must-revalidate
				//
				// header["Cache-Control"] = "no-cache";

				// Get the file size from the 'stat' system call
				var total = stats.size;
				if (typeof req.headers.range !== 'undefined') {
					// Parse the range request from the HTTP header
					var range = req.headers.range;
					var parts = range.replace(/bytes=/, "").split("-");
					var partialstart = parts[0];
					var partialend   = parts[1];

					var start = parseInt(partialstart, 10);
					var end = partialend ? parseInt(partialend, 10) : total - 1;
					var chunksize = (end - start) + 1;

					// Set the range into the HTPP header for the response
					header["Content-Range"]  = "bytes " + start + "-" + end + "/" + total;
					header["Accept-Ranges"]  = "bytes";
					header["Content-Length"] = chunksize;

					// Write the HTTP header, 206 Partial Content
					res.writeHead(206, header);
					// Read part of the file
					stream = fs.createReadStream(pathname, {start: start, end: end});
					// Pass it to the HTTP response
					stream.pipe(res);
				} else {
					// Check for allowed compression
					var acceptEncoding = req.headers['accept-encoding'] || '';
					// Open the file as a stream
					stream = fs.createReadStream(pathname);
					if (acceptEncoding.match(/gzip/)) {
						// Set the encoding to gzip
						header["Content-Encoding"] = 'gzip';
						// Write the HTTP response header
						res.writeHead(200, header);
						// Pipe the file input onto the HTTP response
						stream.pipe(zlib.createGzip()).pipe(res);
					} else if (acceptEncoding.match(/deflate/)) {
						// Set the encoding to deflate
						header["Content-Encoding"] = 'deflate';
						res.writeHead(200, header);
						stream.pipe(zlib.createDeflate()).pipe(res);
					} else {
						// No HTTP compression, just set file size
						header["Content-Length"] = total;
						res.writeHead(200, header);
						stream.pipe(res);
					}
				}
			}
		} else {
			// File not found: 404 HTTP error, with link to index page
			res.writeHead(404, {"Content-Type": "text/html"});
			res.write("<h1>SAGE2 error</h1>file not found: <em>" + pathname + "</em>\n\n");
			res.write("<br><br><br>\n");
			res.write("<b><a href=index.html>SAGE2 main page</a></b>\n");
			res.end();
			return;
		}
	} else if (req.method === "POST") {
		var postName = decodeURIComponent(url.parse(req.url).pathname);
		if (postName in this.postFuncs) {
			this.postFuncs[postName](req, res);
			return;
		}
	} else if (req.method === "PUT") {
		// Need some authentication / security here
		//
		var putName = decodeURIComponent(url.parse(req.url).pathname);
		// Remove the first / if there
		if (putName[0] === '/') {
			putName = putName.slice(1);
		}

		var fileLength = 0;
		var filename   = path.join(this.publicDirectory, "uploads", "tmp", putName);
		var wstream    = fs.createWriteStream(filename);

		wstream.on('finish', function() {
			// stream closed
			console.log('HTTP>		PUT file has been written', putName, fileLength, 'bytes');
		});
		// Getting data
		req.on('data', function(chunk) {
			// Write into output stream
			wstream.write(chunk);
			fileLength += chunk.length;
		});
		// Data no more
		req.on('end', function() {
			// No more date
			console.log("HTTP>		PUT Received:", fileLength, filename, putName);
			// Close the write stream
			wstream.end();
			// empty 200 OK response for now
			res.writeHead(200, "OK", {'Content-Type': 'text/html'});
			res.end();
		});
	}
};

/**
 * Add a HTTP GET handler (i.e. route)
 *
 * @method httpGET
 * @param name {String} matching URL name (i.e. /config)
 * @param callback {Function} processing function
 */
HttpServer.prototype.httpGET = function(name, callback) {
	this.getFuncs[name] = callback;
};

/**
 * Add a HTTP POST handler (i.e. route)
 *
 * @method httpPOST
 * @param name {String} matching URL name (i.e. /upload)
 * @param callback {Function} processing function
 */
HttpServer.prototype.httpPOST = function(name, callback) {
	this.postFuncs[name] = callback;
};

module.exports = HttpServer;

