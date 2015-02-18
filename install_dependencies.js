var fs    = require('fs');
var os    = require('os');
var path  = require('path');
var spawn = require('child_process').spawn;


// Node version detection
var _NODE_VERSION = parseInt(process.versions.node.split(".")[1], 10);

// Platform detection
var platform = os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "MacOSX" : "Linux";
console.log("Detected OS as:", platform);

if(!fileExistsSync("node_modules"))
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