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

/**
 * Entry point of the editor
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// Connect to the server
	var wsio = new WebsocketIO();

	console.log("Connected to server: ", window.location.origin);

	// Callback when socket opens
	wsio.open(function() {
		console.log("open websocket");

		// Setup message callbacks
		setupListeners(wsio);

		// Register to the server as a console
		var clientDescription = {
			clientType: "files",
			requests: {
				config:  true,
				version: true,
				time:    false,
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
 * Place callbacks on various messages from the server
 *
 * @method setupListeners
 * @param wsio {Object} websocket
 */
function setupListeners(wsio) {

	// Got a reply from the server
	wsio.on('initialize', function() {
		console.log('initialize');

		wsio.emit('requestStoredFiles');
		wsio.emit('requestAvailableApplications');
	});

	// Server sends the application list
	wsio.on('availableApplications', function(data) {
		var output, i, f;

		output = [];
		for (i = 0, f; f = data[i]; i++) { // eslint-disable-line
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td> <img style=vertical-align:middle src=/', escape(f.exif.SAGE2thumbnail) + '_128.jpg /></td>',
				'<td>', unescape(f.exif.metadata.title), '</td>',
				'<td>', f.exif.metadata.description, '</td>',
				'<td>', f.exif.metadata.author, '</td>',
				'</tr>');
		}
		document.getElementById('application_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' +
				output.join('') + '</table>';
	});

	// Server the media files list
	wsio.on('storedFileList', function(data) {

		// WEBIX
		// ---------------------------------------------------
		webix.ready(function() {

			var data_with_icon = [
				{id: "root", value: "Assets", icon: "home", open: true, data: [
						{id: "Image", open: true, value: "Image", data: []},
						{id: "Video", open: true, value: "Video", data: []},
						{id: "PDF", open: true, value: "PDF", data: []}
					]
				}
			];

			var main = webix.ui({
				container: "testA",
				id: "layout",
				rows: [
					{template: "SAGE2 content browser", height: 55 },
					{cols: [
						{
							id: "tree1",
							view: "tree",
							select: "multiselect",
							navigation: true,
							drag: true,
							data: data_with_icon,
							onContext: {} // required for context menu
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
							rows: [
								{
									view: "property",
									id: "metadata",
									editable: false,
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
									id: "thumb",
									template: function(obj) {
											if (obj.image) {
												return "<img src='" + obj.image + "_256.jpg'></img>";
											} else {
												return "";
											}
										}
								}
							]
						}
					]
				}
				]
			});
			main.show();
			// webix.event(window, "resize", function(){ main.adjust() });

			var allFiles = {};
			for (i = 0, f; f = data.images[i]; i++) { // eslint-disable-line
				allFiles[f.id] = f;
			}
			for (i = 0, f; f = data.videos[i]; i++) { // eslint-disable-line
				allFiles[f.id] = f;
			}
			for (i = 0, f; f = data.pdfs[i]; i++) { // eslint-disable-line
				allFiles[f.id] = f;
			}

			function sortByDate(a, b) {
				// fileds are 'moment' objects
				a = allFiles[a.id].exif.FileModifyDate;
				b = allFiles[b.id].exif.FileModifyDate;
				return a > b ? 1 : (a < b ? -1 : 0);
			}
			function sortBySize(a, b) {
				// File size in byte
				a = allFiles[a.id].exif.FileSize;
				b = allFiles[b.id].exif.FileSize;
				return a > b ? 1 : (a < b ? -1 : 0);
			}

			var multiview1 = $$("multiview1");
			multiview1.addView({
				id: "image_table",
				view: "datatable",
				autowidth: true,
				animate: false,
				drag: true,
				select: "multiselect",
				navigation: true,
				columns: [
					{id: "name", header: "Name", width: 300, sort: "text"},
					{id: "date", header: "Date", width: 170, sort: sortByDate},
					{id: "ago",  header: "Modified", width: 135, sort: sortByDate},
					{id: "type", header: "Type", width: 80,  sort: "text"},
					{id: "size", header: "Size", width: 80,  sort: sortBySize}
				],
				data: [
				]
			});
			multiview1.addView({
				id: "pdf_table",
				view: "datatable",
				autowidth: true,
				animate: false,
				drag: true,
				select: "multiselect",
				navigation: true,
				columns: [
					{id: "name", header: "Name", width: 300, sort: "text"},
					{id: "date", header: "Date", width: 170, sort: sortByDate},
					{id: "ago",  header: "Modified", width: 135, sort: sortByDate},
					{id: "type", header: "Type", width: 80,  sort: "text"},
					{id: "size", header: "Size", width: 80,  sort: sortBySize}
				]
			});
			multiview1.addView({
				id: "video_table",
				view: "datatable",
				autowidth: true,
				animate: false,
				drag: true,
				select: "multiselect",
				navigation: true,
				columns: [
					{id: "name", header: "Name", width: 300, sort: "text"},
					{id: "date", header: "Date", width: 170, sort: sortByDate},
					{id: "ago",  header: "Modified", width: 135, sort: sortByDate},
					{id: "type", header: "Type", width: 80,  sort: "text"},
					{id: "size", header: "Size", width: 80,  sort: sortBySize}
				],
				data: [
				]
			});
			multiview1.addView({
				id: "all_table",
				view: "datatable",
				editable: true,
				autowidth: true,
				animate: false,
				drag: true,
				select: "multiselect",
				navigation: true,
				columns: [
					{id: "name", header: "Name", width: 300, sort: "text"},
					{id: "date", header: "Date", width: 170, sort: sortByDate},
					{id: "ago",  header: "Modified", width: 135, sort: sortByDate},
					{id: "type", header: "Type", width: 80,  sort: "text"},
					{id: "size", header: "Size", width: 80,  sort: sortBySize}
				],
				data: [
				]
			});
			var image_table = $$("image_table");
			var pdf_table   = $$("pdf_table");
			var video_table = $$("video_table");
			var all_table   = $$("all_table");
			var mm;
			var tree = $$("tree1");
			for (i = 0, f; f = data.images[i]; i++) { // eslint-disable-line
				tree.data.add({id: f.id, value: f.exif.FileName}, i, "Image");
				mm = moment(f.exif.FileModifyDate, 'YYYY:MM:DD HH:mm:ssZZ');
				f.exif.FileModifyDate = mm;
				image_table.data.add({id: f.id,
					name: f.exif.FileName,
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago:  mm.fromNow(),
					type: f.exif.FileType,
					size: fileSizeIEC(f.exif.FileSize)
				});
			}
			image_table.markSorting("name", "asc");

			for (i = 0, f; f = data.videos[i]; i++) { // eslint-disable-line
				tree.data.add({id: f.id, value: f.exif.FileName}, i, "Video");
				mm = moment(f.exif.FileModifyDate, 'YYYY:MM:DD HH:mm:ssZZ');
				f.exif.FileModifyDate = mm;
				video_table.data.add({id: f.id,
					name: f.exif.FileName,
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago:  mm.fromNow(),
					type: f.exif.FileType,
					size: fileSizeIEC(f.exif.FileSize)
				});
			}
			for (i = 0, f; f = data.pdfs[i]; i++) { // eslint-disable-line
				tree.data.add({id: f.id, value: f.exif.FileName}, i, "PDF");
				mm = moment(f.exif.FileModifyDate, 'YYYY:MM:DD HH:mm:ssZZ');
				f.exif.FileModifyDate = mm;
				pdf_table.data.add({id: f.id,
					name: f.exif.FileName,
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago:  mm.fromNow(),
					type: f.exif.FileType,
					size: fileSizeIEC(f.exif.FileSize)
				});
			}
			i = 0;
			for (var a in allFiles) {
				f = allFiles[a];
				mm = moment(f.exif.FileModifyDate, 'YYYY:MM:DD HH:mm:ssZZ');
				f.exif.FileModifyDate = mm;
				all_table.data.add({id: f.id,
					name: f.exif.FileName,
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					ago:  mm.fromNow(),
					type: f.exif.FileType,
					size: fileSizeIEC(f.exif.FileSize)
				});
				i++;
			}
			tree.refresh();
			all_table.refresh();
			multiview1.setValue("all_table");

			// User selection
			all_table.attachEvent("onSelectChange", function(evt) {
				var elt = all_table.getSelectedId();
				var metadata = $$("metadata");

				// Rebuild the metadata panel
				metadata.config.elements = [];
				metadata.config.elements.push({label: "Metadata", type: "label"});
				metadata.config.elements.push({label: "Width",
						value: allFiles[elt.id].exif.ImageWidth || '-'});
				metadata.config.elements.push({label: "Height",
						value: allFiles[elt.id].exif.ImageHeight || '-'});
				metadata.config.elements.push({label: "Author",
						value: allFiles[elt.id].exif.Creator || '-'});
				metadata.config.elements.push({label: "File",
						value: allFiles[elt.id].exif.MIMEType || '-'});

				// Add an EXIF panel for pictures
				if (allFiles[elt.id].exif.MIMEType.indexOf('image') >= 0) {
					metadata.config.elements.push({label: "EXIF", type: "label"});
					var info;
					info = allFiles[elt.id].exif.Make || '';
					metadata.config.elements.push({label: "Make", value: info});
					info = allFiles[elt.id].exif.Model || '';
					metadata.config.elements.push({label: "Camera", value: info});
					info = allFiles[elt.id].exif.LensID || allFiles[elt.id].exif.LensInfo || '';
					metadata.config.elements.push({label: "Lens", value: info});
					info = allFiles[elt.id].exif.ExposureTime || allFiles[elt.id].exif.ShutterSpeedValue ||
								allFiles[elt.id].exif.ShutterSpeed || '';
					metadata.config.elements.push({label: "Shutter speed", value: info});
					info = allFiles[elt.id].exif.FNumber || allFiles[elt.id].exif.Aperture ||
								allFiles[elt.id].exif.ApertureValue || '';
					metadata.config.elements.push({label: "Aperture", value: info});
					info = allFiles[elt.id].exif.ISO || '';
					metadata.config.elements.push({label: "ISO", value: info});
					info = allFiles[elt.id].exif.ExposureProgram || '';
					metadata.config.elements.push({label: "Program", value: info});
					info = allFiles[elt.id].exif.Flash || '';
					metadata.config.elements.push({label: "Flash", value: info});
					info = allFiles[elt.id].exif.Megapixels || '';
					metadata.config.elements.push({label: "Megapixels", value: info});
					info = allFiles[elt.id].exif.ColorSpace || '';
					metadata.config.elements.push({label: "Color space", value: info});
					info = allFiles[elt.id].exif.WhiteBalance || '';
					metadata.config.elements.push({label: "White balance", value: info});
				}
				// Done updating metadata
				metadata.refresh();

				// Update the thumbnail
				var thumb = $$("thumb");
				thumb.data = {image: allFiles[elt.id].exif.SAGE2thumbnail};
				thumb.refresh();
			});
			all_table.attachEvent("onItemDblClick", function(id, e, node) {
				var elt = id.row;
				var url = allFiles[elt].sage2URL;

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

			});

			all_table.attachEvent("onAfterSort", function(by, dir, func) {
				// console.log('Sorting done');
			});
			// Sort the table by name
			all_table.sort("name", "asc");


			// onItemClick onAfterSelect onBeforeSelect
			tree.attachEvent("onSelectChange", function(evt) {
				// console.log('element selected', tree.getSelectedId());
			});
			tree.attachEvent("onItemClick", function(evt) {
				// console.log('element click', evt);
				if (evt === "Image") {
					multiview1.setValue("image_table");
				} else if (evt === "PDF") {
					multiview1.setValue("pdf_table");
				} else if (evt === "Video") {
					multiview1.setValue("video_table");
				} else if (evt === "root") {
					multiview1.setValue("all_table");
				}
			});

			// The drag-and-drop context can have the next properties:
			// from - the source object
			// to - the target object
			// source - the id of the dragged item(s)
			// target - the id of the drop target, null for drop on empty space
			// start - the id from which DND was started
			all_table.attachEvent("onBeforeDrag", function(context, ev) {
				context.html = "<div style='padding:8px;'>";
				for (var i = 0; i < context.source.length; i++) {
					context.html += context.from.getItem(context.source[i]).name + "<br>";
				}
				context.html += "</div>";
			});
			tree.attachEvent("onBeforeDrop", function(context, ev) {
				// for (var i = 0; i < context.source.length; i++) {
				// 	console.log('onBeforeDrop', context.source[i], context.target);
				// }
				return true;
			});
			tree.attachEvent("onAfterDrop", function(context, native_event) {
				// console.log('onAfterDrop', context.source, context.target);
			});

			tree.closeAll();
			tree.open("root");


			webix.ui({
				view: "contextmenu",
				id: "cmenu",
				data: ["Add", "Rename", "Delete", { $template: "Separator" }, "Info"],
				on: {
					onItemClick: function(id) {
						var context = this.getContext();
						var list    = context.obj;
						var listId  = context.id;
						console.log("List item: ", id, list.getItem(listId).id);
					}
				}
			});
			$$("cmenu").attachTo($$("tree1"));
			$$("cmenu").attachTo($$("all_table"));
		});
		// ---------------------------------------------------





		var output, i, f;
		document.getElementById('configuration_files').innerHTML = '<ul> <li>default-cfg.json</li> </ul>';

		output = [];
		for (i = 0, f; f = data.sessions[i]; i++) { // eslint-disable-line
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td>', escape(f.exif.FileName), '</td>',
				'<td>', f.exif.FileDate, '</td>',
				'<td>', f.exif.FileSize, ' bytes</td>',
				'</tr>');
		}
		document.getElementById('session_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' +
				output.join('') + '</table>';

		output = [];
		for (i = 0, f; f = data.images[i]; i++) { // eslint-disable-line
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td><a href=/uploads/images/', escape(f.exif.FileName), '> <img style=vertical-align:middle src=/',
						escape(f.exif.SAGE2thumbnail) + '_128.jpg /></a></td>',
				'<td>', escape(f.exif.FileName), '</td>',
				'<td>', f.exif.FileType, '</td>',
				'<td>', f.exif.FileSize, '</td>',
				'</tr>');
		}
		document.getElementById('image_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' +
				output.join('') + '</table>';

		output = [];
		for (i = 0, f; f = data.pdfs[i]; i++) { // eslint-disable-line
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td><a href=/uploads/pdfs/', escape(f.exif.FileName), '> <img style=vertical-align:middle src=/',
						escape(f.exif.SAGE2thumbnail) + '_128.jpg /></a></td>',
				'<td>', escape(f.exif.FileName), '</td>',
				'<td>', f.exif.FileType, '</td>',
				'<td>', f.exif.FileSize, '</td>',
				'</tr>');
		}
		document.getElementById('pdf_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' +
				output.join('') + '</table>';

		output = [];
		for (i = 0, f; f = data.videos[i]; i++) { // eslint-disable-line
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td><a href=/uploads/videos/', escape(f.exif.FileName), '> <img style=vertical-align:middle src=/',
						escape(f.exif.SAGE2thumbnail) + '_128.jpg /></a></td>',
				'<td>', escape(f.exif.FileName), '</td>',
				'<td>', f.exif.FileType, '</td>',
				'<td>', f.exif.FileSize, '</td>',
				'</tr>');
		}
		document.getElementById('video_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' +
				output.join('') + '</table>';
	});

	// Server sends the SAGE2 version
	wsio.on('setupSAGE2Version', function(data) {
		console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
	});

	// Server sends the wall configuration
	wsio.on('setupDisplayConfiguration', function() {
		console.log('wall configuration');
	});

}
