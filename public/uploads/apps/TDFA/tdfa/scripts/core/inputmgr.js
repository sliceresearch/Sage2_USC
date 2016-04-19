var TDFA = TDFA || {};
TDFA.InputMgr = TDFA.InputMgr || null;

define(["lib/knockout", "core/event", "util/misc"], function (ko, ev, misc) {

	/**
	* Represents a node in a pointer collider tree use for
	* event propagation
	*
	* @class PointerCollider
	* @param PointerCollider parent
	* @param DOMElement element
	* @return PointerCollider instance
	*/
	var PointerCollider = function (parent, element) {
		return {

			element: element,
			parent: parent,
			children: null

		};
	}


	/**
	* Represents a state and history of user pointer actions.
	* Used for implementing more complex event types
	*
	* @class UserPointerState
	* @return UserPointerState instance
	*/
	var UserPointerState = function () {
		return {

			clickTarget: null,
			focusTarget: null,
			dragTarget: null,
			hoverTarget: null,
			cached: null

		};
	}


	/**
	* Provides facilities for input event propagation
	*
	* @class InputMgr
	* @return InputMgr instance
	*/
	var InputMgr = function () {
		const MAX_PRIORITY = 1000;
		var _clientOffsetX = 0;
		var _clientOffsetY = 0;
		var _pointerStateMap = {};
		var _eventRecvTriggerNodes = PointerCollider(null, null);


		/**
		* Check if the element is a target if (x, y) are event coordinates
		*
		* @private
		* @method _isTarget
		* @param DOMElement element
		* @param integer x
		* @param integer y
		* @return boolean true if x and y are contained within element
		*/
		var _isTarget = function (element, x, y) {
			var box = element.getBoundingClientRect(),
				left = box.left - _clientOffsetX,	// normalize to diplay client's coords
				top = box.top - _clientOffsetY;		// normalize to diplay client's coords

			if (left <= x && top <= y) {
				var w = element.clientWidth + left;
				var h = element.clientHeight + top;
				return x <= w && y <= h;
			}

			return false;
		};

		/**
		* Get user pointer state object. If doesn't exist, create one.
		*
		* @private
		* @method _getUserPointerState
		* @param {Object} user
		* @return UserPointerState user pointer state identified by user id
		*/
		var _getUserPointerState = function (user) {
			var pointerState = _pointerStateMap[user.id];

			// create new no entry exists
			if (pointerState == null) {
				pointerState = UserPointerState();
				_pointerStateMap[user.id] = pointerState;
			}

			return pointerState;
		}

		/**
		* Invokes an event handler for target. Based on user pointer state,
		* simulates more complex events.
		*
		* @private
		* @method _process
		* @param DOMElement target
		* @param {Object} event
		*/
		var _process = function (target, event) {
			var pos = event.position,
				pointerState = _getUserPointerState(event.user);

			// before the event is delegated, it should be able to identify its target
			event.target = target;

			switch (event.type) {

			case ev.EVENT_TYPES.POINTER_MOVE:
				// mousemove
				if (target.onmousemove) target.onmousemove(event);

				if (pointerState.hoverTarget != null) {
					if (pointerState.hoverTarget !== target) {
						// hover target has changed, deliver mouseleave to old hover target
						event.target = pointerState.hoverTarget;
						if (pointerState.hoverTarget.onmouseleave) pointerState.hoverTarget.onmouseleave(event);
					}
				}

				// if hover target has changed, deliver mouseenter to new hover target
				if (pointerState.hoverTarget !== target) {
					if (target.onmouseenter) target.onmouseenter(event);
					pointerState.hoverTarget = target;
				}

				break;

			case ev.EVENT_TYPES.POINTER_PRESS:
				pointerState.dragTarget = target;
				pointerState.clickTarget = target;

				// emit mousedown
				if (target.onmousedown) target.onmousedown(event);
				event.SetShouldPropagate(false);

				break;

			case ev.EVENT_TYPES.POINTER_RELEASE:
				// emit mouseup
				if (target.onmouseup) target.onmouseup(event);

				// mouseup on clickTarget, emit click event
				if (pointerState.clickTarget === target) {
					if (target.onclick) target.onclick(event);
					if (target.onfocus) target.onfocus(event);
					pointerState.focusTarget = target;
				}

				pointerState.clickTarget = null;
				break;

			case ev.EVENT_TYPES.POINTER_SCROLL:
				if (target.onmousewheel) target.onmousewheel(event);
				break;

			case ev.EVENT_TYPES.KEY_DOWN:
				if (target.onkeydown) target.onkeydown(event);
				break;

			case ev.EVENT_TYPES.KEY_UP:
				if (target.onkeydown) target.onkeyup(event);
				break;

			}

			// cache this element to give it priority when next event arrives
			pointerState.cached = target;
		}

		/**
		* Recursively follows collider tree to find event target. If target
		* is found, the event is then processed on the target and this
		* function returns true
		*
		* @private
		* @method _traverseColliderTree
		* @param PointerCollider colliderNode
		* @param {Object} event
		* @param UserPointerSate pointerState
		* @return boolean True if event hit occurred
		*/
		var _traverseColliderTree = function (colliderNode, event, pointerState) {
			var pos = event.position,
				hit = false;

			for (var key in colliderNode.children) {

				// get priority node
				var colliderNodes = colliderNode.children[key];
				for (var i = 0; i < colliderNodes.length; ++i) {

					// get child node
					var node = colliderNodes[i];
					if (_isTarget(node.element, pos.x, pos.y)) {

						if (node.children != null) {
							// not a leaf node, descend
							hit = _traverseColliderTree(node, event, pointerState)
							break;
						} else if (node.element != pointerState.cached) {
							// if node hasn't been processed before, do it now
							_process(node.element, event);
							hit = true;
						}

						if (!event.ShouldPropagate()) break;
					}
				}

				if (!event.ShouldPropagate()) break;
			}

			return hit;
		}

		/**
		* Complement the priority to get an actual priority value
		*
		* @private
		* @method _getPriority
		* @param integer priority
		* @return integer priority
		*/
		var _getPriority = function (priority) {
			return MAX_PRIORITY - priority;
		}

		// basic properties
		var _self = {


			/**
			* Insert new collider node for element under specified parent with given
			* priority. If such node already exists, return it instead of creating
			* a duplicate
			*
			* @method CreatePointerCollider
			* @param PointerCollider parentCollider
			* @param DOMElement element
			* @param integer priority
			* @return PointerCollider new or existing pointer collider node
			*/
			CreatePointerCollider: function (parentCollider, element, priority) {
				var key,
					colliders,
					existing;

				// if no parent specified, create under root node
				if (parentCollider == null) {
					parentCollider = _eventRecvTriggerNodes;
				}

				// initialize children map if it does not exist
				if (parentCollider.children == null) {
					parentCollider.children = {}
				}

				// create child entry with given priority if it does not exist
				key = String(_getPriority(priority));
				if (parentCollider.children[key] == null) {
					parentCollider.children[key] = [];
				}

				// find the existing node with the specified element
				colliders = parentCollider.children[key];
				existing = ko.utils.arrayFirst(colliders, function (collider) {
					return collider.element === element;
				});

				if (existing != null) {
					return existing;
				} else {
					// create a node, insert it and return it
					var newCollider = PointerCollider(parentCollider, element);
					colliders.push(newCollider);
					return newCollider;
				}
			},

			/**
			* Adds a collider nodes for each DOMElement in elements array
			* under specified parent with given priority. Returns an array
			* of created nodes
			*
			* @method CreatePointerColliders
			* @param PointerCollider parentCollider
			* @param Array elements
			* @param integer priority
			* @return Array array of collider nodes
			*/
			CreatePointerColliders: function (parentCollider, elements, priority) {
				return elements.map(function (el) {
					return _self.CreatePointerCollider(parentCollider, el, priority);
				});
			},

			/**
			* Removes specified collider node from the tree
			*
			* @method RemovePointerCollider
			* @param PointerCollider collider
			*/
			RemovePointerCollider: function (collider) {
				var parent = collider.parent;
				if (parent == null) {
					parent = _eventRecvTriggerNodes;
				}

				for (var key in parent.children) {
					var colliders = parent.children[key],
						idx = colliders.indexOf(collider);

					// if found
					if (idx > -1) {
						// remove
						colliders.splice(idx, 1);

						// if no other colliders
						if (colliders.length == 0) {
							// remove priority entry
							delete parent.children[key];

							// if no entries
							if (misc.IsObjectEmpty(parent.children)) {
								parent.children = null;
							}
						}

						return;
					}
				}
			},

			/**
			* Remove each PointerCollider in collider array from the
			* collider tree
			*
			* @method RemovePointerColliders
			* @param Array colliders
			*/
			RemovePointerColliders: function (colliders) {
				colliders.forEach(function (c) {
					_self.RemovePointerCollider(c);
				});
			},

			/**
			* Set display client offset
			*
			* @method SetOffset
			* @param integer x
			* @param integer y
			*/
			SetOffset: function (x, y) {
				_clientOffsetX = x;
				_clientOffsetY = y;
			},

			/**
			* Acts as a trampoline to event propagation procedure. Some
			* simulated events need to be preprocessed here. Also, priority
			* processing is handled here. It is then determined if collider
			* tree traversal is necessary.
			*
			* @method Deliver
			* @param {Object} event
			*/
			Deliver: function (event) {
				var hit = false,
					pos = event.position,
					shouldPropagate = true,
					pointerState = _getUserPointerState(event.user);

				// some simulated events need to be processed here
				switch (event.type) {

				case ev.EVENT_TYPES.POINTER_PRESS:
					if (pointerState.focusTarget !== null) {

						// emit blur event
						event.target = pointerState.focusTarget;
						if (pointerState.focusTarget.onblur) pointerState.focusTarget.onblur(event);
						pointerState.focusTarget = null;

					}
					pointerState.cached = null;
					break;

				case ev.EVENT_TYPES.POINTER_RELEASE:
					// pointer release implies stop dragging
					pointerState.dragTarget = null;
					break;

				case ev.EVENT_TYPES.POINTER_MOVE:
					if (pointerState.dragTarget !== null) {

						// dragging in progress should be processed first and usually shouldn't be interrupted
						event.target = pointerState.dragTarget;
						if (pointerState.dragTarget.ondrag) pointerState.dragTarget.ondrag(event);
						shouldPropagate = event.ShouldPropagate();

					}
					break;

				}

				// priority process
				if (shouldPropagate && pointerState.cached != null) {
					if (_isTarget(pointerState.cached, pos.x, pos.y)) {
						_process(pointerState.cached, event);
						hit = true;
						shouldPropagate = event.ShouldPropagate();
					} else {
						pointerState.cached = null;
					}
				}

				// start normal event propagation if possible
				if (shouldPropagate) {
					hit = _traverseColliderTree(_eventRecvTriggerNodes, event, pointerState) || hit;
				}

				// if the event hasn't been delivered to any node yet
				if (!hit) {
					if (event.type == ev.EVENT_TYPES.POINTER_MOVE) {

						// deliver mouseleave to currently tracked hoverTarget since it no longer is a target
						if (pointerState.hoverTarget != null) {
							event.target = pointerState.hoverTarget;
							if (pointerState.hoverTarget.onmouseleave) pointerState.hoverTarget.onmouseleave(event);
							pointerState.hoverTarget = null;
						}

					}
				}
			}

		}

		return _self;
	}

	// the module should be a globally accessible singleton
	// to maintain the same state between other modules
	if (TDFA.InputMgr == null) {
		TDFA.InputMgr = InputMgr();
	}

	return TDFA.InputMgr;
});
