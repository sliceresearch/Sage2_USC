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
var color     = require('color');
var gm        = require('gm');                   // imagesmagick
var ffmpeg    = require('fluent-ffmpeg');        // ffmpeg
var exiftool  = require('../src/node-exiftool'); // gets exif tags for images
var registry  = require('../src/node-registry');


// Global variable to handle iamgeMagick configuration
var imageMagick = null;
var ffmpegPath = null;

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


// Configuration of ImageMagick and FFMpeg
setupBinaries = function(imOptions, ffmpegOptions) {
	// Load the settings from the server
	imageMagick = gm.subClass(imOptions);
	if(ffmpegOptions.appPath !== undefined){
		ffmpegPath  = ffmpegOptions.appPath + "ffmpeg.exe";
	}
};


listAssets = function() {
	var idx = 0;
	// Sort by name
	var keys = Object.keys(AllAssets.list).sort();
	// Print
	for (var f in keys) {
		var one = AllAssets.list[keys[f]];
		console.log("Assets>", idx, one.exif.FileName, one.exif.FileSize, one.exif.MIMEType);
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

generateImageThumbnails = function(infile, outfile, sizes, index, callback) {
	// initial call, index is not specified
	index = index || 0;
	// are we done yet
	if(index >= sizes.length) {
		callback();
		return;
	}

	// seems to have an issue with noProfile
	//imageMagick(infile+"[0]").noProfile().bitdepth(8).flatten().command("convert").in("-resize", sizes[index]+"x"+sizes[index]).in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", sizes[index]+"x"+sizes[index]).write(outfile+'_'+sizes[index]+'.png', function(err) {
	imageMagick(infile+"[0]").bitdepth(8).flatten().command("convert").in("-resize", sizes[index]+"x"+sizes[index]).in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", sizes[index]+"x"+sizes[index]).write(outfile+'_'+sizes[index]+'.png', function(err) {
		if (err) {
			console.log("Assets> cannot generate "+sizes[index]+"x"+sizes[index]+" thumbnail for:", infile);
			return;
		}
		// recursive call to generate the next size
		generateImageThumbnails(infile, outfile, sizes, index+1, callback);
	});
};

generatePdfThumbnails = function(infile, outfile, width, height, sizes, index, callback) {
	imageMagick(width, height, "#ffffff").append(infile+"[0]").colorspace("RGB").noProfile().flatten().toBuffer("PNG", function(err, buffer) {
		if (err) {
			console.log("Assets> cannot generate thumbnails for:", infile);
			return;
		}
		
		generatePdfThumbnailsHelper(buffer, infile, outfile, sizes, index, callback);
	});
};

generatePdfThumbnailsHelper = function(buffer, infile, outfile, sizes, index, callback) {
	// initial call, index is not specified
	index = index || 0;
	// are we done yet
	if(index >= sizes.length) {
		callback();
		return;
	}
	
	imageMagick(buffer).in("-density", "96").in("-depth", "8").in("-quality", "85").in("-resize", sizes[index]+"x"+sizes[index]).in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", sizes[index]+"x"+sizes[index]).write(outfile+'_'+sizes[index]+'.png', function (err) {
		if (err) {
			console.log("Assets> cannot generate "+sizes[index]+"x"+sizes[index]+" thumbnail for:", infile);
			return;
		}
		// recursive call to generate the next size
		generatePdfThumbnailsHelper(buffer, infile, outfile, sizes, index+1, callback);
	});
};

generateVideoThumbnails = function(infile, outfile, width, height, sizes, index, callback) {
	// initial call, index is not specified
	index = index || 0;
	// are we done yet
	if(index >= sizes.length) {
		callback();
		return;
	}

	var aspect = width/height;
	var size = sizes[index] + "x" + Math.round(sizes[index]/aspect);
	if(aspect < 1.0) size = Math.round(sizes[index]*aspect) + "x" + sizes[index];

	var cmd = ffmpeg(infile);
	if(ffmpegPath !== null) cmd.setFfmpegPath(ffmpegPath);
	cmd.on('end', function() {
		var tmpImg = outfile+'_'+size+'_1.png';
		imageMagick(tmpImg).command("convert").in("-resize", sizes[index]+"x"+sizes[index]).in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", sizes[index]+"x"+sizes[index]).write(outfile+'_'+sizes[index]+'.png', function(err) {
			if (err) {
				console.log("Assets> cannot generate "+sizes[index]+"x"+sizes[index]+" thumbnail for:", infile);
				return;
			}
			fs.unlink(tmpImg, function (err) {
				if (err) throw err;
			});
			// recursive call to generate the next size
			generateVideoThumbnails(infile, outfile, width, height, sizes, index+1, callback);
		});
	}).screenshots({
		timestamps: ["10%"],
		filename: path.basename(outfile)+"_%r_%i.png",
		folder: path.dirname(outfile),
		size: size
	});
};

generateAppThumbnails = function(infile, outfile, color, sizes, index, callback) {
	// initial call, index is not specified
	index = index || 0;
	// are we done yet
	if(index >= sizes.length) {
		callback();
		return;
	}

	var radius = Math.round(sizes[index]/2);
	var edge   = Math.round(sizes[index]/128);
	var corner = Math.round(sizes[index]/6.5641);
	var width  = Math.round(sizes[index]/1.4382);
	var circle = radius + " " + radius + " " + edge + " " + radius;
	var img = corner + " " + corner + " " + width + " " + width;

	imageMagick(sizes[index], sizes[index], "rgba(255,255,255,0)").command("convert").in("-fill", "rgb("+color.r+","+color.g+","+color.b+")").in("-draw", "circle "+circle).in("-draw", "image src-over "+img+" '"+infile+"'").write(outfile+'_'+sizes[index]+'.png', function(err) {
		if (err) {
			console.log("Assets> cannot generate "+sizes[index]+"x"+sizes[index]+" thumbnail for:", infile);
			return;
		}
		// recursive call to generate the next size
		generateAppThumbnails(infile, outfile, color, sizes, index+1, callback);
	});
};

addFile = function(filename, exif, callback) {
	if (exif.MIMEType === 'application/vnd.adobe.photoshop')
		exif.MIMEType = 'image/vnd.adobe.photoshop';

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
		generateImageThumbnails(filename, thumb, [1024, 512, 256], null, function() {
			callback();
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType === 'application/pdf') {
		generatePdfThumbnails(filename, thumb, exif.ImageWidth, exif.ImageHeight, [1024, 512, 256], null, function() {
			callback();
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType.indexOf('video/') > -1) {
		generateVideoThumbnails(filename, thumb, exif.ImageWidth, exif.ImageHeight, [1024, 512, 256], null, function() {
			callback();
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType === 'application/custom') {
		if (exif.icon === null || ! fs.existsSync(exif.icon) ) {
			anAsset.exif.SAGE2thumbnail = path.join(AllAssets.rel, 'assets', 'apps', 'unknownapp');
			callback();
		}
		else {
			// Path for the node server
			thumb  = path.join(AllAssets.root, 'assets', 'apps', exif.FileName);
			// Path for the https server
			rthumb = path.join(AllAssets.rel, 'assets', 'apps', exif.FileName);

			var primaryColorOfImage = function(err, buffer) {
				if(err) throw err;

				var result = buffer.toString();
				var colors = result.substring(1, result.length-1).split("\n");
				var primaryColor = {r: 0, g: 0, b: 0};
				var primaryValue = 0;
				for(var i=0; i<colors.length; i++){
					var cInfo = colors[i].trim();
					var rgbStart = cInfo.indexOf("(");
					var rgbEnd = cInfo.indexOf(")");
					if(rgbStart < 0 || rgbEnd < 0) continue;

					var rawCount = parseInt(cInfo.substring(0, rgbStart-2), 10);
					var red   = parseInt(cInfo.substring(rgbStart+1, rgbStart+ 4), 10);
					var green = parseInt(cInfo.substring(rgbStart+5, rgbStart+ 8), 10);
					var blue  = parseInt(cInfo.substring(rgbStart+9, rgbStart+12), 10);
					var alpha = parseInt(cInfo.substring(rgbStart+13, rgbStart+16), 10);

					var rgb = color({r: red, g: green, b: blue});
					var hsv = rgb.hsv();
					var ms = (hsv.s+1) / 100;
					var mv = hsv.v > 60 ? 1.0 : hsv.v > 30 ? 0.1: 0.01;
					var ma = alpha / 255;
					var weighted = rawCount * ms*mv*ma;
					if(weighted > primaryValue){
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

				generateAppThumbnails(exif.icon, thumb, primaryTint, [1024, 512, 256], null, function() {
					callback();
				});
			};

			imageMagick(exif.icon).command("convert").in("-colors", "32").in("-depth", "8").in("-format", "'%c'").toBuffer("histogram:info", primaryColorOfImage);
			anAsset.exif.SAGE2thumbnail = rthumb;
		}
	}
};

deletePDF = function(filename) {
	var filepath = path.resolve(AllAssets.root, 'pdfs', filename);
	fs.unlink(filepath, function (err) {
		if (err) console.log("Server> error removing file:", filename, err);

		console.log("Server> successfully deleted file:", filename);
		// Delete the metadata
		delete AllAssets.list[filepath];
	});
};
deleteImage = function(filename) {
	var filepath = path.resolve(AllAssets.root, 'images', filename);
	fs.unlink(filepath, function (err) {
		if (err) console.log("Server> error removing file:", filename, err);
			console.log("Server> successfully deleted file:", filename);
			// Delete the metadata
			delete AllAssets.list[filepath];
		}
	);
};
deleteVideo = function(filename) {
	var filepath = path.resolve(AllAssets.root, 'videos', filename);
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

getTag = function (id, tag) {
	id = path.resolve(id);
	if (id in AllAssets.list)
		return AllAssets.list[id].exif[tag];
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
			if(instructions.fileTypes !== undefined && instructions.fileTypes !== null && Array.isArray(instructions.fileTypes)
					&& instructions.directory !== undefined && instructions.directory !== null && instructions.directory !== "") {
						metadata.fileTypes = instructions.fileTypes;
						metadata.directory = instructions.directory;
						registry.register(app, instructions.fileTypes, instructions.directory, false);
			} else metadata.fileTypes = [];
			var exif = {FileName: app, icon: appIcon, MIMEType: "application/custom", metadata: metadata};

			addFile(file, exif, function() {
				if (cmds.length > 0) execNext();
				else cb(null);
			});
		}
		else {
			exiftool.file(file, function(err,data) {
				if (err) {
					console.log("internal error");
					cb(err);
				} else {
					console.log("EXIF> Adding " + data.FileName);
					addFile(data.SourceFile, data, function() {
						if (cmds.length > 0) execNext();
						else cb(null);
					});
				}
			});
		}
	};
	if (cmds.length > 0) execNext();
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

// regenrate all the assets thumbnails and EXIF data
//    (needed with version upgrades)
regenerateAssets = function() {
	// Make sure the asset folder exists
	var assetFolder = path.join(AllAssets.root, 'assets');
	if (!fs.existsSync(assetFolder)) fs.mkdirSync(assetFolder);
	var assetFile = path.join(assetFolder, 'assets.json');
	if (fs.existsSync(assetFile)) {
		fs.unlinkSync(assetFile);
		console.log('Assets> successfully deleted', assetFile);
	}
	var rootdir = AllAssets.root;
	var relativ = AllAssets.rel;
	AllAssets = null;
	initialize(rootdir, relativ);
};


initialize = function (root, relativePath) {
	if (AllAssets === null) {
		// public_HTTPS/uploads/assets/assets.json
		// list: {}, root: null

		// Make sure the asset folder exists
		var assetFolder = path.join(root, 'assets');
		if (!fs.existsSync(assetFolder)) fs.mkdirSync(assetFolder);
		registry.initialize(assetFolder);

		// Make sure the asset/apps folder exists
		var assetAppsFolder = path.join(assetFolder, 'apps');
		if (!fs.existsSync(assetAppsFolder)) fs.mkdirSync(assetAppsFolder);

		// Make sure unknownapp images exist
		var unknownapp_256Img = path.resolve(root, '..', 'images', 'unknownapp_256.png');
		var unknownapp_256 = path.join(assetAppsFolder, 'unknownapp_256.png');
		if (!fs.existsSync(unknownapp_256)) fs.createReadStream(unknownapp_256Img).pipe(fs.createWriteStream(unknownapp_256));
		var unknownapp_512Img = path.resolve(root, '..', 'images', 'unknownapp_512.png');
		var unknownapp_512 = path.join(assetAppsFolder, 'unknownapp_512.png');
		if (!fs.existsSync(unknownapp_512)) fs.createReadStream(unknownapp_512Img).pipe(fs.createWriteStream(unknownapp_512));
		var unknownapp_1024Img = path.resolve(root, '..', 'images', 'unknownapp_1024.png');
		var unknownapp_1024 = path.join(assetAppsFolder, 'unknownapp_1024.png');
		if (!fs.existsSync(unknownapp_1024)) fs.createReadStream(unknownapp_1024Img).pipe(fs.createWriteStream(unknownapp_1024));

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

		console.log("Assets> initialize");
		var thelist = [];
		var uploadedImages = fs.readdirSync(path.join(root, "images"));
		var uploadedVideos = fs.readdirSync(path.join(root, "videos"));
		var uploadedPdfs   = fs.readdirSync(path.join(root, "pdfs"));
		var uploadedApps   = fs.readdirSync(path.join(root, "apps"));
		var i;
		var excludes = [ '.DS_Store' ];
		var item;
        // Start with the apps so we can register filetypes
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

exports.regenerateAssets = regenerateAssets;

exports.exifAsync   = exifAsync;

exports.deleteImage = deleteImage;
exports.deleteVideo = deleteVideo;
exports.deletePDF   = deletePDF;

exports.getDimensions = getDimensions;
exports.getMimeType   = getMimeType;
exports.getExifData   = getExifData;
exports.getTag        = getTag;

exports.setupBinaries = setupBinaries;
