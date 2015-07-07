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

/*global escape: true */
/*global unescape: true */


/**
 * Entry point of the editor
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// Connect to the server
	wsio = new WebsocketIO();

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
	wsio.on('close', function (evt) {
		var refresh = setInterval(function () {
			// make a dummy request to test the server every 2 sec
			var xhr = new XMLHttpRequest();
			xhr.open("GET", "/", true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4 && xhr.status === 200){
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
	wsio.on('initialize', function(data) {
		console.log('initialize');

		wsio.emit('requestStoredFiles');
		wsio.emit('requestAvailableApplications');
	});

	// Server sends the application list
	wsio.on('availableApplications', function(data) {
		console.log('SAGE2: applications', data);

		var output, i, f;

		output = [];
		for (i = 0, f; f = data[i]; i++) {
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td> <img style=vertical-align:middle src=/', escape(f.exif.SAGE2thumbnail)+'_128.jpg /></td>',
				'<td>', unescape(f.exif.metadata.title), '</td>',
				'<td>', f.exif.metadata.description, '</td>',
				'<td>', f.exif.metadata.author, '</td>',
				'</tr>');
		}
		document.getElementById('application_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' + output.join('') + '</table>';
	});

	// Server the media files list
	wsio.on('storedFileList', function(data) {
		console.log('SAGE2: files', data);

		var output, i, f;

		document.getElementById('configuration_files').innerHTML = '<ul> <li>default-cfg.json</li> </ul>';

		output = [];
		for (i = 0, f; f = data.sessions[i]; i++) {
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td>', escape(f.exif.FileName), '</td>',
				'<td>', f.exif.FileDate, '</td>',
				'<td>', f.exif.FileSize, ' bytes</td>',
				'</tr>');
		}
		document.getElementById('session_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' + output.join('') + '</table>';

		output = [];
		for (i = 0, f; f = data.images[i]; i++) {
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td><a href=/uploads/images/', escape(f.exif.FileName), '> <img style=vertical-align:middle src=/', escape(f.exif.SAGE2thumbnail)+'_128.jpg /></a></td>',
				'<td>', escape(f.exif.FileName), '</td>',
				'<td>', f.exif.FileType, '</td>',
				'<td>', f.exif.FileSize, '</td>',
				'</tr>');
		}
		document.getElementById('image_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' + output.join('') + '</table>';

		output = [];
		for (i = 0, f; f = data.pdfs[i]; i++) {
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td><a href=/uploads/pdfs/', escape(f.exif.FileName), '> <img style=vertical-align:middle src=/', escape(f.exif.SAGE2thumbnail)+'_128.jpg /></a></td>',
				'<td>', escape(f.exif.FileName), '</td>',
				'<td>', f.exif.FileType, '</td>',
				'<td>', f.exif.FileSize, '</td>',
				'</tr>');
		}
		document.getElementById('pdf_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' + output.join('') + '</table>';

		output = [];
		for (i = 0, f; f = data.videos[i]; i++) {
			output.push('<tr>',
				'<td>&#8226;</td>',
				'<td><a href=/uploads/videos/', escape(f.exif.FileName), '> <img style=vertical-align:middle src=/', escape(f.exif.SAGE2thumbnail)+'_128.jpg /></a></td>',
				'<td>', escape(f.exif.FileName), '</td>',
				'<td>', f.exif.FileType, '</td>',
				'<td>', f.exif.FileSize, '</td>',
				'</tr>');
		}
		document.getElementById('video_files').innerHTML = '<table style=\"border-spacing: 5px 5px;\">' + output.join('') + '</table>';
	});

	// Server sends the SAGE2 version
	wsio.on('setupSAGE2Version', function(data) {
		console.log('SAGE2: version', data.base, data.branch, data.commit, data.date);
	});

	// Server sends the wall configuration
	wsio.on('setupDisplayConfiguration', function(json_cfg) {
		console.log('wall configuration');
	});

	// Server sends the animate loop event
	wsio.on('animateCanvas', function(data) {
		console.log('animateCanvas');
	});

}
