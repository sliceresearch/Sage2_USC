define(["lib/knockout", "core/handler", "util/domutil"], function (ko, handler, domutil) {

	/**
	* Used as a data model for Button binding
	*
	* @class buttonDescriptor
	* @param String label
	* @param {Object} parentCollider
	* @param function clickCb
	* @param ko.Observable disabledObs
	* @return {Object} description
	*/
	var buttonDescriptor = function (label, parentCollider, clickCb, disabledObs) {
		return {

			label: label,
			parentCollider: parentCollider,
			clickCb: clickCb,
			disabledObs: disabledObs || ko.observable(false)

		};
	}

	/**
	* Binding handler for Button templates
	*
	* @class buttonHandler
	* @param DOMElement element
	* @param function valueAccessor
	* @return {Object} buttonHandler isntance
	*/
	var buttonHandler = function (element, valueAccessor) {

		var _evtRecvRef,
			_parentCollider;

		/**
		* Based on the  value of the argument, manipulate button
		* DOMElement list of classes
		*
		* @private
		* @method _onDisabledChanged
		* @param boolean disabled
		*/
		var _onDisabledChanged = function (disabled) {
			var element = _evtRecvRef.EventReceivers[0];

			if (disabled) {
				element.classList.add("disabled");
			} else {
				element.classList.remove("disabled");
			}
		}

		// define basic properties
		var _self = {

			// observable specifying whether the button should be disabled or not
			disabled: valueAccessor().disabledObs,

			// envoked when the button receives click event
			onClick: function () {
				valueAccessor().clickCb();
			},

			/**
			* Implements mandatory IHandler onDispose
			*
			* @method onDispose
			*/
			onDispose: function () {},

			/**
			* Implements mandatory IHandler lateInit. Sets up
			* the button DomElement for receiveing events
			*
			* @method lateInit
			*/
			lateInit: function () {
				var evtRecvs,
					flatEvrRecvs;

				evtRecvs = element.getElementsByClassName("btn");

				// convert DOMCollection to flat array
				flatEvrRecvs = domutil.MatchedToArray(evtRecvs);
				// make event receiver
				_evtRecvRef = domutil.EventReceivers(_parentCollider, flatEvrRecvs, 0);
				// also setup the element for hover events
				domutil.MakeHoverReceivers(flatEvrRecvs);

				// synchronize the looks with current state
				_onDisabledChanged(_self.disabled());

				// add disposables for auto cleanup
				_self.addDisposable(_evtRecvRef);
				_self.addDisposable(_self.disabled.subscribe(_onDisabledChanged));
			}

		}


		var _init = function () {
			// decorate with IHandler interface properties
			handler.Decorate(_self);

			// mouse collider node under which we will inject the button
			_parentCollider = valueAccessor().parentCollider;
			_evtRecvRef = null;
		}


		_init();

		return _self;
	}

	// register the handler
	ko.bindingHandlers.button = handler.CreateCustomBinding(buttonHandler, true);


	return {

		Descriptor: buttonDescriptor

	};

});
