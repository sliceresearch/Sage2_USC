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
      .style("fill", "#000000");

    // console.log("creating controls");
    // this.controls.addButton({label: "Mode",  position: 1,  identifier: "ModeToggle"});
    // this.controls.addButton({type: "next",   position: 5,  identifier: "NextValPrim"});
    // this.controls.addButton({label: "Prim.", position: 4,  identifier: "PrimVal"});
    // this.controls.addButton({type: "prev",   position: 3,  identifier: "PrevValPrim"});
    // this.controls.addButton({label: "Sort",  position: 7,  identifier: "SortToggle"});
    // this.controls.addButton({type: "next",   position: 9,  identifier: "NextValSec"});
    // this.controls.addButton({label: "Sec.",  position: 10, identifier: "SecVal"});
    // this.controls.addButton({type: "prev",   position: 11, identifier: "PrevValSec"});
    // this.controls.addButton({label: "Col 1", position: 12, identifier: "FirstColToggle"});

    this.controls.finishedAddingControls();
  },

  load: function(date) {
    // empty
  },

  drawvis: function(date) {
    var width = this.element.clientWidth,
    height = this.element.clientHeight;

    var svg = this.svg;
    var graph = this.visData;

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    var link = svg.append("g")
        .attr("class", "links")
      .selectAll("line")
      .data(function() {console.log(graph.links); return graph.links})
      .enter().append("line")
        .attr("stroke-width", function(d) { return Math.sqrt(d.value); })
        .style("stroke", "#aaa");

    var node = svg.append("g")
        .attr("class", "nodes")
      .selectAll("circle")
      .data(graph.nodes)
      .enter().append("circle")
        .attr("r", 5)
        .attr("fill", function(d) { return color(d.group); })
        .style("stroke", "#FFF")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("title")
        .text(function(d) { return d.id; });

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
      link
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
    }


    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  },

  draw: function(date) {
    // this.draw_d3(date);
  },

  resize: function(date) {
    var box = "0,0," + this.element.clientWidth + "," + this.element.clientHeight;
    this.svg.attr('width',  this.element.clientWidth)
      .attr('height', this.element.clientHeight)
      // .attr("viewBox", box);

    // this.svg.select(".bg")
    //   .attr("width", +this.svg.attr("width"))
    //   .attr("height", +this.svg.attr("height"));

    this.refresh(date);
    // this.drawvis(date);
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
