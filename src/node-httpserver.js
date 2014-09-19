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

mime.default_type = "text/plain";

function httpserver(publicDirectory) {
	this.publicDirectory = publicDirectory;
	this.getFuncs  = {};
	this.postFuncs = {};
	this.onrequest = this.onreq.bind(this);
}

httpserver.prototype.onreq = function(req, res) {
	var stream;
	
	if(req.method == "GET"){
		var getName = decodeURIComponent(url.parse(req.url).pathname);
		if(getName in this.getFuncs){
			this.getFuncs[getName](req, res);
			return;
		}

		if (fs.existsSync(this.publicDirectory+getName)) {
			var stats = fs.lstatSync(this.publicDirectory+getName);
			if (stats.isDirectory()) getName = getName + "/index.html";
		}
		
		if (getName == "/") getName = "/index.html";

		var pathname = this.publicDirectory + getName;
		
		var header = {};
		var type = mime.lookup(pathname);
		header["Content-Type"] = type;
		
		if(req.headers.origin !== undefined) {
			header['Access-Control-Allow-Origin'] = req.headers.origin;
			header['Access-Control-Allow-Methods'] = "GET";
			header['Access-Control-Allow-Headers'] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
			header['Access-Control-Allow-Credentials'] = true;
		}
		
		fs.stat(pathname, function(err, stat) {
			if(err){
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.write(err + "\n\n");
				res.end();
				return;
			}
			if(stat.isDirectory()){
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.write("Error: cannot read directory.\n\n");
				res.end();
				return;
			}
			
			var total = stat.size;
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
		});
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
