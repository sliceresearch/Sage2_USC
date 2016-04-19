define(["lib/knockout", "core/handler", "core/inputmgr", "core/event", "model/view", "util/domutil"], function (ko, handler, Input, ev, view, domutil) {

	/**
	* Binding handler controlling creation and destruction of new Sinks
	*
	* @class tileSplitTriggerHandler
	* @param DomElement element
	* @param function valueAccessor
	* @return {Object} tileSplitTriggerHandler instance
	*/
	var tileSplitTriggerHandler = function (element, valueAccessor) {
		const TRIGGER_DRAG_DISTANCE = 60;

		var _initialPointerPos,
			_collider;


		/**
		* Initiates split or merge operations on Sink
		* @private
		* @method _onDrag
		* @param {Object} event
		*/
		var _onDrag = function (event) {
			if (_initialPointerPos == null) return;

			// distance dragged from mousedown
			var dy = event.position.y - _initialPointerPos.y;
			var dx = event.position.x - _initialPointerPos.x;

			if (dx < -TRIGGER_DRAG_DISTANCE || dy > TRIGGER_DRAG_DISTANCE) {
				// dragged 60 units left or down - perform split in this case

				_initialPointerPos = null;

				// check if dragged horizontally or vertically
				var mx = Math.abs(dx);
				var orientation = mx > dy ? view.Orientation.HORIZONTAL : view.Orientation.VERTICAL;

				// do not hog in here
				setTimeout(function () {
					_self.Split(orientation);
				}, 1);

				Input.Deliver(ev.PointerUp(event.position, event.user, event));

			} else if (dx > TRIGGER_DRAG_DISTANCE || dy < -TRIGGER_DRAG_DISTANCE) {
				// dragged 60 units right or up - perform merge

				_initialPointerPos = null;

				// check if dragged horizontally or vertically
				var my = Math.abs(dy);
				var orientation = dx > my ? view.Orientation.HORIZONTAL : view.Orientation.VERTICAL;

				// do not hog in here
				setTimeout(function () {
					_self.Merge(orientation);
				}, 1);

				Input.Deliver(ev.PointerUp(event.position, event.user, event));
			}

			event.SetShouldPropagate(false);
		}

		/**
		* Save position of pointerPress event so that it can be used
		* in determining the distance when dragging
		*
		* @private
		* @method _onPointerPress
		* @param {Object} event
		*/
		var _onPointerPress = function (event) {
			_initialPointerPos = event.position;
			event.SetShouldPropagate(false);
		}


		var _self = {
			sink: valueAccessor().sink,

			/**
			* Initiate sink split in direction specified by orientation
			*
			* @method Split
			* @param {Object} orientation
			*/
			Split: function (orientation) {
				_self.sink.Split(orientation);
			},


			/**
			* Initiate sink merge in direction specified by orientation
			*
			* @method Merge
			* @param {Object} orientation
			*/
			Merge: function (orientation) {
				_self.sink.Merge(orientation);
			}
		}


		var _init = function () {
			// decorate with handler interface properties
			handler.Decorate(_self);

			var elementBtn = element.getElementsByClassName("tileSplitTriggerBtn")[0];
			_collider = Input.CreatePointerCollider(null, elementBtn, 999);

			domutil.AddEventHandler(elementBtn, "mousedown", _onPointerPress);
			domutil.AddEventHandler(elementBtn, "drag", _onDrag);
		}


		/**
		* Implements madatory IHandler lateInit
		*
		* @method onDispose
		*/
		_self.lateInit = function () {}

		/**
		* Implements madatory IHandler onDispose to perform cleanup
		*
		* @method onDispose
		*/
		_self.onDispose = function () {
			domutil.RemoveEventHandler(_collider.element, "mousedown", _onPointerPress);
			domutil.RemoveEventHandler(_collider.element, "drag", _onDrag);
			Input.RemovePointerCollider(_collider);
		}


		_init();

		return _self;
	}

	// register the handler
	ko.bindingHandlers.tile_split_trigger = handler.CreateCustomBinding(tileSplitTriggerHandler, true);

});
