define(["lib/loader/AssimpJSONLoader"], function () {

	var _assimpJSON;


	function init() {

		_assimpJSON = new THREE.AssimpJSONLoader(getLoadingManager());

	}


	function extractMediaBase(url) {

		var parts = url.split('/');
		parts.pop(); // pop resource name
		parts.pop(); // pop parent directory (models)
		return (parts.length < 1 ? '.' : parts.join('/')) + '/';

	}


	function onLoadFailed(error) {
		// TODO present to user
		console.error(error);
	}


	function onProgress(event) {}


	function getAssimpLoadedHandler(callback) {
		return function (resource) {

			// append id to the name, which is always "RootNode"
			resource.name += new String("_" + resource.id);
			callback(resource);

		};
	}


	function getLoadingManager() {

		var _onLoad = function () {}

		var _onProgress = function (url, itemsLoaded, itemsTotal) {}

		var _onError = function (url) {
			onLoadFailed("Failed fetching " + url);
		}

		var _self = new THREE.LoadingManager(_onLoad, _onProgress, _onError);

		return _self;
	}


	function Load(uri, cb) {

		var dotIdx = uri.lastIndexOf("."),
			extension = uri.substring(dotIdx + 1),
			loader = null,
			loadedHandler = null;


		switch (extension) {

		case "json": // assimpJSON
			loader = _assimpJSON;
			loader.setTexturePath(extractMediaBase(uri) + "images"); // /path/to/model/../images
			loadedHandler = getAssimpLoadedHandler(cb);
			break;

		default:
			loader = null;

		}

		if (loader !== null) {
			try {

				loader.load(uri, loadedHandler, onProgress, onLoadFailed);

			} catch (error) {
				onLoadFailed(error);
			}
		} else {
			onLoadFailed("No suitable loader found for ." + extension);
		}

	}


	init();

	return {

		Load: Load

	};

});
