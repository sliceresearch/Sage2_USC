define(["lib/knockout", "model/view", "core/disposable", "lib/orbitcontrol", "lib/flycontrol", "lib/transformcontrol", "core/scenemgr"], function (ko, view, disposable, orbitCtl, flyCtl, tCtl, SceneMgr) {

	/**
	* Enum ControlsType
	*
	* @class ControlsType
	*/
	var ControlsType = {

		FLY: "Fly",
		ORBIT: "Orbit"

	};

	/**
	* Enum CameraType
	*
	* @class CameraType
	*/
	var CameraType = {

		PERSPECTIVE: "Perspective",
		ORTHOGRAPHIC: "Orthographic"

	};

	/**
	* Decorates bare tile implementation of Sink adapting it
	* to being a sufficient data model for a viewport
	*
	* @method Decorate
	* @param Sink sink
	* @param {Object} collider
	* @return {Object} SinkController instance
	*/
	var SinkController = function (sink, collider) {
		var _collider;
		var _controller;		// nav controls
		var _controllerType; 	// type of current nav controls
		var _transformCtl;		// transform controls
		var _raycaster;
		var _rayOriginCb;		// will be set externally to provide Viewport normalized coordinates of a pointer
		var _viewportGeomCb;	// will provide dimensions of the viewport
		var _exclusiveVisible;


		var _self = sink;


		/**
		* Check the objects provided for intersection with a ray originating from
		* normalizedCoords. This function does recursive checking on objects.
		*
		* @private
		* @method _intersectObjects
		* @param THREE.Vector2 normalizedCoords
		* @param Array objects
		* @return Array intersections found
		*/
		var _intersectObjects = function (normalizedCoords, objects) {
			_raycaster.setFromCamera(normalizedCoords, _self.Camera());
			return _raycaster.intersectObjects(objects, true);
		}

		/**
		* Check the specified object for intersection with a ray originating from
		* normalizedCoords. Return intersection data
		*
		* @private
		* @method _intersectObject
		* @param THREE.Vector2 normalizedCoords
		* @param {Object} object
		* @return {Object} intersection
		*/
		var _intersectObject = function (normalizedCoords, object) {
			_raycaster.setFromCamera(normalizedCoords, _self.Camera());
			return _raycaster.intersectObject(object);
		}

		/**
		* Fix apect for both persepctive and orthogonal camera types
		*
		* @private
		* @method _fixAspect
		*/
		var _fixAspect = function () {
			var aspect = _self.width() / _self.height();
			var camera = _self.Camera();

			if (_self.CurrentCameraType() == CameraType.PERSPECTIVE) {
				camera.aspect = aspect;
			} else {
				// compute current aspect to use it with new aspect as a scaling factor
				var currentAspect = (camera.right - camera.left) / (camera.top - camera.bottom);
				camera.left *= aspect / currentAspect;
				camera.right *= aspect / currentAspect;
			}

			camera.updateProjectionMatrix();
		}

		// TODO change
		var _setExclusiveVisibility = function (visible) {
			for (var idx = 0; idx < _exclusiveVisible.length; ++idx) {
				_exclusiveVisible[idx].visible = visible;
			}
		}

		/**
		* Sets nvavigation controls to those specified by type
		*
		* @private
		* @method _setNavigationControls
		* @param ControlsType type
		*/
		var _setNavigationControls = function (type) {
			if (type === ControlsType.FLY) {
				_self.SelectFlyControls();
			} else {
				_self.SelectOrbitControls();
			}
		}




		var init = function () {
			// decorate with disposable interface props
			disposable.Decorate(_self);

			_self.NavigationControlsType(ControlsType.FLY);
			_self.SetCamera(CameraType.PERSPECTIVE, false);
			_self.Camera().position.set(0, 2, 5);

			_collider = collider;
			_exclusiveVisible = [];
			_raycaster = new THREE.Raycaster();
			_transformCtl = tCtl.Create(_self.Camera, _collider.element);


			_exclusiveVisible.push(_transformCtl);

			_self.addDisposable(_self.NavigationControlsType.subscribe(_setNavigationControls));
			_self.addDisposable(_self.width.subscribe(_fixAspect));
			_self.addDisposable(_self.height.subscribe(_fixAspect));
		}


		// observables

		_self.Camera = ko.observable(new THREE.PerspectiveCamera());

		_self.NavigationControlsType = ko.observable(null);

		_self.TransformControlAttached = ko.pureComputed(function () {
			return _transformCtl.object() != null;
		});

		_self.SelectedObject = ko.pureComputed(function () {
			return _transformCtl.object();
		});

		_self.TransformMode = ko.pureComputed(function () {
			return _transformCtl.mode();
		});

		_self.CurrentCameraType = ko.pureComputed(function () {
			if (_self.Camera().fov != null) return CameraType.PERSPECTIVE;
			else return CameraType.ORTHOGRAPHIC;
		});




		/**
		* Select first-person style controller in a sanitized manner
		*
		* @method SelectFlyControls
		*/
		_self.SelectFlyControls = function () {
			if (_controller != null) {
				_controller.dispose();
			}

			_controller = flyCtl.Create(_collider.element, _self.Camera);
			_controllerType = ControlsType.FLY;
		}

		/**
		* Select third-person style controller in a sanitized manner
		*
		* @method SelectOrbitControls
		*/
		_self.SelectOrbitControls = function () {
			var position = null;

			if (_controller != null) {
				position = _controller.object().position.clone();
				_controller.dispose();
			}

			_controller = orbitCtl.Create(_collider.element, _self.Camera, position);
			_controllerType = ControlsType.ORBIT;

			if (_self.TransformControlAttached()) {
				_controller.target = _transformCtl.object().position.clone();
			}
		}

		/**
		* Set the callback to be used for polling viewport-normalized
		* pointer coordinates
		*
		* @method SetRayOriginCallback
		* @param function rayOriginCb
		*/
		_self.SetRayOriginCallback = function (rayOriginCb) {
			_rayOriginCb = rayOriginCb;
			_transformCtl.setRayOriginCallback(rayOriginCb);
		}

		/**
		* Set function to used for polling viewport size
		*
		* @method SetViewportGeomCallback
		* @param function viewportGeomCb
		*/
		_self.SetViewportGeomCallback = function (viewportGeomCb) {
			_viewportGeomCb = viewportGeomCb;
		}

		/**
		* Perform ray picking of scene objects
		*
		* @method RayPick
		*/
		_self.RayPick = function () {
			var intersecting;

			if (_self.TransformControlAttached()) {
				// prevent raypicking if we are currently manipulating an object with transform controls
				if (_transformCtl.isDragging()) {
					return;
				} else {
					// just detach the controller form object
					_self.DetachTransformControl();
				}
			}

			intersecting = _intersectObjects(_rayOriginCb(), SceneMgr.Primary().Objects());

			if (intersecting[0] != null) {
				_self.AttachTransformControlTo(intersecting[0].object);
			}
		}

		/**
		* Retrieve current viewport geometry
		*
		* @method ViewportGeom
		* @return {x,y,z,w} 4 component vector representing viewport size
		*/
		_self.ViewportGeom = function () {
			return _viewportGeomCb();
		}

		/**
		* Shows and binds the transform controller to specified object
		*
		* @method AttachTransformControlTo
		* @param THREE.Object3D object
		*/
		_self.AttachTransformControlTo = function (object) {
			_transformCtl.attach(object);
			SceneMgr.Primary().scene.add(_transformCtl);
		}

		/**
		* Hide and unbind transform controller
		*
		* @method DetachTransformControl
		*/
		_self.DetachTransformControl = function () {
			_transformCtl.detach();
			SceneMgr.Primary().scene.remove(_transformCtl);
		}

		/**
		* Set transform mode to specified value ("translate" /
		* "rotate" / "scale")
		*
		* @method SetTransformMode
		* @param {Object} mode
		*/
		_self.SetTransformMode = function (mode) {
			_transformCtl.setMode(mode);
		}

		/**
		* Set transform space to specified value ("world" /
		* "local")
		*
		* @method SetTransformSpace
		* @param {Object} space
		*/
		_self.SetTransformSpace = function (space) {
			_transformCtl.setSpace(space);
		}

		/**
		* Retrieve navigation controller (fly or orbit)
		*
		* @method NavigationController
		* @return {Object} navigation controller
		*/
		_self.NavigationController = function () {
			return _controller;
		}

		/**
		* Retrieve transform controller
		*
		* @method TransformController
		* @return {Object} transform controller
		*/
		_self.TransformController = function () {
			return _transformCtl;
		}

		/**
		* Set camera to the specified type in a sanitized manner
		*
		* @method SetCamera
		* @param CameraType cameraType
		*/
		_self.SetCamera = function (cameraType) {
			var camTransform = _self.Camera().matrixWorld;

			if (cameraType === CameraType.PERSPECTIVE) {
				_self.Camera(new THREE.PerspectiveCamera(_self.fov, _self.width() / _self.height(), 1, 10000));
			} else {
				var aspect = _self.width() / _self.height();
				var size = 10;
				_self.Camera(new THREE.OrthographicCamera(-aspect * size / 2, aspect * size / 2, size / 2, -size / 2, -100, 10000));
			}

			_self.Camera().matrixWorld = camTransform;
		}

		/**
		* Rotates or moves the camera to towards selected object
		* in a sanitized manner
		*
		* @method FocusCameraOnSelectedObject
		*/
		_self.FocusCameraOnSelectedObject = function () {
			var obj = _self.SelectedObject();
			if (obj == null) return;

			var position = new THREE.Vector3(0, 0, 0);
			obj.localToWorld(position);

			if (_controllerType == ControlsType.FLY) {
				_self.Camera().lookAt(position);
			} else {
				_controller.setTarget(position.clone());
			}
		}

		/**
		* Purge selected object from the scene
		*
		* @method RemoveSelectedObject
		*/
		_self.RemoveSelectedObject = function () {
			var obj = _self.SelectedObject();

			_self.DetachTransformControl();
			SceneMgr.Primary().Remove(obj);
		}

		/**
		* Make updates with delta time scaling factor
		*
		* @method Update
		* @param {Object} dt
		*/
		_self.Update = function (dt) {
			// no need to update the navigation controller if we're using
			// the transform controller and vice versa
			if (!_transformCtl.isDragging()) {
				_controller.update(dt);
			} //else {
				_transformCtl.update(dt);
			//}
		}

		/**
		* Make updates before this sink is rendered
		*
		* @method PreRender
		*/
		_self.PreRender = function () {
			_setExclusiveVisibility(true);
		}

		/**
		* Make upodates after this sink is rendered
		*
		* @method PostRender
		*/
		_self.PostRender = function () {
			_setExclusiveVisibility(false);
		}

		// expose fixAspect
		_self.FixAspect = _fixAspect;

		/**
		* Implements mandatory IDisposable onDispose for custom cleanup
		*
		* @method onDispose
		*/
		_self.onDispose = function () {
			_controller.dispose();
		}


		init();

		return _self;
	}


	return {

		Decorate: SinkController,
		ControlsType: ControlsType,
		CameraType: CameraType

	};

});
