define(["lib/knockout", "core/handler", "core/inputmgr", "model/view", "util/domutil"], function (ko, handler, Input, view, domutil) {

	/**
	* Binding handler managing splitter elements that are used to resize Tiles
	*
	* @class splitterManagerHandler
	* @param DOMElement element
	* @param function valueAccessor
	* @return {Object} splitterManagerHandler instance
	*/
	var splitterManagerHandler = function (element, valueAccessor) {
		var _cachedColliders;

		/**
		* Handle dragging performed on splitter element. Resizes
		* Tiles and adjusts positions of other splitter elements
		*
		* @private
		* @method _onDrag
		* @param {Object} event
		*/
		var _onDrag = function (event) {

			// target is the splitter node on which dragging is performed
			var target = event.target;

			// index to the global array of splitters
			var idx = parseInt(target.getAttribute("data-idx"));
			if (idx != null) {
				var splitter = _self.splitters()[idx];
				var prev = splitter.prev;	// previous Sink (left or top)
				var next = splitter.next;	// next Sink (right or bottom)

				if (splitter.IsHorizontal()) {

					var x = event.position.x;

					// retrieve neighbouring sinks
					var leftMostOfNext = next.LeftMost();
					var rightMostOfPrev = prev.RightMost();

					// stop responding to dragging if either of neighbouring Sinks reaches it's minimal size
					if (rightMostOfPrev.left() + 20 >= x || leftMostOfNext.right() - 20 <= x) return;

					// adjust geometries and position
					target.style.left = String(x + "px");
					splitter.prev.right(x);
					splitter.next.left(x + 1);

				} else {

					var y = event.position.y;

					// retrieve neighbouring sinks
					var topMostOfNext = next.TopMost();
					var bottomMostOfPrev = prev.BottomMost();

					// stop responding to dragging if either of neighbouring Sinks reaches it's minimal size
					if (bottomMostOfPrev.top() + 20 >= y || topMostOfNext.bottom() - 20 <= y) return;

					// adjust geometries and position
					target.style.top = String(y + "px");
					splitter.prev.bottom(y);
					splitter.next.top(y + 1);

				}
			}

			// let nothing else process this event
			event.SetShouldPropagate(false);
		}

		/**
		* Stop the received event to be propagated further
		*
		* @private
		* @method _stopEventPropagation
		* @param {Object} event
		*/
		var _stopEventPropagation = function (event) {
			event.SetShouldPropagate(false);
		}

		/**
		* Cleanup event handlers of existing splitter elements
		* @private
		* @method _releaseEventHandlers
		*/
		var _releaseEventHandlers = function () {
			_cachedColliders.forEach(function (c) {

				domutil.RemoveEventHandler(c.element, "drag", _onDrag);
				domutil.RemoveEventHandler(c.element, "mousedown", _stopEventPropagation);
				domutil.RemoveEventHandler(c.element, "mouseup", _stopEventPropagation);

			});
		}

		// define basic properties of the handlers
		var _self = {
			// make splitter models accessible for binding
			splitters: valueAccessor().splitters,

			// each splitter element will use these to refresh its size and position
			left: function (splitter) {
				return String(splitter.prev.left() + "px");
			},

			top: function (splitter) {
				return String(splitter.prev.top() + "px");
			},

			width: function (splitter) {
				return String(splitter.prev.width() + "px");
			},

			height: function (splitter) {
				return String(splitter.prev.height() + "px");
			},

			leftHorizontal: function (splitter) {
				return String(splitter.prev.right() + "px");
			},

			topVertical: function (splitter) {
				return String(splitter.prev.bottom() + "px");
			}
		}


		var _init = function () {
			// decorate with properties of binding handler interface
			handler.Decorate(_self);

			_cachedColliders = [];

			// throttle notifications
			_self.splitters.extend({
				rateLimit: {
					method: "notifyWhenChangesStop",
					timeout: 500
				}
			});
		}


		/**
		* Initialize newly created splitter elements. Called by KO
		* runtime each time a new splitter element node gets inserted.
		* If the number nodes matches the number of splitter models,
		* all the nodes are processed at once.
		*
		* @method AfterSplitterRender
		*/
		_self.AfterSplitterRender = function () {
			var elementCollection = element.getElementsByClassName("splitter");

			// if not all dom nodes added yet, return
			if (elementCollection.length != _self.splitters().length) return;

			// convert collection to flat array
			var elements = domutil.MatchedToArray(elementCollection);

			// release previous data
			_releaseEventHandlers();
			Input.RemovePointerColliders(_cachedColliders);

			// attach event handlers to each splitter node
			elements.forEach(function (element) {

				domutil.AddEventHandler(element, "drag", _onDrag);
				domutil.AddEventHandler(element, "mousedown", _stopEventPropagation);
				domutil.AddEventHandler(element, "mouseup", _stopEventPropagation);

			});

			console.log("splits:", _self.splitters().length, "nodes:", elements.length);

			// initialize each element's properties according to splitter model
			for (var idx = 0; idx < elements.length; ++idx) {
				var splitter = _self.splitters()[idx];
				var splitterNode = elements[idx];

				if (splitter.IsHorizontal()) {

					splitterNode.style.height = String(splitter.prev.height() + "px");
					splitterNode.style.left = String(splitter.next.left() + "px");
					splitterNode.style.top = String(splitter.next.top() + "px");

				} else if (splitter.IsVertical()) {

					splitterNode.style.width = String(splitter.prev.width() + "px");
					splitterNode.style.left = String(splitter.next.left() + "px");
					splitterNode.style.top = String(splitter.next.top() + "px");

				}
			}

			// update collider registry
			_cachedColliders = Input.CreatePointerColliders(null, elements, 998);

			// make sure the nodes receive hover events
			// TODO check if need to unbind evernt handler
			domutil.MakeHoverReceivers(elements);
		}

		/**
		* Implements madatory IHandler onDispose to perform cleanup
		*
		* @method onDispose
		*/
		_self.onDispose = function () {
			_releaseEventHandlers();
			Input.RemovePointerColliders(_cachedColliders);
		};

		/**
		* Implements mandatory IHandler lateInit
		*
		* @method lateInit
		*/
		_self.lateInit = function () {
			// triggers dependency checking (notably AfterSplitterRender method above)
			_self.splitters.notifySubscribers(_self.splitters());
		};


		_init();

		return _self;
	}

	// create custom binding for splitter manager
	ko.bindingHandlers.splitter_manager = handler.CreateCustomBinding(splitterManagerHandler, true);

});
