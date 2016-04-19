define(["lib/knockout", "core/handler", "util/domutil", "util/uid", "util/misc"], function (ko, handler, domutil, uid, misc) {


	/**
	* Enum ButtonsetType
	*
	* @class ButtonsetType
	*/
	var ButtonsetType = {

		RADIO: "radio",
		CHECKBOX: "checkbox"

	}

	/**
	* Data model for an item that will be represented
	* by a button in a Buttonset
	*
	* @method buttonsetItem
	* @param {Object} id
	* @param String label
	* @param {Object} userData
	* @return {Object} buttonsetItem instance
	*/
	var buttonsetItem = function (id, label, userData) {
		return {

			id: id,
			label: label,
			data: userData,
			selected: ko.observable(false)

		};
	}

	/**
	* Data model used for Buttonset binding
	*
	* @class buttonsetDescriptor
	* @param {Object} type
	* @param Array items
	* @param {Object} parentCollider
	* @param function selectCb
	* @param ko.Observable disabledObs
	* @return {Object} buttonsetDescriptor instance
	*/
	var buttonsetDescriptor = function (type, items, parentCollider, selectCb, disabledObs) {
		return {

			type: type,
			items: items,
			parentCollider: parentCollider,
			selectCb: selectCb,
			disabledObs: disabledObs || ko.observable(false)

		};
	}

	/**
	* Binding handler for buttonset template. Supports
	* CHECKBOX and RADIO modes
	*
	* @class buttonsetHandler
	* @param DOMElement element
	* @param function valueAccessor
	* @return {Object} buttonsetHandler instance
	*/
	var buttonsetHandler = function (element, valueAccessor) {

		var _evtRecvRef,
			_parentCollider,
			_changeTriggeredByInteraction,
			_changeTriggeredByDeselect;


		/**
		* Clear all selection
		*
		* @private
		* @method _deselectAll
		*/
		var _deselectAll = function () {
			_changeTriggeredByDeselect = true;

			_self.items.forEach(function (i) {
				i.selected(false)
			});

			_changeTriggeredByDeselect = false;
		}

		/**
		* Retrieve all selected items
		*
		* @private
		* @method _getSelected
		* @return Array Array of selected items
		*/
		var _getSelected = function () {

			return _self.items.filter(function (i) {
				return i.selected();
			});

		}

		/**
		* Set state of button elements in accordance with their models.
		*
		* @private
		* @method _updateUI
		*/
		var _updateUI = function () {
			for (var idx = 0; idx < _self.items.length; ++idx) {
				var item = _self.items[idx];
				var element = _evtRecvRef.EventReceivers[idx];

				// if item is selected, corresponding element should have active class attached and removed otherwise
				item.selected() ? element.classList.add("active") : element.classList.remove("active");
			}
		}

		/**
		* Respond to changes made externally. This function should be
		* automatically called when any of the items selection state
		* changes. It will make necessary updates as if an item's
		* element was clicked
		*
		* @private
		* @method _onSelectionChange
		*/
		var _onSelectionChange = function () {
			// the  condition evaluates to false if selected observables were
			// modified externally (not in the handler nor through mouse interaction)
			if (_changeTriggeredByInteraction || _changeTriggeredByDeselect) return;

			// update
			for (var idx = 0; idx < _self.items.length; ++idx) {
				var item = _self.items[idx];
				var element = _evtRecvRef.EventReceivers[idx];

				// this will somewhat trigger the same behaviour as if items were actually clicked on
				item.selected() ? _self.onSelect(null, item) : element.classList.remove("active");
			}
		}

		// basic properties
		var _self = {

			// CHECKBOX or RADIO
			type: valueAccessor().type,

			// VERTICAL or HORIZONTAL
			orientation: valueAccessor().orientation,

			// array of buttonsetItem (see above) objects
			items: valueAccessor().items,

			salt: uid.Next(),

			// controls if GUI interaction is disabled
			disabled: valueAccessor().disabledObs,


			/**
			* Handle click event on any of the buttons. Updates the
			* UI elements invokes specified callback function with
			* selected items
			*
			* @method onSelect
			* @param {Object} event
			* @param {Object} item
			* @return {Object} single buttonsetItem or array of buttonsetItem objects
			*/
			onSelect: function (event, item) {
				var selected = null;

				if (_self.disabled()) {
					return;
				}

				_changeTriggeredByInteraction = true;

				if (_self.type === ButtonsetType.RADIO) {
					_deselectAll();
					item.selected(true);
					selected = item;
				} else if (_self.type === ButtonsetType.CHECKBOX) {
					// toggle state
					item.selected(!item.selected());
					selected = _getSelected();
				}

				// update
				_updateUI();


				valueAccessor().selectCb(selected);
				_changeTriggeredByInteraction = false;
			},

			/**
			* Implements mandatory IHandler onDispose
			*
			* @method onDispose
			*/
			onDispose: function () {},

			/**
			* Implements mandatory IHandler lateInit. Sets up
			* the elements for receiveing events and subscibes to
			* notifications if any of the items changes
			*
			* @method lateInit
			*/
			lateInit: function () {
				var evtRecvs,
					flatEvtRecvs;

				evtRecvs = element.getElementsByClassName("btn");
				flatEvtRecvs = domutil.MatchedToArray(evtRecvs);
				_evtRecvRef = domutil.EventReceivers(_parentCollider, flatEvtRecvs, 0);

				// set all button elements tp react to hover events
				domutil.MakeHoverReceivers(flatEvtRecvs);

				// create manual subscriptions to each observable so that we can
				// perform proper book keeping when any of the observables changes
				for (var idx = 0; idx < _self.items.length; ++idx) {
					var item = _self.items[idx];
					_self.addDisposable(item.selected.subscribe(_onSelectionChange));
				}

				// for self cleanup
				_self.addDisposable(_evtRecvRef);

				// add special classes that impact the shape of the elements in extrema
				flatEvtRecvs[0].classList.add("first");
				flatEvtRecvs[flatEvtRecvs.length - 1].classList.add("last");
			}

		};


		var init = function () {
			handler.Decorate(_self);

			_parentCollider = valueAccessor().parentCollider;
			_changeTriggeredByInteraction = false;
			_changeTriggeredByDeselect = false;
		}


		init();

		return _self;
	}

	// register the handler
	ko.bindingHandlers.button_set = handler.CreateCustomBinding(buttonsetHandler, true);


	return {

		Item: buttonsetItem,
		Descriptor: buttonsetDescriptor,
		Type: ButtonsetType

	};

});
