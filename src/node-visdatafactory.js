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
  * SAGE2 Data Factory Class
  * @module server
  * @submodule DataFactory
  * @requires fs
  * @requires path
  */

function DataFactory() {

}


// basic visualization data types
DataFactory.prototype.dataTypes = {
  Number: function(options) {

  },
  Text: function(options) {

  },
  Point: function(options) {

  }
};


module.exports = DataFactory;
