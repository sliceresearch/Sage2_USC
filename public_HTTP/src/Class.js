// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

function Class() { }

Class.prototype.construct = function() {};

Class.extend = function(def) {
	var classDef = function() {
		if (arguments[0] !== Class) { this.construct.apply(this, arguments); }
	};
 
	var proto = new this(Class);
	var superClass = this.prototype;
 
	for (var n in def) {
		var item = def[n];                      
		if (item instanceof Function) item.superClass = superClass;
		proto[n] = item;
	}
 
	classDef.prototype = proto;
 
	//Give this new class the same static extend method    
	classDef.extend = this.extend;      
	return classDef;
};
