/**
 * @author arodic / https://github.com/arodic
 * @author sharkgoesmad
 *
 * changelog:
 *  - extended with IsDragging()
 *  - refactored to namespace TDFA
 *  - refactored to AMD
 */
 /*jshint sub:true*/

define(["three", "lib/knockout", "core/event", "lib/Projector"],
		function(THREE, ko, evt)
{

var GizmoMaterial = function ( parameters ) {

	THREE.MeshBasicMaterial.call( this );

	this.depthTest = false;
	this.depthWrite = false;
	this.side = THREE.FrontSide;
	this.transparent = true;

	this.setValues( parameters );

	this.oldColor = this.color.clone();
	this.oldOpacity = this.opacity;

	this.highlight = function( highlighted ) {

		if ( highlighted ) {

			this.color.setRGB( 1, 1, 0 );
			this.opacity = 1;

		} else {

			this.color.copy( this.oldColor );
			this.opacity = this.oldOpacity;

		}

	};

};

GizmoMaterial.prototype = Object.create( THREE.MeshBasicMaterial.prototype );
GizmoMaterial.prototype.constructor = GizmoMaterial;


var GizmoLineMaterial = function ( parameters ) {

	THREE.LineBasicMaterial.call( this );

	this.depthTest = false;
	this.depthWrite = false;
	this.transparent = true;
	this.linewidth = 2;

	this.setValues( parameters );

	this.oldColor = this.color.clone();
	this.oldOpacity = this.opacity;

	this.highlight = function( highlighted ) {

		if ( highlighted ) {

			this.color.setRGB( 1, 1, 0 );
			this.opacity = 1;

		} else {

			this.color.copy( this.oldColor );
			this.opacity = this.oldOpacity;

		}

	};

};

GizmoLineMaterial.prototype = Object.create( THREE.LineBasicMaterial.prototype );
GizmoLineMaterial.prototype.constructor = GizmoLineMaterial;


var pickerMaterial = new GizmoMaterial( { visible: false, transparent: false } );


THREE.TransformGizmo = function () {

	var scope = this;

	this.init = function () {

		THREE.Object3D.call( this );

		this.handles = new THREE.Object3D();
		this.pickers = new THREE.Object3D();
		this.planes = new THREE.Object3D();

		this.add( this.handles );
		this.add( this.pickers );
		this.add( this.planes );

		//// PLANES

		var planeGeometry = new THREE.PlaneBufferGeometry( 50, 50, 2, 2 );
		var planeMaterial = new THREE.MeshBasicMaterial( { visible: false, side: THREE.DoubleSide } );

		var planes = {
			"XY":   new THREE.Mesh( planeGeometry, planeMaterial ),
			"YZ":   new THREE.Mesh( planeGeometry, planeMaterial ),
			"XZ":   new THREE.Mesh( planeGeometry, planeMaterial ),
			"XYZE": new THREE.Mesh( planeGeometry, planeMaterial )
		};

		this.activePlane = planes[ "XYZE" ];

		planes[ "YZ" ].rotation.set( 0, Math.PI / 2, 0 );
		planes[ "XZ" ].rotation.set( - Math.PI / 2, 0, 0 );

		for ( var i in planes ) {

			planes[ i ].name = i;
			this.planes.add( planes[ i ] );
			this.planes[ i ] = planes[ i ];

		}

		//// HANDLES AND PICKERS

		var setupGizmos = function( gizmoMap, parent ) {

			for ( var name in gizmoMap ) {

				for ( i = gizmoMap[ name ].length; i --; ) {

					var object = gizmoMap[ name ][ i ][ 0 ];
					var position = gizmoMap[ name ][ i ][ 1 ];
					var rotation = gizmoMap[ name ][ i ][ 2 ];

					object.name = name;

					if ( position ) object.position.set( position[ 0 ], position[ 1 ], position[ 2 ] );
					if ( rotation ) object.rotation.set( rotation[ 0 ], rotation[ 1 ], rotation[ 2 ] );

					parent.add( object );

				}

			}

		};

		setupGizmos( this.handleGizmos, this.handles );
		setupGizmos( this.pickerGizmos, this.pickers );

		// reset Transformations

		this.traverse( function ( child ) {

			if ( child instanceof THREE.Mesh ) {

				child.updateMatrix();

				var tempGeometry = child.geometry.clone();
				tempGeometry.applyMatrix( child.matrix );
				child.geometry = tempGeometry;

				child.position.set( 0, 0, 0 );
				child.rotation.set( 0, 0, 0 );
				child.scale.set( 1, 1, 1 );

			}

		} );

	};

	this.highlight = function ( axis ) {

		this.traverse( function( child ) {

			if ( child.material && child.material.highlight ) {

				if ( child.name === axis ) {

					child.material.highlight( true );

				} else {

					child.material.highlight( false );

				}

			}

		} );

	};

};

THREE.TransformGizmo.prototype = Object.create( THREE.Object3D.prototype );
THREE.TransformGizmo.prototype.constructor = THREE.TransformGizmo;

THREE.TransformGizmo.prototype.update = function ( rotation, eye ) {

	var vec1 = new THREE.Vector3( 0, 0, 0 );
	var vec2 = new THREE.Vector3( 0, 1, 0 );
	var lookAtMatrix = new THREE.Matrix4();

	this.traverse( function( child ) {

		if ( child.name.search( "E" ) !== - 1 ) {

			child.quaternion.setFromRotationMatrix( lookAtMatrix.lookAt( eye, vec1, vec2 ) );

		} else if ( child.name.search( "X" ) !== - 1 || child.name.search( "Y" ) !== - 1 || child.name.search( "Z" ) !== - 1 ) {

			child.quaternion.setFromEuler( rotation );

		}

	} );

};

THREE.TransformGizmoTranslate = function () {

	THREE.TransformGizmo.call( this );

	var arrowGeometry = new THREE.Geometry();
	var mesh = new THREE.Mesh( new THREE.CylinderGeometry( 0, 0.05, 0.2, 12, 1, false ) );
	mesh.position.y = 0.5;
	mesh.updateMatrix();

	arrowGeometry.merge( mesh.geometry, mesh.matrix );

	var lineXGeometry = new THREE.BufferGeometry();
	lineXGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  1, 0, 0 ], 3 ) );

	var lineYGeometry = new THREE.BufferGeometry();
	lineYGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  0, 1, 0 ], 3 ) );

	var lineZGeometry = new THREE.BufferGeometry();
	lineZGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  0, 0, 1 ], 3 ) );

	this.handleGizmos = {

		X: [
			[ new THREE.Mesh( arrowGeometry, new GizmoMaterial( { color: 0xff0000 } ) ), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
			[ new THREE.Line( lineXGeometry, new GizmoLineMaterial( { color: 0xff0000 } ) ) ]
		],

		Y: [
			[ new THREE.Mesh( arrowGeometry, new GizmoMaterial( { color: 0x00ff00 } ) ), [ 0, 0.5, 0 ] ],
			[	new THREE.Line( lineYGeometry, new GizmoLineMaterial( { color: 0x00ff00 } ) ) ]
		],

		Z: [
			[ new THREE.Mesh( arrowGeometry, new GizmoMaterial( { color: 0x0000ff } ) ), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
			[ new THREE.Line( lineZGeometry, new GizmoLineMaterial( { color: 0x0000ff } ) ) ]
		],

		XYZ: [
			[ new THREE.Mesh( new THREE.OctahedronGeometry( 0.1, 0 ), new GizmoMaterial( { color: 0xffffff, opacity: 0.25 } ) ), [ 0, 0, 0 ], [ 0, 0, 0 ] ]
		],

		XY: [
			[ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.29, 0.29 ), new GizmoMaterial( { color: 0xffff00, opacity: 0.25 } ) ), [ 0.15, 0.15, 0 ] ]
		],

		YZ: [
			[ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.29, 0.29 ), new GizmoMaterial( { color: 0x00ffff, opacity: 0.25 } ) ), [ 0, 0.15, 0.15 ], [ 0, Math.PI / 2, 0 ] ]
		],

		XZ: [
			[ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.29, 0.29 ), new GizmoMaterial( { color: 0xff00ff, opacity: 0.25 } ) ), [ 0.15, 0, 0.15 ], [ - Math.PI / 2, 0, 0 ] ]
		]

	};

	this.pickerGizmos = {

		X: [
			[ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
		],

		Y: [
			[ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0.6, 0 ] ]
		],

		Z: [
			[ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
		],

		XYZ: [
			[ new THREE.Mesh( new THREE.OctahedronGeometry( 0.2, 0 ), pickerMaterial ) ]
		],

		XY: [
			[ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.4, 0.4 ), pickerMaterial ), [ 0.2, 0.2, 0 ] ]
		],

		YZ: [
			[ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.4, 0.4 ), pickerMaterial ), [ 0, 0.2, 0.2 ], [ 0, Math.PI / 2, 0 ] ]
		],

		XZ: [
			[ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.4, 0.4 ), pickerMaterial ), [ 0.2, 0, 0.2 ], [ - Math.PI / 2, 0, 0 ] ]
		]

	};

	this.setActivePlane = function ( axis, eye ) {

		var tempMatrix = new THREE.Matrix4();
		eye.applyMatrix4( tempMatrix.getInverse( tempMatrix.extractRotation( this.planes[ "XY" ].matrixWorld ) ) );

		if ( axis === "X" ) {

			this.activePlane = this.planes[ "XY" ];

			if ( Math.abs( eye.y ) > Math.abs( eye.z ) ) this.activePlane = this.planes[ "XZ" ];

		}

		if ( axis === "Y" ) {

			this.activePlane = this.planes[ "XY" ];

			if ( Math.abs( eye.x ) > Math.abs( eye.z ) ) this.activePlane = this.planes[ "YZ" ];

		}

		if ( axis === "Z" ) {

			this.activePlane = this.planes[ "XZ" ];

			if ( Math.abs( eye.x ) > Math.abs( eye.y ) ) this.activePlane = this.planes[ "YZ" ];

		}

		if ( axis === "XYZ" ) this.activePlane = this.planes[ "XYZE" ];

		if ( axis === "XY" ) this.activePlane = this.planes[ "XY" ];

		if ( axis === "YZ" ) this.activePlane = this.planes[ "YZ" ];

		if ( axis === "XZ" ) this.activePlane = this.planes[ "XZ" ];

	};

	this.init();

};

THREE.TransformGizmoTranslate.prototype = Object.create( THREE.TransformGizmo.prototype );
THREE.TransformGizmoTranslate.prototype.constructor = THREE.TransformGizmoTranslate;

THREE.TransformGizmoRotate = function () {

	THREE.TransformGizmo.call( this );

	var CircleGeometry = function ( radius, facing, arc ) {

		var geometry = new THREE.BufferGeometry();
		var vertices = [];
		arc = arc ? arc : 1;

		for ( var i = 0; i <= 64 * arc; ++ i ) {

			if ( facing === 'x' ) vertices.push( 0, Math.cos( i / 32 * Math.PI ) * radius, Math.sin( i / 32 * Math.PI ) * radius );
			if ( facing === 'y' ) vertices.push( Math.cos( i / 32 * Math.PI ) * radius, 0, Math.sin( i / 32 * Math.PI ) * radius );
			if ( facing === 'z' ) vertices.push( Math.sin( i / 32 * Math.PI ) * radius, Math.cos( i / 32 * Math.PI ) * radius, 0 );

		}

		geometry.addAttribute( 'position', new THREE.Float32Attribute( vertices, 3 ) );
		return geometry;

	};

	this.handleGizmos = {

		X: [
			[ new THREE.Line( new CircleGeometry( 1, 'x', 0.5 ), new GizmoLineMaterial( { color: 0xff0000 } ) ) ]
		],

		Y: [
			[ new THREE.Line( new CircleGeometry( 1, 'y', 0.5 ), new GizmoLineMaterial( { color: 0x00ff00 } ) ) ]
		],

		Z: [
			[ new THREE.Line( new CircleGeometry( 1, 'z', 0.5 ), new GizmoLineMaterial( { color: 0x0000ff } ) ) ]
		],

		E: [
			[ new THREE.Line( new CircleGeometry( 1.25, 'z', 1 ), new GizmoLineMaterial( { color: 0xcccc00 } ) ) ]
		],

		XYZE: [
			[ new THREE.Line( new CircleGeometry( 1, 'z', 1 ), new GizmoLineMaterial( { color: 0x787878 } ) ) ]
		]

	};

	this.pickerGizmos = {

		X: [
			[ new THREE.Mesh( new THREE.TorusGeometry( 1, 0.12, 4, 12, Math.PI ), pickerMaterial ), [ 0, 0, 0 ], [ 0, - Math.PI / 2, - Math.PI / 2 ] ]
		],

		Y: [
			[ new THREE.Mesh( new THREE.TorusGeometry( 1, 0.12, 4, 12, Math.PI ), pickerMaterial ), [ 0, 0, 0 ], [ Math.PI / 2, 0, 0 ] ]
		],

		Z: [
			[ new THREE.Mesh( new THREE.TorusGeometry( 1, 0.12, 4, 12, Math.PI ), pickerMaterial ), [ 0, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
		],

		E: [
			[ new THREE.Mesh( new THREE.TorusGeometry( 1.25, 0.12, 2, 24 ), pickerMaterial ) ]
		],

		XYZE: [
			[ new THREE.Mesh( new THREE.BoxGeometry( 0.4, 0.4, 0.4 ), pickerMaterial ) ]// TODO
		]

	};

	this.setActivePlane = function ( axis ) {

		if ( axis === "E" ) this.activePlane = this.planes[ "XYZE" ];

		if ( axis === "X" ) this.activePlane = this.planes[ "YZ" ];

		if ( axis === "Y" ) this.activePlane = this.planes[ "XZ" ];

		if ( axis === "Z" ) this.activePlane = this.planes[ "XY" ];

	};

	this.update = function ( rotation, eye2 ) {

		THREE.TransformGizmo.prototype.update.apply( this, arguments );

		var group = {

			handles: this[ "handles" ],
			pickers: this[ "pickers" ],

		};

		var tempMatrix = new THREE.Matrix4();
		var worldRotation = new THREE.Euler( 0, 0, 1 );
		var tempQuaternion = new THREE.Quaternion();
		var unitX = new THREE.Vector3( 1, 0, 0 );
		var unitY = new THREE.Vector3( 0, 1, 0 );
		var unitZ = new THREE.Vector3( 0, 0, 1 );
		var quaternionX = new THREE.Quaternion();
		var quaternionY = new THREE.Quaternion();
		var quaternionZ = new THREE.Quaternion();
		var eye = eye2.clone();

		worldRotation.copy( this.planes[ "XY" ].rotation );
		tempQuaternion.setFromEuler( worldRotation );

		tempMatrix.makeRotationFromQuaternion( tempQuaternion ).getInverse( tempMatrix );
		eye.applyMatrix4( tempMatrix );

		this.traverse( function( child ) {

			tempQuaternion.setFromEuler( worldRotation );

			if ( child.name === "X" ) {

				quaternionX.setFromAxisAngle( unitX, Math.atan2( - eye.y, eye.z ) );
				tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionX );
				child.quaternion.copy( tempQuaternion );

			}

			if ( child.name === "Y" ) {

				quaternionY.setFromAxisAngle( unitY, Math.atan2( eye.x, eye.z ) );
				tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionY );
				child.quaternion.copy( tempQuaternion );

			}

			if ( child.name === "Z" ) {

				quaternionZ.setFromAxisAngle( unitZ, Math.atan2( eye.y, eye.x ) );
				tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionZ );
				child.quaternion.copy( tempQuaternion );

			}

		} );

	};

	this.init();

};

THREE.TransformGizmoRotate.prototype = Object.create( THREE.TransformGizmo.prototype );
THREE.TransformGizmoRotate.prototype.constructor = THREE.TransformGizmoRotate;

THREE.TransformGizmoScale = function () {

	THREE.TransformGizmo.call( this );

	var arrowGeometry = new THREE.Geometry();
	var mesh = new THREE.Mesh( new THREE.BoxGeometry( 0.125, 0.125, 0.125 ) );
	mesh.position.y = 0.5;
	mesh.updateMatrix();

	arrowGeometry.merge( mesh.geometry, mesh.matrix );

	var lineXGeometry = new THREE.BufferGeometry();
	lineXGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  1, 0, 0 ], 3 ) );

	var lineYGeometry = new THREE.BufferGeometry();
	lineYGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  0, 1, 0 ], 3 ) );

	var lineZGeometry = new THREE.BufferGeometry();
	lineZGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  0, 0, 1 ], 3 ) );

	this.handleGizmos = {

		X: [
			[ new THREE.Mesh( arrowGeometry, new GizmoMaterial( { color: 0xff0000 } ) ), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
			[ new THREE.Line( lineXGeometry, new GizmoLineMaterial( { color: 0xff0000 } ) ) ]
		],

		Y: [
			[ new THREE.Mesh( arrowGeometry, new GizmoMaterial( { color: 0x00ff00 } ) ), [ 0, 0.5, 0 ] ],
			[ new THREE.Line( lineYGeometry, new GizmoLineMaterial( { color: 0x00ff00 } ) ) ]
		],

		Z: [
			[ new THREE.Mesh( arrowGeometry, new GizmoMaterial( { color: 0x0000ff } ) ), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
			[ new THREE.Line( lineZGeometry, new GizmoLineMaterial( { color: 0x0000ff } ) ) ]
		],

		XYZ: [
			[ new THREE.Mesh( new THREE.BoxGeometry( 0.125, 0.125, 0.125 ), new GizmoMaterial( { color: 0xffffff, opacity: 0.25 } ) ) ]
		]

	};

	this.pickerGizmos = {

		X: [
			[ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
		],

		Y: [
			[ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0.6, 0 ] ]
		],

		Z: [
			[ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
		],

		XYZ: [
			[ new THREE.Mesh( new THREE.BoxGeometry( 0.4, 0.4, 0.4 ), pickerMaterial ) ]
		]

	};

	this.setActivePlane = function ( axis, eye ) {

		var tempMatrix = new THREE.Matrix4();
		eye.applyMatrix4( tempMatrix.getInverse( tempMatrix.extractRotation( this.planes[ "XY" ].matrixWorld ) ) );

		if ( axis === "X" ) {

			this.activePlane = this.planes[ "XY" ];
			if ( Math.abs( eye.y ) > Math.abs( eye.z ) ) this.activePlane = this.planes[ "XZ" ];

		}

		if ( axis === "Y" ) {

			this.activePlane = this.planes[ "XY" ];
			if ( Math.abs( eye.x ) > Math.abs( eye.z ) ) this.activePlane = this.planes[ "YZ" ];

		}

		if ( axis === "Z" ) {

			this.activePlane = this.planes[ "XZ" ];
			if ( Math.abs( eye.x ) > Math.abs( eye.y ) ) this.activePlane = this.planes[ "YZ" ];

		}

		if ( axis === "XYZ" ) this.activePlane = this.planes[ "XYZE" ];

	};

	this.init();

};

THREE.TransformGizmoScale.prototype = Object.create( THREE.TransformGizmo.prototype );
THREE.TransformGizmoScale.prototype.constructor = THREE.TransformGizmoScale;


var Mode = {

	TRANSLATE: "translate",
	ROTATE: "rotate",
	SCALE: "scale"

};

var Space = {

	WORLD: "world",
	LOCAL: "local"

};

var TransformControls = function ( cameraObs, domElement ) {

	var _self = Object.create( THREE.Object3D.prototype );
	THREE.Object3D.call( _self );

	domElement = ( domElement !== undefined ) ? domElement : document;

	_self.object = ko.observable( undefined );
	_self.mode = ko.observable( "translate" );
	_self.visible = false;
	_self.translationSnap = null;
	_self.rotationSnap = null;
	_self.space = "world";
	_self.size = 1.5;
	_self.axis = null;

	var scope = _self;

	var _dragging = false;
	var _plane = "XY";
	var _gizmo = {

		"translate": new THREE.TransformGizmoTranslate(),
		"rotate": new THREE.TransformGizmoRotate(),
		"scale": new THREE.TransformGizmoScale()
	};

	for ( var type in _gizmo ) {

		var gizmoObj = _gizmo[ type ];

		gizmoObj.visible = ( type === _self.mode() );
		_self.add( gizmoObj );

	}

	var changeEvent = { type: "change" };
	var mouseDownEvent = { type: "mouseDown" };
	var mouseUpEvent = { type: "mouseUp", mode: _self.mode() };
	var objectChangeEvent = { type: "objectChange" };

	var ray = new THREE.Raycaster();
	var rayOriginCb = null;

	var point = new THREE.Vector3();
	var offset = new THREE.Vector3();

	var rotation = new THREE.Vector3();
	var offsetRotation = new THREE.Vector3();
	var scale = 1;
	var scaleNormalizer = 2;
	var zoomNormalizer = 1.0 / 6.0;

	var lookAtMatrix = new THREE.Matrix4();
	var eye = new THREE.Vector3();

	var tempMatrix = new THREE.Matrix4();
	var tempVector = new THREE.Vector3();
	var tempQuaternion = new THREE.Quaternion();
	var unitX = new THREE.Vector3( 1, 0, 0 );
	var unitY = new THREE.Vector3( 0, 1, 0 );
	var unitZ = new THREE.Vector3( 0, 0, 1 );

	var quaternionXYZ = new THREE.Quaternion();
	var quaternionX = new THREE.Quaternion();
	var quaternionY = new THREE.Quaternion();
	var quaternionZ = new THREE.Quaternion();
	var quaternionE = new THREE.Quaternion();

	var oldPosition = new THREE.Vector3();
	var oldScale = new THREE.Vector3();
	var oldRotationMatrix = new THREE.Matrix4();

	var parentRotationMatrix  = new THREE.Matrix4();
	var parentScale = new THREE.Vector3();

	var worldPosition = new THREE.Vector3();
	var worldRotation = new THREE.Euler();
	var worldRotationMatrix  = new THREE.Matrix4();
	var camPosition = new THREE.Vector3();
	var camRotation = new THREE.Euler();


	_self.dispose = function () {

	};

	_self.attach = function ( object ) {

		_self.object( object );
		_self.visible = true;
		_self.update();

	};

	_self.detach = function () {

		_self.object( undefined );
		_self.visible = false;
		_self.axis = null;

	};

	_self.isDragging = function () {

		return _dragging;

	};

	_self.setRayOriginCallback = function ( cb ) {

		rayOriginCb = cb;

	};

	_self.getMode = function () {

		return _mode;

	};

	_self.setMode = function ( mode ) {

		_self.mode( mode ? mode : _self.mode() );

		if ( _self.mode() === "scale" ) scope.space = "local";

		for ( var type in _gizmo ) _gizmo[ type ].visible = ( type === _self.mode() );

		_self.update();

	};

	_self.setTranslationSnap = function ( translationSnap ) {

		scope.translationSnap = translationSnap;

	};

	_self.setRotationSnap = function ( rotationSnap ) {

		scope.rotationSnap = rotationSnap;

	};

	_self.setSize = function ( size ) {

		scope.size = size;
		_self.update();

	};

	_self.setSpace = function ( space ) {

		scope.space = space;
		_self.update();

	};

	_self.update = function () {

		if ( scope.object() === undefined ) return;

		var object = scope.object();
		var camera = cameraObs();

		object.updateMatrixWorld();
		worldPosition.setFromMatrixPosition( object.matrixWorld );
		worldRotation.setFromRotationMatrix( tempMatrix.extractRotation( object.matrixWorld ) );

		camera.updateMatrixWorld();
		camPosition.setFromMatrixPosition( camera.matrixWorld );
		camRotation.setFromRotationMatrix( tempMatrix.extractRotation( camera.matrixWorld ) );

		scale = getScale();
		_self.position.copy( worldPosition );
		_self.scale.set( scale, scale, scale );

		eye.copy( camPosition ).sub( worldPosition ).normalize();

		if ( scope.space === "local" ) {

			_gizmo[ _self.mode() ].update( worldRotation, eye );

		} else if ( scope.space === "world" ) {

			_gizmo[ _self.mode() ].update( new THREE.Euler(), eye );

		}

		_gizmo[ _self.mode() ].highlight( scope.axis );

	};

	function getScale() {
		var camera = cameraObs();

		if (camera.fov != null) {
			// perspective camera
			return worldPosition.distanceTo( camPosition ) * zoomNormalizer * scope.size;
		} else {
			// orthographic camera
			var height = camera.top - camera.bottom;
			return height * zoomNormalizer * scope.size;
		}
	}

	function onPointerHover( event ) {

		if ( scope.object() === undefined || _dragging === true || ( event.button !== undefined && event.button !== 0 ) ) return;

		var intersect = intersectObjects( _gizmo[ _self.mode() ].pickers.children );

		var axis = null;

		if ( intersect ) {

			axis = intersect.object.name;

		}

		if ( scope.axis !== axis ) {

			scope.axis = axis;
			scope.update();

		}

	}

	function onPointerDown( event ) {

		if ( scope.object() === undefined || _dragging === true ) return;

		var object = scope.object();

		if ( event.button === evt.BUTTON_DATA.LEFT ) {

			var intersect = intersectObjects( _gizmo[ _self.mode() ].pickers.children );

			if ( intersect ) {

				//scope.dispatchEvent( mouseDownEvent );

				scope.axis = intersect.object.name;

				scope.update();

				eye.copy( camPosition ).sub( worldPosition ).normalize();

				_gizmo[ _self.mode() ].setActivePlane( scope.axis, eye );

				var planeIntersect = intersectObjects( [ _gizmo[ _self.mode() ].activePlane ] );

				if ( planeIntersect ) {

					oldPosition.copy( object.position );
					oldScale.copy( object.scale );

					oldRotationMatrix.extractRotation( object.matrix );
					worldRotationMatrix.extractRotation( object.matrixWorld );

					parentRotationMatrix.extractRotation( object.parent.matrixWorld );
					parentScale.setFromMatrixScale( tempMatrix.getInverse( object.parent.matrixWorld ) );

					offset.copy( planeIntersect.point );

				}

				_dragging = true;

			}

		}

	}

	function onPointerMove( event ) {

		if ( scope.object() === undefined || scope.axis === null || _dragging === false || ( event.button !== undefined && event.button !== 0 ) ) return;

		var object = scope.object();

		var planeIntersect = intersectObjects( [ _gizmo[ _self.mode() ].activePlane ] );

		if ( planeIntersect === false ) return;

		point.copy( planeIntersect.point );

		if ( _self.mode() === "translate" ) {

			point.sub( offset );
			point.multiply( parentScale );

			if ( scope.space === "local" ) {

				point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

				if ( scope.axis.search( "X" ) === - 1 ) point.x = 0;
				if ( scope.axis.search( "Y" ) === - 1 ) point.y = 0;
				if ( scope.axis.search( "Z" ) === - 1 ) point.z = 0;

				point.applyMatrix4( oldRotationMatrix );

				object.position.copy( oldPosition );
				object.position.add( point );

			}

			if ( scope.space === "world" || scope.axis.search( "XYZ" ) !== - 1 ) {

				if ( scope.axis.search( "X" ) === - 1 ) point.x = 0;
				if ( scope.axis.search( "Y" ) === - 1 ) point.y = 0;
				if ( scope.axis.search( "Z" ) === - 1 ) point.z = 0;

				point.applyMatrix4( tempMatrix.getInverse( parentRotationMatrix ) );

				object.position.copy( oldPosition );
				object.position.add( point );

			}

			if ( scope.translationSnap !== null ) {

				if ( scope.space === "local" ) {

					object.position.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

				}

				if ( scope.axis.search( "X" ) !== - 1 ) object.position.x = Math.round( object.position.x / scope.translationSnap ) * scope.translationSnap;
				if ( scope.axis.search( "Y" ) !== - 1 ) object.position.y = Math.round( object.position.y / scope.translationSnap ) * scope.translationSnap;
				if ( scope.axis.search( "Z" ) !== - 1 ) object.position.z = Math.round( object.position.z / scope.translationSnap ) * scope.translationSnap;

				if ( scope.space === "local" ) {

					object.position.applyMatrix4( worldRotationMatrix );

				}

			}

		} else if ( _self.mode() === "scale" ) {

			point.sub( offset );
			point.multiply( parentScale );

			if ( scope.space === "local" ) {

				if ( scope.axis === "XYZ" ) {

					scale = 1 + ( ( point.y ) / scaleNormalizer );

					object.scale.x = oldScale.x * scale;
					object.scale.y = oldScale.y * scale;
					object.scale.z = oldScale.z * scale;

				} else {

					point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

					if ( scope.axis === "X" ) object.scale.x = oldScale.x * ( 1 + point.x / scaleNormalizer );
					if ( scope.axis === "Y" ) object.scale.y = oldScale.y * ( 1 + point.y / scaleNormalizer );
					if ( scope.axis === "Z" ) object.scale.z = oldScale.z * ( 1 + point.z / scaleNormalizer );

				}

			}

		} else if ( _self.mode() === "rotate" ) {

			point.sub( worldPosition );
			point.multiply( parentScale );
			tempVector.copy( offset ).sub( worldPosition );
			tempVector.multiply( parentScale );

			if ( scope.axis === "E" ) {

				point.applyMatrix4( tempMatrix.getInverse( lookAtMatrix ) );
				tempVector.applyMatrix4( tempMatrix.getInverse( lookAtMatrix ) );

				rotation.set( Math.atan2( point.z, point.y ), Math.atan2( point.x, point.z ), Math.atan2( point.y, point.x ) );
				offsetRotation.set( Math.atan2( tempVector.z, tempVector.y ), Math.atan2( tempVector.x, tempVector.z ), Math.atan2( tempVector.y, tempVector.x ) );

				tempQuaternion.setFromRotationMatrix( tempMatrix.getInverse( parentRotationMatrix ) );

				quaternionE.setFromAxisAngle( eye, rotation.z - offsetRotation.z );
				quaternionXYZ.setFromRotationMatrix( worldRotationMatrix );

				tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionE );
				tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionXYZ );

				object.quaternion.copy( tempQuaternion );

			} else if ( scope.axis === "XYZE" ) {

				quaternionE.setFromEuler( point.clone().cross( tempVector ).normalize() ); // rotation axis

				tempQuaternion.setFromRotationMatrix( tempMatrix.getInverse( parentRotationMatrix ) );
				quaternionX.setFromAxisAngle( quaternionE, - point.clone().angleTo( tempVector ) );
				quaternionXYZ.setFromRotationMatrix( worldRotationMatrix );

				tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionX );
				tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionXYZ );

				object.quaternion.copy( tempQuaternion );

			} else if ( scope.space === "local" ) {

				point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

				tempVector.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

				rotation.set( Math.atan2( point.z, point.y ), Math.atan2( point.x, point.z ), Math.atan2( point.y, point.x ) );
				offsetRotation.set( Math.atan2( tempVector.z, tempVector.y ), Math.atan2( tempVector.x, tempVector.z ), Math.atan2( tempVector.y, tempVector.x ) );

				quaternionXYZ.setFromRotationMatrix( oldRotationMatrix );

				if ( scope.rotationSnap !== null ) {

					quaternionX.setFromAxisAngle( unitX, Math.round( ( rotation.x - offsetRotation.x ) / scope.rotationSnap ) * scope.rotationSnap );
					quaternionY.setFromAxisAngle( unitY, Math.round( ( rotation.y - offsetRotation.y ) / scope.rotationSnap ) * scope.rotationSnap );
					quaternionZ.setFromAxisAngle( unitZ, Math.round( ( rotation.z - offsetRotation.z ) / scope.rotationSnap ) * scope.rotationSnap );

				} else {

					quaternionX.setFromAxisAngle( unitX, rotation.x - offsetRotation.x );
					quaternionY.setFromAxisAngle( unitY, rotation.y - offsetRotation.y );
					quaternionZ.setFromAxisAngle( unitZ, rotation.z - offsetRotation.z );

				}

				if ( scope.axis === "X" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionX );
				if ( scope.axis === "Y" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionY );
				if ( scope.axis === "Z" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionZ );

				object.quaternion.copy( quaternionXYZ );

			} else if ( scope.space === "world" ) {

				rotation.set( Math.atan2( point.z, point.y ), Math.atan2( point.x, point.z ), Math.atan2( point.y, point.x ) );
				offsetRotation.set( Math.atan2( tempVector.z, tempVector.y ), Math.atan2( tempVector.x, tempVector.z ), Math.atan2( tempVector.y, tempVector.x ) );

				tempQuaternion.setFromRotationMatrix( tempMatrix.getInverse( parentRotationMatrix ) );

				if ( scope.rotationSnap !== null ) {

					quaternionX.setFromAxisAngle( unitX, Math.round( ( rotation.x - offsetRotation.x ) / scope.rotationSnap ) * scope.rotationSnap );
					quaternionY.setFromAxisAngle( unitY, Math.round( ( rotation.y - offsetRotation.y ) / scope.rotationSnap ) * scope.rotationSnap );
					quaternionZ.setFromAxisAngle( unitZ, Math.round( ( rotation.z - offsetRotation.z ) / scope.rotationSnap ) * scope.rotationSnap );

				} else {

					quaternionX.setFromAxisAngle( unitX, rotation.x - offsetRotation.x );
					quaternionY.setFromAxisAngle( unitY, rotation.y - offsetRotation.y );
					quaternionZ.setFromAxisAngle( unitZ, rotation.z - offsetRotation.z );

				}

				quaternionXYZ.setFromRotationMatrix( worldRotationMatrix );

				if ( scope.axis === "X" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionX );
				if ( scope.axis === "Y" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionY );
				if ( scope.axis === "Z" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionZ );

				tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionXYZ );

				object.quaternion.copy( tempQuaternion );

			}

		}

		scope.update();

	}

	function onPointerUp( event ) {

		_dragging = false;
		onPointerHover( event );

	}

	function intersectObjects( objects ) {

		ray.setFromCamera( rayOriginCb(), cameraObs() );
		var intersections = ray.intersectObjects( objects, true );
		return intersections[0] ? intersections[0] : false;

	}

	// expose handlers so that we can externally control when to call them
	_self.PointerDown = onPointerDown;
	_self.PointerMove = onPointerMove;
	_self.PointerHover = onPointerHover;
	_self.PointerUp = onPointerUp;

	return _self;

};


return {

	Create: TransformControls,
	Mode: Mode,
	Space: Space

};

});
