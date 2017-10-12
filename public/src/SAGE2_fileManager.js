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

/* global SAGE2_init, SAGE2_resize, escape, unescape, sage2Version, showDialog */
/* global removeAllChildren, SAGE2_copyToClipboard, displayUI, dateToYYYYMMDDHHMMSS */
/* global showSAGE2Message */

"use strict";

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
	this.selectedItem = null;
	this.dragPosition = null;
	this.json_cfg  = null;
	this.http_port = null;

	// Set the current sorting order
	this.sorting = {by: "name", dir: "asc", as: "string"};

	var _this = this;

	// WEBIX
	// ---------------------------------------------------

	var data_with_icon = [
		{id: "treeroot", value: "SAGE2", icon: "home", open: true, tooltip: "All the files",
			data: [
				{id: "Image:/",   value: "Image", icon: "search", data: [], tooltip: "Show all the images"},
				{id: "Video:/",   value: "Video", icon: "search", data: [], tooltip: "Show all the videos"},
				{id: "PDF:/",     value: "PDF", icon: "search", data: [], tooltip: "Show all the PDF files"},
				{id: "Note:/",    value: "Note", icon: "search", data: [], tooltip: "Show all the notes"},
				{id: "App:/",     value: "Application", icon: "search", data: [], tooltip: "Show all the applications"},
				{id: "Session:/", value: "Session", icon: "search", data: [], tooltip: "Show all the sessions"},
				{id: "Link:/",    value: "Link", icon: "search", data: [], tooltip: "Show all the links"},
				{id: "Mine:/",    value: "My files", icon: "search", data: [], tooltip: "Show all my uploaded files"}
			]
		}
	];

	// File menu of the media browser
	var fileMediaActions = {
		folder_menu: {value: "New folder", callback: function (evt) {
			// Try to create a folder
			createFolderUI();
		}},
		upload_menu: {value: "Upload an Image", callback: function (evt) {
			// open the file uploader panel
			showDialog('uploadDialog');
		}},
		separator: {value: "separator"},
		refresh_menu: {value: "Refresh Media Browser", callback: function (evt) {
			wsio.emit('requestStoredFiles');
		}},
		hidefm_menu: {value: "Close Media Browser", callback: function (evt) {
			var mainUI = document.getElementById('mainUI');
			document.getElementById('fileManager').style.display = "none";
			if (mainUI.style.display === "none") {
				mainUI.style.display = "block";
			}
			SAGE2_resize();
		}}
	};

	// Edit menu of the media browser
	var editMediaActions = {
		open_menu: {value: "Open", callback: function (evt) {
			// Get selected items
			var dItems = _this.allTable.getSelectedId(true);
			var tbo = [];
			// otherwise take all selected items
			for (var i = 0; i < dItems.length; i++) {
				tbo.push(dItems[i].id);
			}
			// Open all the content one at a time
			tbo.map(function(tid) {
				_this.openItem(tid);
			});
		}},
		copyurl_menu: {value: "Copy URL", callback: function (evt) {
			// Get selected items
			var dItems = _this.allTable.getSelectedId(true);
			copyURLItem(dItems[0].id);
		}},
		taburl_menu: {value: "Open in Tab", callback: function (evt) {
			// Get selected items
			var dItems = _this.allTable.getSelectedId(true);
			openURLItem(dItems[0].id);
		}},
		download_menu: {value: "Download", callback: function (evt) {
			// Get selected items
			var dItems = _this.allTable.getSelectedId(true);
			// Go over the list of selected items
			for (var i = 0; i < dItems.length; i++) {
				// Trigger the download command
				downloadItem(dItems[i].id);
			}
		}},
		separator: {value: "separator"},
		delete_menu: {value: "Delete", callback: function (evt) {
			// Delete one or several selected files
			deleteFilesUI();
		}}
	};

	// File manager menu bar
	var menuMediaBrowser_data = [
		// File entry
		{id: "file_menu", value: "File", config: {width: 170}, submenu: buildSubmenu(fileMediaActions)},
		// Edit entry
		{id: "edit_menu", value: "Edit", submenu: buildSubmenu(editMediaActions)}
	];
	var menuMediaBrowser = {
		view: "menu",
		id: "menuMediaBrowser",
		openAction: "click",
		data: menuMediaBrowser_data
	};
	var searchToolbar = {
		id: "searchToolbar",
		view: "toolbar", paddingY: 0,  borderless: true, elements: [
			{ id: "search_text", view: "text", width: 250, placeholder: "Search" }
		]
	};

	/////////////////////////////////////////////////////////////////////////////
	// Build all the sub menus

	// File menu
	var fileActions = {
		upload_menu: {value: "Upload an Image",
			tooltip: "Uploads an image to the SAGE2 server and opens it",
			callback: function (evt) {
				// open the file uploader panel
				showDialog('uploadDialog');
			}
		},
		session_menu: {value: "Save the Session",
			tooltip: "Saves the opened applications and their states in a session file",
			callback: function (evt) {
				// open the session popup
				_this.saveSession();
			}
		},
		separator: {value: "separator"},
		showfm_menu: {value: "Open Media Browser",
			tooltip: "Shows the file media browser below the user interface",
			callback: function (evt) {
				document.getElementById('fileManager').style.display = "block";
				SAGE2_resize();
			}
		},
		hidefm_menu: {value: "Close Media Browser",
			tooltip: "Hides the file media broswer",
			callback: function (evt) {
				var mainUI = document.getElementById('mainUI');
				document.getElementById('fileManager').style.display = "none";
				if (mainUI.style.display === "none") {
					mainUI.style.display = "block";
				}
				SAGE2_resize();
			}
		}
	};

	// Partitions menu
	var partitionsActions = {
		p1x1_menu: {value: "Fullscreen", callback: function (evt) {
			// create one full partition
			wsio.emit('partitionScreen', {
				type: "row", ptn: true,	size: 12
			});
		}},
		p2x1_menu: {value: "2 Columns", callback: function (evt) {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "row", size: 12,
					children: [
						{type: "col", ptn: true, size: 6},
						{type: "col", ptn: true, size: 6}
					]
				});
		}},
		p3x1_menu: {value: "3 Columns", callback: function (evt) {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "row", size: 12,
					children: [
						{type: "col", ptn: true, size: 4},
						{type: "col", ptn: true, size: 4},
						{type: "col", ptn: true, size: 4}
					]
				});
		}},
		p2x2_menu: {value: "2 Columns, 2 Rows", callback: function (evt) {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "col", size: 12,
					children: [
						{
							type: "row", size: 6,
							children: [
								{type: "col", ptn: true, size: 6},
								{type: "col", ptn: true, size: 6}
							]
						},
						{
							type: "row", size: 6,
							children: [
								{type: "col", ptn: true, size: 6},
								{type: "col", ptn: true, size: 6}
							]
						}
					]
				});
		}},
		p2s_1b_2s_menu: {value: "Center Pane, 4 Mini", callback: function (evt) {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "row", size: 12,
					children: [
						{
							type: "col", size: 3,
							children: [
								{type: "row", ptn: true, size: 8},
								{type: "row", ptn: true, size: 4}
							]
						},
						{type: "col", ptn: true, size: 6},
						{
							type: "col", size: 3,
							children: [
								{type: "row", ptn: true, size: 4},
								{type: "row", ptn: true, size: 8}
							]
						}
					]
				});
		}},
		p2b_1w_menu: {value: "2 Pane, Taskbar", callback: function (evt) {
			// create partition division of screen
			wsio.emit('partitionScreen',
				{
					type: "col", size: 12,
					children: [
						{
							type: "row", size: 8,
							children: [
								{type: "col", ptn: true, size: 6},
								{type: "col", ptn: true, size: 6}
							]
						},
						{
							type: "row", size: 4,
							children: [
								{type: "col", ptn: true, size: 12}
							]
						}
					]
				});
		}},
		separator: {value: "separator"},
		partitiongrab_menu: {
			value: "Fit Content",
			callback: function (evt) {
				wsio.emit('partitionsGrabAllContent');
			}}
	};

	// View menu
	var viewActions = {
		settings_menu: {value: "Settings",
			tooltip: "Opens the pointer and screen sharing settings panel",
			callback: function (evt) {
				showDialog('settingsDialog');
			}
		},
		separator1: {value: "separator"},
		tile_menu: {value: "Tile Content",
			tooltip: "Applies an automatic layout algorithm to tile the current windows",
			callback: function (evt) {
				// Tile applications on the wall
				wsio.emit('tileApplications');
			}
		},
		clear_menu: {value: "Clear Display",
			tooltip: "Deletes all applications and partitions",
			callback: function (evt) {
				// Remove apps and partitions
				wsio.emit('clearDisplay');
			}
		},
		deleteapps_menu: {value: "Delete Applications",
			tooltip: "Closes all the applications but leaves the partitions",
			callback: function (evt) {
				// Remove apps and keep the partitions
				wsio.emit('deleteAllApplications');
			}
		},
		deletepartition_menu: {value: "Delete Partitions",
			tooltip: "Deletes only the partitions but not the applications",
			callback: function (evt) {
				wsio.emit('deleteAllPartitions');
			}
		},
		partitions_menu: {value: "Create Partitions", submenu: buildSubmenu(partitionsActions)},
		separator3: {value: "separator"},
		wallScreenshot_menu: {value: "Take Screenshot",
			tooltip: "Captures a screenshot of the wall and opens it up",
			callback: function (evt) {
				wsio.emit("startWallScreenshot");
			}
		}
	};

	// Services menu
	var servicesActions = {
		appstore_menu: {value: "SAGE2 Appstore",
			tooltip: "Opens the appstore where you can download new applications\nthat can be added to your wall",
			callback: function (evt) {
				var storeUrl = "http://apps.sagecommons.org/";
				window.open(storeUrl, '_blank');
			}
		},
		imageservice_menu: {value: "Large Image Processing",
			tooltip: "Opens a service that lets you process large images into pyramidal representation:\n" +
				"download the DZI file and drop it onto your wall",
			callback: function (evt) {
				var imageUrl = "https://sage2rtt.evl.uic.edu:3043/upload";
				window.open(imageUrl, '_blank');
			}
		},
		videoservice_menu: {value: "Video Processing",
			tooltip: "Opens a service that lets you convert video files to MP4 format",
			callback: function (evt) {
				var videoUrl = "https://sage2rtt.evl.uic.edu:3043/video/";
				window.open(videoUrl, '_blank');
			}
		}
	};

	// Help
	var helpActions = {
		help_menu: {value: "Help",
			tooltip: "Presents help on how to setup desktop sharing and\nlist supported media formats",
			callback: function (evt) {
				window.open("help/index.html", '_blank');
			}
		},

		shortcuts_menu: {value: "Shortcuts",
			tooltip: "Mouse and keyboard operations and shortcuts",
			callback: function (evt) {
				webix.modalbox({
					title: "Mouse and keyboard operations",
					buttons: ["Ok"],
					text: "<img src=/images/cheat-sheet.jpg width=100%>",
					width: "75%",
					height: "75%"
				});
			}
		},

		forum_menu: {value: "User Forum",
			tooltip: "User forum on Google Groups",
			callback: function (evt) {
				window.open("https://groups.google.com/forum/#!forum/sage2", '_blank');
			}
		},
		info_menu: {value: "Information",
			tooltip: "Shows references and links about SAGE2",
			callback: function (evt) {
				window.open("help/info.html", '_blank');
			}
		},
		about_menu: {value: "About",
			tooltip: "Shows the SAGE2 server version and configuration",
			callback: function (evt) {
				var versionText = buildAboutHTML();
				// Open the popup
				webix.alert({
					type: "alert-warning",
					title: "SAGE2™",
					width: "420px",
					ok: "OK",
					text: versionText
				});
			}
		}
	};

	// Assemble the top menu bar
	var topmenu_data = [
		{id: "topfile_menu", value: "File",
			config: {width: 170, zIndex: 9000},
			submenu: buildSubmenu(fileActions)
		},
		{id: "view_menu", value: "View", config: {width: 170, zIndex: 9000},
			submenu: buildSubmenu(viewActions)
		},
		{id: "services_menu", value: "Services", config: {width: 170, zIndex: 9000},
			submenu: buildSubmenu(servicesActions)
		},
		{id: "mainhelp_menu",  value: "Help", config: {zIndex: 9000},
			submenu: buildSubmenu(helpActions)
		}
	];

	// Build the Advanced menu
	var advancedToolbarActions = {
		display_menu: {value: "Display Client 0",
			tooltip: "Opens a new page with the first display client",
			callback: function (evt) {
				var displayUrl = "http://" + window.location.hostname + _this.http_port +  "/display.html?clientID=0";
				window.open(displayUrl, '_blank');
			}
		},
		overview_menu: {value: "Display Overview Client",
			tooltip: "Opens a new page with the overview display client",
			callback: function (evt) {
				var overviewUrl = "http://" + window.location.hostname + _this.http_port +  "/display.html?clientID=-1";
				window.open(overviewUrl, '_blank');
			}
		},
		audio_menu: {value: "Audio Manager",
			tooltip: "Opens a new page with the audio manager",
			callback: function (evt) {
				var audioUrl = "http://" + window.location.hostname + _this.http_port +  "/audioManager.html";
				window.open(audioUrl, '_blank');
			}
		},
		console_menu: {value: "Server Console",
			tooltip: "Opens a new page displaying the server debug messages",
			callback: function (evt) {
				window.open("admin/console.html", '_blank');
			}
		},
		performance_menu: {value: "Performance Console",
			tooltip: "Opens a new page displaying performance monitoring data",
			callback: function (evt) {
				window.open("admin/performance.html", '_blank');
			}
		}
	};

	// Advanced setting, right-aligned in the top menubar
	var advancedToolbar = {
		view: "toolbar", paddingY: 0, css: {'text-align': 'right'}, elements: [
			{view: "menu", id: "advancedToolbar", paddingY: 0, borderless: true,
				tooltip: false,
				submenuConfig: {
					tooltip: {
						// function building the tooltip text
						template: showTooltip,
						// tooltip position offset
						dx: 50, dy: 5,
						width: 100
					},
					// Delay the tooltip by 0.5s
					mouseEventDelay: 500
				},
				data: [
					{id: "mainadmin_menu", value: "Advanced", config: {zIndex: 9000},
						submenu: buildSubmenu(advancedToolbarActions)
					}
				]
			}
		]
	};

	// On mobile, menu opens with a click, otherwise hovers
	var clickOrNoClick = __SAGE2__.browser.isMobile ? "click" : null;

	var topmenu = {
		id: "topmenu",
		view: "menu",
		// click or not to open
		openAction: clickOrNoClick,
		data: topmenu_data,
		tooltip: false,
		submenuConfig: {
			tooltip: {
				// function building the tooltip text
				template: showTooltip,
				// tooltip position offset
				dx: 50, dy: 5,
				width: 100
			},
			// Delay the tooltip by 0.5s
			mouseEventDelay: 500
		}
	};

	// Top menubar above the UI
	// Create the top menubar, with menu and avanced settings in the right-aligned toolbar
	webix.ui({
		container: document.getElementById('mainMenuBar'),
		id: "toplayout",
		// CSS styling for colors
		css: "my_style",
		// Remove the css borders for full width
		borderless: true,
		rows: [{
			view: "toolbar",
			cols: [topmenu, advancedToolbar]
		}]
	});

	// Disable the screenshot menu. Will wbe enabled later froms server
	$$('topmenu').disableItem('wallScreenshot_menu');

	// Set the actions for the file menu
	attachCallbacks($$("topmenu").getSubMenu('topfile_menu'), fileActions);
	// Set the actions for the view menu
	attachCallbacks($$('topmenu').getSubMenu('view_menu'), viewActions);
	// Set the actions for the services menu
	attachCallbacks($$("topmenu").getSubMenu('services_menu'), servicesActions);
	// Set the actions for the help menu
	attachCallbacks($$("topmenu").getSubMenu('mainhelp_menu'), helpActions);
	// Set the actions for the advanced menu
	attachCallbacks($$("advancedToolbar").getSubMenu('mainadmin_menu'), advancedToolbarActions);
	// Set the actions for the partition menu
	attachCallbacks($$('topmenu').getSubMenu('partitions_menu'), partitionsActions);

	/////////////////////////////////////////////////////////////////////////////

	this.main = webix.ui({
		container: mydiv,
		id: "layout",
		css: { border: "solid 1px #565656;"},
		rows: [
			{
				view: "toolbar",
				cols: [menuMediaBrowser, searchToolbar]
			},
			{ cols: [
				{
					rows: [
						{
							id: "tree1",
							view: "tree",
							select: "select",
							navigation: true,
							drag: true,
							minWidth: 120,
							width: 180,
							activeTitle: true, // close/open when selected
							tooltip: showTooltip,
							data: data_with_icon,
							onContext: {} // required for context menu
						},
						{
							view: "resizer"},
						{
							height: 160, rows: [
								{type: "header", id: "drop_header", template: "Drop files below"},
								{view: "list", id: "uploadlist", type: "uploader", scroll: 'y'}
							]
						}
					]
				},
				{
					view: "resizer"
				},
				{
					id: "all_table",
					view: "datatable",
					gravity: 2, // two times bigger
					columnWidth: 200,
					resizeColumn: true,
					scroll: 'y',
					drag: true,
					select: "multiselect",
					navigation: true,
					scheme: {
						// Generate an automatic index
						$init: function(obj) {
							obj.index = this.count() + 1;
						}
					},
					on: {
						// update index after sort or update
						"data->onStoreUpdated": function() {
							this.data.each(function(obj, i) {
								obj.index = i + 1;
							});
							return true;
						}
					},
					columns: [
						{id: "index", header: "",     width: 40, minWidth: 25, sort: "int"},
						{id: "name",  header: "Name", minWidth: 180,
							sort: "string", fillspace: true},
						{id: "user",  header: "User", width: 80, minWidth: 50,
							sort: "string", css: {'text-align': 'right'}},
						{id: "size",  header: "Size", width: 80, minWidth: 50,
							sort: sortBySize, css: {'text-align': 'right'}},
						{id: "date",  header: "Date", width: 150, minWidth: 80,
							sort: sortByDate1, css: {'text-align': 'center'}},
						{id: "ago",   header: "Modified", width: 100, minWidth: 80,
							sort: sortByDate2, css: {'text-align': 'right'}},
						{id: "type",  header: "Type", width: 80, minWidth: 50,
							sort: "string", css: {'text-align': 'center'}}
					],
					data: [
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
									if (obj.session) {
										// if it is from a session
										return "<img src='" + obj.image + "' style='width:100%;'></img>";
									}
									return "<img src='" + obj.image + "_256.jpg' style='width:100%;'></img>";
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

	// Set the actions for the media browser menu
	attachCallbacks($$("menuMediaBrowser").getSubMenu('file_menu'),
		fileMediaActions);
	attachCallbacks($$("menuMediaBrowser").getSubMenu('edit_menu'),
		editMediaActions);

	// Prevent HTML drop on rest of the page
	webix.event(window, 'dragover', function(evt) {
		evt.preventDefault();
	});
	webix.event(window, 'drop', function(evt) {
		evt.preventDefault();
	});

	// Clear the upload list when clicking the header
	webix.event($$("drop_header").$view, "click", function(e) {
		$$("uploadlist").clearAll();
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

	// Get handle on the middle table data
	this.allTable = $$("all_table");

	// Remember the sorting direction
	this.allTable.attachEvent("onAfterSort", function(sort_by, sort_dir, sort_as) {
		_this.sorting.dir = sort_dir;
		_this.sorting.as  = sort_as;
	});
	// Remember the sorting column
	this.allTable.attachEvent("onHeaderClick", function(id, e, trg) {
		_this.sorting.by = id.column;
	});

	// Sort the table with default order
	this.allTable.sort(this.sorting.by, this.sorting.dir);
	this.allTable.markSorting(this.sorting.by, this.sorting.dir);

	// User selection
	this.allTable.attachEvent("onSelectChange", function(evt) {
		var elt = _this.allTable.getSelectedId();
		// remember the selected item (for drag-drop)
		_this.selectedItem = elt;
		if (!elt || !elt.id) {
			// if nothing selected, done
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
			// Clear the panel
			metadata.config.elements = [];

			// Create a PDF section
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

		} else if (_this.allFiles[elt.id].exif.MIMEType.indexOf('text/plain') >= 0) {
			var key;
			if (_this.allFiles[elt.id].exif.FileName.split(".").pop() === "note") {
				metadata.config.elements.push({label: "note (QuickNote)", type: "label"});
				for (key in _this.allFiles[elt.id].exif) {
					info = _this.allFiles[elt.id].exif[key] || '';
					metadata.config.elements.push({label: key, value: info});
				}
			} else {
				metadata.config.elements.push({label: "Note", type: "label"});
				for (key in _this.allFiles[elt.id].exif) {
					info = _this.allFiles[elt.id].exif[key] || '';
					metadata.config.elements.push({label: key, value: info});
				}
			}
		} else if (_this.allFiles[elt.id].exif.MIMEType.indexOf('application/custom') >= 0) {
			// Clear the panel
			metadata.config.elements = [];
			// Add an application section
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
			metadata.config.elements.push({
				label: "Keywords",
				value: info.map(function(k) {
					return " " + k;
				}).toString()
			});
			// Parse file types
			info = _this.allFiles[elt.id].exif.metadata.fileTypes;
			if (info.length === 0) {
				info = "-";
			}
			metadata.config.elements.push({label: "File types", value: info});

			// Parse description
			info = _this.allFiles[elt.id].exif.metadata.description || '';
			metadata.config.elements.push({
				label: info, type: "label",
				css: {height: "100px"}
			});
		} else if (_this.allFiles[elt.id].exif.MIMEType.indexOf('sage2/url') >= 0) {
			// Clear the panel
			metadata.config.elements = [];
			metadata.config.elements.push({label: "URL", type: "label"});
			metadata.config.elements.push({label: "Link",
				value: _this.allFiles[elt.id].sage2URL || '-'});
			metadata.config.elements.push({label: "Author",
				value: _this.allFiles[elt.id].exif.SAGE2user || '-'});
		} else if (_this.allFiles[elt.id].exif.MIMEType.indexOf('sage2/session') >= 0) {
			// Clear the panel
			metadata.config.elements = [];

			metadata.config.elements.push({label: "Metadata", type: "label"});
			metadata.config.elements.push({label: "Author",
				value: _this.allFiles[elt.id].exif.Creator || '-'});
			metadata.config.elements.push({label: "File",
				value: _this.allFiles[elt.id].exif.MIMEType || '-'});
		}

		// Done updating metadata
		metadata.refresh();

		// Update the thumbnail
		var thumb = $$("thumb");
		// what type of app is it
		var sessionType = _this.allFiles[elt.id].exif.MIMEType === "sage2/session" ||
			_this.allFiles[elt.id].exif.MIMEType === "sage2/url";
		// default thumbnail
		var thumbURL = _this.allFiles[elt.id].exif.SAGE2thumbnail;
		// if it's a URL, try to get the  favico of the site
		if (_this.allFiles[elt.id].exif.MIMEType === "sage2/url") {
			thumbURL = "https://icons.better-idea.org/icon?size=48..128..256&url=" +
				_this.allFiles[elt.id].sage2URL;
		}
		thumb.data = {image: thumbURL, session: sessionType};
		thumb.refresh();
	});

	this.allTable.attachEvent("onItemDblClick", function(id, e, node) {
		// Open the selected content on the wall
		_this.openItem(id.row);
	});

	// onItemClick onAfterSelect onBeforeSelect
	this.tree.attachEvent("onSelectChange", function(evt) {
		// Clear the search box
		$$("search_text").setValue("");
		// Get the selection
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
		// Only drag-drop if multiple selected items,
		//    or the source element is the same as the selected one (select and drag)
		if (context.source.length > 1 ||
			(_this.selectedItem && context.start === _this.selectedItem.id)) {
			var elt;
			context.html = "<div style='padding:8px;background:#d3e3ef'>";
			if (context.source.length === 1) {
				elt = _this.allFiles[context.start];
				context.html += '<img width=96 src="' + elt.exif.SAGE2thumbnail + '_256.jpg" />';
				context.html += '<br>' + elt.exif.FileName;
			} else {
				for (var i = 0; i < Math.min(context.source.length, 35); i++) {
					elt = _this.allFiles[context.source[i]];
					context.html += elt.exif.FileName + "<br>";
				}
			}
			context.html += "</div>";
			return true;
		}
		return false;
	});

	// Track the position of the dragged item
	this.allTable.$dragPos = function(pos, event, node) {
		// dragPosition used in drop function
		_this.dragPosition = pos;
	};

	this.allTable.attachEvent("onBeforeDrop", function(context, ev) {
		// No DnD
		return false;
	});

	// Before the drop, test if it is a valid operation
	this.tree.attachEvent("onBeforeDrop", function(context, ev) {
		if (context.target.startsWith("Image:")   ||
			context.target.startsWith("PDF:")     ||
			context.target.startsWith("Note:")    ||
			context.target.startsWith("Video:")   ||
			context.target.startsWith("App:")     ||
			context.target.startsWith("Session:") ||
			context.target.startsWith("Link:")     ||
			context.target.startsWith("Mine:")) {
			// No DnD on search icons
			return false;
		}
		// Move each file selected one by one
		context.source.map(function(elt) {
			wsio.emit('moveElementFromStoredFiles', {filename: elt, url: context.target});
		});
		// Dont do a real DnD, stop there
		return false;
	});

	// Now, do the transfer
	this.tree.attachEvent("onAfterDrop", function(context, native_event) {
		// done in before drop for now
	});

	webix.event(this.allTable.$view, "drag", function(e) {
		e.preventDefault();
	});

	webix.ui({
		id: "uploadAPI",
		view: "uploader",
		upload: "/upload",  // POST url
		formData: {
			open: false // do not open after upload
		},
		on: {
			onFileUpload: function(item) {
				console.log('uploaded file', item.name);
			},
			onUploadComplete: function(item) {
				console.log('upload complete');
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
		data: ["Open", "Copy URL", "Open in Tab", "Download", { $template: "Separator" }, "Delete"],
		on: {
			onItemClick: function(id) {
				var i;
				var context = this.getContext();
				var list    = context.obj;
				var listId  = context.id;
				var dItems  = _this.allTable.getSelectedId(true);

				if (id === "Download") {
					// Go over the list of selected items
					for (i = 0; i < dItems.length; i++) {
						// Trigger the download command
						downloadItem(dItems[i].id);
					}
				} else if (id === "Copy URL") {
					copyURLItem(list.getItem(listId).id);
				} else if (id === "Open in Tab") {
					openURLItem(list.getItem(listId).id);
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
						width: "75%",
						ok: "Yes",
						cancel: "No",
						text: textTbd,
						callback: function(yesno) {
							if (yesno) {
								// for all elements
								tbd.map(function(tid) {
									var apptype  = _this.allFiles[tid].exif.MIMEType;
									// Send delete message to server
									wsio.emit('deleteElementFromStoredFiles', {
										filename: tid,
										application: apptype
									});
									// Element will be deleted from table by return message from server
									// _this.allTable.remove(tid);
								});
							}
						}
					});
				}
			}
		}
	});
	$$("cmenu").attachTo($$("all_table"));

	this.main.config.height = Math.round(window.innerHeight * 0.80);
	this.main.show();
	this.main.adjust();

	///////////////////////////////////////////////////////////////////////////////////

	/**
     * Setup the callbacks for a menu, using a closure (tricky one)
	 *
	 * @method attachCallbacks
	 * @param element {Object} webix menu object to attach the callbacks to
	 * @param actions {Object} object containing the callback for each id
	 */
	function attachCallbacks(element, actions) {
		if (element) {
			element.attachEvent("onItemClick", (function (act) {
				// Create a closure to keep a local copy of the array 'actions'
				return function(evt, e, node) {
					if (evt in act) {
						if (act[evt].callback) {
							act[evt].callback();
						}
					}
				};
			}(actions)));
			// pass the local variable to the closure
		}
	}

	/**
     * Build a submenu for a description object. Each entry with id and value fields.
	 *
	 * @method buildSubmenu
	 * @param actions {Object} object containing the callback for each id
	 * @return {Array} array of entries with id and value field
	 */
	function buildSubmenu(actions) {
		var entries = [];
		for (var a in actions) {
			// test for a special value to build a separator
			if (actions[a].value === "separator") {
				entries.push({$template: "Separator"});
			} else if (actions[a].submenu) {
				entries.push({id: a,
					value: actions[a].value,
					config: {autowidth: true, zIndex: 9000},
					submenu: actions[a].submenu,
					tooltip: actions[a].tooltip
				});
			} else {
				// otherwise just add the object
				entries.push({id: a,
					value: actions[a].value,
					tooltip: actions[a].tooltip
				});
			}
		}
		return entries;
	}

	/**
     * Return the tooltip field of an object or empty string
	 *
	 * @method showTooltip
	 * @param element {Object} object with tooltip value or not
	 * @return {String} tooltip string
	 */
	function showTooltip(obj) {
		return obj.tooltip ? obj.tooltip : "";
	}

	/**
     * Build some HTML to show info about the SAGE2 server
	 *
	 * @method buildAboutHTML
	 * @return {String} HTML popup showing version and info
	 */
	function buildAboutHTML() {
		var versionText = "<p>";
		// Add new information
		versionText += "<p class='textDialog'><span style='font-weight:bold;'>Host</span>: " + displayUI.config.host + "</p>";
		// Show the type of web browser
		versionText += "<p class='textDialog'><span style='font-weight:bold;'>Browser</span>: " +
			__SAGE2__.browser.browserType + " " + __SAGE2__.browser.version + "</p>";
		versionText += "</p>";
		// Configuration
		versionText += "<p class='textDialog'><span style='font-weight:bold;'>Resolution</span>: " +
			displayUI.config.totalWidth + " x " +  displayUI.config.totalHeight + " pixels";
		versionText += " (" + displayUI.config.layout.columns + " by " + displayUI.config.layout.rows + " tiles";
		versionText += "  - " + displayUI.config.resolution.width + " x " + displayUI.config.resolution.height + ")" + "</p>";
		// Add version
		versionText += "<p class='textDialog'><span style='font-weight:bold;'>SAGE2 Version: </span>";
		if (sage2Version.branch && sage2Version.commit && sage2Version.date) {
			versionText += "<b>v" + sage2Version.base + "-" + sage2Version.branch + "-" +
				sage2Version.commit + "</b> " + sage2Version.date;
		} else {
			versionText += "<b>v" + sage2Version.base + "</b>";
		}

		return versionText;
	}

	/**
     * Try to delete one or several selected files
	 *
	 * @method deleteFilesUI
	 */
	function deleteFilesUI() {
		// Get selected items
		var dItems = _this.allTable.getSelectedId(true);
		var tbd = [];
		var textTbd = "<ol style=\"list-style-position: inside;padding:10px;text-align:left;\">";
		var numItems = 0;
		if (dItems.length > 0) {
			for (var i = 0; i < dItems.length; i++) {
				tbd.push(dItems[i].id);
				// Only list first 15 items...
				if (i < 14) {
					textTbd += '<li>' + dItems[i].id + '</li>';
				} else if (i === 14) {
					textTbd += '<li>...</li>';
				}
				numItems++;
			}
			textTbd += "</ol>";
			webix.confirm({
				title: "Confirm deletion - " + numItems + " item(s)",
				width: "75%",
				ok: "Yes",
				cancel: "No",
				text: textTbd,
				callback: function(yesno) {
					if (yesno) {
						// for all elements
						tbd.map(function(tid) {
							var apptype  = _this.allFiles[tid].exif.MIMEType;
							// Send delete message to server
							wsio.emit('deleteElementFromStoredFiles', {
								filename: tid,
								application: apptype
							});
						});
					}
				}
			});
		}
	}

	/**
     * Try to create a folder inside the currently selected folder
	 *
	 * @method createFolderUI
	 */
	function createFolderUI() {
		var item = _this.tree.getSelectedItem();
		if (item && item.sage2URL) {
			webix.ui({
				view: "window",
				id: "folder_form",
				position: "center",
				modal: true,
				head: "New folder in " + item.sage2URL,
				body: {
					view: "form",
					width: 400,
					borderless: false,
					elements: [
						{view: "text", id: "folder_name", label: "Folder name", name: "folder"},
						{margin: 5, cols: [
							{view: "button", value: "Cancel", click: function() {
								this.getTopParentView().hide();
							}},
							{view: "button", value: "Create", type: "form", click: function() {
								createFolder(item, this.getFormView().getValues());
								this.getTopParentView().hide();
							}}
						]}
					],
					elementsConfig: {
						labelPosition: "top"
					}
				}
			}).show();
			// Attach handlers for keyboard
			$$("folder_name").attachEvent("onKeyPress", function(code, e) {
				// ESC closes
				if (code === 27 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
					this.getTopParentView().hide();
					return false;
				}
				// ENTER activates
				if (code === 13 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
					createFolder(item, this.getFormView().getValues());
					this.getTopParentView().hide();
					return false;
				}
			});
			$$('folder_name').focus();
		} else {
			webix.alert({
				type: "alert-warning",
				title: "SAGE2",
				ok: "OK",
				text: "Select a parent folder first"
			});
		}
	}

	this.openItem = function(tid, position) {
		var appType = this.getApplicationFromId(tid);
		// Opening an app
		if (appType === "application/custom") {
			wsio.emit('loadApplication', {
				application: tid,
				user: _this.uniqueID,
				position: position
			});
		} else if (appType === "sage2/session") {
			wsio.emit('loadFileFromServer',	{
				application: 'load_session',
				filename: tid,
				user: _this.uniqueID,
				position: position
			});
		} else if (appType === "sage2/url") {
			wsio.emit('openNewWebpage',	{
				url: tid,
				user: _this.uniqueID,
				position: position
			});
		} else {
			// Opening a file
			wsio.emit('loadFileFromServer', {
				application: appType,
				filename: tid,
				user: _this.uniqueID,
				position: position
			});
		}
	};

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
			} else if (elt.exif.MIMEType.indexOf('video') >= 0) {
				response = "movie_player";
			} else if (elt.exif.MIMEType.indexOf('sage2/session') >= 0) {
				response = "load_session";
			} else if (elt.exif.MIMEType.indexOf('sage2/url') >= 0) {
				response = "sage2/url";
			}
		}
		// send the result
		return response;
	};

	/**
	 * Trigger a browser downlaod
	 *
	 * @method     downloadItem
	 * @param      {<type>}   elt     The element
	 * @return     {Boolean}  (description_of_the_return_value)
	 */
	function downloadItem(elt) {
		var mimetype = _this.allFiles[elt].exif.MIMEType;
		if (mimetype !== "sage2/url" &&
			mimetype !== "application/custom") {
			var url = _this.allFiles[elt].sage2URL;
			if (url) {
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
		} else {
			showSAGE2Message("File cannot be downloaded");
		}
	}

	/**
	 * Copy the URL of the item into the user's clipboard
	 *
	 * @method     copyURLItem
	 * @param      {<type>}  elt     The element
	 */
	function copyURLItem(elt) {
		var sage2url = _this.allFiles[elt].sage2URL;
		if (sage2url) {
			var url;
			if (_this.allFiles[elt].exif.MIMEType === 'sage2/url') {
				url = sage2url;
			} else {
				url = window.location.origin + sage2url;
			}
			// Copy to clipboard (defined in SAGE2_runtime)
			SAGE2_copyToClipboard(url);
		}
	}

	/**
	 * Opens the content in a browser tab
	 *
	 * @method     openURLItem
	 * @param      {<type>}  elt     The element
	 */
	function openURLItem(elt) {
		var sage2url = _this.allFiles[elt].sage2URL;
		if (sage2url) {
			var url;
			if (_this.allFiles[elt].exif.MIMEType === 'sage2/url') {
				url = sage2url;
			} else {
				url = window.location.origin + sage2url;
			}
			// open in a browser tab
			window.open(url, '_blank');
		}
	}

	function updateSearch(searchParam) {
		if (searchParam === "Image:/") {
			_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('image') >= 0;
			});
		} else if (searchParam === "PDF:/") {
			_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('pdf') >= 0;
			});
		} else if (searchParam === "Note:/") {
			_this.allTable.filter(function(obj) {
				return (_this.allFiles[obj.id].sage2Type &&
					(_this.allFiles[obj.id].sage2Type.indexOf('application/note') >= 0 ||
					_this.allFiles[obj.id].sage2Type.indexOf('application/doodle') >= 0)
				);
			});
		} else if (searchParam === "Video:/") {
			_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('video') >= 0;
			});
		} else if (searchParam === "App:/") {
			_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('application/custom') >= 0;
			});
		} else if (searchParam === "Session:/") {
			_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('sage2/session') >= 0;
			});
		} else if (searchParam === "Link:/") {
			_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('sage2/url') >= 0;
			});
		} else if (searchParam === "Mine:/") {
			_this.allTable.filter(function(obj) {
				var val = false;
				if (_this.allFiles[obj.id].exif.SAGE2user) {
					val = _this.allFiles[obj.id].exif.SAGE2user.indexOf(localStorage.SAGE2_ptrName) >= 0;
				}
				return val;
			});
		} else if (searchParam === "treeroot") {
			// List everything
			// _this.allTable.filter();

			// List all but the applications
			_this.allTable.filter(function(obj) {
				return _this.allFiles[obj.id].exif.MIMEType.indexOf('application/custom') < 0;
			});
		} else {
			// dunno
		}
	}

	this.createSubFolderForFile = function(myFile) {
		var df, folder;
		// Look into the media folders for needed sub-folders
		for (df in this.mediaFolders) {
			folder = this.mediaFolders[df];
			if (myFile.sage2URL.startsWith(folder.url)) {
				// Create a subfolder if needed

				// var filepath = myFile.sage2URL.split('/');
				// var filepath = decodeURIComponent(myFile.sage2URL).split('/');
				var filepath = myFile.sage2URL.split('/');

				// Remove the fist two elements (root) and the last (filename)
				var subdirArray = filepath.slice(2, -1);
				var parent = folder.url;
				subdirArray.forEach(function(sub) {
					// Build the tree item
					var newid = parent + '/' + sub;
					// if it doesnt already exist
					if (!_this.tree.getItem(newid)) {
						var newElement = {
							// id: newid, value: sub,
							id: newid, value: decodeURIComponent(sub),
							icon: "folder", open: true, sage2URL: newid,
							data: [], onContext: {}
						};
						// Add to the tree
						_this.tree.parse({ parent: parent, data: newElement});
					}
					parent = newid;
				});

			}
		}
	};

	this.saveSession = function() {
		// generate a default name
		var template = "session_" + dateToYYYYMMDDHHMMSS(new Date());

		// Build a webix dialog
		webix.ui({
			view: "window",
			id: "session_popup",
			position: "center",
			modal: true,
			zIndex: 9999,
			head: "Save the current session",
			width: 400,
			body: {
				view: "form",
				borderless: false,
				elements: [
					{view: "text", value: template, id: "session_filename",
						label: "Please enter a session name:", name: "session"},
					{margin: 5, cols: [
						{view: "button", value: "Cancel", click: function() {
							this.getTopParentView().hide();
						}},
						{view: "button", value: "Save", type: "form", click: function() {
							var values = this.getFormView().getValues();
							wsio.emit('saveSesion', values.session);
							this.getTopParentView().hide();
						}}
					]}
				],
				elementsConfig: {
					labelPosition: "top"
				}
			}
		}).show();

		// Attach handlers for keyboard
		$$("session_filename").attachEvent("onKeyPress", function(code, e) {
			// ESC closes
			if (code === 27 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
				this.getTopParentView().hide();
				return false;
			}
			// ENTER activates
			if (code === 13 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
				var values = this.getFormView().getValues();
				wsio.emit('saveSesion', values.session);
				this.getTopParentView().hide();
				return false;
			}
		});
		$$('session_filename').focus();
	};

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
			this.createSubFolderForFile(f);
		}
		for (i = 0; i < data.videos.length; i++) {
			f = data.videos[i];
			this.allFiles[f.id] = f;
			this.createSubFolderForFile(f);
		}
		for (i = 0; i < data.pdfs.length; i++) {
			f = data.pdfs[i];
			this.allFiles[f.id] = f;
			this.createSubFolderForFile(f);
		}
		for (i = 0; i < data.applications.length; i++) {
			f = data.applications[i];
			this.allFiles[f.id] = f;
			this.createSubFolderForFile(f);
		}
		for (i = 0; i < data.others.length; i++) {
			f = data.others[i];
			this.allFiles[f.id] = f;
			this.createSubFolderForFile(f);
		}
		for (i = 0; i < data.sessions.length; i++) {
			f = data.sessions[i];
			this.allFiles[f.id] = f;
		}
		for (i = 0; i < data.links.length; i++) {
			f = data.links[i];
			this.allFiles[f.id] = f;
		}

		i = 0;
		var mm, createDate;
		for (var a in this.allFiles) {
			f = this.allFiles[a];
			// if it's an app
			if (f.exif.MIMEType.indexOf('application/custom') >= 0) {
				mm = moment();
				f.exif.FileModifyDate = mm;
				f.exif.FileSize = 0;
				f.exif.Creator = f.exif.metadata.author;
				this.allTable.data.add({id: f.id,
					name: f.exif.FileName,
					user: f.exif.SAGE2user ? f.exif.SAGE2user : "-",
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago: mm.fromNow(),
					type: "APP",
					size: fileSizeIEC(f.exif.FileSize)
				});
			} else if (f.exif.MIMEType.indexOf('sage2/session') >= 0) {
				// It's a SAGE2 session
				mm = moment(f.exif.FileDate, 'YYYY/MM/DD HH:mm:ssZ');
				f.exif.FileModifyDate = mm;
				this.allTable.data.add({id: f.id,
					name: f.exif.FileName,
					user: f.exif.SAGE2user ? f.exif.SAGE2user : "-",
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago:  mm.fromNow(),
					type: "SESSION",
					size: fileSizeIEC(f.exif.FileSize)
				});
			} else if (f.exif.MIMEType.indexOf('sage2/url') >= 0) {
				// It's a URL
				mm = moment(f.exif.FileDate, 'YYYY/MM/DD HH:mm:ssZ');
				f.exif.FileModifyDate = mm;
				this.allTable.data.add({id: f.id,
					name: f.exif.FileName,
					user: f.exif.SAGE2user ? f.exif.SAGE2user : "-",
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago:  mm.fromNow(),
					type: "LINK",
					size: fileSizeIEC(f.exif.FileSize)
				});
			} else {
				// Any other asset type
				// Try to find creation
				createDate = f.exif.CreateDate ||
						f.exif.DateTimeOriginal ||
						f.exif.ModifyDate ||
						f.exif.FileModifyDate;
				mm = moment(createDate, 'YYYY:MM:DD HH:mm:ssZ');
				if (!mm.isValid()) {
					// sometimes a value is not valid
					mm = moment(f.exif.FileModifyDate, 'YYYY:MM:DD HH:mm:ssZ');
				}
				f.exif.FileModifyDate = mm;
				this.allTable.data.add({id: f.id,
					name: f.exif.FileName,
					user: f.exif.SAGE2user ? f.exif.SAGE2user : "-",
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago:  mm.fromNow(),
					type: f.exif.FileType,
					size: fileSizeIEC(f.exif.FileSize)
				});
			}
			i++;
		}

		// Clear the search box
		$$("search_text").setValue("");

		this.refresh();

		// Get the existing selection
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
			updateSearch(treeSelection.id);
		}

	};

	function sortByDate1(a, b) {
		// fileds are 'moment' objects
		a = _this.allFiles[a.id].exif.FileModifyDate;
		b = _this.allFiles[b.id].exif.FileModifyDate;
		return a > b ? 1 : (a < b ? -1 : 0);
	}
	function sortByDate2(a, b) {
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

	this.refresh = function() {
		this.tree.refresh();
		this.allTable.refresh();
		// Resort the table
		if (typeof this.sorting.as === "string") {
			this.allTable.sort('#' + this.sorting.by + '#', this.sorting.dir, this.sorting.as);
		} else {
			this.allTable.sort('', this.sorting.dir, this.sorting.as);
		}
		this.main.adjust();
	};

	function createFolder(item, values) {
		if (item && values.folder) {
			// Send order to the server
			wsio.emit('createFolder', {root: item.sage2URL,
				path: values.folder});
			// Build the tree item
			var newid = item.sage2URL + '/' + values.folder;
			var newElement = {
				id: newid, value: values.folder,
				icon: "folder", open: true, sage2URL: newid,
				data: [], onContext: {}
			};
			// Add to the tree
			$$("tree1").parse({ parent: item.id, data: newElement });
		}
	}

	var tmenu = webix.ui({
		view: "contextmenu",
		id: "tmenu",
		data: ["New folder", { $template: "Separator" }, "Refresh"],
		on: {
			onItemClick: function(id) {
				var context = this.getContext();
				var list    = context.obj;
				var listId  = context.id;

				if (id === "New folder") {
					webix.ui({
						view: "window",
						id: "folder_form",
						position: "center",
						modal: true,
						zIndex: 9999,
						head: "New folder in " + list.getItem(listId).sage2URL,
						body: {
							view: "form",
							width: 400,
							borderless: false,
							elements: [
								{
									view: "text", id: "folder_name", label: "Folder name", name: "folder"
								},
								{
									margin: 5, cols: [
										{
											view: "button", value: "Cancel", click: function() {
												this.getTopParentView().hide();
											}
										},
										{
											view: "button", value: "Create", type: "form", click: function() {
												createFolder(list.getItem(listId), this.getFormView().getValues());
												this.getTopParentView().hide();
											}
										}
									]
								}
							],
							elementsConfig: {
								labelPosition: "top"
							}
						}
					}).show();
					// Attach handlers for keyboard
					$$("folder_name").attachEvent("onKeyPress", function(code, e) {
						// ESC closes
						if (code === 27 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
							this.getTopParentView().hide();
							return false;
						}
						// ENTER activates
						if (code === 13 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
							createFolder(list.getItem(listId), this.getFormView().getValues());
							this.getTopParentView().hide();
							return false;
						}
					});
					$$('folder_name').focus();
				}
			}
		}
	});

	// Server sends the wall configuration
	this.serverConfiguration = function(data) {
		// Add the media folders to the tree
		var f, folder;
		this.json_cfg  = data;
		this.http_port = this.json_cfg.port === 80 ? "" : ":" + this.json_cfg.port;
		this.mediaFolders = data.folders;
		for (f in data.folders) {
			folder = data.folders[f];
			// Build the tree item
			//   folder Object {name: "system", path: "public/uploads/",
			//                  url: "/uploads", upload: false}
			var newElement = {
				id: folder.url, value: folder.name + ":" + folder.url,
				icon: "home", open: true, sage2URL: folder.url, data: [],
				tooltip: folder.name + " folder",
				onContext: {}
			};
			// Add the new folder item into the tree
			this.tree.parse({ parent: null, data: newElement });
			// Fold/close the folders not for upload
			if (!folder.upload) {
				this.tree.close(folder.url);
			}
		}
		// refresh the tree
		this.tree.refresh();
		// Add context menu
		tmenu.attachTo(this.tree);
		// Hidding the 'create folder' on the root folder
		this.tree.attachEvent('onBeforeContextMenu', function(id, e, node) {
			if (id === 'treeroot' ||
				(id.indexOf('Image:/') >= 0) ||
				(id.indexOf('Video:/') >= 0) ||
				(id.indexOf('PDF:/') >= 0)   ||
				(id.indexOf('Note:/') >= 0)  ||
				(id.indexOf('App:/') >= 0)   ||
				(id.indexOf('Mine:/') >= 0)  ||
				(id.indexOf('Link:/') >= 0)  ||
				(id.indexOf('Session:/') >= 0)) {
				tmenu.hideItem('New folder');
			} else {
				tmenu.showItem('New folder');
			}
			return true;
		});

		// Adding list of diplay clients
		var adminmenu = $$('advancedToolbar').getSubMenu('mainadmin_menu');
		var displayList = [];
		// add overview client
		displayList[0] = {
			id: "displayclient_00",
			value: "Display -1",
			href:  "http://" + window.location.hostname + this.http_port +  "/display.html?clientID=-1",
			target: "_blank"
		};
		// add all display clients to list
		for (var i = 0; i <  this.json_cfg.displays.length; i++) {
			displayList[i + 1] = {
				id:     "displayclient_" + i,
				value:  "Display " + i,
				href:   "http://" + window.location.hostname + this.http_port +  "/display.html?clientID=" + i,
				target: "_blank"
			};
		}
		adminmenu.add({
			id:    "alldisplayclients_menu",
			value: "Display Clients",
			type: {subsign: true},
			autowidth: true,
			config: {zIndex: 9000},
			submenu: displayList
		});

	};
}
