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
	"play-pause": function () {
		this.from = "m -3 -5 l 6 5 l -6 5 z";//"m -5 -5 l 0 10 l 6 -3 l 4 -2 z";
		this.to = "m -2 -5 l 0 10 m 4 -10 l 0 10";//"m -2 -5 l 0 10 m 4 0 l 0 -10";
		this.width = 10;
		this.height = 10;
		this.strokeWidth = 1;
		this.fill = "#ffffff";
		this.state = 0;
		this.delay = 400;
		this.textual = false;
		this.animation = true;
	},
	"mute": function () {
		this.from = "m -3 -2 l 2 0 l 3 -3 l 0 10 l -3 -3 l -2 0 z m 6 0 l 0 4 m 1 -5 l 0 6";
		this.to = "m -3 -2 l 2 0 l 3 -3 l 0 10 l -3 -3 l -2 0 z m 3 -3 l -2 10";
		this.width=8;
		this.height=10;
		this.strokeWidth= 1;
		this.fill="#ffffff";
		this.toFill="#6D6D6D";
		this.state= 0;
		this.delay= 400;
		this.textual=false;
		this.animation= true;
	},
	"loop": function (){
		this.from = "m 3 -2 a 3 3 0 1 0 0 3 l 1 2 a 5 5 0 1 1 0 -7 l 1 -1 l 0 4 l -4 0 l 1 -1";
		this.to = "m 3 -2 a 3 3 0 1 0 0 3 l 1 2 a 5 5 0 1 1 0 -7 l 1 -1 l 0 4 l -4 0 l 1 -1 m 1 -4 l -4 12";
		this.width = 10;
		this.height = 10;
		this.strokeWidth = 1;
		this.fill = "#ffffff";
		this.toFill ="#6D6D6D";
		this.state = 0;
		this.delay = 400;
		this.textual = false;
		this.animation = true;
	},
	"play-stop": function (){
		this.from = "m -3 -5 l 6 5 l -6 5 z";
		this.to ="m -4 -4 l 0 8 l 8 0 l 0 -8 z";
		this.width =10;
		this.height =10;
		this.strokeWidth = 1;
		this.fill ="#ffffff";
		this.toFill ="#6D6D6D";
		this.state = 0;
		this.delay = 400;
		this.textual = false;
		this.animation = true;
	},
	"stop": function () {
		this.from ="m -4 -4 l 0 8 l 8 0 l 0 -8 z";
		this.to = "m -4 -4 l 0 8 l 8 0 l 0 -8 z";
		this.width =10;
		this.height =10;
		this.strokeWidth = 1;
		this.fill ="#ffffff";
		this.state = null;
		this.delay = 400;
		this.textual =false;
		this.animation = false;
	},
	"next": function (){
		this.state = null;
		this.from = "m 0 -6 l 4 6 l -4 6";
		this.to = "m -6 0 l 10 0 l -10 0";//"m -3 0 a 6 6 180 1 0 0 1 z";
		this.width = 10;
		this.height = 12;
		this.fill="#6D6D6D";
		this.toFill="#6D6D6D";
		this.strokeWidth = 1;
		this.delay = 600;
		this.textual = false;
		this.animation = true;
	},
	"prev": function (){
		this.state= null;
		this.from="m 0 -6 l -4 6 l 4 6";
		this.to="m 6 0 l -10 0 l 10 0";
		this.width=10;
		this.height=12;
		this.fill="#6D6D6D";
		this.toFill="#6D6D6D";
		this.strokeWidth= 1;
		this.delay=600;
		this.textual=false;
		this.animation= true;

	},
	"up-arrow": function (){
		this.state= null;
		this.from="m -6 0 l 6 -4 l 6 4";
		this.to="m 0 6 l 0 -10 l 0 10";
		this.width=10;
		this.height=12;
		this.fill="#6D6D6D";
		this.toFill="#6D6D6D";
		this.strokeWidth= 1;
		this.delay=600;
		this.textual=false;
		this.animation= true;

	},
	"down-arrow": function (){
		this.state= null;
		this.from="m -6 0 l 6 4 l 6 -4";
		this.to="m 0 -6 l 0 10 l 0 -10";
		this.width=10;
		this.height=12;
		this.fill="#6D6D6D";
		this.toFill="#6D6D6D";
		this.strokeWidth= 1;
		this.delay=600;
		this.textual=false;
		this.animation= true;

	},
	"zoom-in": function (){
		this.from = "m 2 2 a 5 5 0 1 1 1 -1 l 3 3 l -1 1 l -3 -3 m -5 -4 l 4 0 m -2 -2 l 0 4";
		this.to =   "m 2 2 a 5 5 0 1 1 1 -1 l 3 3 l -1 1 l -3 -3 m -5 -4 l 4 0 m -2 -2 l 0 4";
		this.width = 10;
		this.height = 10;
		this.strokeWidth = 1;
		this.fill = "#6D6D6D";
		this.toFill ="#6D6D6D";
		this.state = null;
		this.delay = 400;
		this.textual = false;
		this.animation = false;
	},
	"zoom-out": function (){
		this.from = "m 2 2 a 5 5 0 1 1 1 -1 l 3 3 l -1 1 l -3 -3 m -5 -4 l 4 0";
		this.to =   "m 2 2 a 5 5 0 1 1 1 -1 l 3 3 l -1 1 l -3 -3 m -5 -4 l 4 0";
		this.width = 10;
		this.height = 10;
		this.strokeWidth = 1;
		this.fill = "#6D6D6D";
		this.toFill ="#6D6D6D";
		this.state = null;
		this.delay = 400;
		this.textual = false;
		this.animation = false;
	},
	"rewind": function () {
		this.state= null;
		this.from="m 0 -6 l -4 6 l 4 6 m 4 -12 l -4 6 l 4 6";
		this.to="m 0 -6 l -4 6 l 4 6 m 6 -6 l -10 0 l 10 0";
		this.width=10;
		this.height=12;
		this.fill="#6D6D6D";
		this.toFill="#6D6D6D";
		this.strokeWidth= 1;
		this.delay=600;
		this.textual=false;
		this.animation= true;
	},
	"fastforward": function (){
		this.state= null;
		this.from="m 0 -6 l 4 6 l -4 6 m -4 -12 l 4 6 l -4 6";
		this.to="m 0 -6 l 4 6 l -4 6 m -6 -6 l 10 0 l -10 0 ";
		this.width=10;
		this.height=12;
		this.fill="#6D6D6D";
		this.toFill="#6D6D6D";
		this.strokeWidth= 1;
		this.delay=600;
		this.textual=false;
		this.animation= true;
	},
	"duplicate": function (){
		this.state= null;
		this.from="m -4 -4 l 8 0 l 0 8 l -8 0 z";
		this.to="m -4 -4 l 8 0 l 0 8 l -8 0 z m 3 0 l 0 -3 l 8 0 l 0 8 l -3 0";
		this.width=10;
		this.height=10;
		this.fill="#999999";
		this.strokeWidth= 1;
		this.delay=600;
		this.textual=false;
		this.animation= true;
	},
	"new": function () {
		this.state= null;
		this.from="m -4 -4 l 8 0 l 0 8 l -8 0 z";
		this.to="m -4 -4 l 8 0 l 0 8 l -8 0 z m 5 3 l 0 4 m -2 -2 l 4 0";
		this.width=10;
		this.height=10;
		this.fill="#6D6D6D";
		this.toFill="#6D6D6D";
		this.strokeWidth= 1;
		this.delay=600;
		this.textual=false;
		this.animation= true;
	},
	"closeBar": function () {
		this.from ="m -4 -4 l 8 8 m -8 0 l 8 -8";
		this.to = "m -4 -4 l 8 8 m -8 0 l 8 -8";
		this.width =10;
		this.height =10;
		this.strokeWidth = 3;
		this.fill = "#6D6D6D";
		this.toFill ="#6D6D6D";
		this.state = null;
		this.delay = 400;
		this.textual =false;
		this.animation = false;
	},
	"closeApp": function () {
		this.state= null;
		this.from="m -4 -5 l 8 0 l 0 10 l -8 0 l 0 -10 m 0 2 l 8 0 m -6 2 l 4 4 m 0 -4 l -4 4";
		this.to= "m -4 -5 l 8 0 l 0 10 l -8 0 l 0 -10 m 0 2 l 8 0 m -6 2 l 4 4 m 0 -4 l -4 4";
		this.width=8;
		this.height=10;
		this.fill="#6D6D6D";
		this.toFill="#6D6D6D";
		this.strokeWidth= 1;
		this.delay=600;
		this.textual=false;
		this.animation=false;
	},
	"remote":function(){
		this.img = "images/ui/remote.svg";
		this.textual=false;
		this.animation=false;
	},
	"shareScreen":function(){
		this.img = "images/ui/sharescreen.svg";
		this.textual=false;
		this.animation=false;
	},
	"default": function (){
		this.textual=true;
		this.label="Hello";
		this.fill="rgba(250,250,250,1.0)";
		this.animation=false;
	}

};
