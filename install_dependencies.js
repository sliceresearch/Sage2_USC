"use strict";

var fs     = require('fs');
var os     = require('os');
var path   = require('path');

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
if(fileExistsSync(modules) && fs.lstatSync(modules).isDirectory()) {
	files = fs.readdirSync(modules);
	for(i=0; i<files.length; i++) {
		if(files[i].indexOf(".tar.gz") >= 0) {
			unpacked[files[i]] = false;
			rmdirSync(path.join("node_modules", path.basename(files[i], ".tar.gz")));
		}
	}
	files.forEach(unzipModule);
}

function install() {
	var cmd = spawn('npm', ['install', '--skip-installed']);
	cmd.stdout.on('data', function (data) {
		console.log("> " + data);
	});
	cmd.stderr.on('data', function (data) {
		console.log("> " + data);
	});
	cmd.on('close', function (code) {
		console.log("INSTALL FINISHED: " + code);
	});	
}

function unzipModule(element, index, array) {
	if(element.indexOf(".tar.gz") >= 0) {
		if(platform === "win") {
			exec("7z x " + element, {cwd: modules}, function(error, stdout, stderr) {
				if(error) throw error;
				exec("7z x " + path.basename(element, ".gz"), {cwd: modules}, function(error, stdout, stderr) {
					if(error) throw error;
					fs.unlinkSync(path.basename(element, ".gz"));
					moveModule(element);
				});
			});
			
		}
		else {
			exec("tar xzf " + element, {cwd: modules}, function(error, stdout, stderr) {
				if(error) throw error;
				moveModule(element);
			});
		}
	}
}
function moveModule(mod) {
	var module_dir = path.basename(mod, ".tar.gz");
	fs.rename(path.join(modules, module_dir), path.join("node_modules", module_dir), function(error) {
		if(error) throw error;
		
		unpacked[mod] = true;
		if(allTrueDict(unpacked)) install();
	});
}

function allTrueDict(dict) {
	var key;
	for(key in dict) {
		if(dict[key] !== true) return false;
	}
	return true;
}

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
	};
	fs.rmdirSync(directory);
}


/*

	fs.mkdirSync("node_modules");
if(!fileExistsSync(path.join("node_modules", platform)))
	fs.mkdirSync(path.join("node_modules", platform));
if(!fileExistsSync(path.join("node_modules", platform, "node_modules")))
	fs.mkdirSync(path.join("node_modules", platform, "node_modules"));

copyFileSync("package.json", path.join("node_modules", platform, "package.json"));

var cmd = spawn('npm', ['install', '--skip-installed'], {cwd: path.join(__dirname, "node_modules", platform)});
cmd.stdout.on('data', function (data) {
	console.log("> " + data);
});
cmd.stderr.on('data', function (data) {
	console.log("> " + data);
});
cmd.on('close', function (code) {
	console.log("INSTALL FINISHED: " + code);
});	


*/

function copyFileSync(infilename, outfilename) {
	var content = fs.readFileSync(infilename, {encoding: null} );
	fs.writeFileSync(outfilename, content, {encoding: null});
}

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