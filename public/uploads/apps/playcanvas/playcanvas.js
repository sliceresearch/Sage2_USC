// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

pc = require('./playcanvas-latest');

module.exports = SAGE2_App.extend( {
	
	init: function(data) {
		this.SAGE2Init("canvas", data);

		this.resizeEvents = "onfinish";
		this.renderer = null;
		this.scene    = null;
		this.camera   = null;
		this.model    = null;

        // Create the graphics device
        var device = new pc.pc.gfx.Device(this.element);

        // Create renderer
        this.renderer = new pc.pc.scene.ForwardRenderer(device);

        // Create Scene
        this.scene = new pc.pc.scene.Scene();

        // Create camera node
        this.camera = new pc.pc.scene.CameraNode();
        this.camera.setClearOptions({
            color: [0.4, 0.45, 0.5]
        });
        this.camera.setLocalPosition(0, 7, 24);

        // Set up a default scene light
        var light = new pc.pc.scene.LightNode();
        light.setType(pc.pc.scene.LIGHTTYPE_POINT);
        light.setAttenuationEnd(100);
        light.setLocalPosition(5, 0, 15);
        light.setEnabled(true);
        this.scene.addLight(light);

        // Create resource and asset loaders
        var loader = new pc.pc.resources.ResourceLoader();
        var assets = new pc.pc.asset.AssetRegistry(loader);

        // Register loaders for models, textures and materials
        loader.registerHandler(pc.pc.resources.MaterialRequest, new pc.pc.resources.MaterialResourceHandler(assets));
        loader.registerHandler(pc.pc.resources.TextureRequest, new pc.pc.resources.TextureResourceHandler(device));
        loader.registerHandler(pc.pc.resources.ModelRequest, new pc.pc.resources.ModelResourceHandler(device, assets));
        loader.registerHandler(pc.pc.resources.JsonRequest, new pc.pc.resources.JsonResourceHandler());

        var self = this;
        assets.loadFromUrl(this.resrcPath + "assets/statue/Statue_1.json", "model").then(function (asset) {
            self.model = asset.resource;
            self.scene.addModel(self.model);
        });
        this.controls.finishedAddingControls();
	},
	
	load: function(state, date) {
	},

	draw: function(date) {
		if (this.model) {
			this.model.getGraph().rotate(0, 90*this.dt, 0);
		}
		this.scene.update();
		this.renderer.render(this.scene, this.camera);
	},
	
	startResize: function(date) {
		
	},
	
	resize: function(date) {
		this.refresh(date);
	},
	
    event: function(eventType, position, user_id, data, date) {
		//this.refresh(date);
	}
});

