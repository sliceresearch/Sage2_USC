define(["lib/knockout", "core/handler"], function (ko, handler, $util) {

	/**
	* To be used as a data model for binding Viewport Area Indicators
	*
	* @class vpAreaIndicatorDescriptor
	* @param String fixedText
	* @param ko.Observable variableTextObservable
	* @return {Object} descriptor instance
	*/
	var vpAreaIndicatorDescriptor = function (fixedText, variableTextObservable) {
		return {

			fixedText: fixedText,
			variableTextObservable: variableTextObservable

		};
	}


	/**
	* Binding handler for Viewport Area Indicator
	*
	* @class vpaiHandler
	* @param DOMElement element
	* @param function valueAccessor
	* @return {Object} vpaiHandler instance
	*/
	var vpaiHandler = function (element, valueAccessor) {

		// define basic properties
		var _self = {

			// string representing fixed text protion of the insicator
			fixedText: valueAccessor().descriptor.fixedText,

			// observable wrapping a string for variable text portion
			variableTextObservable: valueAccessor().descriptor.variableTextObservable,


			/**
			* Implements mandatory IHandler onDispose
			*
			* @method onDispose
			*/
			onDispose: function () {},

			/**
			* Implements mandatory IHandler lateInit. Sets up
			* a subscription to variableTextObservable to
			* manipulate a DOMElement corresponding to variable
			* text portion
			*
			* @method lateInit
			*/
			lateInit: function () {
				var variableElement = element.getElementsByClassName("variable")[0];
				_self.addDisposable(_self.variableTextObservable.subscribe(function () {

					variableElement.classList.add("flashing");
					setTimeout(function () {
						variableElement.classList.remove("flashing");
					}, 250);

				}));
			}

		}

		var init = function () {
			// decorate with handler interface properties
			handler.Decorate(_self);
			element.classList.add(
				valueAccessor().orientation == "vertical" ? "vertical" : "horizontal"
			);
		}


		init();

		return _self;
	}

	// register the handler
	ko.bindingHandlers.vp_area_indicator = handler.CreateCustomBinding(vpaiHandler, true);


	return {

		Descriptor: vpAreaIndicatorDescriptor

	};
});
