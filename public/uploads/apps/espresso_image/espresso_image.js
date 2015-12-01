// SAGE2 is available for use under *the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

"use strict";

/**
 * @module client
 * @submodule image_viewer
 */

var gstxb;

/**
 * Xml viewing application
 *
 * @class esptkt_viewer
 */
//<script async src="https://code.jquery.com/jquery-1.6.2.min.js"></script>
//var jQuery = require("jquery");

var espresso_image = SAGE2_App.extend({
		/**
		 * Init method, creates an 'img' tag in the DOM
		 *
		 * @method init
		 * @param data {Object} contains initialization values (id, width, height, state, ...)
		 */
init: function(data) {
	this.SAGE2Init("img", data);

	// To get position and size updates
	this.resizeEvents = "continuous";
	this.moveEvents   = "continuous";

	// visible
	this.vis = true;

	//this.element.innerHTML = "Default Message in esptkt_viewer";
	//this.element.style.background = "white";

	gstxb = this;
	console.log(">>>>>URL: " + this.state.file);

	var ws;
	ws = new WebSocket("wss://localhost:8899/echo");
	console.log("WebSocket established");
	ws.binaryType = "arraybuffer";
	var outImg = this.element;
	console.log(">>>>>> outImg: " + outImg);
	//ws.send("TEST");

	ws.onclose = function(event) {
		console.log("WS Close");
	}

	ws.onmessage = function(message) {
		console.log("OnMessage");
		var blob = new Blob([message.data]);
		render(blob, outImg);
	}

	ws.onopen = function(event) {
		console.log("WS Connect");
		var rawFile = new XMLHttpRequest();
		rawFile.open("GET", gstxb.state.file, false);
		rawFile.onreadystatechange = function ()
		{
			if(rawFile.readyState === 4)
			{
				if(rawFile.status === 200 || rawFile.status == 0)
				{
					var xml = rawFile.responseText;
					var xmlDoc = jQuery.parseXML(xml);
					var jqxml = jQuery(xmlDoc);
					var fileId = jqxml.find("Resource").text();

					var sendData = new Object();
					var fmId     = fileId.substr(0,8);
					var cIdUpper = fileId.substr(8,8);
					var cIdLower = fileId.substr(16,8);
					var verId    = fileId.substr(24,8);
					var nSeq = "1";
					var sendRate = "500000000";
					sendData.fmId = fmId;
					sendData.cIdUpper = cIdUpper;
					sendData.cIdLower = cIdLower;
					sendData.verId    = verId;
					sendData.sendRate = sendRate;
					sendData.nSeq     = nSeq;
					console.log(sendData);
					sendReadRequest(ws, sendData);

					/*
					   var xml = rawFile.responseText;
					   var xmlDoc = jQuery.parseXML(xml);
					   var jqxml = jQuery(xmlDoc);
					   var text = "<pre font-size: 300%;>";

					   text += "[Service Information]\n";	
					   text += "ServiceName              : ";
					   text += jqxml.find("ServiceName").text();
					   text += "\n";
					   text += "ServiceTicketId          : ";
					   text += jqxml.find("ServiceTicketId").text();
					   text += "\n\n";

					   text += "[Target Infomation]\n";	
					   text += "Subject                  : ";
					   text += jqxml.find("Subject").text();
					   text += "\n";
					   text += "Resource (Target File ID): ";
					   text += jqxml.find("Resource").text();
					   text += "\n";
					   text += "Action (Permitted Action): ";
					   text += jqxml.find("Action").text();
					   text += "\n\n";


					   text += "[Date Infomation]\n";	
					   text += "IssueDate                : ";
					   text += jqxml.find("IssueDate").text();
					   text += "\n";
					   text += "Not Valid Before         : ";
					   text += jqxml.find("NotValidBefore").text();
					   text += "\n";
					   text += "Not Valid After          : ";
					   text += jqxml.find("NotValidAfter").text();
					   text += "\n\n";
					   text += "</pre>";




					   gstxb.element.innerHTML = text;
					 */
					/*
					 */

					//gstxb.element.innerHTML = "<xmp>"+rawFile.responseText+"</xmp>";
					//gstxb.element.innerHTML = gstxb.state.exif;
					//this.pre.innerHTML = this.syntaxHighlight(this.state.exif);

				}
			}
		}
		rawFile.send(null);
	}



	//this.updateAppFromState();
	//this.addWidgetControlsToImageViewer();
	  },

		  /**
		   * Load the app from a previous state
		   *
		   * @method load
		   * @param date {Date} time from the server
		   */
load: function(date) {

		  //this.updateAppFromState();
		  //this.refresh(date);
	  },

	  /**
	   * Update the app from it's new state
	   *
	   * @method updateAppFromState
	   */
updateAppFromState: function() {
						this.element.src  = cleanURL(this.state.src);

						//this.pre.innerHTML = this.syntaxHighlight(this.state.exif);
						if (this.state.showExif === true) {
							this.showLayer();
						}
						this.layer.style.top = this.state.top + "px";

						// Fix iPhone picture: various orientations
						//	var ratio = this.state.exif.ImageHeight / this.state.exif.ImageWidth;
						//		var inv = 1.0 / ratio;


					},

					/**
					 * Visibility callback, when app becomes locally visible or hidden.
					 *    Called during preDraw
					 *
					 * @method onVisible
					 * @param visibility {bool} became visible or hidden
					 */
onVisible: function(visibility) {
			   /*
				  if (visibility) {
				  this.element.src = this.state.src;
				  } else {
				  this.element.src = smallWhiteGIF();
				  }
				*/
		   },

		   /**
			* Draw function, empty since the img tag is in the DOM
			*
			* @method draw
			* @param date {Date} current time from the server
			*/
draw: function(date) {
		  //this.element.innerHTML = this.state.doc_url;

	  },

	  /**
	   * Resize callback
	   *
	   * @method resize
	   * @param date {Date} current time from the server
	   */
resize: function(date) {
			// Force a redraw to test visibility
			this.refresh(date);
		},

		/**
		 * Move callback
		 *
		 * @method move
		 * @param date {Date} current time from the server
		 */
move: function(date) {
		  // Force a redraw to test visibility
		  this.refresh(date);
	  },

	  /**
	   * Parse JSON object and add colors
	   *
	   * @method syntaxHighlight
	   * @param json {Object} object containing metadata
	   */
	  /*
syntaxHighlight: function(json, cb) {
if (typeof json !== 'string') {
json = JSON.stringify(json, undefined, 4);
}
json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
function(match) {
var cls = 'color: darkorange;';
if (/^"/.test(match)) {
if (/:$/.test(match)) {
cls = 'color: CadetBlue;';
} else {
cls = 'color: green;';
}
} else if (/true|false/.test(match)) {
cls = 'color: blue;';
} else if (/null/.test(match)) {
cls = 'color: magenta;';
}
return '<span style="' + cls + '">' + match + '</span>';
});
},
	   */

	  /**
	   * Handles event processing for the app
	   *
	   * @method event
	   * @param eventType {String} the type of event
	   * @param position {Object} contains the x and y positions of the event
	   * @param user_id {Object} data about the user who triggered the event
	   * @param data {Object} object containing extra data about the event,
	   * @param date {Date} current time from the server
	   */
event: function(eventType, position, user_id, data, date) {
		   // Press 'i' to display EXIF information
		   if ((eventType === "keyboard" && data.character === "i") || (eventType === "widgetEvent" && data.identifier === "Info")) {
			   if (this.isLayerHidden()) {
				   this.state.top = 0;
				   this.state.showExif = true;
				   this.showLayer();
			   } else {
				   this.state.showExif = false;
				   this.hideLayer();
			   }

			   this.refresh(date);
		   }
		   // Scroll events for panning the info pannel
		   if (eventType === "pointerScroll") {
			   var amount = -data.wheelDelta / 32;

			   this.state.top += ui.titleTextSize * amount;
			   if (this.state.top > 0) {
				   this.state.top = 0;
			   }
			   if (this.state.top < (-(this.layer.clientHeight - this.element.height))) {
				   this.state.top = -(this.layer.clientHeight - this.element.height);
			   }
			   this.layer.style.top = this.state.top + "px";

			   this.refresh(date);
		   }
	   },

addWidgetControlsToImageViewer: function() {
									// UI stuff
									this.controls.addButton({label: "info", position: 7, identifier: "Info"});
									this.controls.finishedAddingControls();
								}

});

