// Copyright 2012-2015 Luc Renambot, University of Illinois at Chicago.
//    All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Contact: Luc Renambot - renambot@gmail.com

/*jslint node: true */


// ---------------------------------------------
//  Include dependencies
// ---------------------------------------------

// Basic includes
var os    = require('os');
var url   = require('url');
var fs    = require('fs');
var net   = require('net');
var path  = require('path');

// Better parser fro JSON
var JSON5 = require('json5');

// To talk to the web clients
var io = require('socket.io');

// To talk to other servers
var cio = require('socket.io-client');

// To detect file type
var mime = require('mime');

// To build a web server
var http = require('http');

// Parsing url with parameters
var querystring = require('querystring');

// To do authentification
var http_auth = require('http-auth');

// OSC library
var osc = require('./src/node-osc/lib/osc.js');

// htdigest password generation
var htdigest = require('./src/htdigest.js');

// Blocking exec function
// var exec  = require('exec-sync');

// Serial port communication library
var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor

// Application messages
var AppRPC = require('./src/AppRPC');

// Command line argument processing
var optimist = require('optimist');

// the HTTP server
var hserver;
// the HTTP port
var hport = 9000;

// the HTTP server
var tcp_server;
// the HTTP port
var tcp_port = 11000;
var tcp_clients = [];

var platform = os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "Mac OS X" : "Linux";

// Support variables for meetingID writing (passwd.json)
var pathToSageUiPwdFile			= path.join(homedir(), "Documents", "SAGE2_Media", "passwd.json");
var pathToWinDefaultConfig		= path.join(homedir(), "Documents", "SAGE2_Media", "config", "defaultWin-cfg.json");
var pathToMacDefaultConfig		= path.join(homedir(), "Documents", "SAGE2_Media", "config", "default-cfg.json");
// var pathToElectronConfig		= path.join(homedir(), "Documents", "SAGE2_Media", "config", "electron-cfg.json");
var pathToElectronConfig		= path.join(homedir(), "Documents", "SAGE2_Media", "config", "defaultWin-cfg.json");
var pathToWinStartupFolder		= path.join(homedir(), "AppData", "Roaming", "Microsoft", "Windows",
														"Start Menu", "Programs", "Startup", "startWebCon.bat");
 // MonitorInfo gets written here due to nature of the winScriptHelperWriteMonitorRes.exe file.
var pathToMonitorDataFile		= path.join("scripts", "MonitorInfo.json");
var pathToSabiConfigFolder		= path.join(homedir(), "Documents", "SAGE2_Media", "sabiConfig");
var pathToFindMonitorData		= path.join(pathToSabiConfigFolder, "scripts", "winScriptHelperWriteMonitorRes.exe");
// var pathToSage2onbatScript		= path.join(pathToSabiConfigFolder, "scripts", "sage2_on.bat");
var pathToGoWindowsCertGenFile	= path.join(pathToSabiConfigFolder, "scripts", "GO-windows.bat"); // "../keys/GO-windows.bat";
var pathToActivateGoWindowsCert = path.join(pathToSabiConfigFolder, "scripts", "activateWindowsCertGenerator.bat");
var scriptExecutionFunction		= require('./src/script').Script;
var commandExecutionFunction	= require('./src/script').Command;
var spawn = require('child_process').spawn;

// ---------------------------------------------
//  Parse command line arguments
// ---------------------------------------------

console.log('--------------------------------------------');
optimist = optimist.usage('Usage: $0 -h -p password -f [json file]');
if (platform === "Windows") {
	optimist = optimist.default('f', path.join('config', 'windows.json'));
} else {
	optimist = optimist.default('f', path.join('config', 'sabi.json'));
}
// optimist = optimist.default('p', 'sage2');
optimist = optimist.describe('f', 'Load a configuration file');
optimist = optimist.describe('p', 'Create a password for the sage2 user');
var argv = optimist.argv;
if (argv.h) {
	optimist.showHelp();
	process.exit();
}
var ConfigFile = argv.f;
console.log('Reading configuration file:', ConfigFile);
console.log('--------------------------------------------');

//
// SAGE2 Specifics:
// create folders
//
if (ConfigFile.indexOf("sage2") >= 0) {
	console.log('Checking SAGE2 folders...');
	var media = path.join(homedir(), "Documents", "SAGE2_Media");
	if (!folderExists(media)) {
		mkdirParent(media);
	}
	var sessionDirectory = path.join(media, "sessions");
	if (!folderExists(sessionDirectory)) {
		mkdirParent(sessionDirectory);
	}
	var newdirs = ["apps", "assets", "images", "pdfs", "tmp", "videos", "config", "sabiConfig"];
	newdirs.forEach(function(d) {
		var newsubdir = path.join(media, d);
		if (!folderExists(newsubdir)) {
			mkdirParent(newsubdir);
		}
	});


	//
	//Move files as required
	//

	// Copy a default configuration file over if there isn't one.
	var configInput, configOuput;
	if (platform === "Windows" && !fileExists(pathToWinDefaultConfig)) {
		configInput = path.join("scripts", "defaultWin-cfg.json");
		configOuput = pathToWinDefaultConfig;//path.join(media, "config", "defaultWin-cfg.json");

		console.log('Delete this comment later: config file does not exist tried to write to:' + configOuput);
		console.log('    from file:' + configInput);

		// do the actual copy
		fs.writeFileSync(configOuput, fs.readFileSync(configInput));
	} else if (platform === "Mac OS X" && !fileExists(pathToMacDefaultConfig)) {
		configInput = path.join("scripts", "default-cfg.json");
		configOuput = pathToMacDefaultConfig;//path.join(media, "config", "default-cfg.json");

		console.log('Delete this comment later: config file does not exist tried to write to:' + configOuput);
		console.log('    from file:' + configInput);

		// do the actual copy
		fs.writeFileSync(configOuput, fs.readFileSync(configInput));
	}
	// always move electron regardless of OS
	if (!fileExists(pathToElectronConfig)) {
		configInput = path.join("scripts", "defaultWin-cfg.json");
		configOuput = pathToElectronConfig;//path.join(media, "config", "defaultWin-cfg.json");

		console.log('Delete this comment later: config file does not exist tried to write to:' + configOuput);
		console.log('    from file:' + configInput);

		// do the actual copy
		fs.writeFileSync(configOuput, fs.readFileSync(configInput));
	}

	//always ov
	if (platform === "Windows") {
		var sfpContents = 'cd /d "' + __dirname + '\\..' + '"\n';
		sfpContents += 'set PATH=%CD%\\bin;%PATH%;\n';
		sfpContents += 'cd sabi.js\n';
		sfpContents += 'start /MIN ..\\bin\\node server.js -f ' + pathToSabiConfigFolder + '\\config\\sage2.json %*';
		fs.writeFileSync(pathToWinStartupFolder, sfpContents);

		console.log('Startup file does not exist, adding it. Contents:' + sfpContents);
	}

	//copy over additional files to run the sabi interface.
	var sabiMediaCopy;
	var sabiMediaCheck = path.join(pathToSabiConfigFolder, "config");
	if (!folderExists(sabiMediaCheck)) {
		mkdirParent(sabiMediaCheck);
	}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "config", "sage2.json");
	if (!fileExists(sabiMediaCheck)) {
		sabiMediaCopy = path.join("config", "sage2.json");
		fs.writeFileSync(sabiMediaCheck, fs.readFileSync(sabiMediaCopy));
	}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts");
	if (!folderExists(sabiMediaCheck)) {
		mkdirParent(sabiMediaCheck);
	}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "sage2_on.bat");
	if (!fileExists(sabiMediaCheck)) {
		sabiMediaCopy = path.join("scripts", "sage2_on.bat");
		fs.writeFileSync(sabiMediaCheck, fs.readFileSync(sabiMediaCopy));
	}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "s2_on_electron.bat");
	if (!fileExists(sabiMediaCheck)) {
		sabiMediaCopy = path.join("scripts", "s2_on_electron.bat");
		fs.writeFileSync(sabiMediaCheck, fs.readFileSync(sabiMediaCopy));
	}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "sage2_off.bat");
	if (!fileExists(sabiMediaCheck)) {
		sabiMediaCopy = path.join("scripts", "sage2_off.bat");
		fs.writeFileSync(sabiMediaCheck, fs.readFileSync(sabiMediaCopy));
	}
	sabiMediaCheck = path.join(pathToFindMonitorData);
	if (!fileExists(sabiMediaCheck)) {
		sabiMediaCopy = path.join("scripts", "winScriptHelperWriteMonitorRes.exe");
		fs.writeFileSync(sabiMediaCheck, fs.readFileSync(sabiMediaCopy));
	}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "GO-windows.bat");
	if (!fileExists(sabiMediaCheck)) {
		sabiMediaCopy = path.join("..", "keys", "GO-windows.bat");
		fs.writeFileSync(sabiMediaCheck, fs.readFileSync(sabiMediaCopy));
	}

	makeMonitorInfoFile();

	console.log('   ...done checking SAGE2_Media');
}


//
// Some utility functions
//

/**
 * Creates recursively a series of folders if needed (synchronous function and throws error)
 *
 * @method mkdirParent
 * @param dirPath {String} path to be created
 * @return {String} null or directory created
 */
function mkdirParent(dirPath) {
	var made = null;
	dirPath = path.resolve(dirPath);
	try {
		fs.mkdirSync(dirPath);
		made = dirPath;
	} catch (err0) {
		switch (err0.code) {
			case 'ENOENT' : {
				made = mkdirParent(path.dirname(dirPath));
				made = mkdirParent(dirPath);
				break;
			}
			default: {
				var stat;
				try {
					stat = fs.statSync(dirPath);
				} catch (err1) {
					throw err0;
				}
				if (!stat.isDirectory()) {
					throw err0;
				}
				made = dirPath;
				break;
			}
		}
	}
	return made;
}

function folderExists(directory) {
	try {
		var res = fs.statSync(directory);
		return res.isDirectory();
	} catch (err) {
		return false;
	}
}

/**
 * Test if file is exists
 *
 * @method fileExists
 * @param filename {String} name of the file to be tested
 * @return {Bool} true if exists
 */
function fileExists(filename) {
	try {
		var res = fs.statSync(filename);
		return res.isFile();
	} catch (err) {
		return false;
	}
}

// Github: sindresorhus/os-homedir
function homedir() {
	var env  = process.env;
	var home = env.HOME;
	var user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

	if (process.platform === 'win32') {
		return env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH || home || null;
	}

	if (process.platform === 'darwin') {
		return home || (user ? '/Users/' + user : null);
	}

	if (process.platform === 'linux') {
		return home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : null));
	}

	return home || null;
}

// Github: sindresorhus/untildify
function untildify(str) {
	var home = homedir();
	if (typeof str !== 'string') {
		throw new TypeError('Expected a string');
	}

	return home ? str.replace(/^~($|\/|\\)/, home + '$1') : str;
}


// ---------------------------------------------
//  Read the configuration file
// ---------------------------------------------

//var configdata = fs.readFileSync(path.join(__dirname,ConfigFile)); //causes a problem if config files are in SAGE2_Media
var configdata = fs.readFileSync(ConfigFile);
var cfg = JSON5.parse(configdata);

// Get the port of the webserver from configuration file
if (cfg.global.server_port) {
	hport = parseInt(cfg.global.server_port);
}
// Get the port for TCP connection from configuration file
if (cfg.global.tcp_port) {
	tcp_port = parseInt(cfg.global.tcp_port);
}

// ---------------------------------------------
//  Return the mime type of a file
//     used for the web server
// ---------------------------------------------

// Mime function
function contentType(apath) {
	return mime.lookup(apath);
}

// ---------------------------------------------
//  Sleep for a little while
// ---------------------------------------------
// commented out to make lint happy
// function sleep(milliseconds) {
// 	var start = new Date().getTime();
// 	for (var i = 0; i < 1e7; i++) {
// 		if ((new Date().getTime() - start) > milliseconds) {
// 			break;
// 		}
// 	}
// }


// ---------------------------------------------
// Requesting new authentication instance.
// ---------------------------------------------

// Generate the password file
if (argv.p) {
	if (argv.p !== true) {
		console.log('Setting a new password for http authorization sage2 user');
		htdigest.htdigest("users.htpasswd", "sabi", "sage2", argv.p);
	}
}

var digest = http_auth.digest({
	realm: "sabi",
	file:  path.join(__dirname, 'users.htpasswd'),
});

// ---------------------------------------------
//   Build the main page of the site
// ---------------------------------------------

function buildMainPage(cfg) {
	var p, b;
	var data = '';

	// Generate the page
	data += '<div data-role="page" id="MAIN" data-theme="b">\n';

	var numpages = cfg.main.pages.length;

	// Panel
	if (numpages > 1) {
		data += '<div data-role="panel" style="background: rgba(0,0,0,.80);"'
				+ ' id="navpanel" data-display="overlay" data-theme="a">';
		data += '<h2>Menu</h2>';
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			data += '<p> <a data-role="button" data-icon="arrow-r" data-iconpos="right" href="#' +  b  + '">' + b + '</a> </p>\n';
		}
		data += '</div><!-- /panel --> ';
	}


	data += '<div data-role="header" data-position="fixed">\n';
	data += cfg.main.header;
	if (numpages > 1) {
		data += '<a href="#navpanel" data-icon="bars" data-role="button" data-inline="true" data-iconpos="notext">Panel</a>\n';
	}
	data += '</div>\n\n';

	// Content of the page
	data += '<div data-role="content">\n';

	if (cfg.main.image) {
		data += '<div style="text-align: center;">\n';
		data += '<img src="' + cfg.main.image + '" ';
		if (cfg.main.image_style) {
			data += cfg.main.image_style;
		}
		data += '/>\n';
		data += '</div>\n';
	}

	if (numpages === 1) {
		data += buildaPage(cfg, cfg.main.pages[0]);
	} else {
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			data += '<p> <a data-role="button" data-icon="arrow-r" data-iconpos="right" href="#' +  b  + '">' + b + '</a> </p>\n';
		}
		data += '</div>\n\n';
	}

	data += '<div data-role="footer" data-position="fixed">\n';
	data += cfg.main.footer;
	data += '</div>\n\n';

	data += '</div>\n';

	return data;
}

// ---------------------------------------------
//   Build any othe page from the configuration
// ---------------------------------------------

function buildaPage(cfg, name) {
	var a, p, b, theme, role, collapsed;
	var data = '';

	var numpages = cfg.main.pages.length;

	// Panel
	if (numpages > 1) {
		// Generate the page
		data += '<div data-role="page" id="' + name + '" data-theme="b">\n';

		// Panel
		data += '<div data-role="panel" id="navpanel" style="background: rgba(0,0,0,.80);"'
				+ ' data-display="overlay" data-theme="a">';
		data += '<h2>Menu</h2>';
		data += '<p> <a data-role="button" data-icon="grid" data-iconpos="right" href="..">Home</a> </p>\n';
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			if (b != name) {
				data += '<p> <a data-role="button" data-icon="arrow-r" data-iconpos="right" href="#'
						+  b  + '">' + b + '</a> </p>\n';
			}
		}
		data += '</div><!-- /panel --> ';

		// Header
		data += '<div data-role="header" data-position="fixed">\n';
		data += '<h1>' + cfg[name].title + '</h1>';
		// data += '<a href="#navpanel" data-icon="bars" data-role="button" data-inline="true" data-iconpos="notext">Panel</a>\n';
		data += '</div>\n\n';

		// Content of the page
		data += '<div data-role="content">\n';
	}


	var groups = cfg[name].groups;

	if (cfg[name].image) {
		data += '<div style="text-align: center;">\n';
		data += '<img src="' + cfg[name].image + '" ';
		if (cfg.main.image_style) {
			data += cfg.main.image_style;
		}
		data += '/>\n';
		data += '</div>\n';
	}

	if (groups) {
		for (p in groups) {
			data += '<div data-role="collapsible" data-theme="b" data-content-theme="a" data-collapsed="false">\n';
			b = groups[p];
			var c = cfg[name][b];
			data += '<h3>' + c.title + '</h3>\n';
			if (c.image) {
				data += '<div>\n';
				if (c.description) {
					data += c.description + '\n';
				}
				data += '<table style="width:100%;" cellpadding="10">\n';
				data += '<colgroup>\n';
				//data += '<col style="width: 100px;" />\n';
				data += '<col style="width: 15%;max-width:250px" />\n';
				data += '<col style="width: auto;align:right"/>\n';
				data += '</colgroup>\n';
				data += '<tr>\n';
				data += '<td> <img style="width:90%" src="' + c.image + '"/> </td>\n';
				data += '<td>\n<div>\n';
				for (a in c.actions) {
					theme = "a";
					if (c.actions[a].theme) {
						theme = c.actions[a].theme;
					}
					role = "button";
					if (c.actions[a].role) {
						role = c.actions[a].role;
					}
					if (role == "button") {
						data += '<p><a data-icon="gear" data-role="button" data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro + '">';
						} else {
							data += c.actions[a].action + '">';
						}
						data += c.actions[a].title;
						data += '</a> </p>\n';
					} else if (role == "collapsible") {
						collapsed = true;
						if (c.actions[a].collapsed == "false") {
							collapsed = false;
						}
						data += '<div data-role="collapsible" data-collapsed="' + collapsed + '" ';
						data += 'data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro + '">\n';
						} else {
							data += c.actions[a].action + '">\n';
						}
						data += '<h3>' + c.actions[a].title + '</h3>\n';
						data += '<div data-role="fieldcontain"></div>\n';
						data += '</div>\n';
					} else if (role == "range") {
						data += '<div data-role="fieldcontain">\n';
						var minv = 0;
						var maxv = 0;
						if (c.actions[a].minvalue) {
							minv = parseFloat(c.actions[a].minvalue);
						}
						if (c.actions[a].maxvalue) {
							maxv = parseFloat(c.actions[a].maxvalue);
						}
						var medium = (maxv + minv) / 2.0;
						data += '<input type="range" data-track-theme="b" data-highlight="true" ';
						data += 'value=' + medium + ' min=' + minv + ' max=' + maxv;
						if (c.actions[a].macro) {
							data += 'data-theme="' + theme + '" class="sabijs" id="' + c.actions[a].macro + '">\n';
						} else {
							data += 'data-theme="' + theme + '" class="sabijs" id="' + c.actions[a].action + '">\n';
						}
						data += '</div>\n';
					} else if (role == "inputText") {
						data += '<p><input type="text" class="sabijs" placeholder="' + c.actions[a].placeholder + '" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro + '">';
						} else {
							data += c.actions[a].action + '">';
						}
						data += '</input> </p>\n';
					} else if (role == "inputPassword") {
						data += '<p><input type="password" class="sabijs" placeholder="' + c.actions[a].placeholder + '" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro + '">';
						} else {
							data += c.actions[a].action + '">';
						}
						data += '</input> </p>\n';
					}

				}
				data += '</div></td></tr>\n';
				data += '</table></div>\n';
			} else {
				if (c.description) {
					data += '<p>' + c.description + '</p>\n';
				}
				for (a in c.actions) {
					theme = "a";
					if (c.actions[a].theme) {
						theme = c.actions[a].theme;
					}
					role = "button";
					if (c.actions[a].role) {
						role = c.actions[a].role;
					}
					if (role == "button") {
						data += '<p><a data-icon="gear" data-role="button" data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro + '">';
						} else {
							data += c.actions[a].action + '">';
						}
						data += c.actions[a].title;
						data += '</a> </p>\n';
					} else if (role == "collapsible") {
						collapsed = true;
						if (c.actions[a].collapsed == "false") {
							collapsed = false;
						}
						data += '<div data-role="collapsible" data-collapsed="' + collapsed + '" ';
						data += 'data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro + '">\n';
						} else {
							data += c.actions[a].action + '">\n';
						}
						data += '<h3>' + c.actions[a].title + '</h3>\n';
						data += '<div data-role="fieldcontain"></div>\n';
						data += '</div>\n';
					}
				}
			}
			data += '</div>\n\n';
		}
	}

	// Back to main page button
	//data += '<p><a data-role="button" data-theme="b" data-icon="arrow-l" data-iconpos="left" href="#MAIN">Back to Main page</a></p>\n\n';

	if (numpages > 1) {
		// End of page content
		data += '</div>\n\n';

		// Footer
		data += '<div data-role="footer" data-position="fixed">\n';
		data += '  <div data-role="navbar" data-iconpos="left" >';
		data += '  <ul>';
		data += '    <li> <a href="#MAIN" data-theme="b" data-icon="grid">Home</a> </li>\n';
		// Put the navbar items in the navigation bar
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			if (b != name && cfg[b].navbar && cfg[b].navbar == "true") {
				data += '    <li> <a href="#' +  b  + '" data-icon="star">' + b + '</a> </li>\n';
			}
		}
		data += '  </ul>';
		data += '  </div><!-- /navbar -->';
		//data += cfg.main.footer;
		data += '</div>\n\n';

		// end of page
		data += '</div>\n';
	}

	return data;
}


// ---------------------------------------------
// Process one page load
// ---------------------------------------------

function process_request(cfg, req, res) {
	if (req.method === "GET") {
		var apath = url.parse(req.url).pathname;
		if (apath.indexOf('/action/') === 0) {
			var args = apath.split('/');
			var act  = args[args.length - 1];
			var filename = cfg.actions[act].editor;
			filename = path.resolve(untildify(filename));
			// If exists, is it readable/writable
			fs.access(filename, fs.R_OK, function (err) {
				if (err) {
					console.log('Error with file, need read/write access', filename);
					res.writeHead(404);
					res.end();
				} else {
					var content = fs.readFileSync(filename, 'utf8');
					try {
						res.writeHead(200, {'Content-Type': 'text/html'});
						res.write(content, 'utf8');
						res.end();
					} catch (e) {
						console.log('Error with file, need read/write access', filename);
						res.writeHead(404);
						res.end();
					}
				}
			});
		}
		if (apath == '/') {
			// Open the header template
			apath = '/src/header';
			// Read the data synchronously
			let data = fs.readFileSync(__dirname + apath);

			// Build the main page
			data += buildMainPage(cfg);

			// Build the other pages
			var numpages = cfg.main.pages.length;
			if (numpages > 1) {
				for (var p in cfg.main.pages) {
					var b = cfg.main.pages[p];
					data += buildaPage(cfg, b);
				}
			}

			// Add the main script
			data += '\n<script type="text/javascript" src="src/mobile.js"></script>\n\n';

			// Close the HTML syntax
			data += "</body></html>";

			// Send the whole thing as HTML
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data, 'utf8');
			res.end();
		} else {
			//console.log("Agent: " + req.headers['user-agent']);
			console.log("serving to ", req.connection.remoteAddress, apath);
			fs.readFile(__dirname + apath, function(err, data) {
				if (err) {
					res.writeHead(404);
					res.end();
				} else {
					res.writeHead(200, {'Content-Type': contentType(apath)});
					res.write(data, 'utf8');
					res.end();
				}
			});
		}
	} else if (req.method === "PUT") {
		var parsed  = url.parse(req.url);
		var putName = decodeURIComponent(parsed.pathname);
		if (putName === "/upload") {
			var params     = querystring.parse(parsed.query);
			var action     = params.action;
			var fileLength = 0;
			let filename   = cfg.actions[action].editor;
			filename = path.resolve(untildify(filename));
			var wstream    = fs.createWriteStream(filename);

			wstream.on('finish', function() {
				// stream closed
				console.log('HTTP>		PUT file has been written', filename, fileLength, 'bytes');
				updateCertificates(); // keeping this if someone edits with basic / advanced
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
				console.log("HTTP>		PUT Received:", fileLength, filename);
				// Close the write stream
				wstream.end();
				// empty 200 OK response for now
				res.writeHead(200, "OK", {'Content-Type': 'text/html'});
				res.end();
			});
		}
	}
}

// ---------------------------------------------
// Create the web server
// ---------------------------------------------

// hserver = http.createServer(function(req, res) {
// 	var secure = cfg.global.security;
// 	if (secure && (secure === "true")) {
// 		// apply basic login check
// 		basic.apply(req, res, function(username) {   // secure access
// 			// process one request
// 			process_request(cfg, req, res);
// 		});   // end of secure
// 	} else {
// 		// process one request
// 		process_request(cfg, req, res);
// 	}
// });

var secure = cfg.global.security;
if (secure && (secure === "true")) {
	// pass the digest object to do authentification
	hserver = http.createServer(digest, function(req, res) {
		process_request(cfg, req, res);
	});
} else {
	hserver = http.createServer(function(req, res) {
		// process one request
		process_request(cfg, req, res);
	});
}


// ---------------------------------------------
// Create the TCP server
// ---------------------------------------------

function processTCPData(data) {

	var actions = cfg.actions;
	var macros  = cfg.macros;
	var id      = data;

	console.log("processTCPData: ", id);

	// Is it a macro ?
	if (macros && id in macros) {
		console.log("Found macro:", id);
		processMacro(id);
	}
	// Is it an action ?
	if (actions && id in actions) {
		// if the id is an action
		var act = id;
		if (actions[act].oscmessage) {
		// the action is an OSC message
			if (actions[act].parameters) {
				processOSC({message: actions[act].oscmessage,
					server: actions[act].server,
					parameters: [actions[act].parameters] });
			} else {
				processOSC({message: actions[act].oscmessage,
					server: actions[act].server });
			}
		} else if (actions[act].serial) {
			// the action is a serial-port message
			processSerialPort({message: actions[act].serial, baud: actions[act].baud, port: actions[act].port});
		} else if (actions[act].command) {
			// the action is a command (as opposed to a script)
			console.log("Command", actions[act].command);
			processRPC({method: 'command', value: [act, actions[act].command] });
		} else {
			// The action is a script on the local machine
			console.log("Should trigger:", actions[act].script);
			processRPC({method: 'action', value: [act, actions[act].script] });
		}
	} else {
		console.log("Action unknown: [%s]", id);
	}
}

// Callback method executed when data is received from a socket
//
function receiveTCPData(socket, data) {
	// Clean up the message
	let mesg = data.toString().replace(/(\r\n|\n|\r)/gm, "");
	if (mesg.length > 0) {
		console.log("TCP message: [%s]", mesg);
		if (mesg == "@quit") {
			socket.end('Goodbye!\n');
		} else {
			processTCPData(mesg);
			socket.write('@done\n');
		}
	}
}

// Method executed when a socket ends
//
function closeTCPSocket(socket) {
	var i = tcp_clients.indexOf(socket);
	if (i != -1) {
		tcp_clients.splice(i, 1);
		console.log("Closing a TCP client connection: %d client(s)", tcp_clients.length);
	}
}

//  Callback method executed when a new TCP socket is opened.
//
function newTCPSocket(socket) {
	tcp_clients.push(socket);
	console.log("Opening a new TCP client connection: %d client(s)", tcp_clients.length);
	socket.write('Welcome to the Sabi.js TCP server!\n');
	socket.on('end', function() {
		closeTCPSocket(socket);
	});
	socket.on('data', function(data) {
		receiveTCPData(socket, data);
	});
}

// Create a new server and provide a callback for when a connection occurs
tcp_server = net.createServer(newTCPSocket);

// Listen on port tcp_port
tcp_server.listen(tcp_port);
// console.log("TCP server running at localhost:" + tcp_port);


// ---------------------------------------------
// Setup the websocket port
// ---------------------------------------------

var sio = io(hserver);

// ---------------------------------------------
// Process commands
// ---------------------------------------------

function processMacro(data) {
	var id = data;
	var actions = cfg.actions;
	var macros  = cfg.macros;
	// Go through the list of action in the macro
	for (var idx in macros[id]) {
		// process each action one at a time
		var act = macros[id][idx];
		console.log("Macro " + id + " : action " + act);

		if (actions[act].oscmessage) {
			// the action is an OSC message
			if (actions[act].parameters) {
				processOSC({message: actions[act].oscmessage, server: actions[act].server,
					parameters: [actions[act].parameters]});
			} else {
				processOSC({message: actions[act].oscmessage, server: actions[act].server});
			}
		} else if (actions[act].serial) {
			// the action is a serial-port message
			processSerialPort({message: actions[act].serial, baud: actions[act].baud, port: actions[act].port});
		} else if (actions[act].command) {
			// the action is a command (as opposed to a script)
			console.log("Here", act, actions[act].command);
			processRPC({method: 'command', value: [act, actions[act].command]});
		} else {
			// The action is a script on a machine (remote or local)
			// if it's on a different server
			if (actions[act].server) {
				var url = 'http://' + actions[act].server;
				console.log("Connecting to:", url);
				var remotesocket = cio.connect(url);
				console.log("Connected to server: " + url);
				remotesocket.emit('RPC', {method: 'action', value: [act, actions[act].script]});
				remotesocket.once('return', function (data) {
					console.log("remote status: ", data);
				}); // jshint ignore:line
			} else {
				//if (actions[act].return == "process")
				//  this.sendCallandProcess('action', [act, actions[act].script]);
				// else
				processRPC({method: 'action', value: [act, actions[act].script]});
			}
		}
		// End of the current action in macro
	}
}


function processEditor(data, socket) {
	console.log("Editor for:", data);
	try {
		var filename = path.resolve(untildify(data.value));
		var shortname = path.basename(filename);

		// Test if file exists
		fs.access(filename, fs.F_OK, function (err) {
			if (err) {
				console.log('Sending empty new file (file not found)');
				socket.emit('file', {action: data.action, name: shortname, data: "{\n}"});
			} else {
				// If exists, is it readable/writable
				fs.access(filename, fs.R_OK | fs.W_OK, function (err) {
					if (err) {
						console.log('Error with file, need read/write access', filename);
					} else {
						var content = fs.readFileSync(filename, 'utf8');
						try {
							// try to parse the JSON
							var pretty  = JSON.stringify(JSON5.parse(content), null, 4);
							socket.emit('file', {action: data.action, name: shortname, data: pretty});
						} catch (e) {
							// parsing failed, just send file content
							socket.emit('file', {action: data.action, name: shortname, data: content});
						}
					}
				});
			}
		});

	} catch (e) {
		console.log('Error reading file', data.value, e);
	}
}

/*
	data is an object TODO double check this
		data.value	an array
			0		action defined in sage2.json (sabi config file)
			1		path of file to activate
		data.method	sendPurpose

*/
function processRPC(data, socket) {
	console.log("RPC for:", data);

	/*
		Path fix to use SAGE2_Media only if the path STARTS with scripts\

		interception to activate data.method actions script from SAGE2_Media\sabiConfig folder
		data.value[1] now contains full path to specified script. Probably: C:\users\userName\Documents\.....bat
	*/
	if (data.value[1] && data.value[1].indexOf("scripts\\") === 0) {
		data.value[1] = pathToSabiConfigFolder + "\\" + data.value[1];
	}
	var found = false;
	if (data.value[0].indexOf("sage2-on") !== -1 && data.value[1] != undefined) {
		if (data.value[1].indexOf("electron") > -1) {
			spawn(data.value[1], getLaunchParameters("electron"));
		} else {
			spawn(data.value[1], getLaunchParameters());
		}
		return;
	}
	for (var f in AppRPC) {
		var func = AppRPC[f];
		if (typeof func == "function") {
			if (f == data.method) {
				(func)(data, socket);
				found = true;
			}
		}
	}
	if (!found && data.method === "makeNewMeetingID") {
		var jsonString = '{ "pwd" : "' + data.value[0] + '" }';
		console.log('meetingID save double checking:' + jsonString);
		fs.writeFileSync(pathToSageUiPwdFile, jsonString);
	}
	if (!found && data.method === "makeNewLauncherPassword") {
		console.log('Setting new launcher password', data.value[0]);
		htdigest.htdigest_save("users.htpasswd", "sabi", "sage2", data.value[0]);
	}
	if (!found && data.method === "performGitUpdate") {
		console.log('Rewriting launcher to initiate git update before launching sabi');

		//if platform is windows
		if (platform === "Windows") {
			//modify start up script for a one time git fetch and reset.
			//one time because each startup of sabi will re
			var sfpContents = 'cd "' + __dirname + '\\..' + '"\n';
			sfpContents += 'set PATH=%CD%\\bin;%PATH%;\n';
			//sfpContents += 'git config credential.helper store\n';
			sfpContents += 'git fetch --all\n';
			sfpContents += 'git reset --hard origin/master\n';
			sfpContents += 'cd sabi.js\n';
			sfpContents += 'start /MIN ..\\bin\\node server.js -f "' + pathToSabiConfigFolder + '\\config\\sage2.json" %*';
			fs.writeFileSync(pathToWinStartupFolder, sfpContents);

			commandExecutionFunction("shutdown -r -t 1", null);
		} else {
			console.log("Error, update function not supported on this OS.");
		}

	}
}

function getMeetingIDFromPasswd() {
	//if there is no passwd file, then there is no need to add a hash to address.
	if (!fileExists(pathToSageUiPwdFile)) {
		return null;
	}

	var configdata = fs.readFileSync(pathToSageUiPwdFile);
	var cfg = JSON5.parse(configdata);
	return cfg.pwd;
}

function updateCertificates() {
	var pathToConfig; //config name differs depending on OS.
	if (platform === "Windows") {
		pathToConfig = pathToWinDefaultConfig;
	} else if (platform === "Mac OS X") {
		pathToConfig = pathToMacDefaultConfig;
	}

	if (!fileExists(pathToConfig)) {
		console.log("Error, config doesn't exist.");
		return null;
	}

	var configdata = fs.readFileSync(pathToWinDefaultConfig);
	var cfg = JSON5.parse(configdata);
	var host = cfg.host;
	var alternate = cfg.alternate_hosts;

	var rewriteContents = "REM Must be run as administrator\n";
	//rewriteContents += "pushd %~dp0\n"; //Not sure what this does... it stores the directory the script is run from. But to retrieve the path, a popd must be used. No other scripts in the chain seem to use it.
	rewriteContents += "call init_webserver.bat localhost\n";
	rewriteContents += "call init_webserver.bat 127.0.0.1\n";
	rewriteContents += "call init_webserver.bat " + host + "\n";
	for (var i = 0; i < alternate.length; i++) {
		rewriteContents += "call init_webserver.bat " + alternate[i] + "\n";
	}
	fs.writeFileSync(pathToGoWindowsCertGenFile, rewriteContents);

	rewriteContents = "@echo off\n\n";
	rewriteContents += 'start /MIN /D "..\\keys" ' + pathToGoWindowsCertGenFile;
	fs.writeFileSync(pathToActivateGoWindowsCert, rewriteContents);

	scriptExecutionFunction(pathToActivateGoWindowsCert, false);
}

function makeMonitorInfoFile() {
	console.log("Gathering monitor information");
	commandExecutionFunction(pathToFindMonitorData, null);
}

function processSerialPort(data) {
	var sp = new SerialPort(data.port, {
		parser: serialport.parsers.readline("\r"),
		baudrate: parseInt(data.baud)
	});
	sp.on("data", function (data) {
		console.log("Got: " + data);
		sp.close();
	});
	sp.on("error", function(msg) {
		console.log("error: " + msg);
	});
	sp.on('close', function (err) {
		console.log('port closed');
	});
	sp.on('open', function () {
		sp.write(data.message);
		sp.flush();
	});
}

function processOSC(data) {
	var addr    = data.server.split(':');
	var oclient = new osc.Client(addr[0], parseInt(addr[1]));
	var reply   = null;
	if (data.parameters) {
		// for all parameters are converted to type float for OSC messages
		//    need to add int, string, ...
		var params = data.parameters.map(parseFloat);
		if (params.length === 1) {
			reply = new osc.Message(data.message, params[0]);
		}
		if (params.length === 2) {
			reply = new osc.Message(data.message, params[0], params[1]);
		}
		if (params.length === 3) {
			reply = new osc.Message(data.message, params[0], params[1], params[2]);
		}
		if (params.length === 4) {
			reply = new osc.Message(data.message, params[0], params[1], params[2], params[3]);
		}
		if (params.length === 5) {
			reply = new osc.Message(data.message, params[0], params[1], params[2], params[3], params[4]);
		}
	} else {
		reply = new osc.Message(data.message);
	}
	oclient.send(reply, oclient);
}


// ---------------------------------------------
// Callback for the websocket
// ---------------------------------------------

sio.on('connection', function (socket) {
	console.log("New connection from " + socket.request.connection.remoteAddress);

	/*
	// Send the name of the configuration file to the web client
	//    the client will parse the file
	socket.emit('start', ConfigFile);
	*/
	//Rather than send the name, send the contents. It has to get there anyway...
	var cfg = fs.readFileSync(ConfigFile);
	cfg = JSON5.parse(cfg);
	socket.emit('start', cfg);


	socket.on("RPC", function (data) {
		processRPC(data, socket);
	});

	socket.on("EDITOR", function (data) {
		processEditor(data, socket);
	});

	socket.on("SERIALPORT", function (data) {
		processSerialPort(data);
	});

	socket.on("Macro", function (data) {
		processMacro(data);
	});

	socket.on("OSC", function (data) {
		processOSC(data);
	});

	socket.on("disconnect", function (socket) {
		console.log("Connection closed");
	});

	// additional support for assisted config

	/*
		This needs to send necessary config components for the assisted config autofill and suggest values.
	*/
	socket.on("requestConfigAndTips", function(data) {
		socketOnRequestConfigAndTips(socket);
	});

	/*
		This will be sent after user hits the save button.
		Hopefully this triggers correctly before redirecting the page. Double check.
	*/
	socket.on("assistedConfigSend", function(data) {
		socketOnAssistedConfigSend(socket, data);
	});

});


// ---------------------------------------------
// Start the webserver and get ready...
// ---------------------------------------------

// Listen on the given port and IPv4 local interfaces
hserver.listen(hport, "0.0.0.0");
console.log("\nHTTP server running at http://localhost:" + hport);
console.log("\n");






// ------------------------------------------------------------------------------------------------------------
// Additional functions to support assisted config



/*
	Main confusion is monitorData
		tileWidth	actually how many detected monitors there are in the tiled display width
		tileHeight	detected number of monitors in height
		tileCoordinates
		[
			{
			col 	x coordinate of top left corner of this particular monitor
			row 	y coordinate of top left corner of this particular monitor
			}
		]

*/
function socketOnRequestConfigAndTips(socket) {
	// read default
	var cfg 		= fs.readFileSync(pathToWinDefaultConfig, "utf8");
	cfg 		    = JSON5.parse(cfg);
	var monitorData = fs.readFileSync(pathToMonitorDataFile);
	monitorData     = JSON5.parse(monitorData);

	// as mentioned earlier the tilewidth/height is how many detected monitors in the tile display layout
	var tips = {};
	tips.layoutWidth  = monitorData.tileWidth;
	tips.layoutHeight = monitorData.tileHeight;
	tips.resolutionWidth  = "unknown";
	tips.resolutionHeight = "unknown";
	var tw, th;

	// if there are more than one detected, find where there is a difference in coordinates and set tips
	for (var i = 1; i < monitorData.tileCoordinates.length; i++) {
		tw = tips.resolutionWidth = Math.abs(monitorData.tileCoordinates[i - 1].col - monitorData.tileCoordinates[i].col);
		th = tips.resolutionHeight = Math.abs(monitorData.tileCoordinates[i - 1].row - monitorData.tileCoordinates[i].row);
		if (tw > 10) {
			tips.resolutionWidth = tw;
		}
		if (th > 10) {
			tips.resolutionHeight = th;
		}
	}

	cfg.tips = tips;

	socket.emit("requestConfigAndTipsResponse", cfg);
}


/*
	The given config should be correct as it had to be checked in assistedConfig.html for Send button to work.
	Still, have a couple safety checks.
	Needs to copy over
		host
		port
		index_port
		resolution
		layout
		alternate_hosts
		remote_sites

*/
function socketOnAssistedConfigSend(socket, sentCfg) {
	var cfg           = JSON5.parse(fs.readFileSync(pathToWinDefaultConfig));
	var electronCfg   = JSON5.parse(fs.readFileSync(pathToElectronConfig));

	// copy over layout
	cfg.layout = sentCfg.layout;
	cfg.displays = sentCfg.displays;
	// copy over all other relevent data.
	cfg.host = sentCfg.host;
	cfg.port = sentCfg.port;
	cfg.index_port = sentCfg.index_port;
	cfg.resolution = sentCfg.resolution;
	cfg.alternate_hosts = sentCfg.alternate_hosts;
	cfg.remote_sites = sentCfg.remote_sites;
	// write
	console.log("Updating default cfg");
	fs.writeFileSync(pathToWinDefaultConfig, JSON5.stringify(cfg, null, 4));


	// electron copy over
	electronCfg.host = cfg.host;
	electronCfg.port = cfg.port;
	electronCfg.index_port      = cfg.index_port;
	electronCfg.resolution      = {width: (cfg.resolution.width * cfg.layout.columns),
		height: (cfg.resolution.height * cfg.layout.rows)};//cfg.resolution;
	electronCfg.layout          = {rows: 1, columns: 1};
	electronCfg.displays        = [{row: 0, column: 0}];
	electronCfg.alternate_hosts = cfg.alternate_hosts;
	electronCfg.remote_sites    = cfg.remote_sites;

	// write
	// console.log("Updating electron cfg");
	// fs.writeFileSync(pathToElectronConfig, JSON5.stringify(electronCfg, null, 4));

	if (sentCfg.makeCerts) {
		updateCertificates();
	}
}


/*
	Get relevent electron data for launch.
	Electron launcher is a bat that needs to be passed width, height, port, hash(if available)

	rem %1 path electron config
	rem %2 index_port, NOT https
	rem %3 width
	rem %4 height
	rem %5 hash
	rem %6 row count
	rem %7 col count

	This only works with windows, actually probably everything only works with windows.
	Using a custom launch file, will require writer to fill out the values themselves.
	Launching custom will still end up giving that bat file these parameters.
	But the only usable one is probably meetingID.
*/

function getLaunchParameters(isElectron) {
	var cfg;
	var dataReturn = [];

	// grab the correct config file
	if (isElectron != undefined && isElectron == "electron") {
		cfg = JSON5.parse(fs.readFileSync(pathToElectronConfig));
	} else {
		cfg = JSON5.parse(fs.readFileSync(pathToWinDefaultConfig));
	}

	dataReturn.push(pathToElectronConfig);
	dataReturn.push(cfg.index_port);

	// electron bat is designed to get full resolution since it assumes only 1 electorn window.
	if (isElectron != undefined && isElectron == "electron") {
		dataReturn.push(cfg.resolution.width * cfg.layout.columns);
		dataReturn.push(cfg.resolution.height * cfg.layout.rows);
	} else {
		dataReturn.push(cfg.resolution.width);
		dataReturn.push(cfg.resolution.height);
	}

	dataReturn.push(getMeetingIDFromPasswd());
	dataReturn.push(cfg.host);

	return dataReturn;
}





