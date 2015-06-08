// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var THREE = require('threejs');

module.exports = SAGE2_App.extend( {
	init: function(data) {
		this.SAGE2Init("div", data);

		this.resizeEvents = "continuous";
		this.element.id   = "div" + data.id;
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
		this.controls.finishedAddingControls();
	},
	
	load: function(date) {
	},

	draw: function(date) {
		var amplitude = 50;
		var period    = 2.0; // in sec
		var centerY   = 0;
		
		this.sphere.position.y = amplitude * Math.sin(this.t * 2*Math.PI / period) + centerY;
		
		this.renderer.render(this.scene, this.camera);
	},

	resize: function(date) {
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.renderer.setSize(this.width, this.height);
		
		this.refresh(date);
	},
	
	event: function(eventType, position, user_id, data, date) {
		//this.refresh(date);
	}

});
