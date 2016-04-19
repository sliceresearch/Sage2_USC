define(["util/misc"], function (misc) {

	/**
	* IDisposable interface mandates implementation of
	* a cleanup routine in objects
	*
	* @class IDisposable
	*/
	var IDisposable = function () {
		var _disposables = [];
		var _self = this;

		/**
		* Should contain custom cleanup procedures. This property
		* needs to exist in objects decorated by the interface.
		*
		* @property onDispose
		*/
		_self.onDispose = _self.onDispose || misc.ImplDeferred;

		/**
		* Add a disposable object to be cleaned up along with
		* this object.
		*
		* @method addDisposable
		* @param {Object} disposable
		*/
		_self.addDisposable = function (disposable) {
			_disposables.push(disposable);
		}

		/**
		* Dispose of tracked disposables. Invokes onDispose for
		* custom cleanup routines.
		*
		* @method dispose
		*/
		_self.dispose = function () {
			_self.onDispose();
			_disposables.forEach(function (d) {
				d.dispose();
			});
		}
	}


	return {

		/**
		* Decorate provided object with the interface
		* properties.
		*
		* @method Decorate
		* @param {Object} object
		*/
		Decorate: function (object) {
			IDisposable.call(object);
		}

	}

});
