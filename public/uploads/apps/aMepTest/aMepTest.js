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

var aMepTest = SAGE2_App.extend( {
    init: function(data) {
        // data: contains initialization parameters, such as `x`, `y`, `width`, `height`, and `date`
        this.SAGE2Init("div", data);
		this.element.id = "div" + data.id;
        this.resizeEvents = "continuous";
        this.passSAGE2PointerAsMouseEvents = true;

        // Custom app variables initialization
        this.logSAGE2events = true;
        this.ci = 0;
        this.colors = ["pink", "lightblue", "lightgreen", "lightgray"];
        var thisDiv = this.element;
        var thisObj = this;
        this.element.addEventListener("mousedown", function (e) {
			// console.log("erase me, mousedown: " + e.button);
			if (e.button === 2) {
				thisDiv.style.background = thisObj.colors[thisObj.ci];
				thisObj.ci++;
				if (thisObj.ci >= thisObj.colors.length) { thisObj.ci = 0; }
			}
		});
        this.element.addEventListener("wheel", function (e) {
            thisDiv.textContent = "scroll amount:" + e.deltaY;
        });
    },

    //load function allows application to begin with a particular state.  Needed for remote site collaboration.
    load: function(date) {
        //your load code here- update app based on this.state
    },

    draw: function(date) {
    },

    resize: function(date) {
    },

    event: function(type, position, user, data, date) {
        if (this.logSAGE2events) {
            if (type == "pointerPress") {
                console.log("SAGE2 event pointer press button:" + data.button);
            } else if (type == "pointerScroll") {
                console.log("SAGE2 event pointer scroll delta:" + data.wheelDelta);
            }
        } // end if logSAGE2events
    },

    getContextEntries: function() {
        var entries = [];
        var entry;

        entry = {};
        entry.description = "Toggle SAGE2 event console log";
        entry.callback    = "toggleSAGE2eventLog";
        entry.parameters  = {};
        entries.push(entry);

        return entries;
    },

    toggleSAGE2eventLog: function() {
        this.logSAGE2events = !this.logSAGE2events;
    },

    move: function(date) { 
    },

    quit: function() {
        // It's the end
        this.log("Done");
    }
});