"use strict";

var fs      = require('fs');
var https   = require('https');
var os      = require('os');
var path    = require('path');
var url     = require('url');

var child_process = require('child_process');
var exec          = child_process.exec;
var spawn         = child_process.spawn;


// Node version detection
var _NODE_VERSION = parseInt(process.versions.node.split(".")[1], 10);

// Platform detection
var platform = os.platform() === "win32" ? "win" : os.platform() === "darwin" ? "mac" : "lnx";
console.log("Detected OS as:", platform);

var i;
var files;
var unpacked = {};
var modules = path.join("build", "node_modules", platform);

if(!fileExistsSync("node_modules")) fs.mkdirSync("node_modules");


var suffix = "_"+platform+"_"+process.versions.node+".tar.gz";
var packages = [
	"node-demux",
	"ws"
];

var downloaded = {};
for(i=0; i<packages.length; i++){
	downloaded[packages[i]] = false;
}


packages.forEach(function(element, index, array) {
	request({host: "bitbucket.org", path: "/sage2/sage2/downloads/"+element+suffix}, function(res) {
		if(res.statusCode === 200) {
			var writestream = fs.createWriteStream(path.join("node_modules", element+suffix));
			writestream.on('error', function(err) { 
				console.log(err);
			});
	
			res.on('end', function () {
				downloaded[element] = true;
				if(allTrueDict(downloaded)) unzipModules();
			});
			res.pipe(writestream);
		}
		else {
			console.log("could not find binary package " + element+suffix + ". compiling instead.");
			delete downloaded[element];
			if(allTrueDict(downloaded)) unzipModules();
		}
	});
});

function install() {
	process.stdout.write("installing: ");
	var timer = setInterval(function() {
		process.stdout.write(".");
	}, 667);
	exec('npm install --skip-installed --loglevel info', {encoding: 'utf8', timeout: 0, maxBuffer: 500*1024 },
  	function(error, stdout, stderr) {
		if(error) throw error;
		
		clearInterval(timer);
		process.stdout.write("\n");
		console.log(stdout);
		console.log("INSTALL FINISHED!");
	});
}

function unzipModules() {
	if(isEmpty(downloaded)) {
		install();
	}
	else {
		var key;
		for(key in downloaded) {
			unpacked[key+suffix] = false;
		}
		for(key in unpacked) {
			unzipModule(key);
		}
	}
}

function unzipModule(mod) {
	if(mod.indexOf(".tar.gz") >= 0) {
		if(platform === "win") {
			exec("7z x " + mod, {cwd: "node_modules"}, function(error, stdout, stderr) {
				if(error) throw error;
				
				exec("7z x " + path.basename(mod, ".gz"), {cwd: "node_modules"}, function(error, stdout, stderr) {
					if(error) throw error;
					fs.unlinkSync(path.join("node_modules", path.basename(mod, ".gz")));
					fs.unlinkSync(path.join("node_modules", mod));
					unpacked[mod] = true;
					if(allTrueDict(unpacked)) install();
				});
			});

		}
		else {
			exec("tar xzf " + mod, {cwd: "node_modules"}, function(error, stdout, stderr) {
				if(error) throw error;
				fs.unlinkSync(path.join("node_modules", mod));
				unpacked[mod] = true;
				if(allTrueDict(unpacked)) install();
			});
		}
	}
}

function request(options, callback) {
	var req = https.get(options, function(res) {
		if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
			var location = url.parse(res.headers.location);
			if(location.hostname) {
				request(res.headers.location, callback);
			}
			else {
				request(options.host + res.headers.location, callback);
			}
		}
        else {
        	callback(res);
        }
    });
    req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});
}

function allTrueDict(dict) {
	var key;
	for(key in dict) {
		if(dict[key] !== true) return false;
	}
	return true;
}

function isEmpty(obj) {
	// null and undefined are "empty"
    if (obj === null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}

/*
function rmdirSync(directory) {
	if(!fileExistsSync(directory) || !fs.lstatSync(directory).isDirectory()) return false;

	var i;
	var list = fs.readdirSync(directory);
	for(i=0; i <list.length; i++) {
		var file = path.join(directory, list[i]);
		if(fs.lstatSync(file).isDirectory()) {
			rmdirSync(file);
		}
		else {
			fs.unlinkSync(file);
		}
	}
	fs.rmdirSync(directory);
}
*/

function fileExistsSync(filename) {
	if (_NODE_VERSION === 10 || _NODE_VERSION === 11) {
		return fs.existsSync(filename);
	} else {
		try {
			fs.accessSync(filename, fs.R_OK);
			return true;
		} catch (err) {
			return false;
		}
	}
}
