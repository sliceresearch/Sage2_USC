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
		console.log('SAGE2: applications', data);

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
		console.log('SAGE2: files', data);


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

			webix.ui({
				container: "testA",
				id: "layout",
				rows: [
					{template: "File library", height: 55 },
					{cols: [
						{
							id: "tree1",
							view: "tree",
							select: "multiselect",
							navigation: true,
							data: data_with_icon,
							onContext: {} // required for context menu
						},
						{
							id: "multiview1",
							view: "multiview",
							animate: false,
							gravity: 2, // two times bigger
							cells: [
								{
									// view:"datatable",
									// columns:[
									// 	{ id:"rank",	header:"", css:"rank",  		width:50},
									// 	{ id:"title",	header:"Name",width:300},
									// 	{ id:"year",	header:"Date" , width:180},
									// 	{ id:"year",	header:"Type" , width:180},
									// 	{ id:"votes",	header:"Size", 	width:100}
									// ],
									// autoheight:false,
									// autowidth:false,
									// data: [
									// ]
								}
							]
						}
					]
				}
				]
			}).show();

			var multiview1 = $$("multiview1");
			console.log('Multiview', multiview1);
			multiview1.addView({
				id: "image_table",
				view: "datatable",
				animate: false,
				columns: [
					{id: "rank", header: "", css: "rank", width: 50},
					{id: "name", header: "Name", width: 300},
					{id: "date", header: "Date", width: 170},
					{id: "ago",  header: "Ago",  width: 135},
					{id: "type", header: "Type", width: 80},
					{id: "size", header: "Size", width: 80}
				],
				data: [
				]
			});
			multiview1.addView({
				id: "pdf_table",
				view: "datatable",
				animate: false,
				columns: [
					{id: "rank", header: "", css: "rank", width: 50},
					{id: "name", header: "Name", width: 300},
					{id: "date", header: "Date", width: 180},
					{id: "type", header: "Type", width: 180},
					{id: "size", header: "Size", width: 100}
				],
				data: [
				]
			});
			multiview1.addView({
				id: "video_table",
				view: "datatable",
				animate: false,
				columns: [
					{id: "rank",	header: "", css: "rank", width: 50},
					{id: "name",	header: "Name", width: 300},
					{id: "date",	header: "Date", width: 180},
					{id: "type",	header: "Type", width: 180},
					{id: "size",	header: "Size", width: 100}
				],
				data: [
				]
			});
			var image_table = $$("image_table");
			var pdf_table   = $$("pdf_table");
			var video_table = $$("video_table");

			var tree = $$("tree1");
			for (i = 0, f; f = data.images[i]; i++) { // eslint-disable-line
				tree.data.add({id: f.id, value: f.exif.FileName}, i, "Image");
				var mm = moment(f.exif.FileModifyDate, 'YYYY:MM:DD HH:mm:ssZZ');
				image_table.data.add({id: f.id, rank: i + 1,
					name: f.exif.FileName,
					date: mm.format("YYYY/MM/DD HH:mm:ss"),
					// date: mm.format("MMMM Do YYYY, h:mm:ss a"),
					ago:  mm.fromNow(),
					type: f.exif.FileType,
					size: f.exif.FileSize});
			}
			for (i = 0, f; f = data.videos[i]; i++) { // eslint-disable-line
				tree.data.add({id: f.id, value: f.exif.FileName}, i, "Video");
				video_table.data.add({id: f.id, rank: i + 1, name: f.exif.FileName, date: "today", type: "MOV", size: 444});
			}
			for (i = 0, f; f = data.pdfs[i]; i++) { // eslint-disable-line
				tree.data.add({id: f.id, value: f.exif.FileName}, i, "PDF");
				pdf_table.data.add({id: f.id, rank: i + 1, name: f.exif.FileName, date: "today", type: "PDF", size: 444});
			}
			tree.refresh();
			image_table.refresh();
			multiview1.setValue("image_table");
			console.log('image_table');

			// onItemClick onAfterSelect onBeforeSelect
			tree.attachEvent("onSelectChange", function(evt) {
				console.log('element selected', tree.getSelectedId());
			});
			tree.attachEvent("onItemClick", function(evt) {
				console.log('element click', evt);
				if (evt === "Image") {
					multiview1.setValue("image_table");
				} else if (evt === "PDF") {
					multiview1.setValue("pdf_table");
				} else if (evt === "Video") {
					multiview1.setValue("video_table");
				}
			});

			webix.ui({
				view: "contextmenu",
				id: "cmenu",
				data: ["Add", "Rename", "Delete", { $template: "Separator" }, "Info"],
				on: {
					onItemClick: function(id) {
						var context = this.getContext();
						var list    = context.obj;
						var listId  = context.id;
						console.log("List item: ", id, list.getItem(listId).value);
					}
				}
			});
			$$("cmenu").attachTo($$("tree1"));

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

	// Server sends the animate loop event
	wsio.on('animateCanvas', function() {
		console.log('animateCanvas');
	});

}
