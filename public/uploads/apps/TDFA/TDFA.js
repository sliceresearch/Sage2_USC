//
// SAGE2 application: TDFA
// by: sharkgoesmad <sharkgoesmad@gmail.com>
//
// Copyright (c) 2016
//

var TDFA = SAGE2_App.extend({

	pendingfiles: [],

	construct: function () {

		arguments.callee.superClass.construct.call(this);

	},


	init: function (data) {
		var self = this;

		self.SAGE2Init("div", data);
		self.resizeEvents = "continuous";
		self.moveEvents = "continuous";
		self.maxFPS = 30;

		self.element.id = "div" + data.id;

		// before the application is completely initialized, we may start receiving files
		// handle all files here until then
		self.receive = function (file) {
			this.pendingfiles.push(file);
		}


		var requirejsConfig = {

			baseUrl: data.resrc + "/tdfa/scripts",

			paths: { // set aliases for common paths

				text: "lib/text",
				"lib/knockout": "lib/knockout.min",
				tdfa: "../",
				pages: "../templates/pages",
				widgets: "../templates/widgets",
				css: "../css"

			},

			shim: { // specify dependencies for non-AMD scripts
				// currently nothing
			}

		};

		var dependencies = [

			"core/componentloader",
			"handler/custombindings",
			"viewModel/tdfacontext",
			// main page
			"text!pages/tdfa.html",
			"text!widgets/tiledisplay.html",
			"text!widgets/tilesplittrigger.html",
			"text!widgets/sinkoverlay.html",
			"text!widgets/vpareaindicator.html",
			"text!widgets/components.html",
			"text!css/master.css",

		];

		// context trampoline
		requirejs(requirejsConfig, dependencies, function (cl, cb, ctx, index, cmpTileDisplay, cmpTileSplitter, cmpSinkOverlay, cmpVpAreaIndicator, cmpButtonset, mcss) {
			var dom3DFAroot = cl.LoadHTML(self.element, index)[0];
			cl.LoadHTML(self.element, cmpTileDisplay);
			cl.LoadHTML(self.element, cmpTileSplitter);
			cl.LoadHTML(self.element, cmpSinkOverlay);
			cl.LoadHTML(self.element, cmpVpAreaIndicator);
			cl.LoadHTML(self.element, cmpButtonset);
			cl.LoadCSS(dom3DFAroot, mcss);


			self.context = ctx.Create(dom3DFAroot, self);

			// register with the hooks
			self.draw = self.context.Render;
			self.receive = function (file) {
				self.context.HandleArgs([file]);
			};
			self.resize = function (date) {
				self.context.Resize(self.sage2_width, self.sage2_height);
			};
			self.move = function (date) {
				self.context.Move(self.sage2_x - ui.offsetX, self.sage2_y - ui.offsetY);
			};
			self.event = self.context.OnEvent;
			self.quit = self.context.Quit;

			// apply initial offsets
			self.move(self.prevDate);

			// build UI
			self.context.ApplyBindings();

			// handle file loading if a path is provided
			if (self.state.file) {
				self.context.HandleArgs([self.state.file]);
				self.state.file = null;
			}

			// handle references that were delivered while the context was bootstrapping
			if (self.pendingfiles.length > 0) {
				self.context.HandleArgs(self.pendingfiles);
				self.pendingfiles = [];
			}
		});

	},


	load: function (state, date) {},
	draw: function (date) {},
	resize: function (date) {},
	receive: function (file) {},
	event: function (eventType, position, user_id, data, date) {},
	move: function (date) {},
	quit: function () {}

});
