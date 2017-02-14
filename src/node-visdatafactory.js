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
	*/

"use strict";


/**
	* @class DataFactory
	* @constructor
	* @param {object} map - map between terms in data and recognized terms for a object type
	*/
function DataFactory(map) {
	this.map = map;

	this.dataType = "Obj";
}

// basic visualization data types static to class
DataFactory.dataTypes = {
	ID: ID,
	Num: Num,
	Text: Text,
	Point: Point,
	Position: Position,
	Node: Node,
	Link: Link,
	Obj: Obj
};

/**
	* Transform one data object
	*
	* @param {object} options - Data and datatype of the object to be transformed
	*/
DataFactory.prototype.transform = function(options) {
	this.dataType = options.dataType || "Obj";

	// when transforming an element, first map unrecognized terms
	if (this.map) {
		for (var key in options.data) {
			if (this.map[key]) {
				options.data[this.map[key]] = options.data[key];
				delete options.data[key];
			}
		}
	}

	// return new DataFactory.dataTypes[this.dataType](options);
};




// ====== Data Type Class Declarations ======


// =============================================================================
/**
	* @class ID
	* @constructor
	* @param {object} options - data from which to create ID object
	*/
function ID(options) {
	this.data = options.data || null;
}

ID.params = [];


// =============================================================================
/**
	* @class ID
	* @constructor
	* @param {object} options - data from which to create ID object
	*/
function Num(options) {
	this.data = !isNaN(options.data) ? Number(options.data) : 0;
}

Num.params = [];


// =============================================================================
/**
	* @class Text
	* @constructor
	* @param {object} options - data from which to create Text object
	*/
function Text(options) {
	this.data = options.data ? "" + options.data : "";
}

Text.params = [];


// =============================================================================
/**
	* Point objects containing coordinate (requires x and y)
	*
	* @class Point
	* @constructor
	* @param {object} options - data from which to create Point object
	*/
function Point(options) {
	this.data = {x: 0, y: 0, attr: {}};

	if (options.data) {
		if (options.data.x) {
			this.data.x = options.data.x;
		}
		if (options.data.y) {
			this.data.y = options.data.y;
		}

		// copy all other attributes of a link
		var dataCopy = Object.assign({}, options.data);
		delete dataCopy.x;
		delete dataCopy.y;

		var keys = Object.keys(dataCopy);

		for (var k of keys) {
			this.data.attr[k] = dataCopy[k];
		}
	}
}

Point.params = ["x", "y"];



// =============================================================================
/**
	* Position objects containing coordinate (requires lat and lng)
	*
	* @class Position
	* @constructor
	* @param {object} options - data from which to create Position object
	*/
function Position(options) {
	this.data = {lat: 0, lng: 0, attr: {}};

	if (options.data) {
		if (options.data.lat) {
			this.data.lat = options.data.lat;
		}
		if (options.data.lng) {
			this.data.lng = options.data.lng;
		}

		// copy all other attributes of a link
		var dataCopy = Object.assign({}, options.data);
		delete dataCopy.lat;
		delete dataCopy.lng;

		var keys = Object.keys(dataCopy);

		for (var k of keys) {
			this.data.attr[k] = dataCopy[k];
		}
	}
}

Position.params = ["lat", "lng"];


// =============================================================================
/**
	* Node object for a graph (requires id)
	*
	* @class Node
	* @constructor
	* @param {object} options - data from which to create Node object
	*/
function Node(options) {
	this.data = {id: null, attr: {}};

	if (options.data) {
		if (options.data.id) {
			this.data.id = options.data.id;
		}

		// copy all other attributes of a node
		var dataCopy = Object.assign({}, options.data);
		delete dataCopy.id;

		var keys = Object.keys(dataCopy);

		for (var k of keys) {
			this.data.attr[k] = dataCopy[k];
		}
	}
}

Node.params = ["id"];


// =============================================================================
/**
	* Link object for a graph (requires source and target)
	*
	* @class Link
	* @constructor
	* @param {object} options - data from which to create Link object
	*/
function Link(options) {
	this.data = {source: null, target: null, attr: {}};

	if (options.data) {
		if (options.data.source) {
			this.data.source = options.data.source;
		}
		if (options.data.target) {
			this.data.target = options.data.target;
		}

		// copy all other attributes of a link
		var dataCopy = Object.assign({}, options.data);
		delete dataCopy.source;
		delete dataCopy.target;

		var keys = Object.keys(dataCopy);

		for (var k of keys) {
			this.data.attr[k] = dataCopy[k];
		}
	}
}

Link.params = ["source", "target"];


// =============================================================================
/**
	* Basic object (just a data copy)
	*
	* @class Obj
	* @constructor
	* @param {object} options - data from which to create Obj object
	*/
function Obj(options) {
	this.data = options.data || null;
}

Obj.params = [];

module.exports = DataFactory;
