// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file


var three_sample = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.timer  = null;
		this.redraw = null;
		this.frame  = null;
		this.width  = null;
		this.height = null;
		this.resizeEvents = "onfinish"; // "continuous";

		this.renderer = null;
		this.camera   = null;
		this.scene    = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);
	
		this.element.id = "div" + id;
		this.frame  = 0;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		
		this.renderer = new THREE.WebGLRenderer();
		this.camera   = new THREE.PerspectiveCamera(45.0, this.width/this.height, 0.1, 10000.0);
		this.scene    = new THREE.Scene();
		
		this.camera.position.z = 300;
		this.renderer.setSize(this.width, this.height);
		
		this.element.appendChild(this.renderer.domElement);
		
		var sphereMaterial = new THREE.MeshLambertMaterial({color: 0xCC0000});

		// set up the sphere variables
		var radius = 50;
		var segments = 16;
		var rings = 16;

		// create a new mesh with sphere geometry -
		// we will cover the sphereMaterial next!
		this.sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, rings), sphereMaterial);

		// add the sphere to the scene
		this.scene.add(this.sphere);

		// and the camera
		this.scene.add(this.camera);

		// create a point light
		this.pointLight = new THREE.PointLight( 0xFFFFFF );

		// set its position
		this.pointLight.position.x = 10;
		this.pointLight.position.y = 50;
		this.pointLight.position.z = 130;

		// add to the scene
		this.scene.add(this.pointLight);

		// draw!
		this.renderer.render(this.scene, this.camera);

		this.timer  = 0.0;
		this.redraw = true;
	},
	
	load: function(state, date) {
	},

	draw: function(date) {
		this.timer = this.timer + this.dt;
		if(this.timer >= 0.033333333) {
			this.timer  = 0.0;
			this.redraw = true;
		}
		
		if(this.redraw) {		
			var amplitude = 50;
			var period    = 2.0; // in sec
			var centerY   = 0;
			
			this.sphere.position.y = amplitude * Math.sin(this.t * 2*Math.PI / period) + centerY;
			
			this.renderer.render(this.scene, this.camera);
			
			this.frame++;
			this.redraw = false;
		}
	},

	resize: function(date) {
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.minDim = Math.min(this.width, this.height);
		this.redraw = true;

		this.renderer.setSize(this.width, this.height);
		
		this.refresh(date);
	},
	
	event: function(eventType, userId, x, y, data, date) {
		//this.refresh(date);
	}

});
