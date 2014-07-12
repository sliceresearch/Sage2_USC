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
var path      = require('path');
var url       = require('url');

var exiftool  = require('../src/node-exiftool');       // gets exif tags for images


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
    this.filename = aFilename;
    this.id       = aFilename;
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

	var fullpath = path.join(AllAssets.root, filename);
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
};

addURL = function(url,exif) {
	// Add the asset in the array
	var anAsset = new Asset();
	anAsset.setURL(url);
	anAsset.setEXIF(exif);
	AllAssets.list[anAsset.id] = anAsset;
};

getDimensions = function (id) {
	if (id in AllAssets.list)
		return {width:  AllAssets.list[id].exif.ImageWidth,
				height: AllAssets.list[id].exif.ImageHeight };
	else
		return null;
}

getMimeType = function (id) {
	if (id in AllAssets.list)
		return AllAssets.list[id].exif.MIMEType;
	else
		return null;
}

exifAsync = function(cmds, cb) {
	var execNext = function() {
		exiftool.file(cmds.shift(), function(err,data) {
			if (err) {
				console.log("internal error");
				cb(err);
			} else {
				console.log("EXIF> Adding", data.FileName);
				addFile(data.SourceFile, data);
				if (cmds.length) execNext();
				else cb(null);
			}
		});
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


initialize = function (root) {
	if (AllAssets === null) {
		// public_HTTPS/uploads/assets.json
		// list: {}, root: null
		
		AllAssets = {};

		var assetFile = path.join(root,'assets.json');
		if (fs.existsSync(assetFile)) {
			var data    = fs.readFileSync(assetFile);
			var oldList = JSON.parse(data);
			AllAssets.root = root;
			AllAssets.list = oldList.list;
			// Flag all the assets for checking
			for (item in AllAssets.list) AllAssets.list[item].Valid = false;
		} else {
			AllAssets.list = {};
			AllAssets.root = root;
		}
	
		console.log("Assests> initialize");
		var thelist = [];
		var uploadedImages = fs.readdirSync(path.join(root, "images"));
		var uploadedVideos = fs.readdirSync(path.join(root, "videos"));
		var uploadedPdfs   = fs.readdirSync(path.join(root, "pdfs"));
		var i;
	
		var item;
		for(i=0; i<uploadedImages.length; i++) {
			item = path.join(root, "images", uploadedImages[i]);
			if (item in AllAssets.list) {
				AllAssets.list[item].Valid = true;
			} else {
				thelist.push(item);				
			}
		}
		for(i=0; i<uploadedVideos.length; i++) {
			item = path.join(root, "videos", uploadedVideos[i]);
			if (item in AllAssets.list) {
				AllAssets.list[item].Valid = true;
			} else {
				thelist.push(item);
			}
		}
		for(i=0; i<uploadedPdfs.length; i++) {
			item = path.join(root, "pdfs", uploadedPdfs[i]);
			if (item in AllAssets.list) {
				AllAssets.list[item].Valid = true;
			} else {
				thelist.push(item);
			}
		}
		// delete the elements which not there anymore
		for (item in AllAssets.list) {
			if (AllAssets.list[item].Valid === false) {
				console.log("Assets> Removing old item", item);
				delete AllAssets.list[item];
			} else {
				// Just remove the Valid flag
				delete AllAssets.list[item].Valid
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
exports.addFile    = addFile;
exports.addURL     = addURL;

exports.getDimensions = getDimensions;
exports.getMimeType   = getMimeType;

