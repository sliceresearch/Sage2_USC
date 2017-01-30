var __SAGE2__ = __SAGE2__ || {};

var d3; // global d3 of version 3 because old apps and stuff want it

__SAGE2__.lib = {};


require.config({
  baseUrl: "lib",
  paths: {
    d3v3: "d3.v3.min",
    d3v4: "d3.v4.min"
  }
});

// load d3
// require(["d3v3", "d3v4"], function (d3v3, d3v4) {
//  __SAGE2__.lib.d3 = {};

//  __SAGE2__.lib.d3.v3 = d3v3;
//  __SAGE2__.lib.d3.v4 = d3v4;

//  console.log("d3.v3 and d3.v4 loaded");
// });

require(["d3v3", "d3v4"], function (d3v3, d3v4) {

  __SAGE2__.lib.d3 = {};

  __SAGE2__.lib.d3.v3 = d3v3;
  __SAGE2__.lib.d3.v4 = d3v4;

  d3 = __SAGE2__.lib.d3.v3;

  console.log("d3.v3 & d3.v4 loaded");
});
