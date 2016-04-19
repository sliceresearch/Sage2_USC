define(["lib/knockout", "three", "core/handler", "core/inputmgr", "core/scenemgr", "core/event", "lib/transformcontrol", "model/view", "model/sinkcontroller", "util/domutil", "handler/buttonset", "handler/button", "handler/vpareaindicator"], function (ko, THREE, handler, Input, SceneMgr, ev, tCtl, view, sinkController, domutil, hButtonset, hButton, hVpAreaIndicator) {

	/**
	* Enum POINTER_MODE
	*
	* @class POINTER_MODE
	*/
	const POINTER_MODE = {

		INTERACTION: 0,
		NAVIGATION: 1

	};

	/**
	* Binding handler for sinkOverlay template. Uses a sink tile as a data model
	* and controls nearly everything that is visible in a single tile.
	*
	* @class sinkOverlayHandler
	* @param DOMElement element
	* @param function valueAccessor
	* @return sinkOverlayHandler description
	*/
	var sinkOverlayHandler = function (element, valueAccessor) {
		var _sinkOverlayCollider,			// delivers events to .sinkOverlay
			_sinkCtlCollider,				// delivers events to .sinkCtlPanel
			_sinkCtlScrollCollider,			// delivers scroll events to .sinkCtlPanel
			_sinkSceneHierarchyCollider,	// delivers events to .sceneHierarchy (object list)
			_sinkVpCollider,				// delivers events to .sinkViewport
			_objectHierarchyEventReceivers,	// stores references to .sceneHierarchy children nodes
			_objectHierarchyHoverReceivers,	// references to hover events that need to be cleaned up
			_vpGeom,						// store viewport geometry
			_vpNormalizedEventCoords;		// viewport normalized pointer coordinates


		/**
		* Update viewport-normalized pointer coordinates from
		* app global coordinates
		*
		* @private
		* @method _computeVpNormalizedEventCoords
		* @param integer x
		* @param integer y
		*/
		var _computeVpNormalizedEventCoords = function (x, y) {
			_vpNormalizedEventCoords.set(
				((x - _vpGeom.x) / _vpGeom.z) * 2 - 1, ((y - _self.sink.top()) / _self.sink.height()) * -2 + 1
			);
		}


		/**
		* MouseDown event handler. Delivers event to appropriate controllers.
		*
		* @private
		* @method _onPointerDown
		* @param {Object} event
		*/
		var _onPointerDown = function (event) {
			// only left mouse button allowed
			if (event.button !== ev.BUTTON_DATA.LEFT) return;

			if (_self.pointerMode() == POINTER_MODE.NAVIGATION) {
				_self.sink.NavigationController().PointerDown(event);
			} else {
				_self.sink.TransformController().PointerDown(event);
				_self.sink.RayPick();
			}
		}

		/**
		* MouseMove event handler. Updates viewport-normalized pointer
		* coordinates and delivers the event to appropriate controllers.
		*
		* @private
		* @method _onPointerMove
		* @param {Object} event
		*/
		var _onPointerMove = function (event) {
			_computeVpNormalizedEventCoords(event.position.x, event.position.y);

			if (_self.pointerMode() == POINTER_MODE.NAVIGATION) {
				_self.sink.NavigationController().PointerMove(event);
			} else {
				_self.sink.TransformController().PointerMove(event);
			}

			// we want transformation gizmos to highlight regardless of selected pointer mode
			_self.sink.TransformController().PointerHover(event);

			event.SetShouldPropagate(false);
		}

		/**
		* MouseUp event handler.
		*
		* @private
		* @method _onPointerUp
		* @param {Object} event
		*/
		var _onPointerUp = function (event) {
			_self.sink.NavigationController().PointerUp(event);
			_self.sink.TransformController().PointerUp(event);
		}

		/**
		* MouseOut event handler. Delegates processing to _onPointerUp.
		*
		* @private
		* @method _onPointerOut
		*/
		var _onPointerOut = function (event) {
			_onPointerUp(event);
		}

		/**
		* MouseWheel event handler. Delivers the event to nav controller
		* when necessary.
		*
		* @private
		* @method _onPointerScroll
		* @param {Object} event
		*/
		var _onPointerScroll = function (event) {
			if (_self.pointerMode() == POINTER_MODE.NAVIGATION) {
				_self.sink.NavigationController().PointerScroll(event);
			}
		}

		/**
		* KeyDown event handler. Passes any keypress event to nav
		* controller.
		*
		* @private
		* @method _onKeyDown
		* @param {Object} event
		*/
		var _onKeyDown = function (event) {
			switch (event.keyCode) {

			default:
				_self.sink.NavigationController().KeyDown(event);
				break;

			}
		}

		/**
		* KeyUp event handler.
		*
		* @private
		* @method _onKeyUp
		* @param {Object} event
		*/
		var _onKeyUp = function (event) {
			switch (event.keyCode) {

				case ev.KEY_CODES.LCTRL:
				// toggle pointer mode
				_self.pointerMode(
					_self.pointerMode() == POINTER_MODE.INTERACTION ?
					POINTER_MODE.NAVIGATION : POINTER_MODE.INTERACTION
				);
				break;


			default:
				// pass any other key to nav controller
				_self.sink.NavigationController().KeyUp(event);
				break;

			}
		}

		/**
		* MouseWheel event handler. Dedicated specifically to sinkCtlPanel
		* scroll events.
		*
		* @private
		* @method _onCtlPointerScroll
		* @param {Object} event
		*/
		var _onCtlPointerScroll = function (event) {
			var target = event.target;
			target.scrollTop = target.scrollTop + event.wheelDelta / 3;

			event.SetShouldPropagate(false);
		}

		/**
		* Poll viewport geometry, cache the result and return it.
		*
		* @private
		* @method _viewportGeom
		* @return {x,y,z,w} 4-component vector with viewport position and size
		*/
		var _viewportGeom = function () {
			// viewport size is sink size less the control panel size
			var offset = _sinkCtlCollider.element.clientWidth;

			// TODO need to emit fixAspect here if offset changes (control panel is collapsing)

			_vpGeom.x = _self.sink.left() + offset;
			_vpGeom.y = _self.sink.bottom();
			_vpGeom.z = _self.sink.width() - offset;
			_vpGeom.w = _self.sink.height();

			return _vpGeom;
		}

		/**
		* Select nav controller based on argument (FLY/ORBIT). Set
		* as a callback function for nav selection buttonset.
		*
		* @private
		* @method _selectControls
		* @param buttonsetItem bsItem
		*/
		var _selectControls = function (bsItem) {
			_self.sink.NavigationControlsType(bsItem.id);
		}

		/**
		* Select transform space based on argument (world/local). Set
		* as a callback to transform space selection buttonset.
		*
		* @private
		* @method _selectTransformSpace
		* @param buttonsetItem bsItem
		*/
		var _selectTransformSpace = function (bsItem) {
			_self.sink.SetTransformSpace(bsItem.id);
		}

		/**
		* Select transform mode based on argument (translate/rotate/scale).
		* Set as a callback to transform mode selection buttonset.
		*
		* @private
		* @method _selectTransformMode
		* @param buttonsetItem bsItem
		*/
		var _selectTransformMode = function (bsItem) {
			// scaling transformation is carried out only in object's local space
			// perform manual updates in this scenario
			if (bsItem.id === tCtl.Mode.SCALE) {
				// deselect world space and select local space
				_self.transformSpaceSelectionModel.items[0].selected(false);
				_self.transformSpaceSelectionModel.items[1].selected(true);

				// select local space in the transform widget also
				_self.sink.SetTransformSpace(tCtl.Space.LOCAL);
			}

			_self.sink.SetTransformMode(bsItem.id);
		}

		/**
		* Select camera based on argument (PERSPECTIVE/ORTHOGRAPHIC).
		* Set as a callback to camera selection buttonset.
		*
		* @private
		* @method _selectCameraType
		* @param buttonsetItem bsItem
		*/
		var _selectCameraType = function (bsItem) {
			// only orbit controls allowed with orthographic camera
			if (bsItem.id === sinkController.CameraType.ORTHOGRAPHIC) {
				_self.controllerSelectionModel.items[0].selected(false);
				_self.controllerSelectionModel.items[1].selected(true);

				_self.sink.NavigationControlsType(sinkController.ControlsType.ORBIT);
			}

			_self.sink.SetCamera(bsItem.id);
		}

		/**
		* Handles click events on scene hierarchy children. Selects
		* specified object and focuses the camera on it.
		*
		* @private
		* @method _selectFromList
		* @param {Object} event
		* @param THREE.Object3D sceneObject
		*/
		var _selectFromList = function (event, sceneObject) {
			_self.sink.AttachTransformControlTo(sceneObject);
			_goToObject();
		}

		/**
		* Sets up elements corresponding to added sceneObjects to
		* receive events.
		*
		* @private
		* @method _makeObjectListItemCollider
		* @param DOMCollection elements
		*/
		var _makeObjectListItemCollider = function (elements) {
			var element = domutil.FirstDomWithClass("sceneHierarchyListItem", elements);

			// store references since we need to clean them up later
			_objectHierarchyEventReceivers.push(domutil.EventReceivers(_sinkSceneHierarchyCollider, [element], 0));
			_objectHierarchyHoverReceivers.push(domutil.MakeHoverReceivers([element]));
		}

		/**
		* Cleanup DOMElements and event receivers corresponding to a scene
		* object being removed from current hierarchy view.
		*
		* @private
		* @method _cleanupObjectListElement
		* @param DOMElement element
		* @param integer index
		* @param THREE.Object3D item
		*/
		var _cleanupObjectListElement = function (element, index, item) {
			_objectHierarchyEventReceivers.forEach(function(r, idx) {
				if (r.EventReceivers.indexOf(element) > -1) {
					_objectHierarchyEventReceivers.splice(idx, 1);
					r.dispose();
				}
			});

			_objectHierarchyHoverReceivers.forEach(function(r, idx) {
				if (r.HoverReceivers.indexOf(element) > -1) {
					_objectHierarchyHoverReceivers.splice(idx, 1);
					r.dispose();
				}
			});

			element.parentElement.removeChild(element);
		}

		/**
		* Focus camera on currently selected object
		*
		* @private
		* @method _goToObject
		*/
		var _goToObject = function () {
			_self.sink.FocusCameraOnSelectedObject();
		}

		/**
		* Remove currently selected object from the scene hierarchy
		*
		* @private
		* @method _removeSelectedObject
		*/
		var _removeSelectedObject = function () {
			_self.sink.RemoveSelectedObject();
		}

		/**
		* Select parent of currently selected object and focus on it.
		*
		* @private
		* @method _selectParent
		*/
		var _selectParent = function () {
			var obj = _self.sink.SelectedObject();
			if (obj.parent && (obj.parent !== SceneMgr.Primary().scene)) {
				_self.sink.AttachTransformControlTo(obj.parent);
				_goToObject();
			}
		}

		// keeps track of when transform selection should be disabled
		var _transformSpaceSelectionDisabled = ko.pureComputed(function () {
			return _self.sink.TransformMode() == tCtl.Mode.SCALE;
		});

		// keeps track of when nav controllers should be disabled
		var _navigationControlsSelectionDisabled = ko.pureComputed(function () {
			return _self.sink.CurrentCameraType() == sinkController.CameraType.ORTHOGRAPHIC;
		});

		// computes text for viewport area pointer mode indicator
		var _pointerModeText = ko.pureComputed(function () {
			return _self.pointerMode() == POINTER_MODE.INTERACTION ? "Interaction" : "Navigation";
		});


		var _init = function () {

			handler.Decorate(_self);

			var elementSinkOverlay,
				elementCtlPanel,
				elementSceneHierarchy,
				elementSinkViewport;

			// gain references to all DOM nodes of interest
			elementSinkOverlay = element.getElementsByClassName("sinkOverlay")[0];
			elementCtlPanel = elementSinkOverlay.getElementsByClassName("sinkCtlPanel")[0];
			elementSceneHierarchy = elementSinkOverlay.getElementsByClassName("sceneHierarchy")[0];
			elementSinkViewport = elementSinkOverlay.getElementsByClassName("sinkViewport")[0];

			// create and inject pointer colliders to enable event delivery to our DOM nodes
			_sinkOverlayCollider = Input.CreatePointerCollider(null, elementSinkOverlay, 997); // TODO use constant: "max priority"
			_sinkCtlCollider = Input.CreatePointerCollider(_sinkOverlayCollider, elementCtlPanel, 1);
			_sinkCtlScrollCollider = Input.CreatePointerCollider(_sinkOverlayCollider, elementCtlPanel, 0);
			_sinkVpCollider = Input.CreatePointerCollider(_sinkOverlayCollider, elementSinkViewport, 2);
			_sinkSceneHierarchyCollider = Input.CreatePointerCollider(_sinkCtlCollider, elementSceneHierarchy, 0);

			// initialize remaining private props
			_objectHierarchyEventReceivers = [];
			_objectHierarchyHoverReceivers = [];
			_vpGeom = { x: 0, y: 0, z: 0, w: 0 };
			_vpNormalizedEventCoords = new THREE.Vector2();

			// setup our data model
			_self.sink = sinkController.Decorate(valueAccessor().sink, _sinkVpCollider);
			_self.sink.SetRayOriginCallback(function () {
				return _vpNormalizedEventCoords;
			});
			_self.sink.SetViewportGeomCallback(_viewportGeom);
			_self.salt = String(_self.sink.uid);

			console.log("creating overlay for id:", _self.sink.uid);


			// V create models for respective GUI buttons V

			_self.controllerSelectionModel = hButtonset.Descriptor(
				hButtonset.Type.RADIO,
				[
					hButtonset.Item(sinkController.ControlsType.FLY, "Fly"),
					hButtonset.Item(sinkController.ControlsType.ORBIT, "Orbit")
				],
				_sinkCtlCollider,
				_selectControls,
				_navigationControlsSelectionDisabled
			);

			_self.transformSpaceSelectionModel = hButtonset.Descriptor(
				hButtonset.Type.RADIO,
				[
					hButtonset.Item(tCtl.Space.WORLD, "World"),
					hButtonset.Item(tCtl.Space.LOCAL, "Local")
				],
				_sinkCtlCollider,
				_selectTransformSpace,
				_transformSpaceSelectionDisabled
			);

			_self.transformModeSelectionModel = hButtonset.Descriptor(
				hButtonset.Type.RADIO,
				[
					hButtonset.Item(tCtl.Mode.TRANSLATE, "translate"),
					hButtonset.Item(tCtl.Mode.ROTATE, "rotate"),
					hButtonset.Item(tCtl.Mode.SCALE, "scale")
				],
				_sinkCtlCollider,
				_selectTransformMode
			);

			_self.cameraSelectionModel = hButtonset.Descriptor(
				hButtonset.Type.RADIO,
				[
					hButtonset.Item(sinkController.CameraType.PERSPECTIVE, "perspective"),
					hButtonset.Item(sinkController.CameraType.ORTHOGRAPHIC, "orthographic")
				],
				_sinkCtlCollider,
				_selectCameraType,
				null
			);

			_self.goToObjButtonModel = hButton.Descriptor(
				"Focus",
				_sinkCtlCollider,
				_goToObject
			);

			_self.removeObjButtonModel = hButton.Descriptor(
				"Remove",
				_sinkCtlCollider,
				_removeSelectedObject
			);

			_self.selectParentObjModel = hButton.Descriptor(
				"Select Parent",
				_sinkCtlCollider,
				_selectParent,
				ko.pureComputed(function () {
					var obj = _self.sink.SelectedObject();
					return obj && (obj.parent === SceneMgr.Primary().scene);
				})
			);

			_self.pointerModeIndicatorModel = hVpAreaIndicator.Descriptor(
				"Pointer Mode",
				_pointerModeText
			);

			// bind event handlers handling
			domutil.AddEventHandler(_sinkVpCollider.element, "mousedown", _onPointerDown);
			domutil.AddEventHandler(_sinkVpCollider.element, "mousemove", _onPointerMove);
			domutil.AddEventHandler(_sinkVpCollider.element, "mouseup", _onPointerUp);
			domutil.AddEventHandler(_sinkVpCollider.element, "mouseout", _onPointerOut);
			domutil.AddEventHandler(_sinkVpCollider.element, "mousewheel", _onPointerScroll);
			domutil.AddEventHandler(_sinkVpCollider.element, "keydown", _onKeyDown);
			domutil.AddEventHandler(_sinkVpCollider.element, "keyup", _onKeyUp);

			// experimental scrolling
			domutil.AddEventHandler(_sinkCtlCollider.element, "mousewheel", _onCtlPointerScroll);
		}


		// define basic properties
		var _self = {

			sink: null,
			salt: null,

			// computes objects that should be bound to scene hierarchy list
			hierarchyObjects: ko.pureComputed(function () {
				if (_self.sink.SelectedObject() != null) {
					return _self.sink.SelectedObject().children;
				}

				return SceneMgr.Primary().Objects();
			}),

			// computes sanitized string representing selected object name
			selectedObjectName: ko.pureComputed(function () {
				var obj = _self.sink.SelectedObject();
				if (obj != null) {
					return String(obj.name || obj.id);
				}

				return "";
			}),

			// computes scene hierarchy title
			hierarchySectionTitle: ko.pureComputed(function () {
				var obj = _self.sink.SelectedObject();
				if (obj != null) {
					return "Children";
				}

				return "Scene Objects";
			}),

			// determines whether scene hierarchy list should be visible
			hierarchySectionVisible: ko.pureComputed(function () {
				var obj = _self.sink.SelectedObject();
				if (obj != null) {
					return obj.children.length > 0;
				}

				return true;
			}),

			// pointer mode used for property binding
			pointerMode: ko.observable(POINTER_MODE.NAVIGATION),

			// callbacks for scene hierarchy events
			SelectSceneObject: _selectFromList,
			MakeObjectListItemCollider: _makeObjectListItemCollider,
			CleanupObjectListElement: _cleanupObjectListElement,


			// below computed observable will auto update dimensions of sink overlay container
			cssLeft: ko.pureComputed(function () {
				return String(_self.sink.left() + "px");
			}),

			cssTop: ko.pureComputed(function () {
				return String(_self.sink.top() + "px");
			}),

			cssWidth: ko.pureComputed(function () {
				return String(_self.sink.width() + "px");
			}),

			cssHeight: ko.pureComputed(function () {
				return String(_self.sink.height() + "px");
			}),


			/**
			* Implements mandatory IHandler lateInit. Sets button states
			* to their defaults.
			*
			* @method lateInit
			*/
			lateInit: function () {
				_self.controllerSelectionModel.items[1].selected(true);
				_self.transformModeSelectionModel.items[0].selected(true);
				_self.transformSpaceSelectionModel.items[0].selected(true);
				_self.cameraSelectionModel.items[0].selected(true);
				_self.sink.FixAspect();
			},

			/**
			* Implements mandatory IHandler onDispose.
			*
			* @method onDispose
			*/
			onDispose: function () {
				// unbind event handlers
				domutil.RemoveEventHandler(_sinkVpCollider.element, "mousedown", _onPointerDown);
				domutil.RemoveEventHandler(_sinkVpCollider.element, "mousemove", _onPointerMove);
				domutil.RemoveEventHandler(_sinkVpCollider.element, "mouseup", _onPointerUp);
				domutil.RemoveEventHandler(_sinkVpCollider.element, "mouseout", _onPointerOut);
				domutil.RemoveEventHandler(_sinkVpCollider.element, "mousewheel", _onPointerScroll);
				domutil.RemoveEventHandler(_sinkVpCollider.element, "keydown", _onKeyDown);
				domutil.RemoveEventHandler(_sinkVpCollider.element, "keyup", _onKeyUp);
				domutil.RemoveEventHandler(_sinkCtlCollider.element, "mousewheel", _onCtlPointerScroll);

				// cleanup remaining scene hierarchy list event receivers
				_objectHierarchyEventReceivers.forEach(function(r) {
					r.dispose();
				});
				_objectHierarchyHoverReceivers.forEach(function(r) {
					r.dispose();
				});

				// remove pointer colliders from the collider tree
				Input.RemovePointerColliders([
					_sinkSceneHierarchyCollider,
					_sinkVpCollider,
					_sinkCtlScrollCollider,
					_sinkCtlCollider,
					_sinkOverlayCollider
				]);
			}
		}


		_init();

		return _self;
	}

	// register binding handler
	ko.bindingHandlers.sink_overlay = handler.CreateCustomBinding(sinkOverlayHandler, true);

});
