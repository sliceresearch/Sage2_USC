// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-16

//

/* global d3 */
"use strict";

var SAGE2Viz = SAGE2_App.extend({
  init: function(data) {
    console.log(data);

    this.SAGE2Init("div", data);

    this.element.id = "div" + data.id;

    this.resizeEvents = /* "onfinish"; */ "continuous";

    // save the view box (coordinate system)
    this.box = [data.width, data.height];

    // attach the SVG into the this.element node provided to us
    var box = "0,0," + this.box[0] + "," + this.box[1];
    this.svg = d3.select(this.element).append("svg")
      .attr("width",   data.width)
      .attr("height",  data.height)
      .attr("viewBox", box);

    // in case we want to allow for more interactive d3
    // this.passSAGE2PointerAsMouseEvents = true;

    this.svg.append("rect")
      .attr("class", "bg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("fill", "#D1E2E8");

    console.log("creating controls");
    this.controls.addButton({label: "Mode",  position: 1,  identifier: "ModeToggle"});
    this.controls.addButton({type: "next",   position: 5,  identifier: "NextValPrim"});
    this.controls.addButton({label: "Prim.", position: 4,  identifier: "PrimVal"});
    this.controls.addButton({type: "prev",   position: 3,  identifier: "PrevValPrim"});
    this.controls.addButton({label: "Sort",  position: 7,  identifier: "SortToggle"});
    this.controls.addButton({type: "next",   position: 9,  identifier: "NextValSec"});
    this.controls.addButton({label: "Sec.",  position: 10, identifier: "SecVal"});
    this.controls.addButton({type: "prev",   position: 11, identifier: "PrevValSec"});
    this.controls.addButton({label: "Col 1", position: 12, identifier: "FirstColToggle"});

    this.controls.finishedAddingControls();

    // this.load_csv(data.date);

    // create visualization serverside
    this.updateServer(data);
    

    // get file name and type
    var re = /.*\/(.+)\.(\w*)/;
    var arr = re.exec(this.state.file);
    console.log(arr);

    this.updateTitle(arr[1] + " (" + arr[2].toUpperCase() + ")");
  },

  updateServer: function(data) {
    wsio.emit('createVisualization', {id: data.id, filePath: this.state.file});
  },

  load: function(date) {
    // empty
  },

  draw_d3: function(date) {

    var width  = this.element.clientWidth;
    var height = this.element.clientHeight;

    // draw stuff

  },

  draw: function(date) {

  },

  resize: function(date) {
    var box = "0,0," + this.element.clientWidth + "," + this.element.clientHeight;
    this.svg.attr('width',  this.element.clientWidth)
      .attr('height', this.element.clientHeight)
      .attr("viewBox", box);

    this.svg.select(".bg")
      .attr("width", +this.svg.attr("width"))
      .attr("height", +this.svg.attr("height"));

    this.refresh(date);
    this.draw_d3(date);
  },

  getContextEntries: function() {
    var separator = {
      description: "separator"
    };

  //   var sortUnsortOptionName = this.state.sorted ? "Unsort Data" : "Sort Data";
  //   var firstColOptionName = this.state.useFirstColumn ?
  //     "Don't Use First Column" : "Use First Column";

    var contextMenuEntries = [
      {
        description: "Create ",
        callback: "loadNodeLinkApp",
        parameters: {}
      }
    ];

  //     {
  //       description: firstColOptionName,
  //       callback: "toggleUseFirstColumn",
  //       parameters: {}
  //     },
  //     {
  //       description: sortUnsortOptionName,
  //       callback: "toggleSort",
  //       parameters: {}
  //     },
  //     separator,
  //     {
  //       description: "Next Primary Value",
  //       callback: "incrementPrimary",
  //       parameters: {val: 1}
  //     },
  //     {
  //       description: "Previous Primary Value",
  //       callback: "incrementPrimary",
  //       parameters: {val: -1}
  //     },
  //     separator,
  //     {
  //       description: "Next Secondary Value",
  //       callback: "incrementSecondary",
  //       parameters: {val: 1}
  //     },
  //     {
  //       description: "Previous Secondary Value",
  //       callback: "incrementSecondary",
  //       parameters: {val: -1}
  //     },
  //     separator,
  //     {
  //       description: "Save SVG result",
  //       callback: "downloadSVG",
  //       parameters: {}
  //     }
  //   ];

  //   var modeOptions = new Array(this.drawModeNames.length);

  //   modeOptions[0] = [
  //     {
  //       description: "Change Mode",
  //       callback: "modeToggle",
  //       parameters: {}
  //     },
  //     {
  //       description: sortUnsortOptionName,
  //       callback: "toggleSort",
  //       parameters: {}
  //     },
  //     separator,
  //     {
  //       description: "Next Bar Category",
  //       callback: "incrementPrimary",
  //       parameters: {val: 1}
  //     },
  //     {
  //       description: "Previous Bar Category",
  //       callback: "incrementPrimary",
  //       parameters: {val: -1}
  //     },
  //     separator,
  //     {
  //       description: "Next Bar Value",
  //       callback: "incrementSecondary",
  //       parameters: {val: 1}
  //     },
  //     {
  //       description: "Previous Bar Value",
  //       callback: "incrementSecondary",
  //       parameters: {val: -1}
  //     },
  //     separator,
  //     {
  //       description: "Save SVG result",
  //       callback: "downloadSVG",
  //       parameters: {}
  //     }
  //   ];

  //   modeOptions[1] = [
  //     {
  //       description: "Change Mode",
  //       callback: "modeToggle",
  //       parameters: {}
  //     },
  //     {
  //       description: firstColOptionName,
  //       callback: "toggleUseFirstColumn",
  //       parameters: {}
  //     },
  //     {
  //       description: sortUnsortOptionName,
  //       callback: "toggleSort",
  //       parameters: {}
  //     },
  //     separator,
  //     {
  //       description: "Next Sort Value",
  //       callback: "incrementPrimary",
  //       parameters: {val: 1}
  //     },
  //     {
  //       description: "Previous Sort Value",
  //       callback: "incrementPrimary",
  //       parameters: {val: -1}
  //     },
  //     separator,
  //     {
  //       description: "Save SVG result",
  //       callback: "downloadSVG",
  //       parameters: {}
  //     }
  //   ];

  //   modeOptions[2] = [
  //     {
  //       description: "Change Mode",
  //       callback: "modeToggle",
  //       parameters: {}
  //     },
  //     {
  //       description: firstColOptionName,
  //       callback: "toggleUseFirstColumn",
  //       parameters: {}
  //     },
  //     separator,
  //     {
  //       description: "Next X Variable",
  //       callback: "incrementPrimary",
  //       parameters: {val: 1}
  //     },
  //     {
  //       description: "Previous X Variable",
  //       callback: "incrementPrimary",
  //       parameters: {val: -1}
  //     },
  //     separator,
  //     {
  //       description: "Next Y Variable",
  //       callback: "incrementSecondary",
  //       parameters: {val: 1}
  //     },
  //     {
  //       description: "Previous Y Variable",
  //       callback: "incrementSecondary",
  //       parameters: {val: -1}
  //     },
  //     separator,
  //     {
  //       description: "Save SVG result",
  //       callback: "downloadSVG",
  //       parameters: {}
  //     }
  //   ];

  //   var contextMenuEntries = isNaN(this.state.drawMode) ? defaultEntries :
  //     modeOptions[this.state.drawMode];

    return contextMenuEntries;
  },

  event: function(eventType, position, user_id, data, date) {

    if (eventType === "pointerPress" && (data.button === "left")) {
      // press

    }
    if (eventType === "pointerMove") {
      // scale the coordinate by the viewbox (coordinate system)
      // var scalex = this.box[0] / this.element.clientWidth;
      // var scaley = this.box[1] / this.element.clientHeight;
    }
    if (eventType === "pointerRelease" && (data.button === "left")) {
      // release
    }
    if (eventType === "widgetEvent") {
      if (data.identifier === "NextValPrim") {
        this.incrementPrimary({val: 1});
      } else if (data.identifier === "PrevValPrim") {
        this.incrementPrimary({val: -1});
      } else if (data.identifier === "SortToggle") {
        this.toggleSort();
      } else if (data.identifier === "NextValSec") {
        this.incrementSecondary({val: 1});
      } else if (data.identifier === "PrevValSec") {
        this.incrementSecondary({val: -1});
      } else if (data.identifier === "ModeToggle") {
        this.modeToggle();
      } else if (data.identifier === "FirstColToggle") {
        this.toggleUseFirstColumn();
      }
    }
  },

  loadNodeLinkApp: function() {
    if (this.isMaster) {
      wsio.emit('loadApplication', {application: "C:\\Users\\andre\\Documents\\sage2\\public\\uploads\\apps\\nodelink", user: "SAGE2", parent: this.id});
    }
  }

});

