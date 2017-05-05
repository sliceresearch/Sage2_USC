// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

"use strict";

var appObserver = SAGE2_App.extend({
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "onfinish";

		this.element.id = "div" + data.id;
		// Using SAGE2 default font
		this.element.style.fontFamily = "Courier New, Consolas, Menlo, monospace";
		// Default starting attributes
		this.element.style.background = "black";
		this.element.style.fontSize = ui.titleTextSize + "px";
		this.element.style.color = "green";

		// updates per second
		this.maxFPS = 1; // once a second? too much?
		this.appSpecificSetup();
	},

	appSpecificSetup: function() {
		// tracking variables
		this.appsKnown = []; // array of app objects
		this.pdfContents = []; // array of objects for each pdf
		/*
		{
			filename: "string of filename, includes .pdf",
			pageCount: int total number of pages
			pageText: [] one per page since no way to get entire text?
			fullText: "string of all pages together, or waste of space?"
		}
		*/
		// only if master try get the pdf
		if (this.isMaster) {
			this.tryRetrievePdfAtUrl("http://lava.manoa.hawaii.edu/wp-content/uploads/2017/02/Kawano_Destiny_EI201701.pdf");
		}
		this.sendUpdatedPdfTexts();

	},

	sendUpdatedPdfTexts: function() {
		// only send if master
		if (isMaster) {
			// send the center of this
			var dataForServer = {
				type: "setValue",
				nameOfValue: this.id + ":source:pdfTexts",
				description: {
					"overview": "array of objects containing pdf names and text", // better word for this?
					structure: { // should this be in the semantic web format? Will forcing people make them not want to use?
						filename: "string of filename",
						text: "entire pdf text",
					}
				},
				value: []
			};
			dataForServer.value = this.pdfContents;
			dataForServer.value.source = this.id;
			wsio.emit("csdMessage", dataForServer);
			this.addLineToDisplay("Sending data to server");
		}
	},

	load: function(date) {
	},

	/**
	 * Used as update function.
	 */
	draw: function(date) {
		var appIds = Object.keys(applications);
		var newIds = this.getElementsIn1NotIn2(appIds, this.appsKnown);
		var modifiedPath;
		var currentApp;
		
		// if there are new ids, then print the amount
		(newIds.length > 0) ? this.addLineToDisplay("new ids: " + newIds): "";

		for (let i = 0; i < newIds.length; i++) {
			currentApp = applications[newIds[i]];
			if (currentApp.application === "pdf_viewer") {
				if (currentApp.solver === undefined) {
					return; // need the solver to do some of the work.
				}
				modifiedPath = currentApp.resrcPath;

				while (modifiedPath.charAt(modifiedPath.length - 1) === "/") {
					modifiedPath = modifiedPath.substring(0, modifiedPath.length - 1);
				}

				if (modifiedPath && modifiedPath.indexOf("://") !== -1) {
					// modifiedPath = modifiedPath.substring(modifiedPath.indexOf("://") + 3); // should chop protocol http[s]://
					// modifiedPath = modifiedPath.substring(modifiedPath.indexOf("/"));  // should chop hostname but keep /
					// modifiedPath = document.getElementById("machine").textContent + modifiedPath;
					modifiedPath = currentApp.state.doc_url;
					this.addLineToDisplay("&nbsp&nbsp modified path: " + modifiedPath);
				} else {
					this.addLineToDisplay("&nbsp&nbsp **WARNING**: could not find '://' in path");
					this.addLineToDisplay("&nbsp&nbsp modified path: " + modifiedPath);
				}
				this.addLineToDisplay("&nbsp&nbsp path: " + currentApp.resrcPath);
				this.addLineToDisplay("&nbsp&nbsp title : " + currentApp.title);
				this.addLineToDisplay("PDF: " + currentApp.id);

				this.fileGrabPdf(modifiedPath, currentApp);

			} else {
				this.addLineToDisplay("App (not pdf) detected: " + currentApp.id);
			}
		} // end for
		this.appsKnown = this.appsKnown.concat(newIds);
	},
	// ./node_modules/.bin/electron electron.js -s http://localhost:9292 -d 0

	getElementsIn1NotIn2: function(ar1, ar2) {
		var found;
		var diff = [];
		for (let i = 0; i < ar1.length; i++) {
			found = false;
			for (let j = 0; j < ar2.length; j++) {
				if (ar1[i] == ar2[j]) {
					found = true;
				}
			}
			if (!found) {
				diff.push(ar1[i])
			}
		}
		return diff;
	},

	fileGrabPdf: function(pdfPath, currentApp) {
		if (!isMaster) {
			return; // don't do the work multiple times
		}
		var fs = require("fs");
		var path = require("path");

		var pathToCheck = null;

		// if it is within the SAGE2_Media folder it will have the /user/  + filenamein path.
		if (pdfPath.indexOf("/users/") !== -1) {
			pathToCheck = pdfPath.substring(pdfPath.indexOf("/users/") + 7);
			pathToCheck = path.join(homedir(), "Documents", "SAGE2_Media", pathToCheck);
			this.addLineToDisplay("Pdf disk path believed to be:" + pathToCheck);
		} else if (pdfPath.indexOf("/uploads/") !== -1) { // otherwise it is a file that came with SAGE2.
			var electronFolder = __dirname; // this is running off the electron folder
			var split = electronFolder.split("node_modules");
			var rootPath = split[0]; // this is where sage2 is installed.
			pathToCheck = pdfPath.substring(pdfPath.indexOf("/uploads/") + 9);
			pathToCheck = path.join(rootPath, "public/uploads/", pathToCheck);
			this.addLineToDisplay("Pdf disk path believed to be:" + pathToCheck);
		} else {
			this.addLineToDisplay("Don't know where this pdf came from: " + pdfPath);
		}

		// must be in either /users/ or public/uploads/
		// if not then it doesn't exist
		if (pathToCheck) {
			try {
				var fileContent = fs.readFileSync(pathToCheck);
				// this kills browser, probably doesn't correctly format in HTML
				// this.addLineToDisplay(fileContent);

				this.addLineToDisplay("");
				this.addLineToDisplay("");
				this.addLineToDisplay("");
				this.addLineToDisplay("Pdf contents(" + fileContent.length + "):");
			} catch (e) {
				this.addLineToDisplay("Error trying to read pdf");
			}
		}
		// if there is a pdf app open, it should have the solver which can be used to read the file
		if (currentApp) {
			var _this = this;
			/*
			{
				filename: "string of filename, includes .pdf",
				pageCount: int total number of pages
				pageText: [] one per page since no way to get entire text?
				fullText: "string of all pages together, or waste of space?"
			}
			*/
			var pdfEntry = {
				filename:  currentApp.title,
				url: currentApp.state.doc_url,
				pageCount: currentApp.solver.numPages,
				pageText:  Array(currentApp.solver.numPages).fill(""),
				fullText: ""
			};

			var allPagePromises = [];

			this.pdfContents.push(pdfEntry);
			for (let p = 0; p < currentApp.solver.numPages; p++) {
				// for each page need to send a separate get text request
				var solverPage = currentApp.solver.getPage(p + 1);
				// each page promise needs to be added
				allPagePromises.push(solverPage.then(function(page){
					var ptc = page.getTextContent();
					return ptc.then(function(textContent) {
						for (let i = 0; i < textContent.items.length; i++) {
							pdfEntry.pageText[p] += textContent.items[i].str;
						}
						_this.addLineToDisplay("Got text content");
						return true;
					})
				}));
				// print that started the page p
				_this.addLineToDisplay("page" + p);
			}
			Promise.all(allPagePromises).then(function() {
				_this.addLineToDisplay("All page promises triggered");
				pdfEntry.fullText += pdfEntry.pageText.join(""); // join text, dont use symbol separate between elements
				_this.sendUpdatedPdfTexts();
			});
		} // if current app
	}, // end fileGrabPdf

	// Github: sindresorhus/os-homedir
	homedir: function() {
		var env  = process.env;
		var home = env.HOME;
		var user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

		if (process.platform === 'win32') {
			return env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH || home || null;
		}

		if (process.platform === 'darwin') {
			return home || (user ? '/Users/' + user : null);
		}

		if (process.platform === 'linux') {
			return home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : null));
		}

		return home || null;
	},

	tryRetrievePdfAtUrl: function(url) {
		var _this = this;

		var http = require('http');
		var fs = require('fs');
		var path = require("path");

		var filename = url.substring(url.lastIndexOf("/") + 1);
		var file;
		file = path.join(this.homedir(), "Documents", "SAGE2_Media", "pdfs", filename);
		file = fs.createWriteStream(file);
		var request = http.get(url, function(response) {
			response.pipe(file);
			_this.addLineToDisplay("retrieved");
			
			setTimeout(function() {
				var doc_url = "http://localhost:9292/user/pdfs/" + filename;
				// doc_url = "http://localhost:9292/uploads/pdfs/SAGE2_collaborate_com2014.pdf";
				// doc_url = "http://lava.manoa.hawaii.edu/wp-content/uploads/2017/02/Kawano_Destiny_EI201701.pdf";
				console.log("retrieve pdf:" + doc_url);
				PDFJS.getDocument(cleanURL(doc_url)).then(function(solver) {
					// saving the solver
					_this.retrievedPdf = solver;
					_this.retrievedPdfPageText = [];
					for (let p = 0; p < _this.retrievedPdf.numPages; p++) {
						_this.retrievedPdfPageText.push("");
						_this.retrievedPdf.getPage(p + 1).then(function(page){
							page.getTextContent().then(function(textContent) {
								for (let i = 0; i < textContent.items.length; i++) {
									_this.retrievedPdfPageText[p] += textContent.items[i].str;
								}
								_this.addLineToDisplay("Got text content");
							})
						});

						_this.addLineToDisplay("page" + p);
					}
				});
			}, 5000); // 5 second delay, something is messing with the file. Does pipe not complete immediately? or sage folder watch?
		});
	},

	resize: function(date) {
	},

	addLineToDisplay: function(string) {
		this.element.innerHTML = string + "\n<br>\n" + this.element.innerHTML;
	},

	/**
	* To enable right click context menu support this function needs to be present.
	*
	* Must return an array of entries. An entry is an object with three properties:
	*	description: what is to be displayed to the viewer.
	*	callback: String containing the name of the function to activate in the app. It must exist.
	*	parameters: an object with specified datafields to be given to the function.
	*		The following attributes will be automatically added by server.
	*			serverDate, on the return back, server will fill this with time object.
	*			clientId, unique identifier (ip and port) for the client that selected entry.
	*			clientName, the name input for their pointer. Note: users are not required to do so.
	*			clientInput, if entry is marked as input, the value will be in this property. See pdf_viewer.js for example.
	*		Further parameters can be added. See pdf_view.js for example.
	*/
	getContextEntries: function() {
		var entries = [];
		var entry;


		// entry = {};
		// entry.description = "Edit";
		// entry.callback    = "SAGE2_openPage";
		// entry.parameters  = {
		// 	url: this.resrcPath + "saControls.html"
		// };
		// entries.push(entry);

		return entries;
	},

	event: function(eventType, position, user_id, data, date) {
		// left intentionally blank
	},

	quit: function() {
		// no additional calls needed.
	}

});
