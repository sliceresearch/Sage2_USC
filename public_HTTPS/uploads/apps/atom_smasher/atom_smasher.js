// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014
//
// Atom Smasher app written by Todd Margolis


var atom_smasher = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.width  = null;
		this.height = null;
		this.resizeEvents = "onfinish"; // "continuous";

		this.renderer = null;
		this.camera   = null;
		this.scene    = null;

		this.particleSystem 	= null;
		this.particles 	= null;
		this.geometry 	= null;
		this.positions 	= null;
		this.vector 	= null;
		this.accel 		= null;
		this.colors 	= null;
		this.color 		= null;
		this.material 	= null;

		this.lines 		  	= [];
		this.lineGeometries = [];
		this.lineMaterials 	= [];
		this.MAXFRAMES	  	= 300;
		this.FADEOUT	  	= 200;
		this.frameCtr		= 0;

		this.time = null;

	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);
	
		this.element.id = "div" + id;
		this.frame  = 0;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		console.log("width: " + this.width + " height: " + this.height);
		
		this.renderer 	= new THREE.WebGLRenderer( { antialias: true} );

		// PerspectiveCamera(vertical fov, aspect ratio, near, far )
		this.camera = new THREE.PerspectiveCamera(45.0, this.width/this.height, 0.1, 10000 );

		this.scene    = new THREE.Scene();
		
		// add some fog
		this.scene.fog = new THREE.Fog( 0x050505, 3000, 3500 );

		this.camera.position.x = 0; 	// for display size: 4230
//		this.camera.position.x = 1700;	// for display size: 15360

		this.camera.position.z = 1500;
		this.renderer.setSize(this.width, this.height);
		
		this.element.appendChild(this.renderer.domElement);

		// Make geometry

		this.particles = 25;

		this.geometry = new THREE.BufferGeometry();

		this.positions = new Float32Array( this.particles * 3 );
		this.vector = new Float32Array( this.particles * 3 );
		this.accel  = new Float32Array( this.particles * 3 );

		var n = 500, n2 = n / 2; // particles spread in the cube

		var origin = new Float32Array(3);
		origin[0] = Math.random() * n - n2;
		origin[1] = Math.random() * n - n2;
		origin[2] = Math.random() * n - n2;

		// Setup colors
		this.colors = new Float32Array( this.particles * 3 );
		this.color = new THREE.Color();

		for ( var i = 0; i < this.positions.length; i += 3 ) {

			// positions
			var x = origin[0];
			var y = origin[1];
			var z = origin[2];

			this.positions[ i ]     = x;
			this.positions[ i + 1 ] = y;
			this.positions[ i + 2 ] = z;

			// vectors
			var vx = Math.random() * 150.0 - 75.0;
			var vy = Math.random() * 150.0 - 75.0;
			var vz = Math.random() * 150.0 - 75.0;

			this.vector[ i ]     = vx;
			this.vector[ i + 1 ] = vy;
			this.vector[ i + 2 ] = vz;

			// acceleration
			var ax = Math.random() * 50.0 - 25.0;
			var ay = Math.random() * 50.0 - 25.0;
			var az = Math.random() * 50.0 - 25.0;

			this.accel[ i ]     = ax;
			this.accel[ i + 1 ] = ay;
			this.accel[ i + 2 ] = az;

			// colors
			var cx = Math.random();
			var cy = Math.random();
			var cz = Math.random();

			this.color.setRGB( cx, cy, cz );

			this.colors[ i ]     = this.color.r;
			this.colors[ i + 1 ] = this.color.g;
			this.colors[ i + 2 ] = this.color.b;

		}

		this.geometry.addAttribute( 'position', new THREE.BufferAttribute( this.positions, 3 ) );
		this.geometry.addAttribute( 'color', new THREE.BufferAttribute( this.colors, 3 ) );

		this.geometry.computeBoundingSphere();

		var texture = THREE.ImageUtils.loadTexture( this.resrcPath + "textures/disc.png" );

		// Create Material
		this.material = new THREE.PointCloudMaterial( { 
			size: 15, 
			vertexColors: THREE.VertexColors,
			transparent: true,
			depthWrite: false,
			map: texture
		} );

		// Create Particle System and add it to the scene
		this.particleSystem = new THREE.PointCloud( this.geometry, this.material );
		this.particleSystem.sortParticles = true;
		this.scene.add( this.particleSystem );

		// Create Lines
		for (p=0; p<this.particles; p++){
			this.lineGeometries[p] = new THREE.Geometry();
			for (i=0; i<this.MAXFRAMES; i++){
				this.lineGeometries[p].vertices.push(
					new THREE.Vector3( origin[0], origin[1], origin[2] )
				);
			}

			this.lineMaterials[p] = new THREE.LineBasicMaterial({
				color: 0x00ff00,
				linewidth: 1.0,
				transparent: true,
				opacity: 1.0
			});

			this.lines[p] = new THREE.Line( this.lineGeometries[p], this.lineMaterials[p] );
			this.scene.add( this.lines[p] );
		}
/*
// Circle for testing aspect ratio problems
var CircleMaterial = new THREE.MeshBasicMaterial({
	color: 0x0000ff
});

var radius = 150;
var segments = 32;

var circleGeometry = new THREE.CircleGeometry( radius, segments );				
var circle = new THREE.Mesh( circleGeometry, CircleMaterial );
this.scene.add( circle );
*/
		//

		this.renderer.setClearColor( this.scene.fog.color, 1 );

		// add the camera
		this.scene.add(this.camera);

		// create a point light
		this.pointLight = new THREE.PointLight( 0xFFFFFF );

		// set its position
		this.pointLight.position.x = 10;
		this.pointLight.position.y = 50;
		this.pointLight.position.z = 130;

		// add light to the scene
		this.scene.add(this.pointLight);

		// draw!
		this.renderer.render(this.scene, this.camera);

		// init clock
		this.time = 0.0;
	}, 

	reInit: function() {
		// Make geometry
		this.particles = 25;

		var n = 500, n2 = n / 2; // particles spread in the cube

		var origin = new Float32Array(3);
		origin[0] = Math.random() * n - n2;
		origin[1] = Math.random() * n - n2;
		origin[2] = Math.random() * n - n2;

		for ( var i = 0; i < this.positions.length; i += 3 ) {

			// positions
			var x = origin[0];
			var y = origin[1];
			var z = origin[2];

			this.positions[ i ]     = x;
			this.positions[ i + 1 ] = y;
			this.positions[ i + 2 ] = z;

			// vectors
			var vx = Math.random() * 150.0 - 75.0;
			var vy = Math.random() * 150.0 - 75.0;
			var vz = Math.random() * 150.0 - 75.0;

			this.vector[ i ]     = vx;
			this.vector[ i + 1 ] = vy;
			this.vector[ i + 2 ] = vz;

			// acceleration
			var ax = Math.random() * 50.0 - 25.0;
			var ay = Math.random() * 50.0 - 25.0;
			var az = Math.random() * 50.0 - 25.0;

			this.accel[ i ]     = ax;
			this.accel[ i + 1 ] = ay;
			this.accel[ i + 2 ] = az;

			// colors
			var cx = Math.random();
			var cy = Math.random();
			var cz = Math.random();

			this.color.setRGB( cx, cy, cz );

			this.colors[ i ]     = this.color.r;
			this.colors[ i + 1 ] = this.color.g;
			this.colors[ i + 2 ] = this.color.b;

		}

		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.color.needsUpdate = true;
		this.geometry.computeBoundingSphere();

		// Create Lines
		for (p=0; p<this.particles; p++){
			this.lineGeometries[p].vertices = [];
			for (i=0; i<this.MAXFRAMES; i++){
				this.lineGeometries[p].vertices.push(
					new THREE.Vector3( origin[0], origin[1], origin[2] )
				);
			}
			this.lineGeometries[p].verticesNeedUpdate = true;
			this.lineGeometries[p].computeBoundingSphere();

			// reset colors
			this.lineMaterials[p].opacity = 1.;
		}

		// init clock
		this.frameCtr = 0;
	},
	
	load: function(state, date) {
	},

	draw: function(date) {

		this.tDiff = this.t - this.time;
		this.time  = this.t;

		// Rotate the entire particle system
		this.particleSystem.rotation.y = this.t * 0.1;

		for ( var i = 0; i < this.positions.length; i += 3 ) {

			// Calculate velocity
			this.vector[ i ] 	 += this.accel[ i ] * this.tDiff;
			this.vector[ i + 1 ] += this.accel[ i + 1 ] * this.tDiff;
			this.vector[ i + 2 ] += this.accel[ i + 2 ] * this.tDiff;

			// Calculate position
			this.positions[ i ]     += this.vector[ i ]  * this.tDiff;
			this.positions[ i + 1 ] += this.vector[ i + 1 ] * this.tDiff;
			this.positions[ i + 2 ] += this.vector[ i + 2 ] * this.tDiff;

			// Update lines
			this.lineGeometries[i/3].vertices.push(this.lineGeometries[i/3].vertices.shift()); //shift the array
		    var p = new THREE.Vector3( this.positions[ i ], this.positions[ i+1 ], this.positions[ i+2 ] )
		    this.lineGeometries[i/3].vertices[this.MAXFRAMES-1] = p; //add the point to the end of the array
		    this.lineGeometries[i/3].verticesNeedUpdate = true;

			this.lines[i/3].rotation.y = this.t * 0.1;
		}

		if(this.frameCtr == this.MAXFRAMES + this.FADEOUT){
			//console.log("RESET: " + this.lineGeometries[0].vertices.length);

			this.reInit();
		}else if(this.frameCtr > this.MAXFRAMES){
			//console.log("FADEOUT: " + this.lineGeometries[0].vertices.length);

			// fade colors
			for ( var i = 0; i < this.positions.length; i += 3 ) {
				this.colors[ i ]     -= 1/this.FADEOUT;
				this.colors[ i + 1 ] -= 1/this.FADEOUT;
				this.colors[ i + 2 ] -= 1/this.FADEOUT;

				this.lineMaterials[i/3].opacity -= 1/this.FADEOUT;
			}
			this.geometry.attributes.color.needsUpdate = true;
		}

		this.frameCtr++;

		// Dirty the buffer so it forces a geometry update
		this.geometry.attributes.position.needsUpdate = true;

		this.renderer.render(this.scene, this.camera);
	},

	resize: function(date) {
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.renderer.setSize(this.width, this.height);
		
		this.refresh(date);
	},
	
	event: function(eventType, userId, x, y, data, date) {
		//this.refresh(date);
	}

});
