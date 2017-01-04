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
	this.dataType = "Obj";
}

// basic visualization data types
DataFactory.prototype.dataTypes = {
	Num: Num,
	Text: Text,
	Point: Point,
	Position: Position,
	Node: Node,
	Link: Link,
	Obj: Obj
};

DataFactory.prototype.transform = function(options) {
	this.dataType = options.dataType || "Obj";

	return new this.dataTypes[this.dataType](options);
};

// ====== Data Type Class Declarations ======

// Num Class
function Num(options) {
	this.data = options.data || 0;
}

// Text Class
function Text(options) {
	this.data = options.data || "";
}

// Point Class
function Point(options) {
	this.data = {x: 0, y: 0};

	if (options.data) {
		if (options.data.x) {
			this.data.x = options.data.x;
		}
		if (options.data.y) {
			this.data.y = options.data.y;
		}
	}
}

// Position class
function Position(options) {
	this.data = {lat: 0, lng: 0};

	if (options.data) {
		if (options.data.lat) {
			this.data.lat = options.data.lat;
		}
		if (options.data.lng) {
			this.data.lng = options.data.lng;
		}
	}
}

// Node class
function Node(options) {
	this.data = {name: null, value: null};

	if (options.data) {
		if (options.data.name) {
			this.data.name = options.data.name;
		}
		if (options.data.value) {
			this.data.value = options.data.value;
		}
	}
}

// Link Class
function Link(options) {
	this.data = {source: null, target: null, value: null};

	if (options.data) {
		if (options.data.source) {
			this.data.source = options.data.source;
		}
		if (options.data.target) {
			this.data.target = options.data.target;
		}
		if (options.data.value) {
			this.data.value = options.data.value;
		}
	}
}

// Default Object class (data copy)
function Obj(options) {
	this.data = options.data || null;
}

module.exports = DataFactory;
