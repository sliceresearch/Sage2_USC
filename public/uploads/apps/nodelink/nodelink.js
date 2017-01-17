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

var nodelink = SAGE2_DataView.extend({
  init: function(data) {
    
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

    this.state.sorted = this.state.sorted || false;
    this.needsResort = true;
    // this.load_csv(data.date);

    this.colored = true;
  },

  load: function(date) {
    // empty
  },

  load_csv: function(date) {
    var _this = this;

    d3.csv(this.csvSrc)
      .row(function(d, i) {
        var thisRow;

        _this.headers = Object.keys(d);

        thisRow = Object.keys(d).map(function(el) {
          return d[el];
        });

        if (_this.csvData.length < 500) {
          _this.csvData.push({
            number: i,
            key: thisRow[0],
            values: thisRow.slice(1, thisRow.length),
            valuesFull: thisRow
          });
        } else {
          _this.resizeEvents = "onfinish";
        }

      })
      .get(function(error, rows) {
        if (error) {
          console.log(error);
        }

        _this.numVals = _this.csvData[0].values.length;
        _this.draw_d3(date);
      });
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

    var sortUnsortOptionName = this.state.sorted ? "Unsort Data" : "Sort Data";
    var firstColOptionName = this.state.useFirstColumn ?
      "Don't Use First Column" : "Use First Column";

    var contextMenuEntries = [
      {
        description: "Change Mode",
        callback: "modeToggle",
        parameters: {}
      },
      {
        description: firstColOptionName,
        callback: "toggleUseFirstColumn",
        parameters: {}
      },
      {
        description: sortUnsortOptionName,
        callback: "toggleSort",
        parameters: {}
      },
      separator,
      {
        description: "Next Primary Value",
        callback: "incrementPrimary",
        parameters: {val: 1}
      },
      {
        description: "Previous Primary Value",
        callback: "incrementPrimary",
        parameters: {val: -1}
      },
      separator,
      {
        description: "Next Secondary Value",
        callback: "incrementSecondary",
        parameters: {val: 1}
      },
      {
        description: "Previous Secondary Value",
        callback: "incrementSecondary",
        parameters: {val: -1}
      },
      separator,
      {
        description: "Save SVG result",
        callback: "downloadSVG",
        parameters: {}
      }
    ];

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
  }

});
