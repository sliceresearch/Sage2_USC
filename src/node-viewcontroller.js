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
	* Partitioning of SAGE2 Apps into groups
	* @module server
	* @submodule Visualization
	* @requires fs
	* @requires path
	*/

// require variables to be declared
"use strict";

var fs = require('fs');
// var path = require('path');

/**
	* @class Visualization
	* @constructor
	*/

function Visualization(wsio, name) {
	this.wsio = wsio;
	this.name = name;

	// the data for the visualization
	this.data = {};
	// after data is loaded and formatted, it is ready
	this.dataReady = false;

	this.views = {};
	this.numViews = 0;
}

/**
	* Set the data object of this Visualization
	*
	* @param {object} data - Data to be visualized
	*/
Visualization.prototype.setDataSource = function(data) {
	this.data = data || {};
};

/**
	* Load data into the visualization, json, csv, or tsv (csv & tsv with headers)
	*
	* @param {string} dataPath - Path to the remote source of data to be loaded using fs (json format data)
	* @param {string} format - format of data to be loaded ["json", "csv", "tsv"]
	*/
Visualization.prototype.loadDataSource = function(dataPath, format) {
	if (dataPath) {
		fs.readFile(dataPath, (err, data) => {
			if (err) {
				throw err;
			}

			// convert file read to string
			data = data.toString();

			// parse data
			var parsedData = {};

			// read csv/tsv format files
			if (format === "csv" || format === "tsv") {
				var delim;

				if (format === "csv") {
					delim = ",";
				} else if (format === "tsv") {
					delim = "\t";
				}

				var lines = data.split("\n");

				var header = lines[0];

				var dataLines = lines.slice(1);

				parsedData = dataLines.map((el) => {

					var dataPoint = {};
					var thisLine = el.split(delim);

					for (var i = 0; i < header.length; i++) {
						dataPoint[header[i]] = thisLine[i];
					}

					return dataPoint;
				});
			} else if (format === "json") {
				parsedData = JSON.parse(data);
			}

			this.setDataSource(parsedData);
		});
	}
};

/**
	* Format data using provided map from values used in data to
	*
	* @param {object} map - Mapping from data terms to recognized terms
	*/
Visualization.prototype.formatData = function(map) {
	let formattedData = {};

	// perform data regularization operations
	for (var key in this.data) {
		formattedData[map[key]] = formatElement(this.data[key], map);
	}

	this.data = formattedData;


	// used to recursively format substructure of data using same mapping
	function formatElement(el, map) {
		var elCopy = {};

		for (var key in el) {
			elCopy[map[key]] = formatElement(el[key], map);
		}
	} // end formatElement(...

};

Visualization.prototype.addView = function(view) {
	this.views[view.id] = {
		type: view.type
	};

	this.numViews++;
};

Visualization.prototype.removeView = function(viewID) {
	if (this.views.hasOwnProperty(viewID)) {
		// if the object exists within the viewController
		delete this.views[viewID];

		this.numViews--;
	}
};

Visualization.prototype.updateView = function(viewID) {
	if (this.views.hasOwnProperty(viewID)) {
		// if the object exists within the viewController

		// calculate data subset which the view will be sent (depends on view type)
		var dataToSend = this.data;

		// update the data which this view holds
		this.wsio.emit("visualizationUpdateView", {
			id: viewID,
			data: dataToSend
		});


	}
};
