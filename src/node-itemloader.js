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
 * @module itemLoader
 */


var fs        = require('fs');
var path      = require('path');
var url       = require('url');

var unzip     = require('decompress-zip');
var gm        = require('gm');
var mime      = require('mime');
var request   = require('request');
var ytdl      = require('ytdl-core');

var exiftool  = require('../src/node-exiftool');        // gets exif tags for images
var assets    = require('../src/node-assets');          // asset management
var registry  = require('../src/node-registry');  // Registry Manager

var imageMagick;
mime.default_type = "application/custom";

//////////////////////////////////////////////////////////////////////////////////////////


function encodeReservedURL(url) {
	return encodeURI(url).replace(/\$/g, "%24").replace(/\&/g, "%26").replace(/\+/g, "%2B").replace(/\,/g, "%2C").replace(/\:/g, "%3A").replace(/\;/g, "%3B").replace(/\=/g, "%3D").replace(/\?/g, "%3F").replace(/\@/g, "%40");
}

//////////////////////////////////////////////////////////////////////////////////////////
function appLoader(publicDir, hostOrigin, displayWidth, displayHeight, titleBarHeight, imConstraints) {
	this.publicDir = publicDir;
	this.hostOrigin = hostOrigin;
	this.displayWidth = displayWidth;
	this.displayHeight = displayHeight;
	this.titleBarHeight = titleBarHeight;

    this.app2dir = {
    	"image_viewer": "images",
    	"movie_player": "videos",
    	"pdf_viewer": "pdfs",
    	"custom_app": "apps"
    };

	imageMagick = gm.subClass(imConstraints);
}

//////////////////////////////////////////////////////////////////////////////////////////


appLoader.prototype.scaleAppToFitDisplay = function(appInstance) {
	var wallRatio = this.displayWidth / (this.displayHeight-this.titleBarHeight);
	var iWidth    = appInstance.native_width;
	var iHeight   = appInstance.native_height;
	// Image wider than wall
	if(iWidth > (this.displayWidth - (2*this.titleBarHeight)) && appInstance.aspect >= wallRatio) {
		// Image wider than wall
		iWidth  = this.displayWidth - (2*this.titleBarHeight);
		iHeight = iWidth / appInstance.aspect;
	}
	// Image taller than wall
	else if(iHeight > (this.displayHeight - (3*this.titleBarHeight)) && appInstance.aspect < wallRatio) {
		// Wall wider than image
		iHeight = this.displayHeight - (3*this.titleBarHeight);
		iWidth  = iHeight*appInstance.aspect;
	}

	appInstance.width = iWidth;
	appInstance.height = iHeight;
};

appLoader.prototype.loadImageFromURL = function(url, mime_type, name, strictSSL, callback) {
	var _this = this;
	request({url: url, encoding: null, strictSSL: strictSSL}, function(err, response, body) {
		if(err) throw err;

		var result = exiftool.buffer(body, function(err, info) {
			if (err) {
				console.log("Error processing image:", url, mime_type, name, result.err);
			}
			else
				if (info.ImageWidth && info.ImageHeight) {
					_this.loadImageFromDataBuffer(body, info.ImageWidth, info.ImageHeight, mime_type, url, url, name, info,
						function(appInstance) {
							callback(appInstance);
						}
					);
				} else {
					console.log("File not recognized:", file, mime_type, url);
				}
		});
	});
};

appLoader.prototype.loadYoutubeFromURL = function(url, callback) {
	var _this = this;

	ytdl.getInfo(url, function(err, info){
		if(err) throw err;

		var mp4 = {index: -1, resolution: 0};
		for(var i=0; i<info.formats.length; i++){
			if(info.formats[i].container == "mp4" && info.formats[i].resolution !== null && info.formats[i].profile != "3d"){
				var res = parseInt(info.formats[i].resolution.substring(0, info.formats[i].resolution.length-1));
				if(res > mp4.resolution){
					mp4.index = i;
					mp4.resolution = res;
				}
			}
		}
		var name = info.title;
		var aspectRatio = 16/9;
		var resolutionY = mp4.resolution;
		var resolutionX = resolutionY * aspectRatio;

		_this.loadVideoFromURL(url, "video/youtube", info.formats[mp4.index].url, name, resolutionX, resolutionY,
			function(appInstance) {
				callback(appInstance);
		});
	});
};

appLoader.prototype.loadVideoFromURL = function(url, mime_type, source, name, vw, vh, callback) {
	var aspectRatio = vw / vh;

	var metadata         = {};
	metadata.title       = "Video Player";
	metadata.version     = "1.0.0";
	metadata.description = "Video player for SAGE2";
	metadata.author      = "SAGE2";
	metadata.license     = "SAGE2-Software-License";
	metadata.keywords    = ["video", "movie", "player"];

	var appInstance = {
		id: null,
		title: name,
		application: "movie_player",
		type: mime_type,
		url: url,
		data: {
			src: source,
			type: 'video/mp4',
			play: false,
			time: 0.0
		},
		resrc: null,
		left: this.titleBarHeight,
		top: 1.5*this.titleBarHeight,
		width: vw,
		height: vh,
		native_width: vw,
		native_height: vh,
		previous_left: null,
		previous_top: null,
		previous_width: null,
		previous_height: null,
		maximized: false,
		aspect: aspectRatio,
		animation: false,
		metadata: metadata,
		sticky: false,
		date: new Date()
	};
	this.scaleAppToFitDisplay(appInstance);
	callback(appInstance);
};


appLoader.prototype.loadPdfFromURL = function(url, mime_type, name, strictSSL, callback) {
	var local_url = path.join("uploads", "pdfs", name);
	var localPath = path.join(this.publicDir, local_url);
	var _this = this;

	var tmp = fs.createWriteStream(localPath);
	tmp.on('error', function(err) {
		if(err) throw err;
	});
	tmp.on('close', function() {
		//loadPDF
		_this.loadPdfFromFile(localPath, mime_type, local_url, url, name, function(appInstance) {
			callback(appInstance);
		});
	});
	request({url: url, strictSSL: strictSSL}).pipe(tmp);
};


appLoader.prototype.loadImageFromDataBuffer = function(buffer, width, height, mime_type, url, external_url, name, exif_data, callback) {
	var source = buffer.toString("base64");
	var aspectRatio = width / height;

	var metadata         = {};
	metadata.title       = "Image Viewer";
	metadata.version     = "1.0.0";
	metadata.description = "Image viewer for SAGE2";
	metadata.author      = "SAGE2";
	metadata.license     = "SAGE2-Software-License";
	metadata.keywords    = ["image", "picture", "viewer"];

	var appInstance = {
		id: null,
		title: name,
		application: "image_viewer",
		icon: exif_data.SAGE2thumbnail,
		type: mime_type,
		url: external_url,
		data: {
			src: source,
			type: mime_type,
			exif: exif_data
		},
		resrc: null,
		left: this.titleBarHeight,
		top: 1.5*this.titleBarHeight,
		width: width,
		height: height,
		native_width: width,
		native_height: height,
		previous_left: null,
		previous_top: null,
		previous_width: null,
		previous_height: null,
		maximized: false,
		aspect: aspectRatio,
		animation: false,
		metadata: metadata,
		sticky: false,
		date: new Date()
	};
	this.scaleAppToFitDisplay(appInstance);
	callback(appInstance);
};

appLoader.prototype.loadImageFromFile = function(file, mime_type, url, external_url, name, callback) {
	var _this = this;

	if(mime_type === "image/jpeg" || mime_type === "image/png" || mime_type === "image/webp"){
		fs.readFile(file, function (err, data) {
			if(err) {
				console.log("Error> opening file", file);
				return; // throw err;
			}

			// Query the exif data
			var dims = assets.getDimensions(file);
			var exif = assets.getExifData(file);

			if (dims) {
				_this.loadImageFromDataBuffer(data, dims.width, dims.height, mime_type, url, external_url, name, exif, function(appInstance) {
					callback(appInstance);
				});
			} else {
				console.log("File not recognized:", file, mime_type, url);
			}
		});
	}
	// SVG file
	else if (mime_type === "image/svg+xml") {
		fs.readFile(file, function (err, data) {
			if(err) {
				console.log("Error> opening file", file);
				return; // throw err;
			}

			// Query the exif data
			var box  = assets.getTag(file, "ViewBox").split(' ');
			var dims = {width:parseInt(box[2]), height:parseInt(box[3])};
			var exif = assets.getExifData(file);

			if (dims) {
				_this.loadImageFromDataBuffer(data, dims.width, dims.height, mime_type, url, external_url, name, exif, function(appInstance) {
					callback(appInstance);
				});
			} else {
				console.log("File not recognized:", file, mime_type, url);
			}
		});
	}
	else{
		imageMagick(file+"[0]").noProfile().bitdepth(8).flatten().setFormat("PNG").toBuffer(function (err, buffer) {
			if(err) {
				console.log("Error> processing image file", file);
				return; // throw err;
			}

			// imageMagick(buffer).size(function (err, size) {
			// 	if(err) {
			// 		console.log("Error> getting buffer size for file", file);
			// 		return; // throw err;
			// 	}
			// 	_this.loadImageFromDataBuffer(buffer, size.width, size.height, "image/png", url, external_url, name, function(appInstance) {
			// 		callback(appInstance);
			// 	});
			// });

			// Query the exif data
			var dims = assets.getDimensions(file);
			var exif = assets.getExifData(file);

			if (dims) {
				_this.loadImageFromDataBuffer(buffer, dims.width, dims.height, "image/png", url, external_url, name, exif, function(appInstance) {
					callback(appInstance);
				});
			} else {
				console.log("File not recognized:", file, mime_type, url);
			}
		});

	}
};


appLoader.prototype.loadVideoFromFile = function(file, mime_type, url, external_url, name, callback) {
	// Query the exif data
	var dims = assets.getDimensions(file);
	var mime = assets.getMimeType(file);

	if (mime === 'video/quicktime' && mime_type === 'video/mp4')
		mime = 'video/mp4';

	if (dims && mime) {
		if (mime === "video/mp4" || mime === "video/webm" || mime === "video/x-m4v" ) {
			var metadata         = {};
			metadata.title       = "Video Player";
			metadata.version     = "1.0.0";
			metadata.description = "Video player for SAGE2";
			metadata.author      = "SAGE2";
			metadata.license     = "SAGE2-Software-License";
			metadata.keywords    = ["video", "movie", "player"];

			var exif = assets.getExifData(file);

			var appInstance = {
				id: null,
				title: name,
				application: "movie_player",
				icon: exif.SAGE2thumbnail,
				type: mime_type,
				url: external_url,
				data: {
					src: external_url,
					type: mime,
					play: false,
					time: 0.0
				},
				resrc: null,
				left:  this.titleBarHeight,
				top:   1.5 * this.titleBarHeight,
				width:  dims.width,
				height: dims.height,
				native_width:    dims.width,
				native_height:   dims.height,
				previous_left:   null,
				previous_top:    null,
				previous_width:  null,
				previous_height: null,
				maximized:       false,
				aspect:          dims.width / dims.height,
				animation:       false,
				metadata:        metadata,
				sticky: 		 false,
				date:            new Date()
			};
			this.scaleAppToFitDisplay(appInstance);
			callback(appInstance);
			return;
		}
	}
};


appLoader.prototype.loadPdfFromFile = function(file, mime_type, url, external_url, name, callback) {
	// Assume default to Letter size
	var page_width  = 612;
	var page_height = 792;

	var aspectRatio = page_width/page_height;

	var metadata         = {};
	metadata.title       = "PDF Viewer";
	metadata.version     = "1.0.0";
	metadata.description = "PDF viewer for SAGE2";
	metadata.author      = "SAGE2";
	metadata.license     = "SAGE2-Software-License";
	metadata.keywords    = ["pdf", "document", "viewer"];

	var exif = assets.getExifData(file);

	var appInstance = {
		id: null,
		title: name,
		application: "pdf_viewer",
		icon: exif.SAGE2thumbnail,
		type: mime_type,
		url: external_url,
		data: {
			src: external_url,
			page: 1,
			numPagesShown: 1
		},
		resrc:  null,
		left:   this.titleBarHeight,
		top:    1.5 * this.titleBarHeight,
		width:  page_width,
		height: page_height,
		native_width:    page_width,
		native_height:   page_height,
		previous_left:   null,
		previous_top:    null,
		previous_width:  null,
		previous_height: null,
		maximized: false,
		aspect:    aspectRatio,
		animation: false,
		metadata: metadata,
		sticky: false,
		date:      new Date()
	};
	this.scaleAppToFitDisplay(appInstance);
	callback(appInstance);
};

appLoader.prototype.readInstructionsFile = function(instructionsFile, callback) {
    var thumbnailHostPath = null;
    var instr = {};
    fs.readFile(instructionsFile, 'utf8', function(err, json_str) {
		if(err) throw err;

        var instructions = JSON.parse(json_str);
        instr.width = instructions.width;
        instr.height = instructions.height;
        instr.aspectRatio = instructions.width / instructions.height;
        // if icon provided, build the url to it
        instr.icon  = instructions.icon ? url+"/"+instructions.icon : null;
        instr.appName = instructions.main_script.substring(0, instructions.main_script.lastIndexOf('.'));

        instr.metadata = {};
        if (instructions.title !== undefined && instructions.title !== null && instructions.title !== "")
            instr.metadata.title = instructions.title;
        else instr.metadata.title = instr.appName;
        if (instructions.version !== undefined && instructions.version !== null && instructions.version !== "")
            instr.metadata.version = instructions.version;
        else metadata.version = "1.0.0";
        if (instructions.description !== undefined && instructions.description !== null && instructions.description !== "")
            instr.metadata.description = instructions.description;
        else metadata.description = "-";
        if (instructions.author !== undefined && instructions.author !== null && instructions.author !== "")
            instr.metadata.author = instructions.author;
        else metadata.author = "SAGE2";
        if (instructions.license !== undefined && instructions.license !== null && instructions.license !== "")
            instr.metadata.license = instructions.license;
        else metadata.license = "-";
        if (instructions.keywords !== undefined && instructions.keywords !== null && Array.isArray(instructions.keywords) )
            instr.metadata.keywords = instructions.keywords;
        else metadata.keywords = [];
        if (instructions.dependencies !== undefined && instructions.dependencies !== null && instructions.dependencies !== "")
            instr.dependencies = instructions.dependencies;
        if (instructions.fileTypes !== undefined && instructions.fileTypes !== null && Array.isArray(instructions.fileTypes) ) {
            instr.directory = ""
            if (instructions.directory !== undefined && instructions.directory !== null && instructions.directory !== "")
                instr.directory = instructions.directory;
            if(this.registryManager ===undefined || this.registryManager === null) this.registryManager = new registry();
            this.registryManager.register(instr.appName, instructions.fileTypes, instr.directory);
            this.registryManager.writeRegistry();
        }
        instr.resizeMode = "proportional";
		if (instructions.resize !== undefined && instructions.resize !== null && instructions.resize !== "")
			instr.resizeMode = instructions.resize;

        callback(instr);
    });

}

appLoader.prototype.loadApp = function(file, mime_type, url, external_url, name, callback) {
	var _this = this;

    // Find the app!!
    var appName = this.registryManager.type2app[mime_type];
	console.log("Loader> Loading %s with %s", mime_type, appName);

    var instructionsFile = path.join(this.publicDir, "uploads", "apps", appName, "instructions.json");
    console.log("Reading: %s", instructionsFile);
    this.readInstructionsFile(instructionsFile, function(instructions) {
        console.log(instructions);

        // Find the app
        // Create the correct external url
        var app_url = path.join("uploads", "apps", appName);
        var app_external_url = _this.hostOrigin + encodeReservedURL(app_url);


        var appInstance = {
            id: null,
            title: instructions.metadata.title,
            application: instructions.appName,
            type: instructions.mime_type,
            url: app_external_url,
            data: {
                src: file,
                //type: file,
                //encoding: encoding
            },
            resrc: instructions.dependencies,
            icon: instructions.icon,
            left: _this.titleBarHeight,
            top: 1.5*_this.titleBarHeight,
            width: instructions.width,
            height: instructions.height,
            native_width: instructions.width,
            native_height: instructions.height,
            previous_left: null,
            previous_top: null,
            previous_width: null,
            previous_height: null,
            maximized: false,
            aspect: instructions.aspectRatio,
            animation: instructions.animation,
            metadata: instructions.metadata,
            resizeMode: instructions.resizeMode,
            date: new Date()
        };
        console.log(appInstance);
        callback(appInstance);
    });
};


appLoader.prototype.loadAppFromFile = function(file, mime_type, url, external_url, name, callback) {
	var _this = this;
	var zipFolder = file;

	var instuctionsFile = path.join(zipFolder, "instructions.json");
	fs.readFile(instuctionsFile, 'utf8', function(err, json_str) {
		if(err) throw err;

		var instructions = JSON.parse(json_str);
		var appName = instructions.main_script.substring(0, instructions.main_script.lastIndexOf('.'));
		var aspectRatio = instructions.width / instructions.height;

		var resizeMode = "proportional";
		if (instructions.resize !== undefined && instructions.resize !== null && instructions.resize !== "")
			resizeMode = instructions.resize;

		var exif = assets.getExifData(zipFolder);

		var appInstance = {
			id: null,
			title: exif.metadata.title,
			application: appName,
			icon: exif.SAGE2thumbnail,
			type: mime_type,
			url: external_url,
			data: instructions.load,
			resrc: instructions.dependencies,
			left: _this.titleBarHeight,
			top: 1.5*_this.titleBarHeight,
			width: instructions.width,
			height: instructions.height,
			native_width: instructions.width,
			native_height: instructions.height,
			previous_left: null,
			previous_top: null,
			previous_width: null,
			previous_height: null,
			maximized: false,
			aspect: aspectRatio,
			animation: instructions.animation,
			metadata: exif.metadata,
			resizeMode: resizeMode,
			sticky:instructions.sticky,
			date: new Date()
		};
		//_this.scaleAppToFitDisplay(appInstance);
		callback(appInstance);
	});
};

appLoader.prototype.loadZipAppFromFile = function(file, mime_type, url, external_url, name, callback) {
	var _this = this;
	var zipFolder = path.join(path.dirname(file), name);

	var unzipper = new unzip(file);
	unzipper.on('extract', function(log) {
		// read instructions for how to handle
		var instuctionsFile = path.join(zipFolder, "instructions.json");
		fs.readFile(instuctionsFile, 'utf8', function(err, json_str) {
			if(err) throw err;

			assets.exifAsync([zipFolder], function(err){
				if(err) throw err;

				var instructions = JSON.parse(json_str);
				var appName = instructions.main_script.substring(0, instructions.main_script.lastIndexOf('.'));
				var aspectRatio = instructions.width / instructions.height;

				var resizeMode = "proportional";
				if (instructions.resize !== undefined && instructions.resize !== null && instructions.resize !== "")
					resizeMode = instructions.resize;

				var exif = assets.getExifData(zipFolder);

				var appInstance = {
					id: null,
					title: exif.metadata.title,
					application: appName,
					icon: exif.SAGE2thumbnail,
					type: mime_type,
					url: external_url,
					data: instructions.load,
					resrc: instructions.dependencies,
					left: _this.titleBarHeight,
					top: 1.5*_this.titleBarHeight,
					width: instructions.width,
					height: instructions.height,
					native_width: instructions.width,
					native_height: instructions.height,
					previous_left: null,
					previous_top: null,
					previous_width: null,
					previous_height: null,
					maximized: false,
					aspect: aspectRatio,
					animation: instructions.animation,
					metadata: exif.metadata,
					resizeMode: resizeMode,
					sticky:instructions.sticky,
					date: new Date()
				};
				_this.scaleAppToFitDisplay(appInstance);
				callback(appInstance);
			});
		});

		// delete original zip file
		fs.unlink(file, function(err) {
			if(err) throw err;
		});
	});
	unzipper.extract({
		path: path.dirname(file),
		filter: function(extractedFile) {
			if(extractedFile.type === "SymbolicLink") return false;
			if(extractedFile.filename === "__MACOSX") return false;
			if(extractedFile.filename.substring(0,1) === ".") return false;
			if(extractedFile.parent.length >= 8 && extractedFile.parent.substring(0,8) === "__MACOSX") return false;

			return true;
		}
	});
};

appLoader.prototype.createMediaStream = function(source, type, encoding, name, color, width, height, callback) {
	var aspectRatio = width/height;

	var metadata         = {};
	metadata.title       = "Stream Player";
	metadata.version     = "1.0.0";
	metadata.description = "Stream player for SAGE2";
	metadata.author      = "SAGE2";
	metadata.license     = "SAGE2-Software-License";
	metadata.keywords    = ["stream", "network", "player"];

	var appInstance = {
		id: null,
		title: name,
		color: color,
		application: "media_stream",
		type: "application/stream",
		url: null,
		data: {
			src: source,
			type: type,
			encoding: encoding
		},
		resrc: null,
		left: this.titleBarHeight,
		top: 1.5*this.titleBarHeight,
		width: width,
		height: height,
		native_width: width,
		native_height: height,
		previous_left: null,
		previous_top: null,
		previous_width: null,
		previous_height: null,
		maximized: false,
		aspect: aspectRatio,
		animation: false,
		sticky:false,
		metadata: metadata,
		date: new Date()
	};
	this.scaleAppToFitDisplay(appInstance);
	callback(appInstance);
};

appLoader.prototype.loadApplicationFromRemoteServer = function(application, callback) {
	var _this = this;
	this.loadApplication({location: "remote", application: application}, function(appInstance) {
		// cannot use same video url source for youtube
		// must dynamically generate new one
		if(application.type === "video/youtube") {
			_this.loadYoutubeFromURL(application.url, function(youtubeApp) {
				appInstance.data.src = youtubeApp.data.src;
				callback(appInstance);
			});
		}
		else {
			callback(appInstance);
		}
	});
};

appLoader.prototype.loadFileFromWebURL = function(file, callback) {
	// XXX - Will this work with our custom apps?
    var mime_type = file.type;
	var filename = decodeURI(file.url.substring(file.url.lastIndexOf("/")+1));

	this.loadApplication({location: "url", url: file.url, type: mime_type, name: filename, strictSSL: true}, function(appInstance) {
		callback(appInstance);
	});
};

appLoader.prototype.loadFileFromLocalStorage = function(file, callback) {
	var app = file.application;
	var dir = this.app2dir[app];

	var url = path.join("uploads", dir, file.filename);
	var external_url = this.hostOrigin + encodeReservedURL(url);
	var localPath = path.join(this.publicDir, url);
	var mime_type = mime.lookup(localPath);

	this.loadApplication({location: "file", path: localPath, url: url, external_url: external_url, type: mime_type, name: file.filename, compressed: false}, function(appInstance) {
		callback(appInstance);
	});
};

appLoader.prototype.manageAndLoadUploadedFile = function(file, callback) {
    var mime_type = mime.lookup(file.name);
	var app = registry.getDefaultApp(file.name);
	if (app === undefined || app === "") { callback(null); return; }

    // XXX
    var dir = "";
    //var dir = this.app2dir[app];
    //if (dir === null || dir === undefined || dir === "") {
    //    dir = this.registryManager.type2dir[mime_type];
    //}

	var _this = this;
    if (!fs.existsSync(path.join(this.publicDir, "uploads", dir))) {
        fs.mkdirSync(path.join(this.publicDir, "uploads", dir));
    }
	var url = path.join("uploads", dir, file.name);
	var external_url = this.hostOrigin + encodeReservedURL(url);
	var localPath = path.join(this.publicDir, url);

	// Filename exists, then add date
	if (fs.existsSync(localPath)) {
		// Add the date to filename
		var filen  = file.name;
		var splits = filen.split('.');
		var extension   = splits.pop();
		var newfilename = splits.join('_') + "_" + Date.now() + '.' + extension;
		// Regenerate path and url
		url = path.join("uploads", dir, newfilename);
		external_url = this.hostOrigin + encodeReservedURL(url);
		localPath    = path.join(this.publicDir, url);
	}

	fs.rename(file.path, localPath, function(err) {
		if(err) throw err;

		if (app === "image_viewer" || app === "movie_player" || app === "pdf_viewer") {
			exiftool.file(localPath, function(err,data) {
				if (err) {
					console.log("internal error");
				} else {
					console.log("EXIF> Adding", data.FileName);
					assets.addFile(data.SourceFile, data, function() {
						_this.loadApplication({location: "file", path: localPath, url: url, external_url: external_url, type: mime_type, name: file.name, compressed: true}, function(appInstance) {
							callback(appInstance);
						});
					});
				}
			});
		}
		else {
			_this.loadApplication({location: "file", path: localPath, url: url, external_url: external_url, type: mime_type, name: file.name, compressed: true}, function(appInstance) {
				callback(appInstance);
			});
		}
	});
};

appLoader.prototype.loadApplication = function(appData, callback) {
	var app = null;

	if(appData.location === "file") {
		app = registry.getDefaultApp(appData.path);

        var dir = "";
		//var dir = this.app2dir[app];
        //if (dir === null || dir === undefined || dir === "") {
        //    dir = this.registryManager.type2dir[appData.type];
        //}

		if(app === "image_viewer"){
			this.loadImageFromFile(appData.path, appData.type, appData.url, appData.external_url, appData.name, function(appInstance) {
				callback(appInstance);
			});
		}
		else if(app === "movie_player"){
			this.loadVideoFromFile(appData.path, appData.type, appData.url, appData.external_url, appData.name, function(appInstance) {
				callback(appInstance);
			});
		}
		else if(app === "pdf_viewer"){
            console.log(appData);
			this.loadPdfFromFile(appData.path, appData.type, appData.url, appData.external_url, appData.name, function(appInstance) {
				callback(appInstance);
			});
		}
		else if(app === "custom_app"){
			if(appData.compressed === true) {
				var name = path.basename(appData.name, path.extname(appData.name));
				var url = path.join("uploads", dir, name);
				var external_url = this.hostOrigin + encodeReservedURL(url);
				this.loadZipAppFromFile(appData.path, appData.type, url, external_url, name, function(appInstance) {
					callback(appInstance);
				});
			}
			else {
                console.log(appData);
				this.loadAppFromFile(appData.path, appData.type, appData.url, appData.external_url, appData.name, function(appInstance) {
					callback(appInstance);
				});
			}
		}
        else {
            //this.loadApp(appData.path, appData.type, appData.url, appData.external_url, appData.name, function(appInstance) {
            //    callback(appInstance);
            //});
        }
	}

	else if(appData.location === "url") {
		app = this.registryManager.type2app[appData.type];

		if(app === "image_viewer"){
			this.loadImageFromURL(appData.url, appData.type, appData.name, appData.strictSSL, function(appInstance) {
				callback(appInstance);
			});
		}
		else if(app === "movie_player"){
			if(appData.type === "video/youtube"){
				this.loadYoutubeFromURL(appData.url, function(appInstance) {
					callback(appInstance);
				});
			}
			else {
				// Fixed size since cant process exif on URL yet
				this.loadVideoFromURL(appData.url, appData.type, appData.url, appData.name, 1280, 720, function(appInstance) {
					callback(appInstance);
				});
			}
		}
		else if(app === "pdf_viewer"){
			this.loadPdfFromURL(appData.url, appData.type, appData.name, appData.strictSSL, function(appInstance) {
				callback(appInstance);
			});
		}
	}

	else if(appData.location === "remote") {
		var appInstance = {
			id: appData.application.id,
			title: appData.application.title,
			application: appData.application.application,
			type: appData.application.type,
			url: appData.application.url,
			data: appData.application.data,
			resrc: appData.application.resrc,
			left: this.titleBarHeight,
			top: 1.5*this.titleBarHeight,
			width: appData.application.native_width,
			height: appData.application.native_height,
			native_width: appData.application.native_width,
			native_height: appData.application.native_height,
			previous_left: null,
			previous_top: null,
			previous_width: null,
			previous_height: null,
			maximized: false,
			aspect: appData.application.aspect,
			animation: appData.application.animation,
			metadata: appData.application.metadata,
			sticky:appData.application.sticky,
			date: new Date()
		};
		this.scaleAppToFitDisplay(appInstance);
		callback(appInstance);
	}
};

//////////////////////////////////////////////////////////////////////////////////////////

module.exports = appLoader;
