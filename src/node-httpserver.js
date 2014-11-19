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
var url  = require('url');
var mime = require('mime');
var path = require('path');

mime.default_type = "text/plain";

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
		var getName = decodeURIComponent(url.parse(req.url).pathname);
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

		// redirect a folder path to its containing index.html
		if (fs.existsSync(pathname)) {
			var stats = fs.lstatSync(pathname);
			if (stats.isDirectory()) {
				this.redirect(res, path.join(getName, "index.html"));
				return;
			} else {
				var header = {};
				var type   = mime.lookup(pathname);
				header["Content-Type"] = type;
				
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
