// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

/**
 * SAGE2 File Manager
 *
 * @module client
 * @submodule SAGE2_Files
 * @class SAGE2_Files
 */

/* global SAGE2_init, escape, unescape, webix, $$, moment */

"use strict";

var sage2Version;

/**
 * Entry point of the file manager
 *
 * @method SAGE2_FileManager
 */
function SAGE2_FileManager() {
	var fileManager;

	// Connect to the server
	var wsio = new WebsocketIO();

	console.log("Connected to web server: ", window.location.origin);

	// Callback when socket opens
	wsio.open(function() {
		console.log("Open websocket");

		// Server sends the SAGE2 version
		wsio.on('setupSAGE2Version', function(data) {
			sage2Version = data;
			console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
		});

		// Got a reply from the server
		wsio.on('initialize', function(data) {
			var uniqueID = data.UID;
			console.log('Client ID', uniqueID);

			// Setup the file manager
			fileManager = new FileManager(wsio, "testA", uniqueID);

			// First request the files
			wsio.emit('requestStoredFiles');
		});

		wsio.on('storedFileList', function(data) {
			fileManager.updateFiles(data);
		});

		// Server sends the wall configuration
		wsio.on('setupDisplayConfiguration', function(data) {
			console.log('wall configuration received', data);
			fileManager.serverConfiguration(data);
		});

		// Register to the server as a console
		var clientDescription = {
			clientType: "files",
			requests: {
				config: true,
				version: true,
				time: false,
				console: false
			}
		};
		wsio.emit('addClient', clientDescription);
	});

	// Socket close event (ie server crashed)
	wsio.on('close', function() {
		var refresh = setInterval(function() {
			// make a dummy request to test the server every 2 sec
			var xhr = new XMLHttpRequest();
			xhr.open("GET", "/", true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4 && xhr.status === 200) {
					console.log("server ready");
					// when server ready, clear the interval callback
					clearInterval(refresh);
					// and reload the page
					window.location.reload();
				}
			};
			xhr.send();
		}, 2000);
	});
}

/**
 * Convert a file size (number) to pretty string
 *
 * @method fileSizeIEC
 * @param a {Number} file size to be converted
 * @return {String} number with unit
 */
function fileSizeIEC(a, b, c, d, e) {
	return (b = Math, c = b.log, d = 1024, e = c(a) / c(d) | 0,
			a / b.pow(d, e)).toFixed(1) + ' ' + (e ? 'KMGTPEZY'[--e] : 'B');
}


/**
 * FileManager object
 *
 * @method FileManager
 * @param wsio {Object} websocket
 * @param mydiv {Element} DOM element to place the file manager
 */
function FileManager(wsio, mydiv, uniqueID) {
	this.allFiles = {};
	this.allTable = null;
	this.tree = null;
	this.main = null;
	this.uniqueID = uniqueID;
	var _this = this;

	// WEBIX
	// ---------------------------------------------------

	var data_with_icon = [
		{id: "treeroot", value: "Assets", icon: "home", open: true, data: [
				{id: "Image", value: "Image", icon: "search", data: []},
				{id: "Video", value: "Video", icon: "search", data: []},
				{id: "PDF", value: "PDF", icon: "search", data: []},
				{id: "App", value: "Application", icon: "search", data: []},
				{id: "Session", value: "Session", icon: "search", data: []},
				{id: "Config", value: "Configuration", icon: "search", data: []}
			]
		}
	];

	var menu_data = [ {id: "file_menu", value: "File", submenu: [
			{id: "upload_menu", value: "Upload"},
			{id: "refresh_menu", value: "Refresh"},
			{id: "folder_menu", value: "Create folder"}
		]},
		{ id: "edit_menu", value: "Edit", submenu: [
			{id: "delete_menu", value: "Delete"},
			{id: "download_menu", value: "Download"},
			{id: "duplicate_menu", value: "Duplicate"} ]},
		{ id: "mainhelp_menu", value: "Help", submenu: [
			{id: "help_menu", value: "Help"},
			{id: "about_menu", value: "About"}
		] }
	];
	var mymenu = {
		id: "mymenu",
		view: "menu",
		openAction: "click",
		data: menu_data
	};
	var mytoolbar = {
		id: "mytoolbar",
		view: "toolbar", paddingY: 0,  borderless: true, elements: [
			{ id: "search_text", view: "text", width: 250, placeholder: "Search" }
		]
	};

	this.main = webix.ui({
		container: mydiv,
		id: "layout",
		rows: [
			{ view: "toolbar", cols: [ mymenu, mytoolbar ]
			},
			{ cols: [
				{ rows: [
					{id: "tree1",
					view: "tree",
					select: "select",
					navigation: true,
					drag: true,
					minWidth: 120,
					width: 180,
					data: data_with_icon,
					onContext: {} // required for context menu
				},
				{view: "resizer"},
				{height: 160, rows: [
				{type: "header", id: "drop_header", template: "Drop files below"
				},
				{
					view: "list", id: "uploadlist", type: "uploader",
					scroll: true
				}]}
				]
				},
				{
					view: "resizer"
				},
				{
					id: "multiview1",
					view: "multiview",
					animate: false,
					gravity: 2, // two times bigger
					cells: [
						{
						}
					]
				},
				{
					view: "resizer"
				},
				{
					minWidth: 100,
					rows: [
						{
							view: "property",
							id: "metadata",
							editable: false,
							scroll: true,
							width: 260,
							elements: [
							]
						},
						{
							view: "resizer"
						},
						{
							width: 260,
							height: 260,
							minHeight: 100,
							id: "thumb",
							template: function(obj) {
									if (obj.image) {
										return "<img src='" + obj.image + "_256.jpg'></img>";
									}
									return "";
								}
						}
					]
				}
			]
		}
		]
	});
	this.tree = $$("tree1");

	// Prevent HTML drop on rest of the page
	webix.event(window, 'dragover', function(evt) {
		evt.preventDefault();
	});
	webix.event(window, 'drop', function(evt) {
		evt.preventDefault();
	});

	// webix.event(window, "resize", function(evt) {
	// 	console.log('Resize', evt.target);
	// 	var newHeight = Math.round(evt.target.innerHeight * 0.80);
	// 	_this.main.config.height = newHeight;
	// 	_this.main.adjust();
	// });

	// Clear the upload list when clicking the header
	webix.event($$("drop_header").$view, "click", function(e) {
		$$("uploadlist").clearAll();
	});

	$$("mymenu").attachEvent("onMenuItemClick", function(evt) {
		console.log('Menu event', evt);
		if (evt === "about_menu") {
			var versionText = "SAGE2 Version:<br>";
			if (sage2Version.branch && sage2Version.commit && sage2Version.date) {
				versionText += "<b>v" + sage2Version.base + "-" + sage2Version.branch + "-" +
					sage2Version.commit + "</b> " + sage2Version.date;
			} else {
				versionText += "<b>v" + sage2Version.base + "</b>";
			}
			webix.alert({
				type: "alert-warning",
				title: "SAGE2 (tm)",
				ok: "OK",
				text: versionText
			});
		} else if (evt === "refresh_menu") {
			wsio.emit('requestStoredFiles');
		} else {
			// dunno
		}
	});

	$$("search_text").attachEvent("onTimedKeyPress", function() {
		var sel = _this.tree.getSelectedId() || "treeroot";
		var filter = $$("search_text").getValue();
		updateSearch(sel);
		if (filter) {
			_this.allTable.filter(function(obj) {
				return obj.name.search(new RegExp(filter, "i")) !== -1;
			}, null, true);
		}
	});

	var multiview1 = $$("multiview1");
	multiview1.addView({
		id: "all_table",
		view: "datatable",
		editable: true,
		columnWidth: 200,
		resizeColumn: true,
		animate: false,
		drag: true,
		select: "multiselect",
		navigation: true,
		columns: [
			{id: "index", header: "", width: 40, minWidth: 25, sort: "int"},
			{id: "name", header: "Name", minWidth: 180, sort: "text", fillspace: true},
			{id: "date", header: "Date", width: 150, minWidth: 80, sort: sortByDate, css: {'text-align': 'center'}},
			{id: "ago",  header: "Modified", width: 100, minWidth: 80, sort: sortByDate, css: {'text-align': 'right'}},
			{id: "type", header: "Type", width: 80, minWidth: 50,  sort: "text", css: {'text-align': 'center'}},
			{id: "size", header: "Size", width: 80, minWidth: 50,  sort: sortBySize, css: {'text-align': 'right'}}
		],
		data: [
		],
		scheme: {
			// Generate an automatic index
			$init: function(obj) { obj.index = this.count() + 1; }
		},
		on: {
			// update index after sort or update
			"data->onStoreUpdated": function() {
				this.data.each(function(obj, i) {
					obj.index = i + 1;
				});
				return true;
			}
		}
	});
	this.allTable = $$("all_table");

	// User selection
	this.allTable.attachEvent("onSelectChange", function(evt) {
		var elt = _this.allTable.getSelectedId();
		if (!elt || !elt.id) {
			return;
		}
		var metadata = $$("metadata");

		// Rebuild the metadata panel
		metadata.config.elements = [];
		metadata.config.elements.push({label: "Metadata", type: "label"});
		metadata.config.elements.push({label: "Width",
				value: _this.allFiles[elt.id].exif.ImageWidth || '-'});
		metadata.config.elements.push({label: "Height",
				value: _this.allFiles[elt.id].exif.ImageHeight || '-'});
		metadata.config.elements.push({label: "Author",
				value: _this.allFiles[elt.id].exif.Creator || '-'});
		metadata.config.elements.push({label: "File",
				value: _this.allFiles[elt.id].exif.MIMEType || '-'});

		// Add an EXIF panel for pictures
		var info;
		if (_this.allFiles[elt.id].exif.MIMEType.indexOf('image') >= 0) {
			metadata.config.elements.push({label: "Image", type: "label"});

			info = _this.allFiles[elt.id].exif.Make || '';
			metadata.config.elements.push({label: "Make", value: info});
			info = _this.allFiles[elt.id].exif.Model || '';
			metadata.config.elements.push({label: "Camera", value: info});
			info = _this.allFiles[elt.id].exif.LensID || _this.allFiles[elt.id].exif.LensInfo || '';
			metadata.config.elements.push({label: "Lens", value: info});
			info = _this.allFiles[elt.id].exif.ExposureTime || _this.allFiles[elt.id].exif.ShutterSpeedValue ||
						_this.allFiles[elt.id].exif.ShutterSpeed || '';
			metadata.config.elements.push({label: "Shutter speed", value: info});
			info = _this.allFiles[elt.id].exif.FNumber || _this.allFiles[elt.id].exif.Aperture ||
						_this.allFiles[elt.id].exif.ApertureValue || '';
			metadata.config.elements.push({label: "Aperture", value: info});
			info = _this.allFiles[elt.id].exif.ISO || '';
			metadata.config.elements.push({label: "ISO", value: info});
			info = _this.allFiles[elt.id].exif.ExposureProgram || '';
			metadata.config.elements.push({label: "Program", value: info});
			info = _this.allFiles[elt.id].exif.Flash || '';
			metadata.config.elements.push({label: "Flash", value: info});
			info = _this.allFiles[elt.id].exif.Megapixels || '';
			metadata.config.elements.push({label: "Megapixels", value: info});
			info = _this.allFiles[elt.id].exif.ColorSpace || '';
			metadata.config.elements.push({label: "Color space", value: info});
			info = _this.allFiles[elt.id].exif.WhiteBalance || '';
			metadata.config.elements.push({label: "White balance", value: info});

		} else if (_this.allFiles[elt.id].exif.MIMEType.indexOf('video') >= 0) {
			metadata.config.elements.push({label: "Video", type: "label"});

			info = _this.allFiles[elt.id].exif.Duration || '';
			metadata.config.elements.push({label: "Duration", value: info});
			info = _this.allFiles[elt.id].exif.ImageSize || '';
			metadata.config.elements.push({label: "ImageSize", value: info});
			info = _this.allFiles[elt.id].exif.VideoFrameRate || '';
			metadata.config.elements.push({label: "Frame rate", value: info});
			info = _this.allFiles[elt.id].exif.AvgBitrate || '';
			metadata.config.elements.push({label: "AvgBitrate", value: info});
			info = _this.allFiles[elt.id].exif.MajorBrand || '';
			metadata.config.elements.push({label: "Type", value: info});
			info = _this.allFiles[elt.id].exif.CompressorName || '';
			metadata.config.elements.push({label: "Video codec", value: info});
			info = _this.allFiles[elt.id].exif.AudioFormat || '';
			metadata.config.elements.push({label: "Audio codec", value: info});
			info = _this.allFiles[elt.id].exif.AudioChannels || '';
			metadata.config.elements.push({label: "Audio channels", value: info});
			info = _this.allFiles[elt.id].exif.AudioBitsPerSample || '';
			metadata.config.elements.push({label: "Audio bps", value: info});
			info = _this.allFiles[elt.id].exif.AudioSampleRate || '';
			metadata.config.elements.push({label: "Audio rate", value: info});
			info = _this.allFiles[elt.id].exif.Encoder || '';
			metadata.config.elements.push({label: "Encoder", value: info});

		} else if (_this.allFiles[elt.id].exif.MIMEType.indexOf('application/pdf') >= 0) {
			metadata.config.elements.push({label: "PDF", type: "label"});

			info = _this.allFiles[elt.id].exif.Title || '';
			metadata.config.elements.push({label: "Title", value: info});
			info = _this.allFiles[elt.id].exif.PageCount || '';
			metadata.config.elements.push({label: "Pages", value: info});
			info = _this.allFiles[elt.id].exif.Description || '';
			metadata.config.elements.push({label: "Description", value: info});
			info = _this.allFiles[elt.id].exif.Creator || '';
			metadata.config.elements.push({label: "Creator", value: info});
			info = _this.allFiles[elt.id].exif.Keywords || '';
			metadata.config.elements.push({label: "Keywords", value: info});
			info = _this.allFiles[elt.id].exif.PDFVersion || '';
			metadata.config.elements.push({label: "Version", value: info});
			info = _this.allFiles[elt.id].exif.CreatorTool || '';
			metadata.config.elements.push({label: "CreatorTool", value: info});
			info = _this.allFiles[elt.id].exif.Producer || '';
			metadata.config.elements.push({label: "Producer", value: info});
			info = _this.allFiles[elt.id].exif.Linearized || '';
			metadata.config.elements.push({label: "Linearized", value: info});

		} else if (_this.allFiles[elt.id].exif.MIMEType.indexOf('application/xml') >= 0) { //Added by D.A.
			if(_this.allFiles[elt.id].exif.FileName.split(".").pop() === "tkt") {
				metadata.config.elements.push({label: "XML (Espresso Ticket)", type: "label"});
				for (var key in _this.allFiles[elt.id].exif) {
					if (key.match(/Orochi/)) {
						info = _this.allFiles[elt.id].exif[key] || '';
						metadata.config.elements.push({label: key, value: info});
					}
				}
			} else {
				metadata.config.elements.push({label: "XML", type: "label"});
				for (var key in _this.allFiles[elt.id].exif) {
					info = _this.allFiles[elt.id].exif[key] || '';
					metadata.config.elements.push({label: key, value: info});
				}
			}

		} else if (_this.allFiles[elt.id].exif.MIMEType.indexOf('application/custom') >= 0) {
			metadata.config.elements.push({label: "Application", type: "label"});

			info = _this.allFiles[elt.id].exif.metadata.title || '';
			metadata.config.elements.push({label: "Title", value: info});
			info = _this.allFiles[elt.id].exif.metadata.version || '';
			metadata.config.elements.push({label: "Version", value: info});
			info = _this.allFiles[elt.id].exif.metadata.license || '';
			metadata.config.elements.push({label: "License", value: info});
			// Parse email
			info = _this.allFiles[elt.id].exif.metadata.author || '';
			info = info.split('<');
			if (info.length === 2) {
				var email = info[1];
				email = email.split('>')[0];
				metadata.config.elements.push({label: "Email", value: email});
			}
			// Parse keywords
			info = _this.allFiles[elt.id].exif.metadata.keywords || '';
			metadata.config.elements.push({label: "Keywords", value: info.map(function(k) { return " " + k; }).toString()});
			// Parse file types
			info = _this.allFiles[elt.id].exif.metadata.fileTypes;
			if (info.length === 0) {
				info = "-";
			}
			metadata.config.elements.push({label: "File types", value: info});

			// Parse description
			info = _this.allFiles[elt.id].exif.metadata.description || '';
			metadata.config.elements.push({label: info, type: "label",
					css: {height: "100px"}});
		}

		// Done updating metadata
		metadata.refresh();

		// Update the thumbnail
		var thumb = $$("thumb");
		thumb.data = {image: _this.allFiles[elt.id].exif.SAGE2thumbnail};
		thumb.refresh();
	});

	this.openItem = function(tid, position) {
		var appType = this.getApplicationFromId(tid);
		// Opening an app
		if (appType === "application/custom") {
			wsio.emit('loadApplication',
					{application: tid,
user: _this.uniqueID,
position: position});
		} else {
			// Opening a file
			wsio.emit('loadFileFromServer',
					{application: appType,
filename: tid,
user: _this.uniqueID,
position: position});
		}
	};

	this.allTable.attachEvent("onItemDblClick", function(id, e, node) {
			// Open the selected content on the wall
			_this.openItem(id.row);
			});

	// this.allTable.attachEvent("onAfterSort", function(by, dir, func, obj) {
	// 	console.log('Sorting done', by, dir, func);
	// });

	// onItemClick onAfterSelect onBeforeSelect
	this.tree.attachEvent("onSelectChange", function(evt) {
			var treeSelection = _this.tree.getSelectedItem();
			// If a media folder is selection
			if (treeSelection) {
			if (treeSelection.sage2URL) {
			_this.allTable.filter(function(obj) {
				// trying to match the base URL
				return _this.allFiles[obj.id].sage2URL.lastIndexOf(treeSelection.sage2URL, 0) === 0;
				});
			return;
			}
			}
			// Otherwise, regular search
			updateSearch(evt[0]);
			});

	// this.tree.attachEvent("onItemClick", function(evt) {
	// });

	// The drag-and-drop context can have the next properties:
	// from - the source object
	// to - the target object
	// source - the id of the dragged item(s)
	// target - the id of the drop target, null for drop on empty space
	// start - the id from which DND was started
	this.allTable.attachEvent("onBeforeDrag", function(context, ev) {
			var elt;
			context.html = "<div style='padding:8px;background:#d3e3ef'>";
			if (context.source.length === 1) {
			elt = _this.allFiles[context.start];
			context.html += '<img width=96 src=\"' + elt.exif.SAGE2thumbnail + '_128.jpg\" />';
			context.html += '<br>' + elt.exif.FileName;
			} else {
			for (var i = 0; i < Math.min(context.source.length, 35); i++) {
			elt = _this.allFiles[context.source[i]];
			context.html += elt.exif.FileName + "<br>";
			}
			}
			context.html += "</div>";
			});
	this.allTable.attachEvent("onBeforeDrop", function(context, ev) {
			console.log('onBeforeDrop', ev);
			// No DnD
			return false;
			});

	this.tree.attachEvent("onBeforeDrop", function(context, ev) {
			// for (var i = 0; i < context.source.length; i++) {
			// 	console.log('onBeforeDrop', context.source[i], context.target);
			// }
			// return true;

			// No DnD
			return false;
			});
	this.tree.attachEvent("onAfterDrop", function(context, native_event) {
			// console.log('onAfterDrop', context.source, context.target);
			});

	webix.event(this.allTable.$view, "drag", function(e) {
			console.log('drag');
			e.preventDefault();
			});

	// HTML5 drag and drop
	// var popup;
	// webix.event(main.$view, "dragenter", function(e) {
	// 	e.preventDefault();
	// 	if (!popup) {
	// 		popup = webix.ui({
	// 			view: "window",
	// 			id: "my_upload",
	// 			head: "Uploading",
	// 			position: "center",
	// 			width: Math.round(window.innerWidth*0.50),
	// 			height: Math.round(window.innerHeight*0.50),
	// 			body: {
	// 				template: "&nbsp;<br>&nbsp;<br>" +
	// 					"<h1 style=\"color:black\">drop files to upload</h1>"
	// 			}
	// 		})
	// 		popup.show();
	// 	}
	// });
	// webix.event(main.$view, "dragleave", function(e) {
	// 	console.log('drag leave');
	// 	e.preventDefault();
	// 	if (popup) {
	// 		popup.close();
	// 		popup = null;
	// 	}
	// });
	// webix.event(main.$view, "dragover", function(e) {
	// 	e.preventDefault();
	// 	console.log('drag over');
	// });
	// webix.event(main.$view, "drag", function(e) {
	// 	e.preventDefault();
	// 	console.log('drag');
	// });
	// webix.event(main.$view, "drop", function(e) {
	// 	e.preventDefault();
	// 	console.log('drop',e);
	// 	popup.close();
	// 	var mymain = $$(e);
	// 	var id = mymain.locate(e);
	// 	console.log('Drop', e, id);
	// });

	webix.ui({
id: "uploadAPI",
view: "uploader",
upload: "/upload",  // POST url
on: {
onFileUpload: function(item) {
console.log('uploaded file', item.name);
},
onUploadComplete: function(item) {
var d = $$("uploadlist");
d.data.each(function(obj) {
	// if all good, remove from list
	if (obj.status === 'server') {
	var it = d.getItemNode(obj.id);
	it.style.color = "green";
	}
	});
},
onFileUploadError: function(item) {
console.log('onFileUploadError', item);
}
},
link: "uploadlist",
	apiOnly: true
	});
$$("uploadAPI").addDropZone($$("uploadlist").$view);

this.tree.closeAll();
this.tree.open("treeroot");

webix.ui({
view: "contextmenu",
id: "cmenu",
data: ["Open", "Download", { $template: "Separator" }, "Delete"],
on: {
onItemClick: function(id) {
var i;
var context = this.getContext();
var list    = context.obj;
var listId  = context.id;
var dItems  = _this.allTable.getSelectedId(true);

if (id === "Download") {
downloadItem(list.getItem(listId).id);

} else if (id === "Open") {
var tbo = [];
if (dItems.length === 0) {
// If no selection, use the item under the context menu
tbo.push(list.getItem(listId).id);
} else {
	// otherwise take all selected items
	for (i = 0; i < dItems.length; i++) {
		tbo.push(dItems[i].id);
	}
}
// Open all the content one at a time
tbo.map(function(tid) {
		_this.openItem(tid);
		});

} else if (id === "Delete") {
	var tbd = [];
	var textTbd = "<ol style=\"list-style-position: inside;padding:10px;text-align:left;\">";
	var numItems = 0;
	if (dItems.length === 0) {
		// If no selection, use the item under the context menu
		tbd.push(list.getItem(listId).id);
		textTbd += list.getItem(listId).id;
		numItems = 1;
	} else {
		// otherwise take all selected items
		for (i = 0; i < dItems.length; i++) {
			tbd.push(dItems[i].id);
			// Only list first 15 items...
			if (i < 14) {
				textTbd += '<li>' + dItems[i].id + '</li>';
			} else if (i === 14) {
				textTbd += '<li>...</li>';
			}
			numItems++;
		}
	}
	textTbd += "</ol>";
	webix.confirm({
title: "Confirm deletion - " + numItems + " item(s)",
width: "50%",
ok: "Yes",
cancel: "No",
text: textTbd,
callback: function(yesno) {
if (yesno) {
// for all elements
tbd.map(function(tid) {
	// send delete message to server
	wsio.emit('deleteElementFromStoredFiles',
		{filename: tid});
	_this.allTable.remove(tid);
	});
}
}
});
}
}
}
});
$$("cmenu").attachTo($$("all_table"));
// $$("cmenu").attachTo($$("tree1"));

this.main.config.height = Math.round(window.innerHeight * 0.80);
this.main.show();
this.main.adjust();


this.getApplicationFromId = function(id) {
	// default answer
	var response = "application/custom";
	// Lookup the asset
	var elt = this.allFiles[id];
	// if found
	if (elt) {
		if (elt.exif.MIMEType.indexOf('image') >= 0) {
			response = "image_viewer";
		} else if (elt.exif.MIMEType.indexOf('pdf') >= 0) {
			response = "pdf_viewer";
		} else if (elt.exif.MIMEType.indexOf('xml') >= 0) {
			response = "xml_viewer";
		} else if (elt.exif.MIMEType.indexOf('video') >= 0) {
			response = "movie_player";
		}
	}
	// send the result
	return response;
};

function sortByDate(a, b) {
	// fileds are 'moment' objects
	a = _this.allFiles[a.id].exif.FileModifyDate;
	b = _this.allFiles[b.id].exif.FileModifyDate;
	return a > b ? 1 : (a < b ? -1 : 0);
}
function sortBySize(a, b) {
	// File size in byte
	a = _this.allFiles[a.id].exif.FileSize;
	b = _this.allFiles[b.id].exif.FileSize;
	return a > b ? 1 : (a < b ? -1 : 0);
}

function downloadItem(elt) {
	var url = _this.allFiles[elt].sage2URL;
	if (url) {
		// Open the file
		// window.open(url, '_blank');

		// Download the file
		var link = document.createElement('a');
		link.href = url;
		if (link.download !== undefined) {
			// Set HTML5 download attribute. This will prevent file from opening if supported.
			var fileName = url.substring(url.lastIndexOf('/') + 1, url.length);
			link.download = fileName;
		}
		// Dispatching click event
		if (document.createEvent) {
			var me = document.createEvent('MouseEvents');
			me.initEvent('click', true, true);
			link.dispatchEvent(me);
			return true;
		}
	}
}

function updateSearch(searchParam) {
	if (searchParam === "Image") {
		_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('image') >= 0;
				});
	} else if (searchParam === "PDF") {
		_this.allTable.filter(function(obj) {
				return obj.type.toString() === "PDF";
				});
	} else if (searchParam === "Video") {
		_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('video') >= 0;
				});
	} else if (searchParam === "App") {
		_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('application/custom') >= 0;
				});
	} else if (searchParam === "Session") {
		_this.allTable.filter(function(obj) {
				return false;
				});
	} else if (searchParam === "Config") {
		_this.allTable.filter(function(obj) {
				return false;
				});
	} else if (searchParam === "treeroot") {
		_this.allTable.filter();
	} else {
		console.log('Default search on:', searchParam);
	}
}

// Server sends the media files list
this.updateFiles = function(data) {
	var i, f;

	// Clean the main data structures
	this.allFiles = {};
	this.allTable.clearAll();

	// Add all the files in
	for (i = 0; i < data.images.length; i++) {
		f = data.images[i];
		this.allFiles[f.id] = f;
	}
	for (i = 0; i < data.videos.length; i++) {
		f = data.videos[i];
		this.allFiles[f.id] = f;
	}
	for (i = 0; i < data.pdfs.length; i++) {
		f = data.pdfs[i];
		this.allFiles[f.id] = f;
	}
	for (i = 0; i < data.xmls.length; i++) {
		f = data.xmls[i];
		this.allFiles[f.id] = f;
	}
	for (i = 0; i < data.applications.length; i++) {
		f = data.applications[i];
		this.allFiles[f.id] = f;
	}

	i = 0;
	var mm, createDate;
	for (var a in this.allFiles) {
		f = this.allFiles[a];
		// console.log('URL', f.sage2URL);
		// if it's an app
		if (f.exif.MIMEType.indexOf('application/custom') >= 0) {
			mm = moment();
			f.exif.FileModifyDate = mm;
			f.exif.FileSize = 0;
			f.exif.Creator = f.exif.metadata.author;
			this.allTable.data.add({id: f.id,
					name: f.exif.FileName,
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago: mm.fromNow(),
					type: "APP",
					size: fileSizeIEC(f.exif.FileSize)
					});
		} else {
			// Any other asset type
			// Try to find creation
			createDate = f.exif.CreateDate ||
				f.exif.DateTimeOriginal ||
				f.exif.ModifyDate ||
				f.exif.FileModifyDate;
			f.exif.FileModifyDate = createDate;
			mm = moment(f.exif.FileModifyDate, 'YYYY:MM:DD HH:mm:ssZZ');
			f.exif.FileModifyDate = mm;
			this.allTable.data.add({id: f.id,
					name: f.exif.FileName,
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago: mm.fromNow(),
					type: f.exif.FileType,
					size: fileSizeIEC(f.exif.FileSize)
					});
		}
		i++;
	}

	this.refresh();
	// Sort the table by name
	this.allTable.sort("name", "asc");
};

this.refresh = function() {
	this.tree.refresh();
	this.allTable.refresh();
	$$("multiview1").setValue("all_table");
	this.main.adjust();
};

// Server sends the wall configuration
this.serverConfiguration = function(data) {
	// Add the media folders to the tree
	var idx = 0;
	for (var f in data.folders) {
		var folder = data.folders[f];
		// Build the tree item
		//   folder Object {name: "system", path: "public/uploads/",
		//                  url: "/uploads", upload: false}
		var newElement = {id: folder.name, value: folder.name + ":" + folder.url,
			icon: "folder", sage2URL: folder.url, data: []};
		// Add it at the top
		this.tree.data.add(newElement, idx, "treeroot");
		idx = idx + 1;
	}
	// refresh the tree
	this.tree.refresh();
};

}
