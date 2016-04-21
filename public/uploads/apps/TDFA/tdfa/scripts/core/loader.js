/*jslint nomen: true */
/*jshint strict: false */
/*jslint plusplus: true */

var modules =
	[
		"lib/loader/ColladaLoader",
		"lib/loader/FBXLoader",
		"lib/loader/MTLLoader",
		"lib/loader/OBJLoader",
		"lib/loader/STLLoader"
	];


/*global define, THREE*/
define(modules, function () {
	"use strict";

	var _oldTHREELoadingManager;

	var _dae,
		_fbx,
		_mtl,
		_obj,
		_stl;


	function init() {

		_oldTHREELoadingManager = THREE.DefaultLoadingManager;
		THREE.DefaultLoadingManager = getLoadingManager();	// register our own

		_dae = new THREE.ColladaLoader();
		_fbx = new THREE.FBXLoader();
		_mtl = new THREE.MTLLoader();
		_obj = new THREE.OBJLoader();
		_stl = new THREE.STLLoader();

	}


	function onLoadFailed(arg) {
		debugger;
	}


	function onProgress(arg) {
		debugger;
	}


	function getOnLoadedHandler(callback) {
		return function (resource) {

			var idx,
				objects = resource.scene.children;

			resource.scene.updateMatrix();
			while (objects.length > 0) {
				objects[0].applyMatrix(resource.scene.matrix);
				callback(objects[0]);
			}

		};
	}



	function getLoadingManager() {

		var _onLoad = function(url, itemsLoaded, itemsTotal) {
		}

		var _onProgress = function(url, itemsLoaded, itemsTotal) {
		}

		var _onError = function(url, itemsLoaded, itemsTotal) {
		}

		var _self = new THREE.LoadingManager(_onLoad, _onProgress, _onError);

		return _self;
	}



	function load(uri, cb) {

		var dotIdx = uri.lastIndexOf("."),
			extension = uri.substring(dotIdx + 1),
			loader = null;


		switch (extension) {

		case "dae":
			loader = _dae;
			break;

		case "fbx":
			loader = _fbx;
			break;

		case "mtl":
			loader = _mtl;
			break;

		case "obj":
			loader = _obj;
			break;

		case "stl":
			loader = _stl;
			break;

		default:
			loader = null;

		}

		if (loader !== null) {
			try {

				loader.load(uri, getOnLoadedHandler(cb), onProgress, onLoadFailed);

			} catch (error) {;
				console.error(error);
			}
		}

	}


	init();

	return {

		Load: load

	};

});
