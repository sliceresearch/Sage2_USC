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

var DataFactory = require('node-visdatafactory');

// global view types enumerated


/**
	* @class Visualization
	* @constructor
	*/

function Visualization(broadcastFunc, name) {
	this.send = broadcastFunc;
	this.name = name;

	// the data for the visualization
	this.data = null; // data
	this.header = null; // data attributes

	this.parser = new DataFactory();

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

				this.header = lines[0];

				var dataLines = lines.slice(1);

				parsedData = dataLines.map((el) => {

					var dataPoint = {};
					var thisLine = el.split(delim);

					for (var i = 0; i < this.header.length; i++) {
						dataPoint[this.header[i]] = thisLine[i];
					}

					return dataPoint;
				});
			} else if (format === "json") {
				parsedData = JSON.parse(data);
				this.header = Object.keys(parsedData[0]);
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
	* @param {object} map - Mapping from data terms to recognized data types
	*/
Visualization.prototype.formatData = function(map) {
	// let array = Array.isArray(this.data);

	// perform data regularization operations
	for (let obj of this.data) {
		var keys = Object.keys(obj);

		for (let key of keys) {
			// transform the key of the data into the correct data class, store in same object
			obj[key] = this.factory.transform(
				{
					data: obj[key],
					dataType: map[key]
				});
		}
	}

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
