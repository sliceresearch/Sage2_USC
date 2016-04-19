/**
 * @author James Baicoianu / http://www.baicoianu.com/
 * @author sharkgoesmad
 */

define(
	[
		"three",
		"core/event"
	],
function(THREE, ev)
{

var Create = function ( domElement, object ) {

	var _self = {};

	var moveVectorGoal = new THREE.Vector3();
	var rotationVectorGoal = new THREE.Vector3();
	var mouseDelta = { dx: 0, dy: 0 };
	var kbdRotationSpeed = 0.1;
	var kdbMoveSpeed = 1.0;
	var mouseDeltaNorm = 0.004;

	var worldPosition = new THREE.Vector3();
	var yRotation = new THREE.Quaternion();
	var up = new THREE.Vector3();

	_self.object = object;

	_self.domElement = domElement;

	// API

	_self.movementSpeed = 0.25;
	_self.rollSpeed = 0.25;

	_self.dragToLook = true;

	// disable default target object behavior

	// internals

	_self.tmpQuaternion = new THREE.Quaternion();

	_self.mouseStatus = 0;

	_self.moveState = { up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0, rotLeft: 0, rotRight: 0 };
	_self.moveVector = new THREE.Vector3( 0, 0, 0 );
	_self.rotationVector = new THREE.Vector3( 0, 0, 0 );


	var onKeyDown = function( event ) {

		event.SetShouldPropagate(false);

		switch ( event.keyCode ) {

			case ev.KEY_CODES.LSHIFT: _self.movementSpeedMultiplier = .1; break;

			case ev.KEY_CODES.W: _self.moveState.forward = kdbMoveSpeed; break;
			case ev.KEY_CODES.S: _self.moveState.back = kdbMoveSpeed; break;

			case ev.KEY_CODES.A: _self.moveState.left = kdbMoveSpeed; break;
			case ev.KEY_CODES.D: _self.moveState.right = kdbMoveSpeed; break;

			case ev.KEY_CODES.R: _self.moveState.up = kdbMoveSpeed; break;
			case ev.KEY_CODES.F: _self.moveState.down = kdbMoveSpeed; break;

			case ev.KEY_CODES.UP: _self.moveState.pitchUp = kbdRotationSpeed * 0.75; break;
			case ev.KEY_CODES.DOWN: _self.moveState.pitchUp = -kbdRotationSpeed * 0.75; break;

			case ev.KEY_CODES.LEFT: _self.moveState.yawRight = -kbdRotationSpeed * 2.0; break;
			case ev.KEY_CODES.RIGHT: _self.moveState.yawRight = kbdRotationSpeed * 2.0; break;

			case ev.KEY_CODES.Q: _self.moveState.rollLeft = kbdRotationSpeed * 0.5; break;
			case ev.KEY_CODES.E: _self.moveState.rollRight = kbdRotationSpeed * 0.5; break;

		}

		_self.updateMovementVector();
		_self.updateRotationVector();

	};

	var onKeyUp = function( event ) {

		event.SetShouldPropagate(false);

		switch ( event.keyCode ) {

			case ev.KEY_CODES.LSHIFT: _self.movementSpeedMultiplier = 1; break;

			case ev.KEY_CODES.W: _self.moveState.forward = 0; break;
			case ev.KEY_CODES.S: _self.moveState.back = 0; break;

			case ev.KEY_CODES.A: _self.moveState.left = 0; break;
			case ev.KEY_CODES.D: _self.moveState.right = 0; break;

			case ev.KEY_CODES.R: _self.moveState.up = 0; break;
			case ev.KEY_CODES.F: _self.moveState.down = 0; break;

			case ev.KEY_CODES.UP: _self.moveState.pitchUp = 0; break;
			case ev.KEY_CODES.DOWN: _self.moveState.pitchUp = 0; break;

			case ev.KEY_CODES.LEFT: _self.moveState.yawRight = 0; break;
			case ev.KEY_CODES.RIGHT: _self.moveState.yawRight = 0; break;

			case ev.KEY_CODES.Q: _self.moveState.rollLeft = 0; break;
			case ev.KEY_CODES.E: _self.moveState.rollRight = 0; break;

		}

		_self.updateMovementVector();
		_self.updateRotationVector();

	};

	var onMouseDown = function( event ) {

		event.SetShouldPropagate(false);


		if ( event.button !== ev.BUTTON_DATA.LEFT ) return;

		if ( _self.dragToLook ) {

			_self.mouseStatus = 1;

		} else {

			switch ( event.button ) {

				case 0: _self.moveState.forward = 1; break;
				case 2: _self.moveState.back = 1; break;

			}

			_self.updateMovementVector();

		}

	};

	var onMouseMove = function( event ) {

		event.SetShouldPropagate(false);

		if ( !_self.dragToLook || _self.mouseStatus > 0 ) {

			mouseDelta = event.delta;

		}

	};

	var onMouseUp = function( event ) {

		event.SetShouldPropagate(false);

		if ( _self.dragToLook ) {

			_self.mouseStatus = 0;

			_self.moveState.yawLeft = _self.moveState.pitchDown = 0;

		} else {

			switch ( event.button ) {

				case 0: _self.moveState.forward = 0; break;
				case 2: _self.moveState.back = 0; break;

			}

			_self.updateMovementVector();

		}

		_self.updateRotationVector();

	};

	var onMouseWheel = function() {};

	_self.update = function( ds ) {

		_self.moveState.yawLeft   = mouseDelta.dx * mouseDeltaNorm * ds;
		_self.moveState.pitchDown = -(mouseDelta.dy) * mouseDeltaNorm * ds;
		mouseDelta.dx = 0.7 * mouseDelta.dx;
		mouseDelta.dy = 0.7 * mouseDelta.dy;
		_self.updateRotationVector();

		_self.moveVector.lerp( moveVectorGoal, 0.5 * ds );
		_self.rotationVector.lerp( rotationVectorGoal, 0.5 * ds );

		var moveMult = ds * _self.movementSpeed;
		var rotMult = ds * _self.rollSpeed;
		var object = _self.object();

		worldPosition.setFromMatrixPosition( object.matrixWorld );

		object.translateX( _self.moveVector.x * moveMult );
		object.translateY( _self.moveVector.y * moveMult );
		object.translateZ( _self.moveVector.z * moveMult );


		up.set(0, 1, 0);
		up.add(worldPosition);
		object.worldToLocal(up);
		yRotation.setFromAxisAngle(up, _self.rotationVector.y * rotMult);

		_self.tmpQuaternion.set(_self.rotationVector.x * rotMult, 0, _self.rotationVector.z * rotMult, 1 ).normalize();

		object.quaternion.multiply( _self.tmpQuaternion );
		object.quaternion.multiply( yRotation );

		// expose the rotation vector for convenience
		object.rotation.setFromQuaternion( object.quaternion, object.rotation.order );


	};

	_self.updateMovementVector = function() {

		moveVectorGoal.x = ( -_self.moveState.left    + _self.moveState.right );
		moveVectorGoal.y = ( -_self.moveState.down    + _self.moveState.up );
		moveVectorGoal.z = ( -_self.moveState.forward  + _self.moveState.back );

	};

	_self.updateRotationVector = function() {

		rotationVectorGoal.x = ( -_self.moveState.pitchDown + _self.moveState.pitchUp );
		rotationVectorGoal.y = ( -_self.moveState.yawRight  + _self.moveState.yawLeft );
		rotationVectorGoal.z = ( -_self.moveState.rollRight + _self.moveState.rollLeft );

	};




	_self.dispose = function() {

	}

	_self.updateMovementVector();
	_self.updateRotationVector();


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
