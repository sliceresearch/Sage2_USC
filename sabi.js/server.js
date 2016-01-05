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
var util  = require('util');
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
var pathToWinStartupFolder		= path.join(homedir(), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "startWebCon.bat" );
var pathToMonitorDataFile		= path.join("scripts", "MonitorInfo.json"); //gets written here due to nature of the winScriptHelperWriteMonitorRes.exe file.
var pathToSabiConfigFolder		= path.join(homedir(), "Documents", "SAGE2_Media", "sabiConfig");
var pathToFindMonitorData		= path.join(pathToSabiConfigFolder, "scripts", "winScriptHelperWriteMonitorRes.exe");
var pathToSage2onbatScript		= path.join(pathToSabiConfigFolder, "scripts", "sage2_on.bat");
var pathToGoWindowsCertGenFile	= path.join(pathToSabiConfigFolder, "scripts", "GO-windows.bat"); // "../keys/GO-windows.bat";
var pathToActivateGoWindowsCert = path.join(pathToSabiConfigFolder, "scripts", "activateWindowsCertGenerator.bat" );
var needToRegenerateSageOnFile	= true; //always check at least once
var scriptExecutionFunction		= require('./src/script').Script;
var commandExecutionFunction	= require('./src/script').Command;

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
	console.log('Checking SAGE2 folders...')
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
		fs.createReadStream(configInput).pipe(fs.createWriteStream(configOuput));
	} else if (platform === "Mac OS X" && !fileExists(pathToMacDefaultConfig) ) {
		configInput = path.join("scripts", "default-cfg.json");
		configOuput = pathToMacDefaultConfig;//path.join(media, "config", "default-cfg.json");

		console.log('Delete this comment later: config file does not exist tried to write to:' + configOuput);
		console.log('    from file:' + configInput);

		// do the actual copy
		fs.createReadStream(configInput).pipe(fs.createWriteStream(configOuput));
	}

	//always ov
	if (platform === "Windows") {
		var sfpContents = 'cd "' + __dirname + '\\..' + '"\n';
		sfpContents += 'set PATH=%CD%\\bin;%PATH%;\n';
		sfpContents += 'cd sabi.js\n';
		sfpContents += 'start /MIN ..\\bin\\node server.js -f '+ pathToSabiConfigFolder +'\\config\\sage2.json %*';
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
			fs.createReadStream(sabiMediaCopy).pipe(fs.createWriteStream(sabiMediaCheck));
		}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts");
		if (!folderExists(sabiMediaCheck)) {
			mkdirParent(sabiMediaCheck);
		}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "sage2_on.bat");
		if (!fileExists(sabiMediaCheck)) {
			sabiMediaCopy = path.join("scripts", "sage2_on.bat");
			fs.createReadStream(sabiMediaCopy).pipe(fs.createWriteStream(sabiMediaCheck));
		}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "sage2_off.bat");
		if (!fileExists(sabiMediaCheck)) {
			sabiMediaCopy = path.join("scripts", "sage2_off.bat");
			fs.createReadStream(sabiMediaCopy).pipe(fs.createWriteStream(sabiMediaCheck));
		}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "winScriptHelperWriteMonitorRes.exe");
		if (!fileExists(sabiMediaCheck)) {
			sabiMediaCopy = path.join("scripts", "winScriptHelperWriteMonitorRes.exe");
			fs.createReadStream(sabiMediaCopy).pipe(fs.createWriteStream(sabiMediaCheck));
		}
	sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "GO-windows.bat");
		if (!fileExists(sabiMediaCheck)) {
			sabiMediaCopy = path.join("..", "keys", "GO-windows.bat");
			fs.createReadStream(sabiMediaCopy).pipe(fs.createWriteStream(sabiMediaCheck));
		}
	// sabiMediaCheck = path.join(pathToSabiConfigFolder, "scripts", "activateWindowsCertGenerator.bat");
	// 	if (!fileExists(sabiMediaCheck)) {
	// 		sabiMediaCopy = path.join("scripts", "activateWindowsCertGenerator.bat");
	// 		fs.createReadStream(sabiMediaCopy).pipe(fs.createWriteStream(sabiMediaCheck));
	// 	}

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
	}
	catch (err0) {
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
				}
				catch (err1) {
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
var configdata = fs.readFileSync( ConfigFile );
var cfg = JSON5.parse(configdata);

// Get the port of the webserver from configuration file
if (cfg.global.server_port) {
	hport = parseInt( cfg.global.server_port );
}
// Get the port for TCP connection from configuration file
if (cfg.global.tcp_port) {
	tcp_port = parseInt( cfg.global.tcp_port );
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

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds){
			break;
		}
	}
}


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
		data += '<div data-role="panel" style="background: rgba(0,0,0,.80);" id="navpanel" data-display="overlay" data-theme="a">';
		data += '<h2>Menu</h2>';
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			data += '<p> <a data-role="button" data-icon="arrow-r" data-iconpos="right" href="#' +  b  + '">' + b + '</a> </p>\n';
		}
		data += '</div><!-- /panel --> ';
	}


	data += '<div data-role="header" data-position="fixed">\n';
	data += cfg.main.header ;
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
		data += '<div data-role="panel" id="navpanel" style="background: rgba(0,0,0,.80);" data-display="overlay" data-theme="a">';
		data += '<h2>Menu</h2>';
		data += '<p> <a data-role="button" data-icon="grid" data-iconpos="right" href="..">Home</a> </p>\n';
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			if (b!=name) {
				data += '<p> <a data-role="button" data-icon="arrow-r" data-iconpos="right" href="#' +  b  + '">' + b + '</a> </p>\n';
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
					if (c.actions[a].theme){
						theme = c.actions[a].theme;
					}
					role = "button";
					if (c.actions[a].role) {
						role = c.actions[a].role;
					}
					if (role=="button") {
						data += '<p><a data-icon="gear" data-role="button" data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">';
						} else {
							data += c.actions[a].action +'">';
						}
						data += c.actions[a].title;
						data += '</a> </p>\n';
					} else if (role =="collapsible") {
						collapsed = true;
						if (c.actions[a].collapsed == "false") {
							collapsed = false;
						}
						data += '<div data-role="collapsible" data-collapsed="' + collapsed +'" ';
						data += 'data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">\n';
						} else {
							data += c.actions[a].action +'">\n';
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
							data += 'data-theme="' + theme + '" class="sabijs" id="' + c.actions[a].macro +'">\n';
						} else {
							data += 'data-theme="' + theme + '" class="sabijs" id="' + c.actions[a].action +'">\n';
						}
						data += '</div>\n';
					} else if (role == "inputText") {
						data += '<p><input type="text" class="sabijs" placeholder="' + c.actions[a].placeholder + '" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">';
						} else {
							data += c.actions[a].action +'">';
						}
						data += '</input> </p>\n';
					} else if (role == "inputPassword") {
						data += '<p><input type="password" class="sabijs" placeholder="' + c.actions[a].placeholder + '" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">';
						} else {
							data += c.actions[a].action +'">';
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
					if (role=="button") {
						data += '<p><a data-icon="gear" data-role="button" data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">';
						} else {
							data += c.actions[a].action +'">';
						}
						data += c.actions[a].title;
						data += '</a> </p>\n';
					} else if (role =="collapsible") {
						collapsed = true;
						if (c.actions[a].collapsed == "false") {
							collapsed = false;
						}
						data += '<div data-role="collapsible" data-collapsed="' + collapsed +'" ';
						data += 'data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">\n';
						} else {
							data += c.actions[a].action +'">\n';
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
			if (b!=name && cfg[b].navbar && cfg[b].navbar=="true" ) {
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
					} catch(e) {
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
			data = fs.readFileSync(__dirname + apath);

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
			var filename   = cfg.actions[action].editor;
			filename = path.resolve(untildify(filename));
			var wstream    = fs.createWriteStream(filename);

			wstream.on('finish', function() {
				// stream closed
				console.log('HTTP>		PUT file has been written', filename, fileLength, 'bytes');
				needToRegenerateSageOnFile = true;
				updateCertificates();
				makeMonitorInfoFile();
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

// hserver = http.createServer(function(req, res){
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
}
else {
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
    	console.log("Found macro:",id);
    	processMacro(id);
    }
    // Is it an action ?
    if (actions && id in actions) {
      // if the id is an action
      var act = id;
      if ( actions[act].oscmessage ) {
          // the action is an OSC message
          if (actions[act].parameters) {
          	processOSC({message: actions[act].oscmessage,
          		server: actions[act].server,
          		parameters: [ actions[act].parameters ] } );
          } else {
          	processOSC({message: actions[act].oscmessage,
          		server: actions[act].server } );
          }
      } else if ( actions[act].serial ) {
        // the action is a serial-port message
        processSerialPort({message:actions[act].serial, baud:actions[act].baud, port: actions[act].port});
    } else if ( actions[act].command ) {
        // the action is a command (as opposed to a script)
        console.log("Command", actions[act].command);
        processRPC( {method: 'command', value: [act, actions[act].command] } );
    } else {
        // The action is a script on the local machine
        console.log("Should trigger:", actions[act].script);
        processRPC( {method: 'action', value: [act, actions[act].script] } );
    }
}
else {
	console.log("Action unknown: [%s]", id);
}
}

// Callback method executed when data is received from a socket
//
function receiveTCPData(socket, data) {
	// Clean up the message
	mesg = data.toString().replace(/(\r\n|\n|\r)/gm,"");
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
// console.log("TCP server running at localhost:" + tcp_port );


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
		    		parameters: [ actions[act].parameters ]});
		    } else {
		    	processOSC({message: actions[act].oscmessage, server: actions[act].server});
		    }
		} else if ( actions[act].serial ) {
		  // the action is a serial-port message
		  processSerialPort({message:actions[act].serial, baud:actions[act].baud, port:actions[act].port});
		} else if ( actions[act].command ) {
			// the action is a command (as opposed to a script)
			console.log("Here", act, actions[act].command);
			processRPC({method:'command', value:[act, actions[act].command]});
		} else {
		  // The action is a script on a machine (remote or local)
		  // if it's on a different server
		  if (actions[act].server) {
		  	var url = 'http://' + actions[act].server;
		  	console.log("Connecting to:", url);
		  	var remotesocket = cio.connect( url );
		  	console.log("Connected to server: " + url);
		  	remotesocket.emit('RPC', {method: 'action', value: [act, actions[act].script]});
		  	remotesocket.once('return', function (data) {
		  		console.log("remote status: ", data);
		  	}); // jshint ignore:line
		  } else {
		    //if (actions[act].return == "process")
		    //  this.sendCallandProcess('action', [act, actions[act].script]);
		    // else
		    processRPC({method:'action', value:[act, actions[act].script]});
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
						} catch(e) {
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

function processRPC(data, socket) { // dkedits made to account for makeNewMeetingID
	console.log("RPC for:", data);
	var found = false; 
	if (data.value[0].indexOf("sage2-on") !== -1) {
		console.log('Delete this comment later: Intercepting sage2-on action.');
		updateConfigFileToAccountForMonitorsAndResolution();
		console.log("After update config file before write sage on file");
		writeSageOnFileWithCorrectPortAndMeetingID(data);
		needToRegenerateSageOnFile = false;
	}
	//interception to activate data.method actions script from SAGE2_Media\sabiConfig folder
	if(data.value[1] && data.value[1].indexOf("scripts\\") === 0) {
		data.value[1] = pathToSabiConfigFolder + "\\" + data.value[1];
	}
	for (var f in AppRPC) {
		var func = AppRPC[f];
		if (typeof func == "function") {
			if (f == data.method) {
				(func)(data,socket);
				found = true;
			}
		}
	}
	if (!found && data.method === "makeNewMeetingID") {
		var jsonString = '{ "pwd" : "' + data.value[0] + '" }';
		console.log('meetingID save double checking:' + jsonString);
		fs.writeFileSync(pathToSageUiPwdFile, jsonString);
		needToRegenerateSageOnFile = true;
	}
	if (!found && data.method === "makeNewLauncherPassword") {
		console.log('Setting new launcher password', data.value[0]);
		htdigest.htdigest_save("users.htpasswd", "sabi", "sage2", data.value[0]);
	}
	if (!found && data.method === "performGitUpdate") {
		console.log('Rewriting launcher to initiate git update before launching sabi');

		//check for Windows startup file
		if (platform === "Windows") {
			var sfpContents = 'cd "' + __dirname + '\\..' + '"\n';
			sfpContents += 'set PATH=%CD%\\bin;%PATH%;\n';
			sfpContents += 'git fetch --all\n';
			sfpContents += 'git reset --hard origin/master\n';
			sfpContents += 'cd sabi.js\n';
			sfpContents += 'start /MIN ..\\bin\\node server.js -f '+ pathToSabiConfigFolder +'\\config\\sage2.json %*';
			fs.writeFileSync(pathToWinStartupFolder, sfpContents);

			commandExecutionFunction("shutdown -r -t 1", null);
		}
		else {
			console.log("Error, update function not supported on this OS.");
		}

	}
}

function writeSageOnFileWithCorrectPortAndMeetingID( data ) {
	var port 		= getPortUsedInConfig();
	var meetingID 	= getMeetingIDFromPasswd();
	var cfg 		= fs.readFileSync( pathToWinDefaultConfig, "utf8" );
		cfg 		= JSON5.parse(cfg);
	var monitorData = fs.readFileSync(pathToMonitorDataFile);
		monitorData = JSON5.parse(monitorData);
	var displayNumber = 0;

	if (port === null) {
		console.log("Error: null port value. Cannot write file new sage2_on file.");
		return;
	}

	var onFileLocation = path.join(pathToSabiConfigFolder, data.value[1]);

	if(onFileLocation === pathToSage2onbatScript) {
		console.log( "Script to activate matches " + pathToSage2onbatScript );
		console.log( "Going to overwrite it.");
		var rewriteContents;
			rewriteContents = "@rem off\n\n";
			rewriteContents += "This fill will be automatically regenerated through sabi usage.\n\n";
			rewriteContents += "start /MIN /D .. sage2.bat\n\n";
			rewriteContents += "timeout 2\n\n";
			rewriteContents += "rem clear the chrome folders\n";
			rewriteContents += "rmdir /q /s %APPDATA%\\chrome\n\n";
			rewriteContents += "rem audio client\n";
			rewriteContents += "set datadir=%APPDATA%\\chrome\\audio\n";
			rewriteContents += "mkdir %datadir%\n";
			rewriteContents += 'start "" "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --no-default-browser-check --new-window --disable-popup-blocking --no-first-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=600,300 --window-position=0,0 --user-data-dir=%datadir% http://localhost:'
			rewriteContents += port + '/audioManager.html?hash='+meetingID+' /B\n\n';
			rewriteContents += "timeout 5\n\n";
		for(var h = 0; h < cfg.layout.rows; h++) {
			for(var w = 0; w < cfg.layout.columns; w++) {
				displayNumber 	= (h * cfg.layout.columns + w);
				rewriteContents += "timeout 2\n\n";	
				rewriteContents += "rem display" + displayNumber + "\n";
				rewriteContents += "set datadir=%APPDATA%\\chrome\\display" + displayNumber + "\n";
				rewriteContents += "mkdir %datadir%\n";
				rewriteContents += 'start "" "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" ';
				rewriteContents += '--no-default-browser-check --new-window --disable-popup-blocking --no-first-run ';
				rewriteContents += '--enable-accelerated-compositing --allow-file-access-from-files ';
				rewriteContents += '--disable-session-crashed-bubble --allow-running-insecure-content ';
				rewriteContents += '--window-size=500,500 --window-position='+ (monitorData.tileCoordinates[displayNumber].col + 100) +','+ (monitorData.tileCoordinates[displayNumber].row + 100) +'  '; 
				rewriteContents += '--start-fullscreen --user-data-dir=%datadir% ';
				rewriteContents += '"http://localhost:'+port+'/display.html?clientID='+displayNumber+'&hash='+meetingID+'" /B\n\n';
			}
		}
		fs.writeFileSync(pathToSage2onbatScript, rewriteContents);
	}//end if onFileLocation === pathToSage2onbatScript
	else {
		console.log("Script doesn't match.");
		console.log("Will only change value of port and meeting id.");

		var originalFileContents = fs.readFileSync(onFileLocation, "utf8");
		var rewriteContents = originalFileContents.substring( 0, originalFileContents.indexOf("localhost") );
			rewriteContents += "localhost:" + port;
			originalFileContents = originalFileContents.substring( originalFileContents.indexOf("localhost") );
			originalFileContents = originalFileContents.substring( originalFileContents.indexOf("/") );
			rewriteContents += originalFileContents.substring(0, originalFileContents.indexOf("hash="));
			rewriteContents += "hash=" + meetingID;
			originalFileContents = originalFileContents.substring(originalFileContents.indexOf("\"") );
		while(originalFileContents.indexOf("localhost") !== -1) {
			rewriteContents += originalFileContents.substring( 0, originalFileContents.indexOf("localhost") );
			rewriteContents += "localhost:" + port;
			originalFileContents = originalFileContents.substring( originalFileContents.indexOf("localhost") );
			originalFileContents = originalFileContents.substring( originalFileContents.indexOf("/") );
			rewriteContents += originalFileContents.substring(0, originalFileContents.indexOf("hash="));
			rewriteContents += "hash=" + meetingID;
			originalFileContents = originalFileContents.substring(originalFileContents.indexOf("\"") );
		}
		rewriteContents += originalFileContents;
			
		fs.writeFileSync(onFileLocation, rewriteContents);
	}

}

function oldwriteSageOnFileWithCorrectPortAndMeetingIDold() {
	var port = getPortUsedInConfig();
	var meetingID = getMeetingIDFromPasswd();

	if (port === null) {
		console.log("Error: null port value. Cannot write file new sage2_on file.");
		return;
	}
	console.log('Delete this comment later:');
	console.log('   Port:' + port);
	console.log('   meetingID:' + meetingID);

	if (!fileExists(pathToSage2onbatScript)) {
		console.log("Error: sage2_on script missing");
		return;
	}

	var scriptContents = fs.readFileSync( pathToSage2onbatScript, "utf8" );
	console.log("scriptContents:" + scriptContents);
	var rewriteContents = scriptContents.substring(0, scriptContents.indexOf("localhost:"));
		rewriteContents += "localhost:" + port;
	scriptContents = scriptContents.substring(scriptContents.indexOf("/audioManager"));
		rewriteContents += scriptContents.substring(0, scriptContents.indexOf("audioManager.html"));
		rewriteContents += "audioManager.html?hash="+meetingID;
	scriptContents = scriptContents.substring(scriptContents.indexOf(" /B"));
		rewriteContents += scriptContents.substring(0, scriptContents.indexOf("localhost:"));
		rewriteContents += "localhost:" + port;
	scriptContents = scriptContents.substring(scriptContents.indexOf("/display"));
		rewriteContents += scriptContents.substring(0, scriptContents.indexOf("ID=0"));
		if (meetingID === null) { rewriteContents += 'ID=0"'; }
		else { rewriteContents += 'ID=0&hash='+meetingID+'"'; }
	scriptContents = scriptContents.substring(scriptContents.indexOf(" /B"));
		rewriteContents += scriptContents;

	fs.writeFileSync(pathToSage2onbatScript, rewriteContents);
}

function updateConfigFileToAccountForMonitorsAndResolution() {
	if(!fileExists(pathToMonitorDataFile)) {
		console.log("Error, asynchronous file writer through script function");
		process.exit();
	}

	var monitorData = fs.readFileSync(pathToMonitorDataFile);
		monitorData = JSON5.parse(monitorData);
	var cfg 		= fs.readFileSync(pathToWinDefaultConfig);
		cfg 		= JSON5.parse(cfg);
	var displays 	= [];
	var tdisp;

	var totalMonitors	= monitorData.tileWidth * monitorData.tileHeight;
	cfg.layout.columns	= monitorData.tileWidth;
	cfg.layout.rows		= monitorData.tileHeight;

	for(var height = 0; height < cfg.layout.rows; height++){
		for(var width = 0; width < cfg.layout.columns; width++){
			tdisp = {};
			tdisp.row = height;
			tdisp.column = width;
			displays.push(tdisp);
		}
	}

	cfg.displays = displays;
	fs.writeFileSync(pathToWinDefaultConfig, JSON5.stringify(cfg));
}


function getPortUsedInConfig() {
	var pathToConfig; //config name differs depending on OS.
	if (platform === "Windows") { pathToConfig = pathToWinDefaultConfig; }
	else if (platform === "Mac OS X") { pathToConfig = pathToMacDefaultConfig; }
	
	if (!fileExists(pathToConfig)) {
		console.log("Error, config doesn't exist.");
		return null;
	}

	var configdata = fs.readFileSync( pathToWinDefaultConfig );
	var cfg = JSON5.parse(configdata);
	return cfg.index_port;
}

function getMeetingIDFromPasswd() {
	//if there is no passwd file, then there is no need to add a hash to address.
	if (!fileExists(pathToSageUiPwdFile)) { return null; }
	
	var configdata = fs.readFileSync( pathToSageUiPwdFile );
	var cfg = JSON5.parse(configdata);
	return cfg.pwd;
}

function updateCertificates() {
	var pathToConfig; //config name differs depending on OS.
	if (platform === "Windows") { pathToConfig = pathToWinDefaultConfig; }
	else if (platform === "Mac OS X") { pathToConfig = pathToMacDefaultConfig; }
	
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
		rewriteContents += "call init_webserver.bat " + alternate + "\n";
	fs.writeFileSync(pathToGoWindowsCertGenFile, rewriteContents);

	var rewriteContents = "@echo off\n\n";
		rewriteContents += 'start /MIN /D "..\\keys" ' + pathToGoWindowsCertGenFile;
	fs.writeFileSync(pathToActivateGoWindowsCert, rewriteContents);

	scriptExecutionFunction( pathToActivateGoWindowsCert, false);
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
		console.log("Got: "+data);
		sp.close();
	});
	sp.on( "error", function( msg ) {
		console.log("error: " + msg );
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
			reply = new osc.Message(data.message, params[0],params[1]);
		}
		if (params.length === 3) {
			reply = new osc.Message(data.message, params[0],params[1],params[2]);
		}
		if (params.length === 4) {
			reply = new osc.Message(data.message, params[0],params[1],params[2],params[3]);
		}
		if (params.length === 5) {
			reply = new osc.Message(data.message, params[0],params[1],params[2],params[3],params[4]);
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
	var cfg = fs.readFileSync( ConfigFile );
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

	socket.on('disconnect', function (socket) {
		console.log("Connection closed");
	});

});


// ---------------------------------------------
// Start the webserver and get ready...
// ---------------------------------------------

// Listen on the given port and IPv4 local interfaces
hserver.listen(hport, "0.0.0.0");
console.log("\nHTTP server running at http://localhost:" + hport );
console.log("\n");

