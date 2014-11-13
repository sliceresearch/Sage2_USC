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

addFile = function(filename,exif) {
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
		imageMagick(filename).command("convert").in("-resize", "1024x1024").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "1024x1024").write(thumb+'_1024.png', function(err) {
			if (err) {
				console.log("Assets> cannot generate 1024x1024 thumbnail for:", filename);
				return;
			}
		});
		imageMagick(filename).command("convert").in("-resize", "512x512").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "512x512").write(thumb+'_512.png', function(err) {
			if (err) {
				console.log("Assets> cannot generate 512x512 thumbnail for:", filename);
				return;
			}
		});
		imageMagick(filename).command("convert").in("-resize", "256x256").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "256x256").write(thumb+'_256.png', function(err) {
			if (err) {
				console.log("Assets> cannot generate 256x256 thumbnail for:", filename);
				return;
			}
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType === 'application/pdf') {
		// Process first page: [0]
		imageMagick(filename+"[0]").size(function(err, value){
			if(err) throw err;
			
			imageMagick(value.width, value.height, "#ffffff").append(filename+"[0]").colorspace("RGB").noProfile().flatten().toBuffer("PNG", function(err, buffer) {
				if(err) throw err;
				
				imageMagick(buffer).in("-density", "96").in("-depth", "8").in("-quality", "85").in("-resize", "1024x1024").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "1024x1024").write(thumb+'_1024.png', function (err) {
					if (err) {
						console.log("Assets> cannot generate 1024x1024 thumbnail for:", filename);
						return;
					}
					anAsset.exif.SAGE2thumbnail = rthumb;
				});
				imageMagick(buffer).in("-density", "96").in("-depth", "8").in("-quality", "85").in("-resize", "512x512").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "512x512").write(thumb+'_512.png', function (err) {
					if (err) {
						console.log("Assets> cannot generate 512x512 thumbnail for:", filename);
						return;
					}
					anAsset.exif.SAGE2thumbnail = rthumb;
				});
				imageMagick(buffer).in("-density", "96").in("-depth", "8").in("-quality", "85").in("-resize", "256x256").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "256x256").write(thumb+'_256.png', function (err) {
					if (err) {
						console.log("Assets> cannot generate 256x256 thumbnail for:", filename);
						return;
					}
				});
			});
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType.indexOf('video/') > -1) {
		thumbFolder = path.join(AllAssets.root, 'assets');
		
		var width  = exif.ImageWidth;
		var height = exif.ImageHeight;
		var aspect = width/height;
			
		var size1024 = "1024x" + Math.round(1024/aspect);
		var size512  =  "512x" + Math.round( 512/aspect);
		var size256  =  "256x" + Math.round( 256/aspect);
		if(aspect < 1.0){
			size1024 = Math.round(1024*aspect) + "x1024";
			size512  = Math.round( 512*aspect) + "x512";
			size256  = Math.round( 256*aspect) + "x256";
		}
		
		var ffmpeg1024 = ffmpeg(filename);
		if(ffmpegPath !== null) ffmpeg1024.setFfmpegPath(ffmpegPath);
		ffmpeg1024.on('end', function() {
			var tmpImg = path.join(AllAssets.root, 'assets', exif.FileName+'_'+size1024+'_1.png');
			imageMagick(tmpImg).command("convert").in("-resize", "1024x1024").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "1024x1024").write(thumb+'_1024.png', function(err) {
				if (err) {
					console.log("Assets> cannot generate 1024x1024 thumbnail for:", filename);
					return;
				}
				fs.unlink(tmpImg, function (err) {
					if(err) throw err;
				});
			});
		}).screenshots({
			timestamps: ["10%"], 
			filename: exif.FileName+"_%r_%i.png", 
			folder: thumbFolder, 
			size: size1024
		});
		
		var ffmpeg512 = ffmpeg(filename);
		if(ffmpegPath !== null) ffmpeg512.setFfmpegPath(ffmpegPath);
		ffmpeg512.on('end', function() {
			var tmpImg = path.join(AllAssets.root, 'assets', exif.FileName+'_'+size512+'_1.png');
			imageMagick(tmpImg).command("convert").in("-resize", "512x512").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "512x512").write(thumb+'_512.png', function(err) {
				if (err) {
					console.log("Assets> cannot generate 512x512 thumbnail for:", filename);
					return;
				}
				fs.unlink(tmpImg, function (err) {
					if(err) throw err;
				});
			});
		}).screenshots({
			timestamps: ["10%"], 
			filename: exif.FileName+"_%r_%i.png", 
			folder: thumbFolder, 
			size: size512
		});
		
		var ffmpeg256 = ffmpeg(filename);
		if(ffmpegPath !== null) ffmpeg256.setFfmpegPath(ffmpegPath);
		ffmpeg256.on('end', function() {
			var tmpImg = path.join(AllAssets.root, 'assets', exif.FileName+'_'+size256+'_1.png');
			imageMagick(tmpImg).command("convert").in("-resize", "256x256").in("-gravity", "center").in("-background", "rgba(0,0,0,0)").in("-extent", "256x256").write(thumb+'_256.png', function(err) {
				if (err) {
					console.log("Assets> cannot generate 256x256 thumbnail for:", filename);
					return;
				}
				fs.unlink(tmpImg, function (err) {
					if(err) throw err;
				});
			});
		}).screenshots({
			timestamps: ["10%"], 
			filename: exif.FileName+"_%r_%i.png", 
			folder: thumbFolder, 
			size: size256
		});
		anAsset.exif.SAGE2thumbnail = rthumb;
	} else if (exif.MIMEType === 'application/custom') {
		if (exif.icon === null || ! fs.existsSync(exif.icon) ) {
			anAsset.exif.SAGE2thumbnail = path.join(AllAssets.rel, 'assets', 'apps', 'unknownapp');
		}
		else {
			// Path for the node server
			thumb  = path.join(AllAssets.root, 'assets', 'apps', exif.FileName);
			// Path for the https server
			rthumb = path.join(AllAssets.rel, 'assets', 'apps', exif.FileName);

			var averageColorOfImage = function(err, buffer) {
				if(err) throw err;
				
				var avgColor = buffer.toString();
				if(avgColor.length === 6 && avgColor === "'none'"){
					imageMagick(exif.icon).noProfile().write(exif.icon, function(err) {
						if(err) throw err;
						
						imageMagick(exif.icon).command("convert").in("-filter", "box").in("-resize", "1x1!").in("-format", "'%[pixel:u]'").toBuffer("info", averageColorOfImage);
					});
					return;
				}
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
				
				
				imageMagick(1024, 1024, "rgba(255,255,255,0)").command("convert").in("-fill", "rgb("+bgRed+","+bgGreen+","+bgBlue+")").in("-draw", "circle 512 512 8 512").in("-draw", "image src-over 156 156 712 712 '"+exif.icon+"'").write(thumb+'_1024.png', function(err) {
					if (err) {
						console.log("Assets> cannot generate 1024x1024 thumbnail for:", filename);
						return;
					}
				});
				imageMagick(512, 512, "rgba(255,255,255,0)").command("convert").in("-fill", "rgb("+bgRed+","+bgGreen+","+bgBlue+")").in("-draw", "circle 256 256 4 256").in("-draw", "image src-over 78 78 356 356 '"+exif.icon+"'").write(thumb+'_512.png', function(err) {
					if (err) {
						console.log("Assets> cannot generate 512x512 thumbnail for:", filename);
						return;
					}
				});
				imageMagick(256, 256, "rgba(255,255,255,0)").command("convert").in("-fill", "rgb("+bgRed+","+bgGreen+","+bgBlue+")").in("-draw", "circle 128 128 2 128").in("-draw", "image src-over 39 39 178 178 '"+exif.icon+"'").write(thumb+'_256.png', function(err) {
					if (err) {
						console.log("Assets> cannot generate 256x256 thumbnail for:", filename);
						return;
					}
				});
			};
			
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
					//console.log("color ("+hsv.s+"x"+hsv.v+"|"+(ms*mv*ma).toFixed(3)+"): " + weighted.toFixed(1) + " rgb("+red+","+green+","+blue+")");
				}
				var primaryTint = {
					r: Math.round(255 - ((255 - primaryColor.r) * 0.25)),
					g: Math.round(255 - ((255 - primaryColor.g) * 0.25)),
					b: Math.round(255 - ((255 - primaryColor.b) * 0.25))
				};
				
				imageMagick(1024, 1024, "rgba(255,255,255,0)").command("convert").in("-fill", "rgb("+primaryTint.r+","+primaryTint.g+","+primaryTint.b+")").in("-draw", "circle 512 512 8 512").in("-draw", "image src-over 156 156 712 712 '"+exif.icon+"'").write(thumb+'_1024.png', function(err) {
					if (err) {
						console.log("Assets> cannot generate 1024x1024 thumbnail for:", filename);
						return;
					}
				});
				imageMagick(512, 512, "rgba(255,255,255,0)").command("convert").in("-fill", "rgb("+primaryTint.r+","+primaryTint.g+","+primaryTint.b+")").in("-draw", "circle 256 256 4 256").in("-draw", "image src-over 78 78 356 356 '"+exif.icon+"'").write(thumb+'_512.png', function(err) {
					if (err) {
						console.log("Assets> cannot generate 512x512 thumbnail for:", filename);
						return;
					}
				});
				imageMagick(256, 256, "rgba(255,255,255,0)").command("convert").in("-fill", "rgb("+primaryTint.r+","+primaryTint.g+","+primaryTint.b+")").in("-draw", "circle 128 128 2 128").in("-draw", "image src-over 39 39 178 178 '"+exif.icon+"'").write(thumb+'_256.png', function(err) {
					if (err) {
						console.log("Assets> cannot generate 256x256 thumbnail for:", filename);
						return;
					}
				});
				
				//console.log("Primary Color: rgb("+primaryColor.r+","+primaryColor.g+","+primaryColor.b+") ["+exif.FileName+"]");
				//console.log("Primary Tint:  rgb("+primaryTint.r+","+primaryTint.g+","+primaryTint.b+") ["+exif.FileName+"]");
			};
			
			imageMagick(exif.icon).command("convert").in("-colors", "32").in("-depth", "8").in("-format", "'%c'").toBuffer("histogram:info", primaryColorOfImage);
			//imageMagick(exif.icon).command("convert").in("-filter", "box").in("-resize", "1x1!").in("-format", "'%[pixel:u]'").toBuffer("info", averageColorOfImage);
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

exports.regenerateAssets = regenerateAssets;

exports.exifAsync   = exifAsync;

exports.deleteImage = deleteImage;
exports.deleteVideo = deleteVideo;
exports.deletePDF   = deletePDF;

exports.getDimensions = getDimensions;
exports.getMimeType   = getMimeType;
exports.getExifData   = getExifData;

exports.setupBinaries = setupBinaries;
