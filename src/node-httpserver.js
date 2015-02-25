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
 @module httpserver
 */

var fs   = require('fs');
var path = require('path');
var url  = require('url');

var mime = require('mime');

var sageutils = require('../src/node-utils');    // provides utility functions

mime.default_type = "text/plain";

function parseURLQuery(query) {
	if(!query) return {};
	
	var p;
	var paramList = query.split("&");
	var params = {};
	for(var i=0; i<paramList.length; i++) {
		p = paramList[i].split("=");
		if(p.length === 2) params[p[0]] = p[1];
	}
	return params;
}

function httpserver(publicDirectory) {
	this.publicDirectory = publicDirectory;
	this.getFuncs  = {};
	this.postFuncs = {};
	this.onrequest = this.onreq.bind(this);
}

httpserver.prototype.redirect = function(res, url) {
	// 302 HTTP code for redirect
	res.writeHead(302, {'Location': url});
	res.end();
};

httpserver.prototype.onreq = function(req, res) {
	var stream;
	
	if (req.method == "GET") {
		var reqURL = url.parse(req.url);
		var getName = decodeURIComponent(reqURL.pathname);
		if(getName in this.getFuncs){
			this.getFuncs[getName](req, res);
			return;
		}

		// redirect root path to index.html
		if (getName == "/") {
			this.redirect(res, "index.html");
			return;
        }

		var pathname = this.publicDirectory + getName;
		
		
		// SESSION ID CHECK
		if(global.__SESSION_ID && path.extname(pathname) === ".html") {
			var params = parseURLQuery(reqURL.query); // note every field will be a string
				
			// check params.session
			if(params.session !== __SESSION_ID) { // __SESSION_ID ==> global declared in server.js
				// failed
				// serve page that asks for session id instead
				// this.redirect(res, "session.html?onload="+getName);
				//
				// in session.html, when user enters a session id in a popup dialog
				// the page should use 'window.location.replace(<onload?session=<value>>)'
			}
		}
		
		
		// redirect a folder path to its containing index.html
		if (sageutils.fileExists(pathname)) {
			var stats = fs.lstatSync(pathname);
			if (stats.isDirectory()) {
				this.redirect(res, getName+"/index.html");
				return;
			} else {
				var header = {};
				var type   = mime.lookup(pathname);
				header["Content-Type"] = type;
                                header["Access-Control-Allow-Headers" ] = "Range";
                                header["Access-Control-Expose-Headers"] = "Accept-Ranges, Content-Encoding, Content-Length, Content-Range";

				if (req.headers.origin !== undefined) {
					header['Access-Control-Allow-Origin' ] = req.headers.origin;
					header['Access-Control-Allow-Methods'] = "GET";
					header['Access-Control-Allow-Headers'] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
					header['Access-Control-Allow-Credentials'] = true;
				}

				var total = stats.size;
				if(typeof req.headers.range !== 'undefined'){
					var range = req.headers.range;
					var parts = range.replace(/bytes=/, "").split("-");
					var partialstart = parts[0];
					var partialend = parts[1];

					var start = parseInt(partialstart, 10);
					var end = partialend ? parseInt(partialend, 10) : total-1;
					var chunksize = (end-start)+1;

					header["Content-Range"] = "bytes " + start + "-" + end + "/" + total;
					header["Accept-Ranges"] = "bytes";
					header["Content-Length"]= chunksize;

					res.writeHead(206, header);

					stream = fs.createReadStream(pathname, {start: start, end: end});
					stream.pipe(res);
				}
				else{
					header["Content-Length"] = total;
					res.writeHead(200, header);
					stream = fs.createReadStream(pathname);
					stream.pipe(res);
				}
			}
		}
		else {
			// File not found: 404 HTTP error, with link to index page
			res.writeHead(404, {"Content-Type": "text/html"});
			res.write("<h1>SAGE2 error</h1>file not found: <em>" + pathname + "</em>\n\n");
			res.write("<br><br><br>\n");
			res.write("<b><a href=index.html>SAGE2 main page</a></b>\n");
			res.end();
			return;
		}
	}
	else if(req.method == "POST"){
		var postName = decodeURIComponent(url.parse(req.url).pathname);		
		if(postName in this.postFuncs){
			this.postFuncs[postName](req, res);
		}
	}
};

httpserver.prototype.httpGET = function(name, callback) {
	this.getFuncs[name] = callback;
};

httpserver.prototype.httpPOST = function(name, callback) {
	this.postFuncs[name] = callback;
};

module.exports = httpserver;
