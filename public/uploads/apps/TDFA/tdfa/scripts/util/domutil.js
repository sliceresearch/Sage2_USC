define(["lib/knockout", "core/disposable", "core/inputmgr"], function (ko, disposable, Input) {

	/**
	* Attach mouseenter, mouseleave and mousemove to specified
	* element and create a disposable reference to it so that
	* it is easy to clean up thee event handlers.
	*
	* @private
	* @method _makeHoverReceiver
	* @param DOMElement element
	* @return {Object} disposable reference
	*/
	function _makeHoverReceiver(element) {

		var _onMouseEnter = function (event) {
			element.classList.add("hover");
			event.SetShouldPropagate(false);
		}

		var _onMouseLeave = function (event) {
			element.classList.remove("hover");
			event.SetShouldPropagate(false);
		}

		var _onMouseMove = function (event) {
			event.SetShouldPropagate(false);
		}

		var _init = function () {
			disposable.Decorate(_self);
			AddEventHandler(element, "mouseenter", _onMouseEnter);
			AddEventHandler(element, "mouseleave", _onMouseLeave);
			AddEventHandler(element, "mousemove", _onMouseMove);
		}

		var _self = {
			onDispose: function () {
				RemoveEventHandler(element, "mouseenter", _onMouseEnter);
				RemoveEventHandler(element, "mouseleave", _onMouseLeave);
				RemoveEventHandler(element, "mousemove", _onMouseMove);
			}
		}

		_init();

		return _self;
	}

	/**
	* Creates an object that should be attached to one of element's "on~"
	* properties. It allows to easily add and remove event handlers.
	*
	* @private
	* @method _makeEventDelegate
	* @param {Object} userData
	* @return {Object} event delegate
	*/
	function _makeEventDelegate(userData) {
		var handlers = [];

		var fnDelegate = function (event) {
			for (var idx = 0; idx < handlers.length; ++idx) {
				handlers[idx](event, userData);
			}
		}

		fnDelegate.add = function (fnHandler) {
			if (handlers.indexOf(fnHandler) == -1) {
				handlers.push(fnHandler);
			}
		}

		fnDelegate.remove = function (fnHandler) {
			var idx = handlers.indexOf(fnHandler);
			if (idx > -1) {
				handlers.splice(idx, 1);
			}
		}

		fnDelegate.count = function () {
			return handlers.length;
		}

		return fnDelegate;
	}

	/**
	* Converts DOMCollection object to an array of DOMElement
	* objects
	*
	* @method MatchedToArray
	* @param DOMCollection matched
	* @return Array array of DOMElement objects
	*/
	function MatchedToArray(domCollection) {
		if (domCollection == null && domCollection.length == 0) return null;

		var arr = [];
		for (var idx = 0; idx < domCollection.length; ++idx) {
			arr.push(domCollection[idx]);
		}

		return arr;
	}

	/**
	* Creates a collider node for each DOMElement in elements under
	* parentCollider with specified prority. Eases up the cleanup
	* process by implementing IDisposable.
	*
	* @method EventReceivers
	* @param {Object} parentCollider
	* @param Array elements
	* @param integer priority
	* @return {Object} disposable reference to event receivers
	*/
	function EventReceivers(parentCollider, elements, priority) {
		var _colliders;

		var _init = function () {
			disposable.Decorate(_self);
			_colliders = Input.CreatePointerColliders(parentCollider, elements, priority);
		}

		var _self = {
			EventReceivers: elements,

			onDispose: function () {
				Input.RemovePointerColliders(_colliders);
			}
		}


		_init();

		return _self;
	}

	/**
	* Sets up each DOMElement in elements to react to hover events.
	* Creates and returns a disposable reference to ease the
	* cleanup process.
	*
	* @method MakeHoverReceivers
	* @param Array elements
	* @return {Object} disposable reference
	*/
	function MakeHoverReceivers(elements) {
		var _init = function () {
			disposable.Decorate(_self);
			for (var idx = 0; idx < elements.length; ++idx) {
				_self.addDisposable(_makeHoverReceiver(elements[idx]));
			}
		}

		var _self = {
			HoverReceivers: elements,
			onDispose: function () {}
		}

		_init();

		return _self;
	}

	/**
	* Find and return first element in domElementArray that has
	* className class attached to it.
	*
	* @method FirstDomWithClass
	* @param String className
	* @param Array domElementArray
	* @return DOMElement element with specified class or null
	*/
	function FirstDomWithClass(className, domElementArray) {
		return ko.utils.arrayFirst(domElementArray, function (domElement) {
			if (domElement.classList) return domElement.classList.contains(className);
			return false;
		});
	}

	/**
	* Find and return all elements in domElementArray that have
	* className class attached.
	*
	* @method AllDomWithClass
	* @param String className
	* @param Array domElementArray
	* @return Array array of elements with specified class attached
	*/
	function AllDomWithClass(className, domElementArray) {
		return domElementArray.filter(function (domElement) {
			if (domElement.classList) return domElement.classList.contains(className);
			return false;
		});
	}

	/**
	* Add specified event handler for event specified by eventType
	* to domElement. UserData can be provided the first time any
	* handler is bound to a specific eventType so that the data can
	* be passed to each handler.
	*
	* @method AddEventHandler
	* @param domElement domElement
	* @param String eventType
	* @param function fnHandler
	* @param {Object} userData
	*/
	function AddEventHandler(domElement, eventType, fnHandler, userData) {
		var eventDelegate;

		eventType = "on" + eventType;

		if (!domElement[eventType]) {
			domElement[eventType] = _makeEventDelegate(userData);
		}

		eventDelegate = domElement[eventType];
		eventDelegate.add(fnHandler);
	}

	/**
	* Remove specified function from event handlers for specified
	* eventType in domElement.
	*
	* @method RemoveEventHandler
	* @param DOMElement domElement
	* @param String eventType
	* @param function fnHandler
	*/
	function RemoveEventHandler(domElement, eventType, fnHandler) {
		var eventDelegate;

		eventType = "on" + eventType;

		if (domElement[eventType]) {
			domElement[eventType].remove(fnHandler);
			if (domElement[eventType].count() == 0) {
				domElement[eventType] = null;
			}
		}
	}


	return {

		MatchedToArray: MatchedToArray,
		FirstDomWithClass: FirstDomWithClass,
		AllDomWithClass: AllDomWithClass,
		EventReceivers: EventReceivers,
		MakeHoverReceivers: MakeHoverReceivers,
		AddEventHandler: AddEventHandler,
		RemoveEventHandler: RemoveEventHandler

	};

});
