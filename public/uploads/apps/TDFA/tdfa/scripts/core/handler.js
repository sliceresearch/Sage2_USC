define(["lib/knockout", "core/disposable", "util/misc"], function (ko, disposable, misc) {


	/**
	* IHandler interface mandates implementation of
	* a lateInit routine in objects. Also decorates
	* with IDisposable
	*
	* @class IHandler
	* @return {Object} decorated object
	*/
	var IHandler = function () {
		var _self = this;

		var _init = function () {
			// decorate with IDisposable
			disposable.Decorate(_self);
		}

		/**
		* To be implemented by decorated objects for initialization
		* that requires access to fully rendered template in custom
		* bindings
		*
		* @property lateInit
		*/
		_self.lateInit = _self.lateInit || misc.implDeferred;

		_init();

		return _self;
	}


	/**
	* Executes necessary steps for creating knockout custom binding.
	*
	* @method CustomBinding
	* @param function fnHandlerFactory
	* @param boolean controlsDescendantBindings
	* @return {Object} custom binding
	*/
	var CustomBinding = function (fnHandlerFactory, controlsDescendantBindings) {
		return {

			init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				// sanitize argument if omitted
				controlsDescendantBindings = controlsDescendantBindings ? true : false;

				var handler = fnHandlerFactory(element, valueAccessor);

				if (controlsDescendantBindings) {
					var childBindingCtx = bindingContext.createChildContext(viewModel);
					ko.utils.extend(childBindingCtx, handler);
					ko.applyBindingsToDescendants(childBindingCtx, element);
				}

				ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
					handler.dispose();
				});

				// some handlers might need this since they might rely on completely rendered template
				handler.lateInit();

				return {

					controlsDescendantBindings: controlsDescendantBindings

				};
			}

		}
	}


	return {

		CreateCustomBinding: CustomBinding,

		Decorate: function (object) {
			IHandler.call(object);
		}

	};

});
