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
	* SAGE2 Vizualization Class
	* @module server
	* @submodule Visualization
	* @requires fs
	* @requires path
	* @requires node-visdatafactory
	*/

// require variables to be declared
"use strict";

var fs = require('fs');
// var path = require('path');

// global view types enumerated


/**
	* @class Visualization
	* @constructor
	*/

function Visualization(broadcastFunc, name) {
	this.send = broadcastFunc;
	this.name = name;

	// the data for the visualization
	this.data = null;
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
	*/
Visualization.prototype.loadDataSource = function(dataPath) {
	if (dataPath) {
		// format inferred from filename
		var format = dataPath.substring(dataPath.lastIndexOf(".") + 1);

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
			} else {
				var e = new Error();
				e.message = "Incompatible data format: " + dataPath;
				e.name = "VisControllerDataError";

				throw e;
			}

			this.setDataSource(parsedData);
		});
	}
};

/**
	* Format first level of data using provided map from values used in data to recognized terms,
	*
	*
	* @param {object} map - Mapping from data terms to recognized terms
	*/
Visualization.prototype.formatData = function(map) {
	let formattedData = Array.isArray(this.data) ? new Array(this.data.length) : {};

	// perform data regularization operations
	for (let key in this.data) {
		let newKey = map[key] && map[key].type || key;

		if (map[key]) {
			formattedData[newKey] = {
				label: key,
				use: map[key].use,
				domain: map[key].domain,
				data: this.data[key]
			};
		} else {
			formattedData[newKey] = {
				label: key,
				use: null,
				domain: null,
				data: this.data[key]
			};
		}
	}

	this.data = formattedData;
	this.dataReady = true;
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

		console.log("Visualization: Update Vis View:", {
			id: viewID,
			data: dataToSend
		});

		// update the data which this view holds
		this.send("visualizationUpdateView", {
			id: viewID,
			data: dataToSend
		});


	}
};

module.exports = Visualization;
