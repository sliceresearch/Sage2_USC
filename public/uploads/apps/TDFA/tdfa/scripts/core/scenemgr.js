var TDFA = TDFA || {};
TDFA.SceneMgr = TDFA.SceneMgr || null;

define(["three", "lib/knockout"], function (THREE, ko) {

	/**
	* Wraps THREE.Scene class to provide singleton
	* functionality and object adding/removal
	* notifications.
	*
	* @class SceneManager
	* @return SceneManager instance
	*/
	var SceneManager = function () {
		var _helperGrid;

		var _init = function () {

			// light up the scene a bit
			var directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
			var directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
			directionalLight1.position.set(0, 1000, 0);
			directionalLight2.position.set(0, -1000, 0);
			_self.scene.add(directionalLight1);
			_self.scene.add(directionalLight2);

		}

		// basic properties
		var _self = {

			// wrapped scene object
			scene: new THREE.Scene(),

			// observable for notifications
			Objects: ko.observableArray([]),

			/**
			* Add 3d object to the scene
			*
			* @method Add
			* @param THREE.Object3D object
			*/
			Add: function (object) {
				_self.scene.add(object);
				_self.Objects.push(object);	// sends out a notification
			},

			/**
			* Remove 3d object from the scene
			*
			* @method Remove
			* @param {Object} object
			*/
			Remove: function (object) {
				object.parent.remove(object);
				_self.Objects().splice(_self.Objects().indexOf(object), 1);
				_self.Objects.notifySubscribers(_self.Objects());
			},

			/**
			* Shows or hides helper grid
			*
			* @method ShowHelperGrid
			* @param boolean show
			*/
			ShowHelperGrid: function (show) {
				if (show && _helperGrid == null) {

					_helperGrid = new THREE.GridHelper(100, 10);
					_helperGrid.setColors(new THREE.Color(0xFFC0CB), new THREE.Color(0x8f8f8f));
					_helperGrid.position.set(0, 0, 0);
					_self.scene.add(_helperGrid);

				} else if (!show && _helperGrid != null) {

					_self.scene.remove(_helperGrid);
					_helperGrid = null;

				}
			}

		}


		_init();

		return _self;
	}

	// if no module instance exist
	if (TDFA.SceneMgr == null) {
		var _primary;	// stores reference to primary scene

		TDFA.SceneMgr = {

			Create: SceneManager,

			/**
			* Get primary scene manager
			*
			* @method Primary
			* @return SceneManager instance
			*/
			Primary: function () {
				if (_primary == null) {
					_primary = SceneManager();
				}

				return _primary;
			},

			/**
			* Set new primary scene manager
			*
			* @method SetPrimary
			* @param SceneManager sceneMgr
			*/
			SetPrimary: function (sceneMgr) {
				_primary = sceneMgr;
			}

		};
	}


	return TDFA.SceneMgr;

});
