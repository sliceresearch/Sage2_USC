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
 * Asset management functions for SAGE2 server
 *
 * @module server
 * @submodule node-assets
 * @requires color, fluent-ffmpeg, gm, json5, node-exiftool, node-utils, node-registry
 */


// require variables to be declared
"use strict";


var fs        = require('fs');
var path      = require('path');

var color     = require('color');
var ffmpeg    = require('fluent-ffmpeg');     // ffmpeg
var gm        = require('gm');                // imagesmagick
var json5     = require('json5');

var exiftool  = require('../src/node-exiftool'); // gets exif tags for images
var sageutils = require('../src/node-utils');    // provides utility functions
var registry  = require('../src/node-registry');

// Global variable to handle imageMagick configuration
var imageMagick = null;


/**
 * Class describing one asset (file or url)
 *
 * @class Asset
 * @constructor
 * @return {Object} an object representing an empty asset
 */
function Asset() {
	this.filename = null;
	this.url      = null;
	this.id       = null;
	this.exif     = null;
}

/**
 * Set an URL for an asset
 *
 * @method setURL
 * @param aUrl {String} url string
 */
Asset.prototype.setURL = function(aUrl) {
	this.url = aUrl;
	this.id  = aUrl;
};

/**
 * Set an filename for an asset
 *
 * @method setFilename
 * @param aFilename {String} name of the file
 */
Asset.prototype.setFilename = function(aFilename) {
	this.filename = path.resolve(aFilename);
	this.id       = this.filename;

	// Calculate a SAGE2 URL based on the full pathname
	this.sage2URL = "";
	for (var f in global.mediaFolders) {
		var folder = global.mediaFolders[f];
		var up;
		up = path.resolve(folder.path);
		var pubdir = this.id.split(up);
		if (pubdir.length === 2) {
			this.sage2URL = sageutils.encodeReservedURL(folder.url + pubdir[1]);
		}
	}
};

/**
 * Set the metadata for an asset
 *
 * @method setEXIF
 * @param exifdata {Object} an object containing EXIF data
 */
Asset.prototype.setEXIF = function(exifdata) {
	this.exif = exifdata;
};

/**
 * Get the width of an asset, from  the EXIF data
 *
 * @method width
 * @return {Number} width in pixel
 */
Asset.prototype.width = function() {
	return this.exif.ImageWidth;
};

/**
 * Get the height of an asset, from  the EXIF data
 *
 * @method height
 * @return {Number} height in pixel
 */
Asset.prototype.height = function() {
	return this.exif.ImageHeight;
};


var AllAssets = null;


/**
 * Asset management
 *
 * @class node-assets
 */

/**
 * Configuration of ImageMagick and FFMpeg
 *
 * @method setupBinaries
 * @param imOptions {Object} object containing path to binaries
 * @param ffmpegOptions {Object} object containing path to binaries
 */
var setupBinaries = function(imOptions, ffmpegOptions) {
	// Load the settings from the server
	imageMagick = gm.subClass(imOptions);
	// Set the path to binaries for video processing
	if (ffmpegOptions.appPath !== undefined) {
		ffmpeg.setFfmpegPath(ffmpegOptions.appPath  + 'ffmpeg');
		ffmpeg.setFfprobePath(ffmpegOptions.appPath + 'ffprobe');
	}
};


var listAssets = function() {
	var idx = 0;
	// Sort by name
	var keys = Object.keys(AllAssets.list).sort();
	// Print
	for (var f in keys) {
		var one = AllAssets.list[keys[f]];
		console.log(sageutils.header("Assets"), idx, one.exif.FileName, one.exif.FileSize, one.exif.MIMEType);
		idx++;
	}
};

var saveAssets = function(filename) {
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
		console.log(sageutils.header("Assets") + "error saving assets", err);
	}
	// console.log(sageutils.header("Assets") + "saved assets file to " + fullpath);
};

var generateImageThumbnails = function(infile, outfile, sizes, index, callback) {
	// initial call, index is not specified
	index = index || 0;
	// are we done yet
	if (index >= sizes.length) {
		callback();
		return;
	}

	imageMagick(infile + "[0]").bitdepth(8).flatten().command("convert").in("-resize", sizes[index] + "x" + sizes[index])
		.in("-gravity", "center").in("-background", "rgb(71,71,71)")
		.in("-extent", sizes[index] + "x" + sizes[index])
		.out("-quality", "70").write(outfile + '_' + sizes[index] + '.jpg', function(err) {
		if (err) {
			console.log(sageutils.header("Assets") + "cannot generate " + sizes[index] + "x" + sizes[index] + " thumbnail for:", infile);
			return;
		}
		// recursive call to generate the next size
		generateImageThumbnails(infile, outfile, sizes, index + 1, callback);
	});
};

var generatePdfThumbnailsHelper = function(buffer, infile, outfile, sizes, index, callback) {
	// initial call, index is not specified
	index = index || 0;
	// are we done yet
	if (index >= sizes.length) {
		callback();
		return;
	}

	imageMagick(buffer).in("-density", "96").in("-depth", "8").in("-quality", "70")
		.in("-resize", sizes[index] + "x" + sizes[index]).in("-gravity", "center")
		.in("-background", "rgb(71,71,71)").in("-extent", sizes[index] + "x" + sizes[index])
		.out("-quality", "70").write(outfile + '_' + sizes[index] + '.jpg', function(err) {
		if (err) {
			console.log(sageutils.header("Assets") + "cannot generate " + sizes[index] + "x" + sizes[index] + " thumbnail for:", infile);
			return;
		}
		// recursive call to generate the next size
		generatePdfThumbnailsHelper(buffer, infile, outfile, sizes, index + 1, callback);
	});
};

var generatePdfThumbnails = function(infile, outfile, width, height, sizes, index, callback) {
	imageMagick(width, height, "#ffffff").append(infile + "[0]").colorspace("RGB").noProfile().flatten()
	.toBuffer("PNG", function(err, buffer) {
		if (err) {
			console.log(sageutils.header("Assets") + "cannot generate thumbnails for:", infile);
			return;
		}

		generatePdfThumbnailsHelper(buffer, infile, outfile, sizes, index, callback);
	});
};

var generateVideoThumbnails = function(infile, outfile, width, height, sizes, index, callback) {
	// initial call, index is not specified
	index = index || 0;
	// are we done yet
	if (index >= sizes.length) {
		callback();
		return;
	}

	var aspect = width / height;
	var size = sizes[index] + "x" + Math.round(sizes[index] / aspect);
	if (aspect < 1.0) {
		size = Math.round(sizes[index] * aspect) + "x" + sizes[index];
	}

	var cmd = ffmpeg(infile);
	cmd.on('end', function() {
		var tmpImg = outfile + '_' + size + '_1.jpg';
		imageMagick(tmpImg).command("convert").in("-resize", sizes[index] + "x" + sizes[index])
			.in("-gravity", "center").in("-background", "rgb(71,71,71)")
			.in("-extent", sizes[index] + "x" + sizes[index])
			.out("-quality", "70").write(outfile + '_' + sizes[index] + '.jpg', function(err) {
			if (err) {
				console.log(sageutils.header("Assets") + "cannot generate " + sizes[index] + "x" + sizes[index] + " thumbnail for:", infile);
				return;
			}
			fs.unlink(tmpImg, function(err2) {
				if (err2) {
					// throw err2;
					console.log('Error', err2);
				}
			});
			// recursive call to generate the next size
			generateVideoThumbnails(infile, outfile, width, height, sizes, index + 1, callback);
		});
	}).screenshots({
		timestamps: ["10%"],
		filename: path.basename(outfile) + "_%r_%i.jpg",
		folder: path.dirname(outfile),
		size: size
	});
};

var generateAppThumbnails = function(infile, outfile, acolor, sizes, index, callback) {
	// initial call, index is not specified
	index = index || 0;
	// are we done yet
	if (index >= sizes.length) {
		callback();
		return;
	}

	var radius = Math.round(sizes[index] / 2);
	var edge   = Math.round(sizes[index] / 128);
	var corner = Math.round(sizes[index] / 6.5641);
	var width  = Math.round(sizes[index] / 1.4382);
	var circle = radius + " " + radius + " " + edge + " " + radius;
	var img = corner + " " + corner + " " + width + " " + width;

	imageMagick(sizes[index], sizes[index], "rgb(71,71,71)").command("convert")
		.in("-fill", "rgb(" + acolor.r + "," + acolor.g + "," + acolor.b + ")")
		.in("-draw", "circle " + circle).in("-draw", "image src-over " + img + " '" + infile + "'")
		.out("-quality", "70").write(outfile + '_' + sizes[index] + '.jpg', function(err) {
		if (err) {
			console.log(sageutils.header("Assets") + "cannot generate " + sizes[index] + "x" + sizes[index] + " thumbnail for:", infile);
			return;
		}
		// recursive call to generate the next size
		generateAppThumbnails(infile, outfile, acolor, sizes, index + 1, callback);
	});
};

var addFile = function(filename, exif, callback) {
	if (exif.MIMEType === 'application/vnd.adobe.photoshop') {
		exif.MIMEType = 'image/vnd.adobe.photoshop';
	}

	// Add the asset in the array
	var anAsset = new Asset();
	anAsset.setFilename(filename);
	anAsset.setEXIF(exif);
	AllAssets.list[anAsset.id] = anAsset;

	// Path for the file system
	var thumb  = path.join(AllAssets.root, 'assets', exif.FileName);
	// Path for the https server
	var rthumb = path.join(AllAssets.rel, 'assets', exif.FileName);

	// If it's an image, process for thumbnail
	if (exif.MIMEType.indexOf('image/') > -1) {
		generateImageThumbnails(filename, thumb, [512, 256], null, function() {
			callback();
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType === 'application/pdf') {
		generatePdfThumbnails(filename, thumb, exif.ImageWidth, exif.ImageHeight, [512, 256], null, function() {
			callback();
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType.indexOf('video/') > -1) {
		generateVideoThumbnails(filename, thumb, exif.ImageWidth, exif.ImageHeight, [512, 256], null, function() {
			callback();
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType === 'application/custom') {
		if (exif.icon === null || !sageutils.fileExists(exif.icon)) {
			anAsset.exif.SAGE2thumbnail = path.join(AllAssets.rel, 'assets', 'apps', 'unknownapp');
			callback();
		} else {
			// Path for the node server
			thumb  = path.join(AllAssets.root, 'assets', 'apps', exif.FileName);
			// Path for the https server
			rthumb = path.join(AllAssets.rel, 'assets', 'apps', exif.FileName);

			var primaryColorOfImage = function(err, buffer) {
				if (err) {
					throw err;
				}

				var result = buffer.toString();
				var colors = result.substring(1, result.length - 1).split("\n");
				var primaryColor = {r: 0, g: 0, b: 0};
				var primaryValue = 0;
				for (var i = 0; i < colors.length; i++) {
					var cInfo = colors[i].trim();
					var rgbStart = cInfo.indexOf("(");
					var rgbEnd = cInfo.indexOf(")");
					if (rgbStart < 0 || rgbEnd < 0) {
						continue;
					}

					var rawCount = parseInt(cInfo.substring(0, rgbStart - 2), 10);
					var red   = parseInt(cInfo.substring(rgbStart + 1, rgbStart + 4), 10);
					var green = parseInt(cInfo.substring(rgbStart + 5, rgbStart + 8), 10);
					var blue  = parseInt(cInfo.substring(rgbStart + 9, rgbStart + 12), 10);
					var alpha = parseInt(cInfo.substring(rgbStart + 13, rgbStart + 16), 10);

					var rgb = color({r: red, g: green, b: blue});
					var hsv = rgb.hsv();
					var ms = (hsv.s + 1) / 100;
					var mv = hsv.v > 60 ? 1.0 : hsv.v > 30 ? 0.1: 0.01;
					var ma = alpha / 255;
					var weighted = rawCount * ms * mv * ma;
					if (weighted > primaryValue) {
						primaryValue = weighted;
						primaryColor.r = red;
						primaryColor.g = green;
						primaryColor.b = blue;
					}
				}

				// use tinted primary color as background
				var tint = 0.4; // 0.0 --> white, 1.0 --> original color
				var primaryTint = {
					r: Math.round(255 - ((255 - primaryColor.r) * tint)),
					g: Math.round(255 - ((255 - primaryColor.g) * tint)),
					b: Math.round(255 - ((255 - primaryColor.b) * tint))
				};

				generateAppThumbnails(exif.icon, thumb, primaryTint, [512, 256], null, function() {
					callback();
				});
			};

			imageMagick(exif.icon).command("convert").in("-colors", "32")
				.in("-depth", "8").in("-format", "'%c'")
				.toBuffer("histogram:info", primaryColorOfImage);
			anAsset.exif.SAGE2thumbnail = rthumb;
		}
	}
	saveAssets();
};

var deletePDF = function(filename) {
	var filepath = path.resolve(AllAssets.root, 'pdfs', filename);
	fs.unlink(filepath, function(err) {
		if (err) {
			console.log("Server> error removing file:", filename, err);
		}
		console.log("Server> successfully deleted file:", filename);
		// Delete the metadata
		delete AllAssets.list[filepath];
		saveAssets();
	});
};


var deleteAsset = function(filename) {
	var filepath = path.resolve(filename);
	fs.unlink(filepath, function(err) {
		if (err) {
			console.log("Server> error removing file:", filename, err);
		} else {
			console.log("Server> successfully deleted file:", filename);
			// Delete the metadata
			delete AllAssets.list[filepath];
			saveAssets();
		}
	});
};

var deleteImage = function(filename) {
	var filepath = path.resolve(AllAssets.root, 'images', filename);
	fs.unlink(filepath, function(err) {
		if (err) {
			console.log("Server> error removing file:", filename, err);
		}
		console.log("Server> successfully deleted file:", filename);
		// Delete the metadata
		delete AllAssets.list[filepath];
		saveAssets();
	});
};

var deleteVideo = function(filename) {
	var filepath = path.resolve(AllAssets.root, 'videos', filename);
	fs.unlink(filepath, function(err) {
		if (err) {
			console.log("Server> error removing file:", filename, err);
		}
		console.log("Server> successfully deleted file:", filename);
		// Delete the metadata
		delete AllAssets.list[filepath];
		saveAssets();
	}
);
};

var addURL = function(aUrl, exif) {
	// Add the asset in the array
	var anAsset = new Asset();
	anAsset.setURL(aUrl);
	anAsset.setEXIF(exif);
	AllAssets.list[anAsset.id] = anAsset;
};

var getDimensions = function(id) {
	id = path.resolve(id);
	if (id in AllAssets.list) {
		return {width:  AllAssets.list[id].exif.ImageWidth,
				height: AllAssets.list[id].exif.ImageHeight };
	} else {
		return null;
	}
};

var getTag = function(id, tag) {
	id = path.resolve(id);
	if (id in AllAssets.list) {
		return AllAssets.list[id].exif[tag];
	} else {
		return null;
	}
};

var getURL = function(id) {
	id = path.resolve(id);
	if (id in AllAssets.list) {
		return AllAssets.list[id].sage2URL;
	} else {
		return null;
	}
};

var getMimeType = function(id) {
	id = path.resolve(id);
	if (id in AllAssets.list) {
		return AllAssets.list[id].exif.MIMEType;
	} else {
		return null;
	}
};

var getExifData = function(id) {
	id = path.resolve(id);
	if (id in AllAssets.list) {
		return AllAssets.list[id].exif;
	} else {
		return null;
	}
};

var exifAsync = function(cmds, cb) {
	var execNext = function() {
		var file = cmds.shift();
		if (fs.lstatSync(file).isDirectory()) {
			var instuctionsFile, instructions;
			instuctionsFile = path.join(file, "instructions.json");
			if (!sageutils.fileExists(instuctionsFile)) {
				if (cmds.length > 0) {
					return execNext();
				} else {
					return cb(null);
				}
			}
			instructions = json5.parse(fs.readFileSync(instuctionsFile, 'utf8'));
			var appIcon = null;
			if (instructions.icon) {
				appIcon = path.join(file, instructions.icon);
			}
			var app = path.basename(file);
			console.log(sageutils.header("EXIF") + "Adding " + app + " (App)");

			var metadata = {};
			if (instructions.title !== undefined && instructions.title !== null && instructions.title !== "") {
				metadata.title = instructions.title;
			} else {
				metadata.title = app;
			}
			if (instructions.version !== undefined && instructions.version !== null && instructions.version !== "") {
				metadata.version = instructions.version;
			} else {
				metadata.version = "1.0.0";
			}
			if (instructions.description !== undefined && instructions.description !== null && instructions.description !== "") {
				metadata.description = instructions.description;
			} else {
				metadata.description = "-";
			}
			if (instructions.author !== undefined && instructions.author !== null && instructions.author !== "") {
				metadata.author = instructions.author;
			} else {
				metadata.author = "SAGE2";
			}
			if (instructions.license !== undefined && instructions.license !== null && instructions.license !== "") {
				metadata.license = instructions.license;
			} else {
				metadata.license = "-";
			}
			if (instructions.keywords !== undefined && instructions.keywords !== null &&
					Array.isArray(instructions.keywords)) {
				metadata.keywords = instructions.keywords;
			} else {
				metadata.keywords = [];
			}
			if (instructions.fileTypes !== undefined && instructions.fileTypes !== null &&
					Array.isArray(instructions.fileTypes) && instructions.directory !== undefined &&
					instructions.directory !== null && instructions.directory !== "") {
				metadata.fileTypes = instructions.fileTypes;
				metadata.directory = instructions.directory;
				registry.register(app, instructions.fileTypes, instructions.directory, false);
			} else {
				metadata.fileTypes = [];
			}
			var exif = {FileName: app, icon: appIcon, MIMEType: "application/custom", metadata: metadata};

			addFile(file, exif, function() {
				if (cmds.length > 0) {
					execNext();
				} else {
					cb(null);
				}
			});
		} else {
			exiftool.file(file, function(err, data) {
				if (err) {
					console.log("internal error for file", file);
					cb(err);
				} else {
					console.log(sageutils.header("EXIF") + "Adding " + data.FileName);
					addFile(data.SourceFile, data, function() {
						if (cmds.length > 0) {
							execNext();
						} else {
							cb(null);
						}
					});
				}
			});
		}
	};
	if (cmds.length > 0) {
		execNext();
	}
};

// exifSync = function(cmds, cb) {
// 	var execNext = function() {
// 		var result = exiftool.fileSync(cmds.shift());
// 		if (result.err) {
// 			console.log("internal error");
// 			cb(result.err);
// 		} else {
// 			console.log(sageutils.header("EXIF") + "Adding", result.metadata.FileName);
// 			addFile(result.metadata.SourceFile, result.metadata);
// 			if (cmds.length) execNext();
// 			else cb(null);
// 		}
// 	};
// 	if (cmds.length>0) execNext();
// };

var listPDFs = function() {
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

var listImages = function() {
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

var listVideos = function() {
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

var listApps = function() {
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

var recursiveReaddirSync = function(aPath) {
	var list     = [];
	var excludes = [ '.DS_Store', 'Thumbs.db', 'assets', 'tmp' ];
	var files, stats;

	files = fs.readdirSync(aPath);
	if (files.indexOf('instructions.json') >= 0) {
		// it's an application folder
		list.push(aPath);
	} else {
		files.forEach(function(file) {
			if (excludes.indexOf(file) === -1) {
				stats = fs.lstatSync(path.join(aPath, file));
				if (stats.isDirectory()) {
					list = list.concat(recursiveReaddirSync(path.join(aPath, file)));
				} else {
					list.push(path.join(aPath, file));
				}
			}
		});
	}
	return list;
}

var refresh = function(root, callback) {
	var uploaded = recursiveReaddirSync(root);

	var thelist = [];
	var i;
	var item;

	for (i = 0; i < uploaded.length; i++) {
		item = path.resolve(uploaded[i]);
		if (item in AllAssets.list) {
			AllAssets.list[item].Valid = true;
		} else {
			thelist.push(item);
		}
	}

	if (thelist.length > 0) {
		console.log(sageutils.header("EXIF") + "Starting processing: " + thelist.length + " items");
	}
	exifAsync(thelist, function(err) {
		if (err) {
			console.log(sageutils.header("EXIF") + "Error:", err);
		} else {
			console.log(sageutils.header("EXIF") + "Done " + root);
			if (callback) {
				callback();
			}
		}
	});
};

var initialize = function(mainFolder, mediaFolders) {
	if (AllAssets === null) {
		// public_HTTPS/uploads/assets/assets.json
		// list: {}, root: null

		var root = mainFolder.path;
		var relativePath = mainFolder.url;

		console.log(sageutils.header("Assets") + 'Main asset folder: ' + root);

		// Make sure the asset folder exists
		var assetFolder = path.join(root, 'assets');
		if (!sageutils.folderExists(assetFolder)) {
			fs.mkdirSync(assetFolder);
		}
		registry.initialize(assetFolder);

		// Make sure the asset/apps folder exists
		var assetAppsFolder = path.join(assetFolder, 'apps');
		if (!sageutils.folderExists(assetAppsFolder)) {
			fs.mkdirSync(assetAppsFolder);
		}

		// Make sure unknownapp images exist
		var unknownapp_256Img = path.resolve('public', 'images', 'unknownapp_256.jpg');
		var unknownapp_256 = path.join(assetAppsFolder, 'unknownapp_256.jpg');
		if (!sageutils.fileExists(unknownapp_256)) {
			fs.createReadStream(unknownapp_256Img).pipe(fs.createWriteStream(unknownapp_256));
		}
		var unknownapp_512Img = path.resolve('public', 'images', 'unknownapp_512.jpg');
		var unknownapp_512 = path.join(assetAppsFolder, 'unknownapp_512.jpg');
		if (!sageutils.fileExists(unknownapp_512)) {
			fs.createReadStream(unknownapp_512Img).pipe(fs.createWriteStream(unknownapp_512));
		}

		AllAssets = {};
		AllAssets.mainFolder = mainFolder;

		var assetFile = path.join(assetFolder, 'assets.json');
		if (sageutils.fileExists(assetFile)) {
			var data    = fs.readFileSync(assetFile);
			var oldList = JSON.parse(data);
			AllAssets.root = root;
			AllAssets.rel  = relativePath;
			AllAssets.list = oldList.list;
			// Flag all the assets for checking
			for (var it in AllAssets.list) {
				AllAssets.list[it].Valid = false;
			}
		} else {
			AllAssets.list = {};
			AllAssets.root = root;
			AllAssets.rel  = relativePath;
		}

		refresh(root);

		// Extra folders
		AllAssets.mediaFolders = mediaFolders;
		for (var mf in mediaFolders) {
			var f = mediaFolders[mf];
			if (root !== f.path) {
				// Adding all the other folders (except the main one)
				addAssetFolder(f.path);
			}
		}

		// Finally, delete the elements which not there anymore
		for (var item in AllAssets.list) {
			if (AllAssets.list[item].Valid === false) {
				console.log(sageutils.header("Assets") + "Removing old item", item);
				delete AllAssets.list[item];
			} else {
				// Just remove the Valid flag
				delete AllAssets.list[item].Valid;
			}
		}

	}
};

var addAssetFolder = function(root) {
	console.log(sageutils.header("Assets") + 'Adding asset folder: ' + root);
	// Make sure the asset folder exists
	var assetFolder = path.join(root, 'assets');
	if (!sageutils.folderExists(assetFolder)) {
		fs.mkdirSync(assetFolder);
	}

	// Make sure the asset/apps folder exists
	var assetAppsFolder = path.join(assetFolder, 'apps');
	if (!sageutils.folderExists(assetAppsFolder)) {
		fs.mkdirSync(assetAppsFolder);
	}

	// Make sure unknownapp images exist
	var unknownapp_256Img = path.resolve('public', 'images', 'unknownapp_256.jpg');
	var unknownapp_256 = path.join(assetAppsFolder, 'unknownapp_256.jpg');
	if (!sageutils.fileExists(unknownapp_256)) {
		fs.createReadStream(unknownapp_256Img).pipe(fs.createWriteStream(unknownapp_256));
	}
	var unknownapp_512Img = path.resolve('public', 'images', 'unknownapp_512.jpg');
	var unknownapp_512 = path.join(assetAppsFolder, 'unknownapp_512.jpg');
	if (!sageutils.fileExists(unknownapp_512)) {
		fs.createReadStream(unknownapp_512Img).pipe(fs.createWriteStream(unknownapp_512));
	}

	var uploaded = recursiveReaddirSync(root);

	var thelist = [];
	var i;
	var item;

	for (i = 0; i < uploaded.length; i++) {
		item = path.resolve(uploaded[i]);
		if (item in AllAssets.list) {
			AllAssets.list[item].Valid = true;
		} else {
			thelist.push(item);
		}
	}

	if (thelist.length > 0) {
		console.log(sageutils.header("EXIF") + "Starting processing: " + thelist.length + " items");
	}
	exifAsync(thelist, function(err) {
		if (err) {
			console.log(sageutils.header("EXIF") + "Error:", err);
		} else {
			console.log(sageutils.header("EXIF") + "Done " + root);
		}
	});
};

// regenrate all the assets thumbnails and EXIF data
//    (needed with version upgrades)
var regenerateAssets = function() {
	// Make sure the asset folder exists
	var assetFolder = path.join(AllAssets.root, 'assets');
	if (!sageutils.folderExists(assetFolder)) {
		fs.mkdirSync(assetFolder);
	}
	var assetFile = path.join(assetFolder, 'assets.json');
	if (sageutils.fileExists(assetFile)) {
		fs.unlinkSync(assetFile);
		console.log(sageutils.header("Assets") + "successfully deleted", assetFile);
	}
	// var rootdir = AllAssets.root;
	// var relativ = AllAssets.rel;
	var mediaf  = AllAssets.mediaFolders;
	var mainf   = AllAssets.mainFolder;
	AllAssets = null;
	initialize(mainf, mediaf);
};


exports.initialize     = initialize;
exports.refresh        = refresh;
exports.addAssetFolder = addAssetFolder;

exports.listAssets = listAssets;
exports.saveAssets = saveAssets;
exports.listImages = listImages;
exports.listPDFs   = listPDFs;
exports.listVideos = listVideos;
exports.listApps   = listApps;
exports.addFile    = addFile;
exports.addURL     = addURL;

exports.regenerateAssets = regenerateAssets;

exports.exifAsync   = exifAsync;

exports.deleteImage = deleteImage;
exports.deleteVideo = deleteVideo;
exports.deletePDF   = deletePDF;
exports.deleteAsset = deleteAsset;

exports.getDimensions = getDimensions;
exports.getMimeType   = getMimeType;
exports.getExifData   = getExifData;
exports.getTag        = getTag;
exports.getURL        = getURL;

exports.setupBinaries = setupBinaries;
