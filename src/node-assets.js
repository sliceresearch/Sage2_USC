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
 * @module asset
 */


var fs        = require('fs');
var json5     = require('json5');
var path      = require('path');
var url       = require('url');
var gm        = require('gm');                   // imagesmagick
var exiftool  = require('../src/node-exiftool'); // gets exif tags for images


// Global variable to handle iamgeMagick configuration
var imageMagick;

//////////////////////////////////////////////////////////////////////////////////////////

function Asset() {
	this.filename = null;
	this.url      = null;
	this.id       = null;
	this.exif     = null;
}


Asset.prototype.setURL = function(aUrl) {
    this.url = aUrl;
    this.id  = aUrl;
};

Asset.prototype.setFilename = function(aFilename) {
    this.filename = path.resolve(aFilename);
    this.id       = this.filename;
};

Asset.prototype.setEXIF = function(exifdata) {
    this.exif = exifdata;
};

Asset.prototype.width = function() {
    return this.exif.ImageWidth;
};
Asset.prototype.height = function() {
    return this.exif.ImageHeight;
};

var AllAssets = null;


//////////////////////////////////////////////////////////////////////////////////////////


// Configuration of ImageMagick
setupImageMagick = function(constraints) {
	// Load the settings from the server
	imageMagick = gm.subClass(constraints);
};


listAssets = function() {
	var idx = 0;
	// Sort by name
	var keys = Object.keys(AllAssets.list).sort();
	// Print
	for (var f in keys) {
		var one = AllAssets.list[keys[f]];
		console.log("Asset>", idx, one.exif.FileName, one.exif.FileSize, one.exif.MIMEType);
		idx++;
	}
};

saveAssets = function(filename) {
	// if parameter null, defaults
	filename = filename || 'assets';

	var fullpath = path.join(AllAssets.root, 'assets', filename);
	// if it doesn't end in .json, add it
	if (fullpath.indexOf(".json", fullpath.length - 5) === -1) {
		fullpath += '.json';
	}

	try {
		fs.writeFileSync(fullpath, JSON.stringify(AllAssets, null, 4));
	}
	catch (err) {
		console.log("Assets> error saving list", err);
	}
	console.log("Assets> saved to " + fullpath);
};

addFile = function(filename,exif) {
	// Add the asset in the array
	var anAsset = new Asset();
	anAsset.setFilename(filename);
	anAsset.setEXIF(exif);
	AllAssets.list[anAsset.id] = anAsset;

	// Path for the node server
	var thumb  = path.join(AllAssets.root, 'assets', exif.FileName+'.png');
	// Path for the https server
	var rthumb = path.join(AllAssets.rel, 'assets', exif.FileName+'.png');

	// If it's an image, process for thumbnail
	if (exif.MIMEType.indexOf('image/') > -1) {
		imageMagick(filename).command("convert").in("-resize", "256x256").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "256x256").write(thumb, function(err) {
			if (err) {
				console.log("Assets> cannot generate thumbnail for:", filename);
				return;
			}
			anAsset.exif.SAGE2thumbnail = rthumb;
		});
	} else if (exif.MIMEType === 'application/pdf') {
		// Process first page: [0]
		imageMagick(filename+"[0]").size(function(err, value){
			if(err) throw err;
			
			imageMagick(value.width, value.height, "#ffffff").append(filename+"[0]").colorspace("RGB").noProfile().flatten().toBuffer("PNG", function(err, buffer) {
				if(err) throw err;
	
				imageMagick(buffer).in("-density", "96").in("-depth", "8").in("-quality", "85").in("-resize", "256x256").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "256x256").write(thumb, function (err) {
					if (err) {
						console.log("Assets> cannot generate thumbnail for:", filename);
						return;
					}
					anAsset.exif.SAGE2thumbnail = rthumb;
				});
			});
		});
	} else if (exif.MIMEType.indexOf('video/') > -1) {
		// try first frame: [0]
		imageMagick(filename+"[0]").command("convert").in("-resize", "256x256").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "256x256").write(thumb, function(err) {
			if (err) {
				console.log("Assets> cannot generate thumbnail for:", filename);
				return;
			}
			anAsset.exif.SAGE2thumbnail = rthumb;
		});
	} else if (exif.MIMEType === 'application/custom') {
		if(exif.icon === null){
			anAsset.exif.SAGE2thumbnail = path.join(AllAssets.rel, 'assets', 'apps', 'unknownapp1.png');
		}
		else {
			// Path for the node server
			var thumb  = path.join(AllAssets.root, 'assets', 'apps', exif.FileName+'.png');
			// Path for the https server
			var rthumb = path.join(AllAssets.rel, 'assets', 'apps', exif.FileName+'.png');
			imageMagick(exif.icon).command("convert").in("-filter", "box").in("-resize", "1x1!").in("-format", "'%[pixel:u]'").toBuffer("info", function(err, buffer) {
				if(err) throw err;
			
				var avgColor = buffer.toString();
				var rgbaStart = avgColor.indexOf("(");
				var rgbaEnd   = avgColor.indexOf(")");
				var rgba = avgColor.substring(rgbaStart+1, rgbaEnd).split(",");
				var red   = 0;
				var green = 0;
				var blue  = 0;
				if(rgba[0][rgba[0].length-1] === "%") red   = Math.round(255 * parseFloat(rgba[0])/100);
				else red   = parseInt(rgba[0], 10);
				if(rgba[1][rgba[1].length-1] === "%") green = Math.round(255 * parseFloat(rgba[1])/100);
				else green = parseInt(rgba[1], 10);
				if(rgba[2][rgba[2].length-1] === "%") blue  = Math.round(255 * parseFloat(rgba[2])/100);
				else blue  = parseInt(rgba[2], 10);
			
				// use tinted average color as background
				var bgRed   = Math.round(255 - ((255 - red)   * 0.5));
				var bgGreen = Math.round(255 - ((255 - green) * 0.5));
				var bgBlue  = Math.round(255 - ((255 - blue)  * 0.5));
				
				imageMagick(840, 840, "rgba(255,255,255,0)").command("convert").in("-fill", "rgb("+bgRed+","+bgGreen+","+bgBlue+")").in("-draw", "circle 420 420 5 420").in("-draw", "image src-over 164 164 512 512 '"+exif.icon+"'").write(thumb, function(err) {
					if (err) {
						console.log("Assets> cannot generate thumbnail for:", filename);
						return;
					}
					anAsset.exif.SAGE2thumbnail = rthumb;
				});
			});
		}
	}
};

deletePDF = function(filename) {
	var filepath = path.join(AllAssets.root, 'pdfs', filename);
	fs.unlink(filepath, function (err) {
		if (err) console.log("Server> error removing file:", filename, err);
			console.log("Server> successfully deleted file:", filename);
			// Delete the metadata
			delete AllAssets.list[filepath];
		}
	);
};
deleteImage = function(filename) {
	var filepath = path.join(AllAssets.root, 'images', filename);
	fs.unlink(filepath, function (err) {
		if (err) console.log("Server> error removing file:", filename, err);
			console.log("Server> successfully deleted file:", filename);
			// Delete the metadata
			delete AllAssets.list[filepath];
		}
	);
};
deleteVideo = function(filename) {
	var filepath = path.join(AllAssets.root, 'videos', filename);
		fs.unlink(filepath, function (err) {
		if (err) console.log("Server> error removing file:", filename, err);
			console.log("Server> successfully deleted file:", filename);
			// Delete the metadata
			delete AllAssets.list[filepath];
		}
	);
};

addURL = function(url,exif) {
	// Add the asset in the array
	var anAsset = new Asset();
	anAsset.setURL(url);
	anAsset.setEXIF(exif);
	AllAssets.list[anAsset.id] = anAsset;
};

getDimensions = function (id) {
	id = path.resolve(id);
	if (id in AllAssets.list)
		return {width:  AllAssets.list[id].exif.ImageWidth,
				height: AllAssets.list[id].exif.ImageHeight };
	else
		return null;
};

getMimeType = function (id) {
	id = path.resolve(id);
	if (id in AllAssets.list)
		return AllAssets.list[id].exif.MIMEType;
	else
		return null;
};

getExifData = function (id) {
	id = path.resolve(id);
	if (id in AllAssets.list)
		return AllAssets.list[id].exif;
	else
		return null;
};


exifAsync = function(cmds, cb) {
	var execNext = function() {
		var file = cmds.shift();
		if(fs.lstatSync(file).isDirectory()){
			var instuctionsFile   = path.join(file, "instructions.json");		
			var instructions      = json5.parse(fs.readFileSync(instuctionsFile, 'utf8'));
			var appIcon = null;
			if(instructions.icon) {
				appIcon = path.join(file, instructions.icon);
			}
			var app = path.basename(file);
			console.log("EXIF> Adding " + app + " (App)");
			
			var metadata = {};
			if (instructions.title !== undefined && instructions.title !== null && instructions.title !== "")
				metadata.title = instructions.title;
			else metadata.title = app;
			if (instructions.version !== undefined && instructions.version !== null && instructions.version !== "")
				metadata.version = instructions.version;
			else metadata.version = "1.0.0";
			if (instructions.description !== undefined && instructions.description !== null && instructions.description !== "")
				metadata.description = instructions.description;
			else metadata.description = "-";
			if (instructions.author !== undefined && instructions.author !== null && instructions.author !== "")
				metadata.author = instructions.author;
			else metadata.author = "SAGE2";
			if (instructions.license !== undefined && instructions.license !== null && instructions.license !== "")
				metadata.license = instructions.license;
			else metadata.license = "-";
			if (instructions.keywords !== undefined && instructions.keywords !== null && Array.isArray(instructions.keywords) )
				metadata.keywords = instructions.keywords;
			else metadata.keywords = [];
			
			var exif = {FileName: app, icon: appIcon, MIMEType: "application/custom", metadata: metadata};
			
			addFile(file, exif);
			if (cmds.length) execNext();
			else cb(null);
		}
		else {
			exiftool.file(file, function(err,data) {
				if (err) {
					console.log("internal error");
					cb(err);
				} else {
					console.log("EXIF> Adding " + data.FileName);
					addFile(data.SourceFile, data);
					if (cmds.length) execNext();
					else cb(null);
				}
			});
		}
	};
	if (cmds.length>0) execNext();
};

// exifSync = function(cmds, cb) {
// 	var execNext = function() {
// 		var result = exiftool.fileSync(cmds.shift());
// 		if (result.err) {
// 			console.log("internal error");
// 			cb(result.err);
// 		} else {
// 			console.log("EXIF> Adding", result.metadata.FileName);
// 			addFile(result.metadata.SourceFile, result.metadata);
// 			if (cmds.length) execNext();
// 			else cb(null);
// 		}
// 	};
// 	if (cmds.length>0) execNext();
// };

listPDFs = function() {
	var result = [];
	var keys = Object.keys(AllAssets.list);
	for (var f in keys) {
		var one = AllAssets.list[keys[f]];
		if (one.exif.MIMEType === 'application/pdf') {
			result.push(one);
		}
	}
	return result;
};

listImages = function() {
	var result = [];
	var keys = Object.keys(AllAssets.list);
	for (var f in keys) {
		var one = AllAssets.list[keys[f]];
		if (one.exif.MIMEType.indexOf('image/') > -1) {
			result.push(one);
		}
	}
	return result;
};

listVideos = function() {
	var result = [];
	var keys = Object.keys(AllAssets.list);
	for (var f in keys) {
		var one = AllAssets.list[keys[f]];
		if (one.exif.MIMEType.indexOf('video/') > -1) {
			result.push(one);
		}
	}
	return result;
};

listApps = function() {
	var result = [];
	var keys = Object.keys(AllAssets.list);
	for (var f in keys) {
		var one = AllAssets.list[keys[f]];
		if (one.exif.MIMEType === 'application/custom') {
			result.push(one);
		}
	}
	return result;
};

initialize = function (root, relativePath) {
	if (AllAssets === null) {
		// public_HTTPS/uploads/assets/assets.json
		// list: {}, root: null
		
		// Make sure the asset folder exists
		var assetFolder = path.join(root, 'assets');
		if (!fs.existsSync(assetFolder)) {
		     fs.mkdirSync(assetFolder);
		}

		AllAssets = {};

		var assetFile = path.join(assetFolder, 'assets.json');
		if (fs.existsSync(assetFile)) {
			var data    = fs.readFileSync(assetFile);
			var oldList = JSON.parse(data);
			AllAssets.root = root;
			AllAssets.rel  = relativePath;
			AllAssets.list = oldList.list;
			// Flag all the assets for checking
			for (var it in AllAssets.list) AllAssets.list[it].Valid = false;
		} else {
			AllAssets.list = {};
			AllAssets.root = root;
			AllAssets.rel  = relativePath;
		}

		console.log("Assests> initialize");
		var thelist = [];
		var uploadedImages = fs.readdirSync(path.join(root, "images"));
		var uploadedVideos = fs.readdirSync(path.join(root, "videos"));
		var uploadedPdfs   = fs.readdirSync(path.join(root, "pdfs"));
		var uploadedApps   = fs.readdirSync(path.join(root, "apps"));
		var i;
		var excludes = [ '.DS_Store' ];
		var item;
		for(i=0; i<uploadedImages.length; i++) {
			if (excludes.indexOf(uploadedImages[i]) === -1) {
				item = path.resolve(root, "images", uploadedImages[i]);
				if (item in AllAssets.list) {
					AllAssets.list[item].Valid = true;
				} else {
					thelist.push(item);
				}
			}
		}
		for(i=0; i<uploadedVideos.length; i++) {
			if (excludes.indexOf(uploadedVideos[i]) === -1) {
				item = path.resolve(root, "videos", uploadedVideos[i]);
				if (item in AllAssets.list) {
					AllAssets.list[item].Valid = true;
				} else {
					thelist.push(item);
				}
			}
		}
		for(i=0; i<uploadedPdfs.length; i++) {
			if (excludes.indexOf(uploadedPdfs[i]) === -1) {
				item = path.resolve(root, "pdfs", uploadedPdfs[i]);
				if (item in AllAssets.list) {
					AllAssets.list[item].Valid = true;
				} else {
					thelist.push(item);
				}
			}
		}
		for(i=0; i<uploadedApps.length; i++){
			var applicationDir = path.resolve(root, "apps", uploadedApps[i]);
			if (fs.lstatSync(applicationDir).isDirectory()) {
				item = applicationDir;
				if (item in AllAssets.list) {
					AllAssets.list[item].Valid = true;
				} else {
					thelist.push(item);
				}
			}
		}
		
		// delete the elements which not there anymore
		for (item in AllAssets.list) {
			if (AllAssets.list[item].Valid === false) {
				console.log("Assets> Removing old item", item);
				delete AllAssets.list[item];
			} else {
				// Just remove the Valid flag
				delete AllAssets.list[item].Valid;
			}
		}

		console.log("EXIF> Starting processing:", thelist);
		exifAsync(thelist, function(err) {
			if (err) {
				console.log("EXIF> Error:", err);
			} else {
				console.log("EXIF> Done");
			}
		});
	}
};

//////////////////////////////////////////////////////////////////////////////////////////

exports.initialize = initialize;
exports.listAssets = listAssets;
exports.saveAssets = saveAssets;
exports.listImages = listImages;
exports.listPDFs   = listPDFs;
exports.listVideos = listVideos;
exports.listApps   = listApps;
exports.addFile    = addFile;
exports.addURL     = addURL;

exports.deleteImage = deleteImage;
exports.deleteVideo = deleteVideo;
exports.deletePDF   = deletePDF;

exports.getDimensions = getDimensions;
exports.getMimeType   = getMimeType;
exports.getExifData   = getExifData;

exports.setupImageMagick = setupImageMagick;

