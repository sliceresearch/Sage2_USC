// SAGE2 is available for use under the SAGE2 Software License
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
 * Provides widget controls and helper functionality for custom application user interface
 *
 * @module client
 * @submodule widgets
 */


/**
 * Enum for button types
 * @readonly
 * @property SAGE2WidgetButtonTypes
 * @type {Object}
 */
var SAGE2WidgetButtonTypes = {
	remote: function() {
		this.img = "images/ui/remote.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	stop: function() {
		this.img = "images/appUi/stopBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	weather: function() {
		this.img = "images/appUi/weatherBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	traffic: function() {
		this.img = "images/appUi/trafficBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	closeBar: function() {
		this.img = "images/appUi/closeMenuBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	new: function() {
		this.img = "images/appUi/stickyBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	duplicate: function() {
		this.img = "images/appUi/stickyCopyBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	shareScreen: function() {
		this.img = "images/ui/sharescreen.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	prev: function() {
		this.img = "images/appUi/arrowLeftBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	next: function() {
		this.img = "images/appUi/arrowRightBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	"up-arrow": function() {
		this.img = "images/appUi/arrowUpBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	"down-arrow": function() {
		this.img = "images/appUi/arrowDownBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	rewind: function() {
		this.img = "images/appUi/homeBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	fastforward: function() {
		this.img = "images/appUi/endBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	mute: function() {
		this.img2 = "images/appUi/muteBtn.svg";
		this.img  = "images/appUi/soundBtn.svg";
		this.state = 0;
		this.textual = false;
		this.animation = false;
	},
	loop: function() {
		this.img2 = "images/appUi/loopBtn.svg";
		this.img  = "images/appUi/dontLoopBtn.svg";
		this.state = 0;
		this.textual = false;
		this.animation = false;
	},
	"play-pause": function() {
		this.img  = "images/appUi/playBtn.svg";
		this.img2 = "images/appUi/playBtn.svg";
		this.state = 0;
		this.textual = false;
		this.animation = false;
	},
	"zoom-in": function() {
		this.img = "images/appUi/zoomInBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	"zoom-out": function() {
		this.img = "images/appUi/zoomOutBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
	},
	closeApp: function() {
		this.img = "images/appUi/closeAppBtn.svg";
		this.state = null;
		this.textual = false;
		this.animation = false;
		this.shape = "octagon";
	},
	default: function() {
		this.textual = true;
		this.label = "Hello";
		this.fill = "rgba(250,250,250,1.0)";
		this.animation = false;
	}

};
