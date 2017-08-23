// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

//
// original SAGE implementation: Luc Renambot
// contributed by Garry Keltie
//     garry.keltie@gmail.com
//


"use strict";

/* global THREE */


/**
 * WebGL 3D application, inherits from SAGE2_WebGLApp
 *
 * @class car_threejs
 */
var car_threejs = SAGE2_WebGLApp.extend({

	init: function(data) {
		// Create a canvas into the DOM
		this.WebGLAppInit('canvas', data);

		// Set the background to black
		this.element.style.backgroundColor = 'black';

		this.renderer = null;
		this.camera   = null;
		this.scene    = null;
		this.ready    = null;

		this.cameraCube = null;
		this.sceneCube  = null;
		this.dragging   = null;
		this.rotating   = null;

		this.element.id = "div" + data.id;
		this.frame  = 0;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;
		this.dragging = false;
		this.ready    = false;
		this.rotating = false;

		// build the app
		this.initialize(data.date);

		this.controls.addButton({type: "prev", position: 1, identifier: "Left"});
		this.controls.addButton({type: "next", position: 7, identifier: "Right"});
		this.controls.addButton({type: "up-arrow", position: 4, identifier: "Up"});
		this.controls.addButton({type: "down-arrow", position: 10, identifier: "Down"});
		this.controls.addButton({type: "zoom-in", position: 12, identifier: "ZoomIn"});
		this.controls.addButton({type: "zoom-out", position: 11, identifier: "ZoomOut"});
		this.controls.addButton({type: "loop", position: 2, identifier: "Loop"});
		this.controls.finishedAddingControls();

		this.resizeCanvas();
		this.refresh(data.date);
	},

	initialize: function(date) {
		console.log("initialize ctm");
		// CAMERA
		this.camera = new THREE.PerspectiveCamera(25, this.width / this.height, 1, 10000);
		this.camera.position.set(185, 40, 170);

		this.orbitControls = new THREE.OrbitControls(this.camera, this.element);
		this.orbitControls.maxPolarAngle = Math.PI / 2;
		this.orbitControls.minDistance = 200;
		this.orbitControls.maxDistance = 500;
		this.orbitControls.autoRotate  = true;
		this.orbitControls.zoomSpeed   = 0.1;
		this.orbitControls.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// SCENE
		this.scene = new THREE.Scene();

		// SKYBOX
		this.sceneCube  = new THREE.Scene();
		this.cameraCube = new THREE.PerspectiveCamera(25, this.width / this.height, 1, 10000);
		this.sceneCube.add(this.cameraCube);


		// Texture cube
		var cubeLoader = new THREE.CubeTextureLoader();
		var r    = this.resrcPath + "textures/";
		var urls = [r + "px.jpg", r + "nx.jpg", r + "py.jpg", r + "ny.jpg", r + "pz.jpg", r + "nz.jpg"];
		var textureCube = cubeLoader.load(urls);

		var shader = THREE.ShaderLib.cube;
		shader.uniforms.tCube.value = textureCube;

		var material = new THREE.ShaderMaterial({
			fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: shader.uniforms,
			depthWrite: false,
			side: THREE.BackSide
		});

		var mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), material);
		this.sceneCube.add(mesh);

		// LIGHTS
		var light = new THREE.PointLight(0xffffff, 1);
		light.position.set(2, 5, 1);
		light.position.multiplyScalar(30);
		this.scene.add(light);

		var light2 = new THREE.PointLight(0xffffff, 0.75);
		light2.position.set(-12, 4.6, 2.4);
		light2.position.multiplyScalar(30);
		this.scene.add(light2);

		this.scene.add(new THREE.AmbientLight(0x050505));

		// RENDERER
		if (this.renderer == null) {
			this.renderer = new THREE.WebGLRenderer({
				canvas: this.canvas,
				antialias: true
			});
			this.renderer.setSize(this.width, this.height);
			this.renderer.autoClear = false;

			this.renderer.gammaInput  = true;
			this.renderer.gammaOutput = true;
		}
		// Loader
		var start = Date.now();
		var loaderCTM = new THREE.CTMLoader();

		var position = new THREE.Vector3(-105, -78, -40);
		var scale    = new THREE.Vector3(30, 30, 30);

		var _this = this;
		var m, mm, i;
		loaderCTM.loadParts(_this.resrcPath + "camaro/camaro.js", function(geometries, materials) {
			// hackMaterials
			for (i = 0; i < materials.length; i++) {
				m = materials[i];
				if (m.name.indexOf("Body") !== -1) {
					mm = new THREE.MeshPhongMaterial({ map: m.map });
					mm.envMap  = textureCube;
					mm.combine = THREE.MixOperation;
					mm.reflectivity = 0.75;
					materials[i] = mm;
				} else if (m.name.indexOf("mirror") !== -1) {
					mm = new THREE.MeshPhongMaterial({ map: m.map });
					mm.envMap  = textureCube;
					mm.combine = THREE.MultiplyOperation;
					materials[i] = mm;
				} else if (m.name.indexOf("glass") !== -1) {
					mm = new THREE.MeshPhongMaterial({ map: m.map });
					mm.envMap = textureCube;
					mm.color.copy(m.color);
					mm.combine = THREE.MixOperation;
					mm.reflectivity = 0.25;
					mm.opacity = m.opacity;
					mm.transparent = true;
					materials[i] = mm;
				} else if (m.name.indexOf("Material.001") !== -1) {
					mm = new THREE.MeshPhongMaterial({ map: m.map });
					mm.shininess = 30;
					mm.color.setHex(0x404040);
					mm.metal = true;
					materials[i] = mm;
				}
				materials[i].side = THREE.DoubleSide;
			}

			for (i = 0; i < geometries.length; i++) {
				var amesh = new THREE.Mesh(geometries[i], materials[i]);
				amesh.position.copy(position);
				amesh.scale.copy(scale);
				_this.scene.add(amesh);
			}

			var end = Date.now();
			console.log("load time:", end - start, "ms");

		}, { useWorker: true });

		this.ready = true;

		// draw!
		this.resize(date);
	},

	load: function(date) {
		// nothing
	},

	draw: function(date) {
		if (this.ready) {
			this.orbitControls.update();
			this.cameraCube.rotation.copy(this.camera.rotation);

			this.renderer.clear();
			this.renderer.render(this.sceneCube, this.cameraCube);
			this.renderer.render(this.scene, this.camera);
		}
	},

	// Local Threejs specific resize calls.
	resizeApp: function(resizeData) {
		if (this.renderer != null && this.camera != null) {
			this.renderer.setSize(this.canvas.width, this.canvas.height);

			this.camera.setViewOffset(this.sage2_width, this.sage2_height,
				resizeData.leftViewOffset, resizeData.topViewOffset,
				resizeData.localWidth, resizeData.localHeight);
			this.cameraCube.setViewOffset(this.sage2_width, this.sage2_height,
				resizeData.leftViewOffset, resizeData.topViewOffset,
				resizeData.localWidth, resizeData.localHeight);
		}
	},

	event: function(eventType, position, user_id, data, date) {
		if (this.ready) {
			if (eventType === "pointerPress" && (data.button === "left")) {
				this.dragging = true;
				this.orbitControls.mouseDown(position.x, position.y, 0);
			} else if (eventType === "pointerMove" && this.dragging) {
				this.orbitControls.mouseMove(position.x, position.y);
				this.refresh(date);
			} else if (eventType === "pointerRelease" && (data.button === "left")) {
				this.dragging = false;
			}

			if (eventType === "pointerScroll") {
				this.orbitControls.scale(data.wheelDelta);
				this.refresh(date);
			}

			if (eventType === "keyboard") {
				if (data.character === " ") {
					this.rotating = !this.rotating;
					this.orbitControls.autoRotate = this.rotating;
					this.refresh(date);
				}
			}

			if (eventType === "specialKey") {
				if (data.code === 37 && data.state === "down") { // left
					this.orbitControls.pan(this.orbitControls.keyPanSpeed, 0);
					this.orbitControls.update();
					this.refresh(date);
				} else if (data.code === 38 && data.state === "down") { // up
					this.orbitControls.pan(0, this.orbitControls.keyPanSpeed);
					this.orbitControls.update();
					this.refresh(date);
				} else if (data.code === 39 && data.state === "down") { // right
					this.orbitControls.pan(-this.orbitControls.keyPanSpeed, 0);
					this.orbitControls.update();
					this.refresh(date);
				} else if (data.code === 40 && data.state === "down") { // down
					this.orbitControls.pan(0, -this.orbitControls.keyPanSpeed);
					this.orbitControls.update();
					this.refresh(date);
				}
			} else if (eventType === "widgetEvent") {
				switch (data.identifier) {
					case "Up":
						// up
						this.orbitControls.pan(0, this.orbitControls.keyPanSpeed);
						this.orbitControls.update();
						break;
					case "Down":
						// down
						this.orbitControls.pan(0, -this.orbitControls.keyPanSpeed);
						this.orbitControls.update();
						break;
					case "Left":
						// left
						this.orbitControls.pan(this.orbitControls.keyPanSpeed, 0);
						this.orbitControls.update();
						break;
					case "Right":
						// right
						this.orbitControls.pan(-this.orbitControls.keyPanSpeed, 0);
						this.orbitControls.update();
						break;
					case "ZoomIn":
						this.orbitControls.scale(4);
						break;
					case "ZoomOut":
						this.orbitControls.scale(-4);
						break;
					case "Loop":
						this.rotating = !this.rotating;
						this.orbitControls.autoRotate = this.rotating;
						break;
					default:
						console.log("No handler for:", data.identifier);
						return;
				}
				this.refresh(date);
			}
		}
	}

});
