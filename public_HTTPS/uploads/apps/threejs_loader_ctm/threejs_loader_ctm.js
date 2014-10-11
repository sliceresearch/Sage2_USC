// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014



function addScriptForThreejs( url, callback ) {
	var script = document.createElement( 'script' );
	if( callback ) script.onload = callback;
	script.type = 'text/javascript';
	script.src = url;
	document.body.appendChild( script );  
}


var threejs_loader_ctm = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.width  = null;
		this.height = null;
		this.resizeEvents = "continuous";

		this.renderer = null;
		this.camera   = null;
		this.scene    = null;
		this.controls = null;
		this.ready    = null;

		this.cameraCube = null;
		this.sceneCube  = null;
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);
	
		this.element.id = "div" + id;
		this.frame  = 0;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.ready  = false;

		var _this = this;
		addScriptForThreejs(_this.resrcPath + "scripts/OrbitControls.js", function() {
			addScriptForThreejs(_this.resrcPath + "scripts/ctm/lzma.js", function() {
				addScriptForThreejs(_this.resrcPath + "scripts/ctm/ctm.js", function() {
					addScriptForThreejs(_this.resrcPath + "scripts/ctm/CTMLoader.js", function() {
						_this.initialize(date);
					});
				});
			});
		});
	},

	initialize: function(date) {
		// CAMERA
		this.camera = new THREE.PerspectiveCamera( 25, this.width / this.width, 1, 10000 );
		this.camera.position.set( 185, 40, 170 );

		this.controls = new THREE.OrbitControls( this.camera, this.element );
		this.controls.maxPolarAngle = Math.PI / 2;
		this.controls.minDistance = 200;
		this.controls.maxDistance = 500;
		this.controls.autoRotate  = true;
		this.controls.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// SCENE
		this.scene = new THREE.Scene();

		// SKYBOX
		this.sceneCube  = new THREE.Scene();
		this.cameraCube = new THREE.PerspectiveCamera( 25, this.width / this.width, 1, 10000 );
		this.sceneCube.add( this.cameraCube );

		var r    = this.resrcPath + "textures/";
		var urls = [ r + "px.png", r + "nx.png", r + "py.png", r + "ny.png", r + "pz.png", r + "nz.png" ];
		var textureCube = THREE.ImageUtils.loadTextureCube( urls );

		var shader = THREE.ShaderLib[ "cube" ];
		shader.uniforms[ "tCube" ].value = textureCube;

		var material = new THREE.ShaderMaterial( {
			fragmentShader: shader.fragmentShader,
			vertexShader:   shader.vertexShader,
			uniforms:       shader.uniforms,
			depthWrite:     false,
			side:           THREE.BackSide
		} );

		var mesh = new THREE.Mesh( new THREE.BoxGeometry( 100, 100, 100 ), material );
		this.sceneCube.add( mesh );

		// LIGHTS

		var light = new THREE.PointLight( 0xffffff, 1 );
		light.position.set( 2, 5, 1 );
		light.position.multiplyScalar( 30 );
		this.scene.add( light );

		var light = new THREE.PointLight( 0xffffff, 0.75 );
		light.position.set( -12, 4.6, 2.4 );
		light.position.multiplyScalar( 30 );
		this.scene.add( light );

		this.scene.add( new THREE.AmbientLight( 0x050505 ) );

		// RENDERER
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setSize(this.width, this.height);
		this.renderer.autoClear = false;

		this.element.appendChild(this.renderer.domElement);
		
		this.renderer.gammaInput  = true;
		this.renderer.gammaOutput = true;

		// LOADER
		var start = Date.now();

		loaderCTM = new THREE.CTMLoader( true );
		//document.body.appendChild( loaderCTM.statusDomElement );

		var position = new THREE.Vector3( -105, -78, -40 );
		var scale    = new THREE.Vector3( 30, 30, 30 );

		var _this = this;
		loaderCTM.loadParts( _this.resrcPath + "camaro/camaro.js", function( geometries, materials ) {
			// hackMaterials
			for ( var i = 0; i < materials.length; i ++ ) {
				var m = materials[ i ];
				if ( m.name.indexOf( "Body" ) !== -1 ) {
					var mm = new THREE.MeshPhongMaterial( { map: m.map } );
					mm.envMap  = textureCube;
					mm.combine = THREE.MixOperation;
					mm.reflectivity = 0.75;
					materials[ i ] = mm;
				} else if ( m.name.indexOf( "mirror" ) !== -1 ) {
					var mm = new THREE.MeshPhongMaterial( { map: m.map } );
					mm.envMap  = textureCube;
					mm.combine = THREE.MultiplyOperation;
					materials[ i ] = mm;
				} else if ( m.name.indexOf( "glass" ) !== -1 ) {
					var mm = new THREE.MeshPhongMaterial( { map: m.map } );
					mm.envMap = textureCube;
					mm.color.copy( m.color );
					mm.combine = THREE.MixOperation;
					mm.reflectivity = 0.25;
					mm.opacity = m.opacity;
					mm.transparent = true;
					materials[ i ] = mm;
				} else if ( m.name.indexOf( "Material.001" ) !== -1 ) {
					var mm = new THREE.MeshPhongMaterial( { map: m.map } );
					mm.shininess = 30;
					mm.color.setHex( 0x404040 );
					mm.metal = true;
					materials[ i ] = mm;
				}
				materials[ i ].side = THREE.DoubleSide;
			}

			for ( var i = 0; i < geometries.length; i ++ ) {
				var mesh = new THREE.Mesh( geometries[ i ], materials[ i ] );
				mesh.position.copy( position );
				mesh.scale.copy( scale );
				_this.scene.add( mesh );
			}

			// loaderCTM.statusDomElement.style.display = "none";

			var end = Date.now();
			console.log( "load time:", end - start, "ms" );

		}, { useWorker: true } );
		
		this.ready = true;

		// draw!
		this.resize(date);
	},
	
	load: function(state, date) {
	},

	draw: function(date) {
		if (this.ready) {
			this.controls.update();
			this.cameraCube.rotation.copy( this.camera.rotation );

			this.renderer.clear();
			this.renderer.render( this.sceneCube, this.cameraCube );
			this.renderer.render( this.scene, this.camera );
		}
	},

	resize: function(date) {
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.renderer.setSize(this.width, this.height);
		
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();

		this.cameraCube.aspect = this.width / this.height;
		this.cameraCube.updateProjectionMatrix();

		this.refresh(date);
	},
	
	event: function(eventType, position, user_id, data, date) {
		if (this.ready) {
			if (eventType === "specialKey") {
				if (data.code === 37 && data.state === "down") { // left
					this.controls.pan(100, 0);
					this.controls.update();
				}
				else if (data.code === 38 && data.state === "down") { // up
					this.controls.pan(0, 100);
					this.controls.update();
				}
				else if (data.code === 39 && data.state === "down") { // right
					this.controls.pan(-100, 0);
					this.controls.update();
				}
				else if (data.code === 40 && data.state === "down") { // down
					this.controls.pan(0, -100);
					this.controls.update();
				}
				
				this.refresh(date);
			}
		}
	}

});
