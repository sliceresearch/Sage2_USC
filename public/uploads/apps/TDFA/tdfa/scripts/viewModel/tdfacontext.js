define(["lib/knockout", "three", "core/scenemgr", "core/event", "core/inputmgr", "core/loader", "model/view", "model/splitter", "handler/splittermgr", "handler/tilesplittrigger", "handler/sinkoverlay"], function (ko, THREE, sceneMgr, event, Input, loader, view, splitter) {

	var Context = function (domTDFAroot, s2App) {
		var _domTdfaWebGlContainer,	// will contain the webgl surface
			_rootViewNode,
			_renderer;

		// app size
		var _width = ko.observable(domTDFAroot.clientWidth);
		var _height = ko.observable(domTDFAroot.clientHeight);

		// computes sinks contained in the hierarchy by
		// performaing breadth-first traversal
		var _sinks = ko.pureComputed(function () {
			var sinkAccum = [];
			var itQueue = [_rootViewNode];
			var node = _rootViewNode;

			while (itQueue.length > 0) {
				if (node != null) {
					if (!node.isSink()) {

						// add child nodes to the queue for inspection
						var children = node.children();
						for (var idx = 0; idx < children.length; ++idx) {
							itQueue.push(children[idx]);
						}

					} else {

						// sink nodes are leafs, add to result set
						sinkAccum.push(node);

					}
				}

				itQueue.shift();
				node = itQueue[0];
			}

			return sinkAccum;
		});

		// computes all view nodes by performing breadth-first
		// traveral over the hierarchy
		var _views = ko.pureComputed(function () {
			var viewAccum = [];
			var itQueue = [_rootViewNode];
			var node = _rootViewNode;

			while (itQueue.length > 0) {
				if (node != null) {
					if (!node.isSink()) {

						// add this node to the result set
						viewAccum.push(node);

						// add children to the queue
						var children = node.children();
						for (var idx = 0; idx < children.length; ++idx) {
							itQueue.push(children[idx]);
						}

					}
				}

				itQueue.shift();
				node = itQueue[0];
			}

			return viewAccum;
		});

		// computes splitter models based on the availability
		// of view nodes
		var _splitters = ko.pureComputed(function () {
			var splitters = [];
			for (var idx = 0; idx < _views().length; ++idx) {

				var tile = _views()[idx];
				children = tile.children();
				for (var i = 0; i < children.length - 1; ++i) {

					// each consecutive pair of tiles needs a splitter
					var prev = children[i];
					var next = children[i + 1];
					splitters.push(splitter.Create(prev, next, tile.orientation));

				}

			}

			return splitters;
		});

		var _init = function () {

			// initial size of the app
			var initialGeom = {
				left: 0,
				top: 0,
				right: _width(),
				bottom: _height()
			};

			_renderer = new THREE.WebGLRenderer();
			_renderer.setSize(_width(), _height());
			_renderer.autoClear = false;
			_renderer.setScissorTest(true);

			// grab a reference to webgl container
			_domTdfaWebGlContainer = domTDFAroot.getElementsByClassName("TdfaWebGlContainer")[0];

			// add renderer surface to dom hierarchy
			_domTdfaWebGlContainer.appendChild(_renderer.domElement);

			// create a root view node
			// the node will be initialized with a sink inside of it - this is the only view node
			// allowed to have a single sink node
			_rootViewNode = view.View(null, initialGeom, null, null, view.Orientation.HORIZONTAL);

			// show helper grid by default
			sceneMgr.Primary().ShowHelperGrid(true);

		};


		// define basic properties
		var _self = {

			sinks: _sinks,			// all sinks in the hierarchy need to be exposed
			splitters: _splitters,	// all splitters need to be exposed as well

			/**
			* Carry out updates and rendering of a single frame
			*
			* @method Render
			* @param Date date
			*/
			Render: function (date) {

				var dtsf = s2App.dt * s2App.maxFPS;
				var sinks = _sinks();

				for (idx = 0; idx < sinks.length; ++idx) {
					var sink = sinks[idx],
						sinkGeom = sink.ViewportGeom();

					// do not render if not visible
					if (sink.width() <= 1 || sink.height() <= 1) continue;

					sink.PreRender();
					sink.Update(dtsf);

					_renderer.setViewport(
						sinkGeom.x,
						_height() - sinkGeom.y,
						sinkGeom.z,
						sinkGeom.w
					);

					_renderer.setScissor(
						sinkGeom.x,
						_height() - sinkGeom.y,
						sinkGeom.z,
						sinkGeom.w
					);

					_renderer.setClearColor(sink.background);
					_renderer.clear();
					_renderer.render(sceneMgr.Primary().scene, sink.Camera());

					sink.PostRender();
				}

			},

			/**
			* Resize. Scales internal elements.
			*
			* @method Resize
			* @param integer width
			* @param integer height
			*/
			Resize: function (width, height) {
				_rootViewNode.ScaleGeom(width / _width(), height / _height());
				_width(width);
				_height(height);
				_renderer.setSize(_width(), _height());
			},

			/**
			* Move. Update offset on global coordinates.
			*
			* @method Move
			* @param integer x
			* @param integer y
			*/
			Move: function (x, y) {
				Input.SetOffset(x, y);
			},

			/**
			* Deliver input events
			*
			* @method OnEvent
			* @param String eventType
			* @param {Object} position
			* @param {Object} user_id
			* @param {Object} data
			* @param Date date
			*/
			OnEvent: function (eventType, position, user_id, data, date) {
				Input.Deliver(event.From(eventType, position, user_id, data));
			},

			/**
			* Instantiates templates and custom bindings to build the UI
			*
			* @method ApplyBindings
			*/
			ApplyBindings: function () {
				ko.applyBindings(_self, domTDFAroot);
			},

			/**
			* Handle file references passed in by the server.
			*
			* @method HandleArgs
			* @param {Object} args
			*/
			HandleArgs: function (args) {
				var onLoaded = function (model) {
					sceneMgr.Primary().Add(model);
				}

				args.forEach(function (arg) {
					loader.Load(arg, onLoaded);
				});
			}

		}


		_init();

		return _self;
	}


	return {

		Create: Context

	};

});
