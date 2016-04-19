/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 * @author sharkgoesmad
 *
 *
 */
/*global THREE, console */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe
//


define(
[
	"three",
	"core/event"
],
function(THREE, ev) {

var Create = function ( domElement, object, initialPosition, initialTarget ) {

	var _self = Object.create( THREE.EventDispatcher.prototype );

	_self.dummy = new THREE.Object3D();
	_self.object = object || _self.dummy;
	_self.domElement = domElement;

	// API

	// Set to false to disable this control
	_self.enabled = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	_self.target = initialTarget || new THREE.Vector3();

	// center is old, deprecated; use "target" instead
	_self.center = _self.target;

	// This option actually enables dollying in and out; left as "zoom" for
	// backwards compatibility
	_self.noZoom = false;
	_self.zoomSpeed = 5.0;
	_self.keyZoomSpeed = 1.1;

	// Limits to how far you can dolly in and out
	_self.minDistance = 0;
	_self.maxDistance = Infinity;

	// Set to true to disable this control
	_self.noRotate = false;
	_self.rotateSpeed = 1.0;
	_self.keyRotateSpeed = _self.rotateSpeed * 0.05;

	// Set to true to disable this control
	_self.noPan = false;
	_self.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	_self.autoRotate = false;
	_self.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	_self.minPolarAngle = 0; // radians
	_self.maxPolarAngle = Math.PI; // radians

	// Set to true to disable use of the keys
	_self.noKeys = false;

	////////////
	// internals

	var dragging = false;
	var modKeyHeld = false;
	var dampHelper = initialPosition || new THREE.Vector3(0, 2, 5);
	var targetDampHelper = _self.target.clone();

	var EPS = 0.000001;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	// for reset

	_self.target0 = _self.target.clone();
	_self.position0 = _self.object().position.clone();

	// so camera.up is the orbit axis

	var quat = new THREE.Quaternion().setFromUnitVectors( _self.object().up, new THREE.Vector3( 0, 1, 0 ) );
	var quatInverse = quat.clone().inverse();

	_self.setTarget = function ( target ) {
		targetDampHelper = target;
	}

	_self.rotateLeft = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	_self.rotateUp = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	// pass in distance in world space to move left
	_self.panLeft = function ( distance ) {

		var te = _self.object().matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );

		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	_self.panUp = function ( distance ) {

		var te = _self.object().matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );

		pan.add( panOffset );

	};

	// pass in x,y of change desired in pixel space,
	// right and down are positive
	_self.pan = function ( deltaX, deltaY ) {

		var element = _self.domElement;
		var object = _self.object();

		if ( object.fov !== undefined ) {

			// perspective
			var position = object.position;
			var offset = position.clone().sub( _self.target );
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			_self.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			_self.panUp( 2 * deltaY * targetDistance / element.clientHeight );

		} else if ( object.top !== undefined ) {

			// orthographic
			_self.panLeft( deltaX * (object.right - object.left) / element.clientWidth );
			_self.panUp( deltaY * (object.top - object.bottom) / element.clientHeight );

		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

		}

	};

	_self.dollyIn = function ( dollyScale ) {

		var object = _self.object();

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		if ( object.fov !== undefined ) {

			scale /= dollyScale;

		} else if ( object.top !== undefined ) {

			var dollyScaleInv = 1.0 / dollyScale;
			object.left *= dollyScaleInv;
			object.right *= dollyScaleInv;
			object.top *= dollyScaleInv;
			object.bottom *= dollyScaleInv;
			object.near *= dollyScaleInv;
			object.updateProjectionMatrix();

		}

	};

	_self.dollyOut = function ( dollyScale ) {

		var object = _self.object();

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		if ( object.fov !== undefined ) {

			scale *= dollyScale;

		} else if ( object.top !== undefined ) {

			object.left *= dollyScale;
			object.right *= dollyScale;
			object.top *= dollyScale;
			object.bottom *= dollyScale;
			object.near *= dollyScale;
			object.updateProjectionMatrix();

		}
	};

	_self.update = function () {

		var position = dampHelper;  //_self.object.position;
		var object = _self.object();

		offset.copy( dampHelper ).sub( _self.target );

		// rotate offset to "y-axis-is-up" space
		offset.applyQuaternion( quat );

		// angle from z-axis around y-axis

		var theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

		if ( _self.autoRotate ) {

			_self.rotateLeft( getAutoRotationAngle() );

		}

		theta += thetaDelta;
		phi += phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max( _self.minPolarAngle, Math.min( _self.maxPolarAngle, phi ) );

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max( _self.minDistance, Math.min( _self.maxDistance, radius ) );

		// move target to panned location
		targetDampHelper.add( pan );
		_self.target.lerp( targetDampHelper, 0.3 );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		// rotate offset back to "camera-up-vector-is-up" space
		offset.applyQuaternion( quatInverse );

		// update position
		dampHelper.copy(_self.target).add(offset);
		object.position.lerp( dampHelper, 0.3 );

		object.lookAt( _self.target );

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		if ( lastPosition.distanceToSquared( object.position ) > EPS ) {

			lastPosition.copy( object.position );

		}

	};


	_self.reset = function () {

		state = STATE.NONE;

		_self.target.copy( _self.target0 );
		_self.object().position.copy( _self.position0 );

	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * _self.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, _self.zoomSpeed );

	}

	function onMouseDown( event ) {

		if ( _self.enabled === false ) return;

		if ( event.button === ev.BUTTON_DATA.LEFT ) {

			if ( modKeyHeld ) {

				if ( _self.noPan === true ) return;

				state = STATE.PAN;
				panStart.set( event.position.x, event.position.y );

			} else {

				if ( _self.noRotate === true ) return;

				state = STATE.ROTATE;
				rotateStart.set( event.position.x, event.position.y );

			}

		} else if ( event.button === ev.BUTTON_DATA.MIDDLE ) {

			if ( _self.noZoom === true ) return;

			state = STATE.DOLLY;
			dollyStart.set( event.position.x, event.position.y );

		}

		dragging = true;
	}

	function onMouseMove( event ) {

		if ( _self.enabled === false || dragging === false) return;

		var element = _self.domElement;

		if ( state === STATE.ROTATE ) {

			if ( _self.noRotate === true ) return;

			rotateEnd.set( event.position.x, event.position.y );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			_self.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * _self.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			_self.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * _self.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.DOLLY ) {

			if ( _self.noZoom === true ) return;

			dollyEnd.set( event.position.x, event.position.y );
			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				_self.dollyIn();

			} else {

				_self.dollyOut();

			}

			dollyStart.copy( dollyEnd );

		} else if ( state === STATE.PAN ) {

			if ( _self.noPan === true ) return;

			panEnd.set( event.position.x, event.position.y );
			panDelta.subVectors( panEnd, panStart );

			_self.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

		}

		//_self.update();

	}

	function onMouseUp( event ) {

		dragging = false;
		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( _self.enabled === false || _self.noZoom === true ) return;

		var delta = 0;

		delta = - event.wheelDelta;

		if ( delta > 0 ) {

			_self.dollyOut();

		} else {

			_self.dollyIn();

		}
	}

	function onKeyDown( event ) {

		if ( _self.enabled === false || _self.noKeys === true || _self.noPan === true ) return;

		switch ( event.keyCode ) {

			case ev.KEY_CODES.W:
				_self.dollyIn( _self.keyZoomSpeed );
				break;

			case ev.KEY_CODES.S:
				_self.dollyOut( _self.keyZoomSpeed );
				break;

			case ev.KEY_CODES.R:
				_self.pan( 0, _self.keyPanSpeed );
				break;

			case ev.KEY_CODES.F:
				_self.pan( 0, - _self.keyPanSpeed );
				break;

			case ev.KEY_CODES.A:
				_self.pan( _self.keyPanSpeed, 0 );
				break;

			case ev.KEY_CODES.D:
				_self.pan( - _self.keyPanSpeed, 0 );
				break;

			case ev.KEY_CODES.UP:
				_self.rotateUp( _self.keyRotateSpeed );
				break;

			case ev.KEY_CODES.DOWN:
				_self.rotateUp( - _self.keyRotateSpeed );
				break;

			case ev.KEY_CODES.LEFT:
				_self.rotateLeft( _self.keyRotateSpeed );
				break;

			case ev.KEY_CODES.RIGHT:
				_self.rotateLeft( - _self.keyRotateSpeed );
				break;

			case ev.KEY_CODES.LSHIFT:
				modKeyHeld = true;
				break;

		}

	}

	function onKeyUp( event ) {

		switch ( event.keyCode ) {

			case ev.KEY_CODES.LSHIFT:
				modKeyHeld = false;
				break;

		}

	}

	function stopPropagation( event ) {
		event.preventDefault();
	}


	_self.dispose = function() {

	}

	_self.PointerDown = onMouseDown;
	_self.PointerMove = onMouseMove;
	_self.PointerUp = onMouseUp;
	_self.PointerScroll = onMouseWheel;
	_self.KeyDown = onKeyDown;
	_self.KeyUp = onKeyUp;

	return _self;
};

return {

	Create: Create

};


});
