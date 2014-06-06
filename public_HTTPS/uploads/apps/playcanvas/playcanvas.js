// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

var playcanvas = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.resizeEvents = "onfinish";
		this.renderer = null;
		this.scene    = null;
		this.camera   = null;
		this.model    = null;
                this.timer = null;
                this.redraw = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
		
        // Create the graphics device
        var device = new pc.gfx.Device(this.element);

        // Create renderer
        this.renderer = new pc.scene.ForwardRenderer(device);

        // Create Scene
        this.scene = new pc.scene.Scene();

        // Create camera node
        this.camera = new pc.scene.CameraNode();
        this.camera.setClearOptions({
            color: [0.4, 0.45, 0.5]
        });
        this.camera.setLocalPosition(0, 7, 24);

        // Set up a default scene light
        var light = new pc.scene.LightNode();
        light.setType(pc.scene.LIGHTTYPE_POINT);
        light.setAttenuationEnd(100);
        light.setLocalPosition(5, 0, 15);
        light.setEnabled(true);
        this.scene.addLight(light);

        // Create resource and asset loaders
        var loader = new pc.resources.ResourceLoader();
        var assets = new pc.asset.AssetRegistry(loader);

        // Register loaders for models, textures and materials
        loader.registerHandler(pc.resources.MaterialRequest, new pc.resources.MaterialResourceHandler(assets));
        loader.registerHandler(pc.resources.TextureRequest, new pc.resources.TextureResourceHandler(device));
        loader.registerHandler(pc.resources.ModelRequest, new pc.resources.ModelResourceHandler(device, assets));
        loader.registerHandler(pc.resources.JsonRequest, new pc.resources.JsonResourceHandler());

        var self = this;
        assets.loadFromUrl(this.resrcPath + "assets/statue/Statue_1.json", "model").then(function (asset) {
            self.model = asset.resource;
            self.scene.addModel(self.model);
        });

		this.timer = 0.0;
		this.redraw = false;
	},
	
	load: function(state, date) {
	},

	draw: function(date) {
		// only redraw if more than 1 sec has passed
		this.timer = this.timer + this.dt;
		if(this.timer >= 0.033333333) {
			// 30 fps
			this.timer = 0.0;
			this.redraw = true;
		}

		if (this.redraw) {
			if (this.model) {
				this.model.getGraph().rotate(0, 90*this.dt, 0);
			}
			this.scene.update();
			this.renderer.render(this.scene, this.camera);
			this.redraw = false;
		}
	},
	
	resize: function(date) {
		this.redraw = true;
		this.refresh(date);
	},
	
	event: function(eventType, userId, x, y, data, date) {
		//this.refresh(date);
	}
});

