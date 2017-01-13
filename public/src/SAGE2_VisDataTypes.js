var VisDataTypes = {};

(function() {
	// transfer object into the correct form with attributes property
	VisDataTypes.parse = function(object) {

		var xobj = {attr: {}, dataType: object.dataType};
		var attributes = Object.assign({}, object.data);

		for (var prop of VisDataTypes.types[object.dataType].params) {
			xobj[prop] = attributes[prop];
			delete attributes[prop];
		}

		for (var key of Object.keys(attributes)) {
			xobj.attr[key] = attributes[key];
		}

		return xobj;
	};

	// VisDataTypes.types = {
	//   ID: ID,
	//   Num: Num,
	//   Text: Text,
	//   Point: Point,
	//   Position: Position,
	//   Node: Node,
	//   Link: Link,
	//   Obj: Obj
	// };

	VisDataTypes.types = {
		ID: {
			params: []
		},
		Num: {
			params: []
		},
		Text: {
			params: []
		},
		Point: {
			params: ["x", "y", "z"]
		},
		Position: {
			params: ["lat", "lng"]
		},
		Node: {
			params: ["id"]
		},
		Link: {
			params: ["source", "target"]
		},
		Obj: {
			params: []
		}
	};

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
}());
