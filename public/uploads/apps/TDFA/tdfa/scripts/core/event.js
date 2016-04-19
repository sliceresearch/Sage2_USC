define([], function () {

	/**
	* Enum EVENT_TYPES
	*
	* @class EVENT_TYPES
	*/
	var EVENT_TYPES = {

		POINTER_PRESS: "pointerPress",
		POINTER_RELEASE: "pointerRelease",
		POINTER_MOVE: "pointerMove",
		POINTER_SCROLL: "pointerScroll",
		SPECIAL_KEY: "specialKey",
		KEY_UP: "keyUp",
		KEY_DOWN: "keyDown"

	};

	/**
	* Enum BUTTON_DATA
	*
	* @class BUTTON_DATA
	*/
	var BUTTON_DATA = {

		LEFT: "left",
		MIDDLE: "middle",
		RIGHT: "right"

	};

	/**
	* Enum KEY_STATE
	*
	* @class KEY_STATE
	*/
	var KEY_STATE = {

		UP: "up",
		DOWN: "down"

	};

	/**
	* Enum KEY_CODES. Contains significant keycodes
	*
	* @class KEY_CODES
	*/
	var KEY_CODES = {

		A: 65,
		W: 87,
		D: 68,
		S: 83,
		R: 82,
		F: 70,
		Q: 81,
		E: 69,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		LSHIFT: 16,
		LCTRL: 17

	};


	/**
	* Base event object
	*
	* @class Event
	* @param {Object} type
	* @param {Object} position
	* @param {Object} user_id
	* @param {Object} data
	* @return Event isntance
	*/
	function Event(type, position, user_id, data) {
		var _propagate = true;

		// event model
		var em = {

			type: type,
			position: position,
			user: user_id,

			SetShouldPropagate: function (shouldPropagate) {
				_propagate = shouldPropagate;
			},
			ShouldPropagate: function () {
				return _propagate;
			}
		}

		return em;
	}

	/**
	* Event decorator
	*
	* @method PointerDown
	* @param {Object} position
	* @param {Object} user_id
	* @param {Object} data
	* @return PointerDown isntance
	*/
	function PointerDown(position, user_id, data) {
		var md = Event(EVENT_TYPES.POINTER_PRESS, position, user_id, data);
		md.button = data.button;

		return md;
	}

	/**
	* Event decorator
	*
	* @method PointerUp
	* @param {Object} position
	* @param {Object} user_id
	* @param {Object} data
	* @return PointerUp isntance
	*/
	function PointerUp(position, user_id, data) {
		var md = Event(EVENT_TYPES.POINTER_RELEASE, position, user_id, data);
		md.button = data.button;

		return md;
	}

	/**
	* Event decorator
	*
	* @method PointerMove
	* @param {Object} position
	* @param {Object} user_id
	* @param {Object} data
	* @return PointerMove isntance
	*/
	function PointerMove(position, user_id, data) {
		var md = Event(EVENT_TYPES.POINTER_MOVE, position, user_id, data);
		md.delta = data;

		return md;
	}

	/**
	* Event decorator
	*
	* @method PointerScroll
	* @param {Object} position
	* @param {Object} user_id
	* @param {Object} data
	* @return PointerScroll isntance
	*/
	function PointerScroll(position, user_id, data) {
		var md = Event(EVENT_TYPES.POINTER_SCROLL, position, user_id, data);
		md.wheelDelta = data.wheelDelta;

		return md;
	}

	/**
	* Event decorator
	*
	* @method KeyDown
	* @param {Object} position
	* @param {Object} user_id
	* @param {Object} data
	* @return KeyDown isntance
	*/
	function KeyDown(position, user_id, data) {
		var md = Event(EVENT_TYPES.KEY_DOWN, position, user_id, data);
		md.keyCode = data.code;

		return md;
	}

	/**
	* Event decorator
	*
	* @method KeyUp
	* @param {Object} position
	* @param {Object} user_id
	* @param {Object} data
	* @return KeyUp isntance
	*/
	function KeyUp(position, user_id, data) {
		var md = Event(EVENT_TYPES.KEY_UP, position, user_id, data);
		md.keyCode = data.code;

		return md;
	}


	/**
	* Event factory
	*
	* @method From
	* @param {Object} eventType
	* @param {Object} position
	* @param {Object} user_id
	* @param {Object} data
	* @return {Object} event
	*/
	function From(eventType, position, user_id, data) {
		var event;

		switch (eventType) {
		case EVENT_TYPES.POINTER_PRESS:
			event = PointerDown(position, user_id, data);
			break;

		case EVENT_TYPES.POINTER_RELEASE:
			event = PointerUp(position, user_id, data);
			break;

		case EVENT_TYPES.POINTER_MOVE:
			event = PointerMove(position, user_id, data);
			break;

		case EVENT_TYPES.POINTER_SCROLL:
			event = PointerScroll(position, user_id, data);
			break;

		case EVENT_TYPES.SPECIAL_KEY:
			switch (data.state) {
			case KEY_STATE.UP:
				event = KeyUp(position, user_id, data);
				break;

			case KEY_STATE.DOWN:
			default:
				event = KeyDown(position, user_id, data);
				break;
			}
			break;

		default:
			event = Event(eventType, position, user_id, data);
			break;
		}

		return event;
	}


	return {

		EVENT_TYPES: EVENT_TYPES,
		BUTTON_DATA: BUTTON_DATA,
		KEY_STATE: KEY_STATE,
		KEY_CODES: KEY_CODES,
		Event: Event,
		PointerDown: PointerDown,
		PointerUp: PointerUp,
		PointerMove: PointerMove,
		PointerScroll: PointerScroll,
		KeyDown: KeyDown,
		KeyUp: KeyUp,
		From: From

	}

});
