// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

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
