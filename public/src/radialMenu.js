// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

/**
 * Menu System for SAGE2 Display Clients
 *
 * @module client
 * @submodule RadialMenu
 */

// layout parameters (Defaults based on Cyber-Commons touch interaction)
var imageThumbSize = 75;
var thumbSpacer = 5;

//var thumbnailWindowWidth = 0.8;
var previewWindowWidth = 0.2;
//var previewWindowOffset = 0.74;

// radial menu buttons
var radialMenuScale = 1.0;
//var thumbnailWindowMinTextHeight = 24;

var radialMenuCenter = { x: 215 * radialMenuScale, y: 215 * radialMenuScale }; // overwritten in init - based on window size
//var radialMenuSize = { x: 425 * radialMenuScale, y: 425 * radialMenuScale };
var angleSeparation = 35;
var initAngle = 55;
var angle = 0;
var menuRadius = 100;
var menuButtonSize = 100; // pie image size
var menuButtonHitboxSize = 50;
var overlayIconScale = 0.5; // image, pdf, etc image

var thumbnailScrollScale = 1;
var thumbnailDisableSelectionScrollDistance = 5; // Distance in pixels scroll window can move before button select is cancelled
var thumbnailWindowSize = { x: 1024, y: 768 };
var thumbnailPreviewWindowSize = { x: 550, y: 800 };

var radialMenuList = {};

// Mostly for debugging, toggles buttons/thumbnails redrawing on a events (like move)
//var enableEventRedraw = false;

// common radial menu icons
var radialButtonIcon = new Image();
radialButtonIcon.src = "images/radialMenu/icon_radial_button_circle.svg";
var radialMenuLevel2Icon = new Image();
radialMenuLevel2Icon.src = "images/radialMenu/icon_radial_level2_360.png";
var idleExitIcon = new Image();
idleExitIcon.src = "images/ui/close.svg";

// Level 1 radial icons
var idleRemoteSitesIcon = new Image();
idleRemoteSitesIcon.src = "images/ui/remote.svg";
var idlePDFIcon = new Image();
idlePDFIcon.src = "images/ui/pdfs.svg";
var idleImageIcon = new Image();
idleImageIcon.src = "images/ui/images.svg";
var idleVideoIcon = new Image();
idleVideoIcon.src = "images/ui/videos.svg";
var idleAppIcon = new Image();
idleAppIcon.src = "images/ui/applauncher.svg";
var idleSessionIcon = new Image();
idleSessionIcon.src = "images/ui/loadsession.svg";
var idleSaveSessionIcon = new Image();
idleSaveSessionIcon.src = "images/ui/savesession.svg";
var idleSettingsIcon = new Image();
idleSettingsIcon.src = "images/ui/arrangement.svg";

// Level 2 radial icons
var idleFolderIcon = new Image();
idleFolderIcon.src = "images/radialMenu/open131.svg";
var idleCloseAppIcon = new Image();
idleCloseAppIcon.src = "images/radialMenu/window27.svg";
var idleCloseAllIcon = new Image();
idleCloseAllIcon.src = "images/ui/clearcontent.svg";
var idleMaximizeIcon = new Image();
idleMaximizeIcon.src = "images/radialMenu/maximize.svg";
var idleTileIcon = new Image();
idleTileIcon.src = "images/ui/tilecontent.svg";

var radialDragIcon = new Image();
radialDragIcon.src = "images/radialMenu/drag-ring.svg";

/**
 * Radial menu and Thumbnail Content Window
 * @class RadialMenu
 * @constructor
 */
function RadialMenu(){
	this.element    = null;
	this.ctx        = null;

	this.thumbnailScrollWindowElement = null;
	this.thumbScrollWindowctx = null;

	this.thumbnailScrollWindowElement2 = null;
	this.thumbScrollWindowctx2 = null;

	this.thumbnailWindowSize = thumbnailWindowSize;
	this.imageThumbSize = imageThumbSize;

	// This is the number of thumbnails in the window WITHOUT scrolling
	this.thumbnailGridSize = { x: 10, y: 10 }; // Overwritten in setThumbnailPosition().

	this.level1Buttons = [];
	this.level2Buttons = [];

	this.radialMenuButtons = {};
	this.thumbnailWindows = {};

	/**
	 * Helper function for creating radial menu buttons
	 *
	 * @method addRadialMenuButton
	 * @param name {String} name of the button
	 * @param icon {Image} icon image for the button
	 * @param iconScale {Float} scale factor for icon
	 * @param dim {{buttonSize: float, hitboxSize: float}} object specifying the button display and hitbox size
	 * @param alignment {String} where the center of the button is defined 'left' (default) or 'centered'
	 * @param radialAnglePos {Float} position of the button along the radius. based on angleSeparation and initAngle
	 * @param radialLevel {Float} radial level of button (0 = center, 1 = standard icons, 2 = secondary icons)
	 * @return {ButtonWidget} the ButtonWidget object created
	 */
	this.addRadialMenuButton = function(name, icon, iconScale, dim, alignment, radialAnglePos, radialLevel ){
		var button = this.createRadialButton( radialButtonIcon, false, dim.buttonSize, dim.hitboxSize, alignment, dim.shape, radialAnglePos, menuRadius );
		button.setOverlayImage( icon, iconScale );

		if( radialLevel === 1 )
			this.level1Buttons.push(button);

		this.radialMenuButtons[name] = button;
		return button;
	};

	/**
	 * Initialization
	 *
	 * @method init
	 * @param data { id: this.pointerid, x: this.left, y: this.top, radialMenuSize: this.radialMenuSize, thumbnailWindowSize: this.thumbnailWindowSize, radialMenuScale: this.radialMenuScale, visble: this.visible } Radial menu info from node-radialMenu
	 * @param thumbElem {Element} DOM element for the thumbnail content window
	 * @param thumbElem2 {Element} DOM element for the metadata window (not currently implemented)
	 */
	this.init = function(data, thumbElem, thumbElem2) {
		this.divCtxDebug = false;

		this.id = data.id;
		radialMenuScale = data.radialMenuScale;
		radialMenuCenter = { x: 215 * radialMenuScale, y: 215 * radialMenuScale }; // overwritten in init - based on window size
		this.radialMenuSize = data.radialMenuSize;

		this.thumbnailWindowSize.x = data.thumbnailWindowSize.x;
		this.thumbnailWindowSize.y = data.thumbnailWindowSize.y;
		this.imageThumbSize = imageThumbSize * radialMenuScale;

		this.textHeaderHeight = 32  * radialMenuScale;

		this.element = document.getElementById(this.id+"_menu"); // gets because pointer is assumed to be created with initial connection (else createElement( canvas tag)
		this.ctx     = this.element.getContext("2d");

		this.resrcPath = "images/radialMenu/";

		this.menuID = this.id+"_menu";
		this.currentMenuState = 'radialMenu';
		this.currentRadialState = 'radialMenu';
		this.radialMenuCenter = radialMenuCenter;

		this.settingMenuOpen = false;

		this.timer = 0;
		this.menuState = 'open';
		this.stateTransition = 0;
		this.stateTransitionTime = 1;

		this.visible = true;
		this.windowInteractionMode = false;
		this.ctx.redraw = true;
		this.dragPosition = { x: 0, y: 0 };

		this.notEnoughThumbnailsToScroll = false; // Flag to stop scrolling if there are not enough thumbnails
		this.dragThumbnailWindow = false;
		this.thumbnailWindowPosition = { x: (radialMenuCenter.x * 2 + this.imageThumbSize/2), y: 30 * radialMenuScale };
		this.thumbnailWindowDragPosition = { x: 0, y: 0 };
		this.thumbnailWindowScrollOffset = { x: 0, y: 0 };
		this.thumbnailWindowInitialScrollOffset = { x: 0, y: 0 };

		this.thumbnailWindowDiv = document.getElementById(this.id+"_menuDiv");
		this.thumbnailWindowDiv.style.left   = (this.element.style.left+this.thumbnailWindowPosition.x).toString() + "px";
		this.thumbnailWindowDiv.style.top    = (this.element.style.top+this.thumbnailWindowPosition.y).toString() + "px";

		// Debug: Show scrolling window background
		if (this.divCtxDebug) {
			this.thumbnailWindowDiv.style.backgroundColor = "rgba(10,50,200,0.2)";
		}

		this.thumbnailScrollWindowElement = thumbElem;
		this.thumbScrollWindowctx = this.thumbnailScrollWindowElement.getContext("2d");

		this.thumbnailWindowScrollLock = { x: false, y: true };
		this.scrollOpenContentLock = false; // Stop opening content/app if window is scrolling

		this.thumbnailScrollWindowElement.width = this.thumbnailWindowSize.x - this.thumbnailWindowPosition.x;
		this.thumbnailScrollWindowElement.height = this.thumbnailWindowSize.y - this.thumbnailWindowPosition.y;
		this.thumbnailScrollWindowElement.style.display = "block";

		this.hoverOverText = "";
		radialMenuList[this.id+"_menu"] = this;

		if (isMaster) {
			this.wsio = wsio;
			this.sendsToServer = true;
		} else {
			this.sendsToServer = false;
		}

		// Create buttons
		// icon, useBackgroundColor, buttonSize, hitboxSize, alignment, hitboxType, radialAnglePos, radialDistance
		this.radialDragButton = this.createRadialButton( radialDragIcon, false, 500, this.imageThumbSize, 'centered', 'circle', 0, 0 );

		this.radialCenterButton = this.createRadialButton( radialButtonIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 0, 0 );

		this.radialRemoteSitesButton = this.addRadialMenuButton("radialRemoteSitesButton", idleRemoteSitesIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 0, 1);
		this.radialRemoteSitesButton.setHidden(true);

		this.radialPDFButton = this.addRadialMenuButton("radialPDFButton", idlePDFIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 1, 1);

		this.radialImageButton = this.addRadialMenuButton("radialImageButton", idleImageIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 2, 1);

		this.radialVideoButton = this.addRadialMenuButton("radialVideoButton", idleVideoIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 3, 1);

		this.radialAppButton = this.addRadialMenuButton("radialAppButton", idleAppIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 4, 1);

		this.radialSessionButton = this.addRadialMenuButton("radialSessionButton", idleSessionIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 5, 1);

		this.radialSaveSessionButton = this.addRadialMenuButton("radialSaveSessionButton", idleSaveSessionIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 6, 1);

		this.radialSettingsButton = this.addRadialMenuButton("radialSettingsButton", idleSettingsIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 7.5, 1);

		this.radialCloseButton = this.addRadialMenuButton("radialCloseButton", idleExitIcon, overlayIconScale, {buttonSize: menuButtonSize, hitboxSize: menuButtonHitboxSize, shape: 'circle'}, 'centered', 8.5, 1);

		// Radial level 2 (Not currently used + really old way of creating buttons)
		var menu2ButtonSize = 140;
		var menuLevel2Radius = menuRadius + menuButtonSize/2 + 10;

		this.radial2CloseAllButton = this.createRadialButton( radialButtonIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 7.875, menuLevel2Radius );
		this.radial2CloseAllButton.setOverlayImage( idleCloseAllIcon, overlayIconScale );

		this.radial2TileButton = this.createRadialButton( radialButtonIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 7.175, menuLevel2Radius );
		this.radial2TileButton.setOverlayImage( idleTileIcon, overlayIconScale );

		this.radial2ImageButton = new ButtonWidget();
		this.radial2ImageButton.init(0, this.ctx, null);
		this.radial2ImageButton.setButtonImage( radialButtonIcon );
		this.radial2ImageButton.useBackgroundColor = false;
		this.radial2ImageButton.setOverlayImage( idleImageIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );

		this.radial2PDFButton = new ButtonWidget();
		this.radial2PDFButton.init(0, this.ctx, null);
		this.radial2PDFButton.setButtonImage( radialButtonIcon );
		this.radial2PDFButton.useBackgroundColor = false;
		this.radial2PDFButton.setOverlayImage( idlePDFIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );

		this.radial2VideoButton = new ButtonWidget();
		this.radial2VideoButton.init(0, this.ctx, null);
		this.radial2VideoButton.setButtonImage( radialButtonIcon );
		this.radial2VideoButton.useBackgroundColor = false;
		this.radial2VideoButton.setOverlayImage( idleVideoIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );

		this.radial2AppButton = new ButtonWidget();
		this.radial2AppButton.init(0, this.ctx, null);
		this.radial2AppButton.setButtonImage( radialButtonIcon );
		this.radial2AppButton.useBackgroundColor = false;
		this.radial2AppButton.setOverlayImage( idleAppIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );


		this.radial2ImageButton.setSize( menu2ButtonSize, menu2ButtonSize );
		this.radial2PDFButton.setSize( menu2ButtonSize, menu2ButtonSize );
		this.radial2VideoButton.setSize( menu2ButtonSize, menu2ButtonSize );
		this.radial2AppButton.setSize( menu2ButtonSize, menu2ButtonSize );


		this.radial2ImageButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radial2PDFButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radial2VideoButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radial2AppButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );

		this.radial2ImageButton.alignment = 'centered';
		this.radial2PDFButton.alignment = 'centered';
		this.radial2VideoButton.alignment = 'centered';
		this.radial2AppButton.alignment = 'centered';
		this.radial2CloseAllButton.alignment = 'centered';
		this.radial2TileButton.alignment = 'centered';

		angle = (initAngle + angleSeparation * 1) * (Math.PI/180);
		this.radial2ImageButton.setPosition( radialMenuCenter.x - menuLevel2Radius * Math.cos(angle), radialMenuCenter.y - menuLevel2Radius * Math.sin(angle) );
		this.radial2ImageButton.setRotation( angle - Math.PI/2 );

		angle = (initAngle + angleSeparation * 0) * (Math.PI/180);
		this.radial2PDFButton.setPosition( radialMenuCenter.x - menuLevel2Radius * Math.cos(angle), radialMenuCenter.y - menuLevel2Radius * Math.sin(angle) );
		this.radial2PDFButton.setRotation( angle - Math.PI/2 );

		angle = (initAngle + angleSeparation * 2) * (Math.PI/180);
		this.radial2VideoButton.setPosition( radialMenuCenter.x - menuLevel2Radius * Math.cos(angle), radialMenuCenter.y - menuLevel2Radius * Math.sin(angle) );
		this.radial2VideoButton.setRotation( angle - Math.PI/2 );

		angle = (initAngle + angleSeparation * 3) * (Math.PI/180);
		this.radial2AppButton.setPosition( radialMenuCenter.x - menuLevel2Radius * Math.cos(angle), radialMenuCenter.y - menuLevel2Radius * Math.sin(angle) );
		this.radial2AppButton.setRotation( angle - Math.PI/2 );


	};

	/**
	 * Helper function for creating a radial button (more generic than addRadialMenuButton)
	 *
	 * @method createRadialButton
	 * @param icon {Image} icon image for the button
	 * @param useBackgroundColor {Boolean}
	 * @param buttonSize {Float} size of the button in pixels
	 * @param hitboxSize {Float} size of the button hitbox in pixels
	 * @param alignment {String} where the center of the button is defined 'left' (default) or 'centered'
	 * @param hitboxShape {String} shape of the hitbox 'box' or 'circle'
	 * @param radialPos {Float} position of the button along the radius. based on angleSeparation and initAngle
	 * @param buttonRadius {Float} distance from the center of the menu
	 * @return {ButtonWidget} the ButtonWidget object created
	 */
	this.createRadialButton = function( idleIcon, useBackgroundColor, buttonSize, hitboxSize, alignment, hitboxShape, radialPos, buttonRadius )	{
		var button = new ButtonWidget();
		button.init(0, this.ctx, null);
		button.setButtonImage( idleIcon );
		button.useBackgroundColor = useBackgroundColor;
		button.useEventOverColor = true;

		button.setSize( buttonSize * radialMenuScale, buttonSize * radialMenuScale );
		button.setHitboxSize( hitboxSize * radialMenuScale, hitboxSize * radialMenuScale );

		button.alignment = alignment;
		button.hitboxShape = hitboxShape;

		angle = (initAngle + angleSeparation * radialPos) * (Math.PI/180);
		button.setPosition( radialMenuCenter.x - buttonRadius * radialMenuScale  * Math.cos(angle), radialMenuCenter.y - buttonRadius * radialMenuScale * Math.sin(angle) );
		button.setRotation( angle - Math.PI/2 );

		return button;
	};

	/**
	 * Helper function for drawing an image
	 *
	 * @method drawImage
	 * @param ctx {Context} context to draw on
	 * @param image {Image} image to draw
	 * @param position {x: Float, y: Float} position to draw
	 * @param size {x: Float, y: Float} width, height of image
	 * @param color {Color} fill color to use
	 * @param rotation {Float} rotation of the image (not currently used)
	 * @param centered {Boolean} is the center of the image the origin for positioning
	 */
	this.drawImage = function( ctx, image, position, size, color, rotation, centered ) {
		//this.ctx.save();
		ctx.fillStyle = color;
		//this.ctx.translate( position.x , position.y );
		//this.ctx.rotate( (initAngle + angleSeparation * angleIncrement + 90) * (Math.PI/180) );
		if( centered )
			ctx.drawImage(image, position.x - size.x/2, position.y - size.y/2, size.x, size.y);
		else
			ctx.drawImage(image, position.x, position.y, size.x, size.y);

		//this.ctx.restore();
	};

	/**
	 * Forces a redraw of the menu
	 *
	 * @method redraw
	 */
	this.redraw = function() {
		this.thumbScrollWindowctx.redraw = true;

		this.draw();
	};

	/**
	 * Draws the menu
	 *
	 * @method draw
	 */
	this.draw = function() {
		// clear canvas
		this.ctx.clearRect(0, 0, this.element.width, this.element.height);

		if( this.thumbScrollWindowctx.redraw || this.currentMenuState === 'radialMenu') {
			this.thumbScrollWindowctx.clearRect(0, 0, this.thumbnailScrollWindowElement.width, this.thumbnailScrollWindowElement.height);
		}
		if( this.windowInteractionMode === false ) {
			this.ctx.fillStyle = "rgba(5, 15, 55, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		} else if( this.dragThumbnailWindow === true ) {
			this.ctx.fillStyle = "rgba(55, 55, 5, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		} else {
			this.ctx.fillStyle = "rgba(5, 5, 5, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		}

		// TEMP: Just to clearly see context edge
		if( this.divCtxDebug ) {
			this.ctx.fillStyle = "rgba(5, 255, 5, 0.3)";
			this.ctx.fillRect(0, 0, this.element.width, this.element.height);
		}

		if( this.menuState === 'opening' ) {
			if( this.stateTransition < 1 )
				this.stateTransition += this.stateTransitionTime / 1000;
			else
				this.stateTransition = 0;
		} else if( this.menuState === 'open' ) {
			this.stateTransition = 1;
		}

		this.radialDragButton.draw();

		if( this.currentMenuState !== 'radialMenu' ) {
			// line from radial menu to thumbnail window
			this.ctx.beginPath();
			this.ctx.moveTo( radialMenuCenter.x + menuButtonSize/4 * radialMenuScale, radialMenuCenter.y );
			this.ctx.lineTo( this.thumbnailWindowPosition.x - 18  * radialMenuScale, radialMenuCenter.y );
			this.ctx.strokeStyle = '#ffffff';
			this.ctx.lineWidth = 5 * radialMenuScale;
			this.ctx.stroke();
		}

		// draw lines to each button
		for( var i=0; i<this.level1Buttons.length; i++) {

			if( this.level1Buttons[i].isHidden() === false ) {
				this.ctx.beginPath();

				//this.ctx.moveTo(radialMenuCenter.x, radialMenuCenter.y);
				//this.ctx.lineTo(this.level1Buttons[i].posX, this.level1Buttons[i].posY);

				// We're adding -Math.PI/2 since angle also accounts for the initial orientation of the button image
				this.ctx.moveTo(radialMenuCenter.x + (menuButtonSize/4 * radialMenuScale) * Math.cos(this.level1Buttons[i].angle-Math.PI/2), radialMenuCenter.y + (menuButtonSize/4 * radialMenuScale) * Math.sin(this.level1Buttons[i].angle-Math.PI/2));

				this.ctx.lineTo(this.level1Buttons[i].posX + (menuButtonSize/4 * radialMenuScale) * Math.cos(this.level1Buttons[i].angle+Math.PI/2), this.level1Buttons[i].posY + (menuButtonSize/4 * radialMenuScale) * Math.sin(this.level1Buttons[i].angle+Math.PI/2));

				this.ctx.strokeStyle = '#ffffff';
				this.ctx.lineWidth = 5 * radialMenuScale;
				this.ctx.stroke();
			}
		}


		this.radialCenterButton.draw();
		this.radialCloseButton.draw();
		this.radialSettingsButton.draw();

		if( this.settingMenuOpen ) {
			this.radial2CloseAllButton.draw();
			this.radial2TileButton.draw();
		}

		if( this.currentRadialState === 'radialMenu' ) {
			this.radialMenuButtons.radialRemoteSitesButton.draw();
			this.radialMenuButtons.radialImageButton.draw();
			this.radialMenuButtons.radialPDFButton.draw();
			this.radialMenuButtons.radialVideoButton.draw();
			this.radialMenuButtons.radialAppButton.draw();
			this.radialMenuButtons.radialSessionButton.draw();
			this.radialMenuButtons.radialSaveSessionButton.draw();

			this.thumbnailWindowDiv.style.backgroundColor = "rgba(10,50,200,0.0)";
		}

		// Thumbnail window
		if( this.currentMenuState !== 'radialMenu' ) {
			this.thumbnailWindowDiv.style.backgroundColor = "rgba(5,5,5,0.5)";

			var currentThumbnailButtons = this.imageThumbnailButtons;

			if( this.currentMenuState === 'imageThumbnailWindow' )
				currentThumbnailButtons = this.imageThumbnailButtons;
			else if( this.currentMenuState === 'pdfThumbnailWindow' )
				currentThumbnailButtons = this.pdfThumbnailButtons;
			else if( this.currentMenuState === 'videoThumbnailWindow' )
				currentThumbnailButtons = this.videoThumbnailButtons;
			else if( this.currentMenuState === 'appThumbnailWindow' )
				currentThumbnailButtons = this.appThumbnailButtons;
			else if( this.currentMenuState === 'sessionThumbnailWindow' )
				currentThumbnailButtons = this.sessionThumbnailButtons;

			if( this.thumbScrollWindowctx.redraw ) {
				for( i = 0; i < currentThumbnailButtons.length; i++ ) {
					var thumbButton = currentThumbnailButtons[i];
					thumbButton.draw();
				}
				this.thumbScrollWindowctx.redraw = false;
			}

			// Preview window
			var previewImageSize = this.element.width * previewWindowWidth;
			var previewImageX = this.thumbnailWindowSize.x + this.imageThumbSize/2 - 10;
			var previewImageY = 60 + this.textHeaderHeight;

			// Metadata
			var metadataLine = 0;
			var metadataTextPosX = previewImageX;
			var metadataTextPosY = previewImageY + previewImageSize + 20  + this.textHeaderHeight;

			// Preview Window Background
			if( this.currentMenuState !== 'radialMenu' ) {
				this.ctx.fillStyle = "rgba(5, 5, 5, 0.5)";
				this.ctx.fillRect(previewImageX - 10, this.thumbnailWindowPosition.y + this.textHeaderHeight, previewImageSize + 20, this.thumbnailWindowSize.y);
			}

			this.borderLineThickness = 5 * radialMenuScale;

			// Thumbnail window - Title bar
			this.ctx.beginPath();
			this.ctx.moveTo(this.thumbnailWindowPosition.x - 18  * radialMenuScale - this.borderLineThickness/2, this.borderLineThickness/2 );
			this.ctx.lineTo( previewImageX - 10 - 40 * radialMenuScale + 2.5 * radialMenuScale -  this.borderLineThickness/2, this.borderLineThickness/2 ); // Top vertical line
			this.ctx.lineTo( previewImageX - 10 - this.borderLineThickness, this.thumbnailWindowPosition.y + this.textHeaderHeight - this.borderLineThickness/2 ); // Angled line
			this.ctx.lineTo( this.thumbnailWindowPosition.x - 18  * radialMenuScale -this.borderLineThickness/2, this.thumbnailWindowPosition.y + this.textHeaderHeight -this.borderLineThickness/2 ); // Bottom horizontal line
			this.ctx.closePath();

			this.ctx.fillStyle = '#50505080';
			this.ctx.fill();
			this.ctx.strokeStyle = '#ffffff';
			this.ctx.lineWidth = 5 * radialMenuScale;
			this.ctx.stroke();

			// Thumbnail window - Vert line
			this.ctx.beginPath();
			this.ctx.moveTo(this.thumbnailWindowPosition.x - 18  * radialMenuScale - this.borderLineThickness/2, this.thumbnailWindowPosition.y + this.textHeaderHeight );
			this.ctx.lineTo( this.thumbnailWindowPosition.x - 18  * radialMenuScale - this.borderLineThickness/2, this.thumbnailWindowSize.y);
			this.ctx.strokeStyle = '#ffffff';
			this.ctx.lineWidth = 5 * radialMenuScale;
			this.ctx.stroke();

			// Thumbnail window - Horz line across preview window
			this.ctx.beginPath();
			this.ctx.moveTo( previewImageX - 10 - 5 * radialMenuScale, this.thumbnailWindowPosition.y + this.textHeaderHeight - this.borderLineThickness/2 );
			this.ctx.lineTo( previewImageX - 10 + previewImageSize + 20, this.thumbnailWindowPosition.y + this.textHeaderHeight - this.borderLineThickness/2 );
			this.ctx.strokeStyle = '#ffffff';
			this.ctx.lineWidth = 5 * radialMenuScale;
			this.ctx.stroke();

			//this.drawImage( this.ctx, this.thumbnailWindowFrame, {x: (this.thumbnailWindowPosition.x - 38 * radialMenuScale), y: 0}, {x: 1984 * radialMenuScale, y: 1004}, "rgba(255, 255, 255, 0.9)", 0, false );

			// Filename text
			this.ctx.font= parseInt(this.textHeaderHeight)+"px sans-serif";
			this.ctx.fillStyle = "rgba(250, 250, 250, 1.0)";
			this.ctx.fillText( this.hoverOverText, this.thumbnailWindowPosition.x, this.thumbnailWindowPosition.y + this.textHeaderHeight / 1.8 );

			if( this.hoverOverThumbnail )
				this.ctx.drawImage( this.hoverOverThumbnail, previewImageX, previewImageY, previewImageSize, previewImageSize );

			if( this.hoverOverMeta ) {
				this.ctx.font="16px sans-serif";
				this.ctx.fillStyle = "rgba(250, 250, 250, 1.0)";
				var metadata = this.hoverOverMeta;
				//console.log( metadata);

				var metadataTags = [];

				// Generic
				metadataTags[0] = { tag: metadata.FileName, longLabel: "File Name: " };
				metadataTags[1] = { tag: metadata.FileSize, longLabel: "File Size: " };
				metadataTags[2] = { tag: metadata.FileDate, longLabel: "File Date: " };

				// Image
				metadataTags[2] = { tag: metadata.ImageSize, longLabel: "Resolution: " };
				metadataTags[3] = { tag: metadata.DateCreated, longLabel: "Date Created: " };
				metadataTags[4] = { tag: metadata.Copyright, longLabel: "Copyright: " };

				// Photo
				metadataTags[5] = { tag: metadata.Artist, longLabel: "Artist: " };
				metadataTags[6] = { tag: metadata.Aperture, longLabel: "Aperture: " };
				metadataTags[7] = { tag: metadata.Exposure, longLabel: "Exposure: " };
				metadataTags[8] = { tag: metadata.Flash, longLabel: "Flash: " };
				metadataTags[9] = { tag: metadata.ExposureTime, longLabel: "Exposure Time: " };
				metadataTags[10] = { tag: metadata.FOV, longLabel: "FOV: " };
				metadataTags[11] = { tag: metadata.FocalLength, longLabel: "Focal Length: " };
				metadataTags[12] = { tag: metadata.Model, longLabel: "Model: " };
				metadataTags[13] = { tag: metadata.LensModel, longLabel: "Lens Model: " };
				metadataTags[14] = { tag: metadata.ISO, longLabel: "ISO: " };
				metadataTags[15] = { tag: metadata.ShutterSpeed, longLabel: "Shutter Speed: " };

				// GPS
				metadataTags[16] = { tag: metadata.GPSAltitude, longLabel: "GPS Altitude: " };
				metadataTags[17] = { tag: metadata.GPSLatitude, longLabel: "GPS Latitude: " };
				metadataTags[18] = { tag: metadata.GPSTimeStamp, longLabel: "GPS TimeStamp: " };

				// Video
				metadataTags[19] = { tag: metadata.Duration, longLabel: "Duration: " };
				metadataTags[20] = { tag: metadata.CompressorID, longLabel: "Compressor: " };
				metadataTags[21] = { tag: metadata.AvgBitrate, longLabel: "Avg. Bitrate: " };
				metadataTags[22] = { tag: metadata.AudioFormat, longLabel: "Audio Format: " };
				metadataTags[23] = { tag: metadata.AudioChannels, longLabel: "Audio Channels: " };
				metadataTags[24] = { tag: metadata.AudioSampleRate, longLabel: "Audio Sample Rate: " };

				// Apps
				if( metadata.metadata !== undefined ) {
					metadataTags[25] = { tag: metadata.metadata.title, longLabel: "Title: " };
					metadataTags[26] = { tag: metadata.metadata.version, longLabel: "Version: " };
					metadataTags[27] = { tag: metadata.metadata.author, longLabel: "Author: " };
					metadataTags[28] = { tag: metadata.metadata.license, longLabel: "License: " };
					metadataTags[29] = { tag: metadata.metadata.keywords, longLabel: "Keywords: " };
					metadataTags[30] = { tag: metadata.metadata.description, longLabel: "Description: " };
				}

				// Sessions
				metadataTags[31] = { tag: metadata.numapps, longLabel: "Applications: " };

				for( i = 0; i < metadataTags.length; i++ ) {
					if( metadataTags[i] !== undefined && metadataTags[i].tag ) {
						this.ctx.fillText( metadataTags[i].longLabel + metadataTags[i].tag, metadataTextPosX, metadataTextPosY + metadataLine * 20);
						metadataLine++;
					}
				}
			}
		}

		this.ctx.redraw = false;
	};

	/**
	 * Closes the menu, sends close signal to server
	 *
	 * @method closeMenu
	 */
	this.closeMenu = function() {
		this.visible = false;

		if( this.sendsToServer === true )
			this.wsio.emit('removeRadialMenu', { id: this.id } );

		this.currentMenuState = 'radialMenu';
		this.resetRadialButtonLitState();

		console.log("Closing menu" );
	};

	/**
	 * Toggles the content window open/close
	 *
	 * @method setToggleMenu
	 */
	this.setToggleMenu = function(type) {
		if (this.currentMenuState !== type ) {
			this.thumbnailWindowScrollOffset = { x: 0, y: 0 };

			this.currentMenuState = type;
			this.element.width    = this.thumbnailWindowSize.x + thumbnailPreviewWindowSize.x;
			this.element.height   = this.thumbnailWindowSize.y;
			this.thumbnailScrollWindowElement.style.display = "block";
			this.thumbScrollWindowctx.redraw = true;
			this.updateThumbnailPositions();
			this.draw();

			if (this.sendsToServer === true) {
				this.wsio.emit('radialMenuWindowToggle', { id: this.id, thumbnailWindowOpen: true } );
			}
			return true;
		} else {
			this.currentMenuState = 'radialMenu';
			this.element.width    = this.radialMenuSize.x;
			this.element.height   = this.radialMenuSize.y;
			//this.thumbnailScrollWindowElement.style.display = "None";

			if (this.sendsToServer === true) {
				this.wsio.emit('radialMenuWindowToggle', { id: this.id, thumbnailWindowOpen: false } );
			}
			return false;
		}
	};

	/**
	 * Helper function to quickly reset the radial menu button lit state
	 *
	 * @method resetRadialButtonLitState
	 */
	this.resetRadialButtonLitState = function() {
		this.radialRemoteSitesButton.isLit = false;
		this.radialImageButton.isLit = false;
		this.radialPDFButton.isLit = false;
		this.radialVideoButton.isLit = false;
		this.radialAppButton.isLit = false;
		this.radialSessionButton.isLit = false;
	};

	/**
	 * Moves the radial menu based on master and server events
	 *
	 * @method moveMenu
	 * @param data {x: data.x, y: data.y, windowX: rect.left, windowY: rect.top} Contains the event position and the bounding rectangle
	 * @param offset {x: this.offsetX, y: this.offsetY} Contains the display client offset
	 */
	this.moveMenu = function( data, offset ) {
		// Note: We don't check if the pointer is over the menu because the server/node-radialMenu does this for us
		if( this.windowInteractionMode === false && this.buttonOverCount === 0 ) {
			var dragOffset = this.dragPosition;

			this.element.style.left    = (data.x - offset.x - dragOffset.x).toString() + "px";
			this.element.style.top     = (data.y - offset.y - dragOffset.y).toString()  + "px";
		}

		this.thumbnailWindowDiv.style.left   = (data.windowX + this.thumbnailWindowPosition.x - 18  * radialMenuScale).toString() + "px";
		this.thumbnailWindowDiv.style.top    = (data.windowY + this.thumbnailWindowPosition.y + this.textHeaderHeight).toString() + "px";

		this.thumbnailWindowDiv.style.width   = (this.thumbnailWindowSize.x + this.imageThumbSize/2 - 10 - this.radialMenuSize.x - 25 * radialMenuScale).toString() + "px";
		this.thumbnailWindowDiv.style.height    = (this.thumbnailWindowSize.y - this.textHeaderHeight * 2).toString() + "px";
	};

	/**
	 * Processes events
	 *
	 * @method onEvent
	 * @param type {String} i.e. "pointerPress", "pointerMove", "pointerRelease"
	 * @param position {x: Float, y: Float} event position
	 * @param user {Integer} userID
	 * @param data {} Other event parameters like button: "left"
	 */
	this.onEvent = function(type, position, user, data) {
		//console.log("RadialMenu " + this.menuID + " " + type + " " + position + " " + user + " " + data );
		this.buttonOverCount = 0; // Count number of buttons have a pointer over it

		// Level 0 - Always visible -----------------------------------
		this.buttonOverCount += this.radialCloseButton.onEvent(type, user.id, position, data);
		if ( this.radialCloseButton.isClicked() && data.button === "left" ) {
			if( this.sendsToServer === true ) {
				this.wsio.emit('radialMenuClick', {button: "closeButton", user: user} );
			}
			this.closeMenu();
		}

		this.buttonOverCount += this.radialSettingsButton.onEvent(type, user.id, position, data);

		this.buttonOverCount += this.radialSessionButton.onEvent(type, user.id, position, data);
		this.buttonOverCount += this.radialSaveSessionButton.onEvent(type, user.id, position, data);

		// Level 1 -----------------------------------
		var i = 0;
		if( this.currentRadialState === 'radialMenu' ) {
			//this.element.width = this.radialMenuSize.x;
			//this.element.height = this.radialMenuSize.y;
			for ( i = 0; i < this.level1Buttons.length; i++ ) {
				this.buttonOverCount += this.level1Buttons[i].onEvent(type, user.id, position, data);
			}
		}

		if( this.radialSettingsButton.isClicked() ) {
			if( this.settingMenuOpen ) {
				this.settingMenuOpen = false;
				this.radialSettingsButton.isLit = false;
				if( this.sendsToServer === true ) {
					this.wsio.emit('radialMenuClick', {button: "settingsButton", user: user, data: {state: "closed"}} );
				}
			} else {
				this.settingMenuOpen = true;
				this.radialSettingsButton.isLit = true;
				if( this.sendsToServer === true ) {
					this.wsio.emit('radialMenuClick', {button: "settingsButton", user: user, data: {state: "opened"}} );
				}
			}
		}

		if( this.settingMenuOpen ) {
			this.buttonOverCount += this.radial2CloseAllButton.onEvent(type, user.id, position, data);
			this.buttonOverCount += this.radial2TileButton.onEvent(type, user.id, position, data);
		}

		if( this.radial2CloseAllButton.isClicked() && this.sendsToServer === true ) {
			this.wsio.emit('clearDisplay');
			this.wsio.emit('radialMenuClick', {button: "clearDisplay", user: user} );
		}
		if( this.radial2TileButton.isClicked() && this.sendsToServer === true ) {
			this.wsio.emit('tileApplications');
			this.wsio.emit('radialMenuClick', {button: "tileApplications", user: user} );
		}


		if( this.radialRemoteSitesButton.isClicked() ) {
			this.resetRadialButtonLitState();
		}

		if( this.radialImageButton.isClicked() || this.radial2ImageButton.isClicked() ) {
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('imageThumbnailWindow') ) {
				this.radialImageButton.isLit = true;
				if( this.sendsToServer === true ) {
					this.wsio.emit('radialMenuClick', {button: "imageWindow", user: user, data: {state: "opened"}} );
				}
			} else if( this.sendsToServer === true ) {
				this.wsio.emit('radialMenuClick', {button: "imageWindow", user: user, data: {state: "closed"}} );
			}
		}
		if( this.radialPDFButton.isClicked() || this.radial2PDFButton.isClicked() ) {
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('pdfThumbnailWindow') ) {
				this.radialPDFButton.isLit = true;
				if( this.sendsToServer === true ) {
					this.wsio.emit('radialMenuClick', {button: "pdfWindow", user: user,  data: {state: "opened"}} );
				}
			} else if( this.sendsToServer === true )	{
				this.wsio.emit('radialMenuClick', {button: "pdfWindow", user: user,  data: {state: "closed"}} );
			}
		}
		if( this.radialVideoButton.isClicked() || this.radial2VideoButton.isClicked() ) {
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('videoThumbnailWindow') ) {
				this.radialVideoButton.isLit = true;
				if( this.sendsToServer === true )
					this.wsio.emit('radialMenuClick', {button: "videoWindow", user: user,  data: {state: "opened"}} );
			}
			else if( this.sendsToServer === true )
				this.wsio.emit('radialMenuClick', {button: "videoWindow", user: user,  data: {state: "closed"}} );
		}
		if( this.radialAppButton.isClicked() || this.radial2AppButton.isClicked() ) {
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('appThumbnailWindow') )
			{
				this.radialAppButton.isLit = true;
				if( this.sendsToServer === true )
					this.wsio.emit('radialMenuClick', {button: "appWindow", user: user,  data: {state: "opened"}} );
			}
			else if( this.sendsToServer === true )
				this.wsio.emit('radialMenuClick', {button: "appWindow", user: user,  data: {state: "closed"}} );
		}
		if( this.radialSessionButton.isClicked() ) {
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('sessionThumbnailWindow') ) {
				this.radialSessionButton.isLit = true;
				if( this.sendsToServer === true )
					this.wsio.emit('radialMenuClick', {button: "sessionWindow", user: user,  data: {state: "opened"}} );
			}
			else if( this.sendsToServer === true )
				this.wsio.emit('radialMenuClick', {button: "sessionWindow", user: user, data: {state: "closed"}} );
		}
		if( this.radialSaveSessionButton.isClicked() && this.sendsToServer === true ) {
			this.wsio.emit('saveSesion');
			this.wsio.emit('requestStoredFiles');
			this.wsio.emit('radialMenuClick', {button: "saveSession", user: user} );
		}

		// Level 2 -----------------------------------
		if( this.currentRadialState === 'radialAppMenu2' ) {
			this.radial2ImageButton.onEvent(type, user.id, position, data);
			this.radial2PDFButton.onEvent(type, user.id, position, data);
			this.radial2VideoButton.onEvent(type, user.id, position, data);
			this.radial2AppButton.onEvent(type, user.id, position, data);
		}

		// Thumbnail window ----------------------------
		if( this.currentMenuState !== 'radialMenu' ) {
			var currentThumbnailButtons = this.imageThumbnailButtons;

			if( this.currentMenuState === 'imageThumbnailWindow' )
				currentThumbnailButtons = this.imageThumbnailButtons;
			else if( this.currentMenuState === 'pdfThumbnailWindow' )
				currentThumbnailButtons = this.pdfThumbnailButtons;
			else if( this.currentMenuState === 'videoThumbnailWindow' )
				currentThumbnailButtons = this.videoThumbnailButtons;
			else if( this.currentMenuState === 'appThumbnailWindow' )
				currentThumbnailButtons = this.appThumbnailButtons;
			else if( this.currentMenuState === 'sessionThumbnailWindow' )
				currentThumbnailButtons = this.sessionThumbnailButtons;

			for( i = 0; i < currentThumbnailButtons.length; i++ ) {
				var thumbButton = currentThumbnailButtons[i];


				var thumbEventPos = { x: position.x - this.thumbnailWindowPosition.x + 18  * radialMenuScale, y: position.y - this.thumbnailWindowPosition.y - this.textHeaderHeight };

				// Prevent clicking on hidden thumbnails under preview window
				var thumbnailWindowDivWidth = this.thumbnailWindowSize.x + this.imageThumbSize/2 - 10 - this.radialMenuSize.x - 25 * radialMenuScale; // Should match where 'this.thumbnailWindowDiv.style.width' is assigned
				if( thumbEventPos.x >= 0 && thumbEventPos.x <= thumbnailWindowDivWidth ) {
					thumbEventPos.x -= this.thumbnailWindowScrollOffset.x;
					this.buttonOverCount += thumbButton.onEvent(type, user.id, thumbEventPos, data);

					if ( thumbButton.isReleased() && this.scrollOpenContentLock === false ) {
						if( this.currentMenuState === 'appThumbnailWindow' ) {
							this.loadApplication( thumbButton.getData(), user  );
						} else {
							this.loadFileFromServer( thumbButton.getData(), user  );
						}

					}
					if ( thumbButton.isPositionOver(user.id, thumbEventPos)  ) {
						this.hoverOverText = thumbButton.getData().filename;
						this.hoverOverThumbnail = thumbButton.buttonImage;
						this.hoverOverMeta = thumbButton.getData().meta;
					}

					if( thumbButton.isFirstOver()  ) // Only occurs on first pointerMove event over button
						this.ctx.redraw = true; // Redraws radial menu and metadata window (independent of thumbnails)
				}
			}
		}

		// windowInteractionMode = true if any active button has an event over its
		if( type === "pointerPress" && data.button === 'left' ) {
			// Press over radial menu, drag menu
			if( position.x > 0 && position.x < this.radialMenuSize.x && position.y > 0 && position.y < this.radialMenuSize.y && this.buttonOverCount === 0 ) {
				this.windowInteractionMode = false;
				this.dragPosition = position;
			}

			if( position.x > this.radialMenuSize.x && position.x < this.thumbnailWindowSize.x && position.y > 0 && position.y < this.thumbnailWindowSize.y ) {
				if( this.dragThumbnailWindow === false ) {
					this.dragThumbnailWindow = true;
					this.thumbnailWindowDragPosition = position;

					this.thumbnailWindowInitialScrollOffset.x = this.thumbnailWindowScrollOffset.x;
					this.thumbnailWindowInitialScrollOffset.y = this.thumbnailWindowScrollOffset.y;
				}
			}
			this.ctx.redraw = true;
		} else if( type === "pointerMove" ) {
			if( this.dragThumbnailWindow === true ) {
				// Controls the content window scrolling.
				// Note:Scrolling is +right, -left so offset should always be negative
				if( this.thumbnailWindowScrollOffset.x <= 0 && this.notEnoughThumbnailsToScroll === false ) {
					var scrollDist = 0;

					var nextScrollPos = this.thumbnailWindowScrollOffset;

					nextScrollPos.x += (position.x - this.thumbnailWindowDragPosition.x) * thumbnailScrollScale;
					nextScrollPos.y += (position.y - this.thumbnailWindowDragPosition.y) * thumbnailScrollScale;

					if( nextScrollPos.x > 0 )
						nextScrollPos.x = 0;
					if( nextScrollPos.y > 0 )
						nextScrollPos.y = 0;

					if( this.thumbnailWindowScrollLock.x === false ) {
						this.thumbnailWindowScrollOffset.x = nextScrollPos.x;
						scrollDist += this.thumbnailWindowInitialScrollOffset.x - this.thumbnailWindowScrollOffset.x;
					}
					if( this.thumbnailWindowScrollLock.y === false ) {
						this.thumbnailWindowScrollOffset.y = nextScrollPos.y;
						scrollDist += this.thumbnailWindowInitialScrollOffset.y - this.thumbnailWindowScrollOffset.y;
					}

					if( scrollDist < 0 )
						scrollDist *= -1;

					if( scrollDist >= thumbnailDisableSelectionScrollDistance ) {
						this.scrollOpenContentLock = true;
					}

					this.thumbnailScrollWindowElement.style.left = (this.thumbnailWindowScrollOffset.x).toString()+"px";

					this.thumbnailWindowDragPosition = position;
				} else {
					this.thumbnailWindowScrollOffset.x = 0;
				}
			}

		}
		else if( type === "pointerRelease" ) {
			if(  this.windowInteractionMode === false )	{
				this.windowInteractionMode = true;
				this.dragPosition = { x: 0, y: 0 };
			}
			else if( this.dragThumbnailWindow === true ) {
				this.dragThumbnailWindow = false;
				this.scrollOpenContentLock = false;
			}
		}

	};

	/**
	 * Tells the server to load a file
	 *
	 * @method loadFileFromServer
	 * @param data {} Content information like type and filename
	 * @param user {Integer} userID
	 */
	this.loadFileFromServer = function( data, user ) {
		if( this.sendsToServer === true ) {
			this.wsio.emit('loadFileFromServer', { application: data.application, filename: data.filename, user: user} );
		}
	};

	/**
	 * Tells the server to start an application
	 *
	 * @method loadApplication
	 * @param data {} Application information like filename
	 * @param user {Integer} userID
	 */
	this.loadApplication = function( data, user ) {
		if( this.sendsToServer === true ) {
			this.wsio.emit('loadApplication', { application: data.filename, user: user} );
		}
	};

	/**
	 * Receives the current asset list from server
	 *
	 * @method updateFileList
	 * @param serverFileList {} Server file list
	 */
	this.updateFileList = function(serverFileList) {
		//console.log("updateFileList: ");
		//console.log(serverFileList);

		this.thumbnailButtons = [];
		this.imageThumbnailButtons = [];
		this.videoThumbnailButtons = [];
		this.pdfThumbnailButtons = [];
		this.appThumbnailButtons = [];
		this.sessionThumbnailButtons = [];

		// Server file lists by type
		var imageList = serverFileList.images;
		var pdfList =  serverFileList.pdfs;
		var videoList =  serverFileList.videos;
		var appList =  serverFileList.apps;

		var sessionList =  serverFileList.sessions;
		var i = 0;
		var thumbnailButton;
		var customIcon;

		if( imageList !== null ) {
			var validImages = 0;
			for( i = 0; i < imageList.length; i++ ) {
				if( imageList[i].filename.search("Thumbs.db") === -1 ) {
					thumbnailButton = new ButtonWidget();
					thumbnailButton.init(0, this.thumbScrollWindowctx, null);
					thumbnailButton.setData( {application: "image_viewer", filename: imageList[i].exif.FileName, meta: imageList[i].exif} );
					thumbnailButton.simpleTint = false;

					// Thumbnail image
					if ( imageList[i].exif.SAGE2thumbnail !== null ) {
						customIcon = new Image();
						customIcon.src = imageList[i].exif.SAGE2thumbnail+"_256.png";
						thumbnailButton.setButtonImage( customIcon );
					} else
						thumbnailButton.setButtonImage( idleImageIcon );

					this.thumbnailButtons.push(thumbnailButton);
					this.imageThumbnailButtons.push(thumbnailButton);
					validImages++;
				}
			}
		}
		if( pdfList !== null ) {
			for( i = 0; i < pdfList.length; i++ ) {
				thumbnailButton = new ButtonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				thumbnailButton.setData( {application: "pdf_viewer", filename: pdfList[i].exif.FileName, meta: pdfList[i].exif} );
				thumbnailButton.simpleTint = false;

				// Thumbnail image
				if ( pdfList[i].exif.SAGE2thumbnail !== null ) {
					customIcon = new Image();
					customIcon.src = pdfList[i].exif.SAGE2thumbnail+"_256.png";
					thumbnailButton.setButtonImage( customIcon );
				} else
					thumbnailButton.setButtonImage( idlePDFIcon );


				this.thumbnailButtons.push(thumbnailButton);
				this.pdfThumbnailButtons.push(thumbnailButton);
			}
		}
		if( videoList !== null ) {
			for( i = 0; i < videoList.length; i++ ) {
				thumbnailButton = new ButtonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				thumbnailButton.setData( {application: "movie_player", filename: videoList[i].exif.FileName, meta: videoList[i].exif} );
				thumbnailButton.simpleTint = false;

				// Thumbnail image
				if ( videoList[i].exif.SAGE2thumbnail !== null ) {
					customIcon = new Image();
					customIcon.src = videoList[i].exif.SAGE2thumbnail+"_256.png";
					//console.log("uploads/assets/"+imageList[i].exif.SAGE2thumbnail);
					thumbnailButton.setButtonImage( customIcon );
				} else
					thumbnailButton.setButtonImage( idleVideoIcon );

				this.thumbnailButtons.push(thumbnailButton);
				this.videoThumbnailButtons.push(thumbnailButton);
			}
		}
		if( appList !== null ) {
			for( i = 0; i < appList.length; i++ ) {
				thumbnailButton = new ButtonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				thumbnailButton.setData( {application: "custom_app", filename: appList[i].exif.FileName, meta: appList[i].exif} );
				thumbnailButton.simpleTint = false;
				thumbnailButton.useBackgroundColor = false;

				thumbnailButton.setSize( this.imageThumbSize * 2, this.imageThumbSize * 2 );
				thumbnailButton.setHitboxSize( this.imageThumbSize * 2, this.imageThumbSize * 2 );

				if ( appList[i].exif.SAGE2thumbnail !== null ) {
					customIcon = new Image();
					customIcon.src = appList[i].exif.SAGE2thumbnail+"_256.png";
					thumbnailButton.setButtonImage( customIcon );
				} else
					thumbnailButton.setButtonImage( idleAppIcon );

				this.thumbnailButtons.push(thumbnailButton);
				this.appThumbnailButtons.push(thumbnailButton);
			}
		}
		if( sessionList !== null ) {
			for( i = 0; i < sessionList.length; i++ ) {
				thumbnailButton = new ButtonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				thumbnailButton.setData( {application: "load_session", filename: sessionList[i].exif.FileName, meta: sessionList[i].exif} );
				thumbnailButton.setButtonImage( idleSessionIcon );
				thumbnailButton.simpleTint = false;

				this.thumbnailButtons.push(thumbnailButton);
				this.sessionThumbnailButtons.push(thumbnailButton);
			}
		}

		this.updateThumbnailPositions();
	};

	/**
	 * Helper function for arranging thumbnails
	 *
	 * @method setThumbnailPosition
	 * @param thumbnailSourceList {} List of thumbnails
	 * @param imageThumbnailSize {Float} width of thumbnail in pixels
	 * @param thumbSpacer {Float} space between thumbnails in pixels
	 * @param maxRows {Integer} maximum thumbnails per row
	 * @param neededColumns {Integer} calculated number of columns needed
	 */
	this.setThumbnailPosition = function( thumbnailSourceList, imageThumbnailSize, thumbnailSpacer, maxRows, neededColumns ) {
		var curRow = 0;
		var curColumn = 0;

		this.thumbnailScrollWindowElement.width = (imageThumbnailSize + thumbSpacer) * neededColumns;
		for( var i = 0; i < thumbnailSourceList.length; i++ ) {
			var currentButton = thumbnailSourceList[i];


			if( curColumn+1 > neededColumns ) {
				curColumn = 0;

				if( curRow < maxRows - 1 )
					curRow++;
			}
			currentButton.setPosition( curColumn * (imageThumbnailSize + thumbnailSpacer),  curRow * (imageThumbnailSize + thumbnailSpacer) );
			curColumn++;
		}
	};

	/**
	 * Recalculates the thumbnail positions
	 *
	 * @method updateThumbnailPositions
	 */
	this.updateThumbnailPositions = function() {
		//{ x: 1224, y: 860 };

		var thumbWindowSize = this.thumbnailWindowSize;

		// maxRows is considered a 'hard' limit based on the thumbnail and window size.
		// If maxRows and maxCols is exceeded, then maxCols is expanded as needed.
		var maxRows = Math.floor((thumbWindowSize.y-this.thumbnailWindowPosition.y) / (this.imageThumbSize + thumbSpacer));
		var maxCols = Math.floor((thumbWindowSize.x-this.thumbnailWindowPosition.x) / (this.imageThumbSize + thumbSpacer));

		var neededColumns = maxRows;

		if( this.currentMenuState === 'imageThumbnailWindow' ) {
			if( this.imageThumbnailButtons.length > (maxRows*maxCols) )
				neededColumns = Math.ceil(this.imageThumbnailButtons.length / maxRows );
		} else if( this.currentMenuState === 'pdfThumbnailWindow' ) {
			if( this.pdfThumbnailButtons.length > (maxRows*maxCols) )
				neededColumns = Math.ceil(this.pdfThumbnailButtons.length / maxRows );
		} else if( this.currentMenuState === 'videoThumbnailWindow' ) {
			if( this.videoThumbnailButtons.length > (maxRows*maxCols) )
				neededColumns = Math.ceil(this.videoThumbnailButtons.length / maxRows );
		} else if( this.currentMenuState === 'sessionThumbnailWindow' ) {
			if( this.sessionThumbnailButtons.length > (maxRows*maxCols) )
				neededColumns = Math.ceil(this.sessionThumbnailButtons.length / maxRows );
		}

		//var maxScrollPosX = this.thumbnailWindowPosition.x - (maxCols - neededColumns + 2) * (this.imageThumbSize + thumbSpacer);

		// Special thumbnail size for custom apps
		if( this.currentMenuState === 'appThumbnailWindow' ) {
			maxRows = Math.floor((this.thumbnailWindowSize.y-this.thumbnailWindowPosition.y) / (this.imageThumbSize * 2 + thumbSpacer));
			maxCols = Math.floor((this.thumbnailWindowSize.x-this.thumbnailWindowPosition.x) / (this.imageThumbSize * 2 + thumbSpacer));
			neededColumns = Math.ceil(this.appThumbnailButtons.length / maxRows );
		}

		this.thumbnailGridSize = { x: maxRows, y: maxCols };
		if( neededColumns > maxRows )
			this.notEnoughThumbnailsToScroll = false;
		else {
			this.notEnoughThumbnailsToScroll = true;
			this.thumbnailWindowScrollOffset.x = 0;
			this.thumbnailScrollWindowElement.style.left = (this.thumbnailWindowScrollOffset.x).toString()+"px";
		}

		if( this.currentMenuState === 'imageThumbnailWindow' ) {
			this.setThumbnailPosition( this.imageThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns );
		}

		if( this.currentMenuState === 'pdfThumbnailWindow' ) {
			this.setThumbnailPosition( this.pdfThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns );
		}

		if( this.currentMenuState === 'videoThumbnailWindow' ) {
			this.setThumbnailPosition( this.videoThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns );
		}

		if( this.currentMenuState === 'appThumbnailWindow' ) {
			this.setThumbnailPosition( this.appThumbnailButtons, this.imageThumbSize * 2, thumbSpacer, maxRows, neededColumns );
		}

		if( this.currentMenuState === 'sessionThumbnailWindow' )
			this.setThumbnailPosition( this.sessionThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns );

	};

}

/**
 * ButtonWidget used for menu and thumbnail buttons
 *
 * @class ButtonWidget
 * @constructor
 */
function ButtonWidget() {
	//this.element = null;
	this.ctx = null;
	this.resrcPath = null;

	this.posX = 100;
	this.posY = 100;
	this.angle = 0;
	this.width = imageThumbSize * radialMenuScale;
	this.height = imageThumbSize * radialMenuScale;

	this.hitboxWidth = imageThumbSize * radialMenuScale;
	this.hitboxheight = imageThumbSize * radialMenuScale;

	this.defaultColor =  "rgba(210, 210, 210, 1.0)";
	this.mouseOverColor = "rgba(210, 210, 10, 1.0 )";
	this.clickedColor = "rgba(10, 210, 10, 1.0 )";
	this.pressedColor = "rgba(10, 210, 210, 1.0 )";

	//this.releasedColor = "rgba(10, 10, 210, 1.0 )";
	this.releasedColor =  "rgba(210, 210, 210, 1.0)";

	this.litColor = "rgba(10, 210, 210, 1.0 )";

	this.buttonImage = null;
	this.overlayImage = null;

	this.useBackgroundColor = true;
	this.useEventOverColor = false;
	this.simpleTint = false;

	this.alignment = 'left';
	this.hitboxShape = 'box';

	this.isLit = false;

	// Button states:
	// -2 = Hidden (and Disabled)
	// -1 = Disabled (Visible, but ignores events - eventually will be dimmed?)
	// 0  = Idle
	// 1  = Over
	// 2  = Pressed
	// 3  = Clicked
	// 4  = Released
	// 5	= OverEnter (First over event)
	this.state = 0;

	this.buttonData = {};

	this.init = function(id, ctx, resrc) {
		//this.element = document.getElementById(id);
		this.ctx = ctx;
		this.resrcPath = resrc;

		//console.log("ButtonWidget init()");
	};

	this.setPosition = function( x, y ) {
		this.posX = x;
		this.posY = y;
	};

	this.setRotation = function( a ) {
		this.angle = a;
	};

	this.setData = function( data ) {
		this.buttonData = data;
	};

	this.setButtonImage = function( image ) {
		this.buttonImage = image;
	};

	this.setOverlayImage = function( overlayImage, scale ) {
		this.overlayImage = overlayImage;
		this.overlayScale = scale;
	};

	this.setSize = function( w, h ) {
		this.width = w;
		this.height = h;
	};

	this.setHitboxSize = function( w, h ) {
		this.hitboxWidth = w;
		this.hitboxheight = h;
	};

	this.getData = function() {
		return this.buttonData;
	};

	this.draw = function() {
		if( this.state === -2 ) // Button is hidden
			return;

		// Default - align 'left'
		var translate = { x: this.posX, y: this.posY };
		var offsetHitbox = { x: 0, y: 0 };
		var offset = { x: 0, y: 0 };

		if( this.alignment === 'centered' ) {
			offset = { x: -this.width/2, y: -this.height/2 };
			offsetHitbox = { x: -this.hitboxWidth/2, y: -this.hitboxWidth/2 };
		}

		this.ctx.save();
		this.ctx.translate( translate.x, translate.y );

		if( this.state === 5 ) {
			this.ctx.fillStyle = this.mouseOverColor;
		}
		else if( this.state === 3 ) {
			this.ctx.fillStyle = this.clickedColor;
			this.state = 2; // Pressed state
		}
		else if( this.state === 2 ) {
			this.ctx.fillStyle = this.pressedColor;
		}
		else if( this.state === 4 ) {
			this.ctx.fillStyle = this.releasedColor;
			this.state = 1;
		}
		if( this.useBackgroundColor ) {
			if( this.isLit )
				this.ctx.fillStyle = this.litColor;
			else
				this.ctx.fillStyle = this.defaultColor;

			if( this.hitboxShape === 'box' )
				this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight);
			//else if( this.hitboxShape === 'circle' ) {
				//this.ctx.arc(0, 0, this.hitboxWidth/2,0,2*Math.PI);
				//this.ctx.fillStyle = this.defaultColor;
				//this.ctx.fill();
			//}
		}

		// Draw icon aligned centered
		if( this.buttonImage !== null ) {
			//this.ctx.rotate( this.angle );

			// draw the original image
			this.ctx.drawImage( this.buttonImage, offset.x, offset.y, this.width, this.height );

			if( this.isLit === true )
				this.drawTintImage( this.buttonImage, offset, this.width, this.height, this.litColor, 0.5 );

			// Tint the image
			if( this.state !== 0 ) {
				if( this.simpleTint ) {
					this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight);
				}
				else {
					if( this.isLit === false && this.useEventOverColor)
						this.drawTintImage( this.buttonImage, offset, this.width, this.height, this.ctx.fillStyle, 0.8 );
				}
			}

		}
		this.ctx.restore();

		if( this.overlayImage !== null ) {
			this.ctx.save();
			this.ctx.translate( translate.x, translate.y );
			this.ctx.drawImage( this.overlayImage, -this.width* this.overlayScale/2, -this.height* this.overlayScale/2, this.width * this.overlayScale, this.height * this.overlayScale);
			this.ctx.restore();
		}
	};

	this.drawTintImage = function( image, offset, width, height, color, alpha ) {
		// Tint the image (Part 1)
		// create offscreen buffer,
		var buffer = document.createElement('canvas');
		buffer.width = width;
		buffer.height = height;
		var bx = buffer.getContext('2d');

		// fill offscreen buffer with the tint color
		bx.fillStyle = color;
		bx.fillRect(0, 0, buffer.width, buffer.height);

		// destination atop makes a result with an alpha channel identical to fg, but with all pixels retaining their original color *as far as I can tell*
		bx.globalCompositeOperation = "destination-atop";
		bx.drawImage(image, 0, 0, width, height );

		//then set the global alpha to the amound that you want to tint it, and draw the buffer directly on top of it.
		this.ctx.globalAlpha = alpha;

		// draw the tinted overlay
		this.ctx.drawImage( buffer, offset.x, offset.y, width, height );
	};

	this.onEvent = function( type, user, position, data ) {
		if( this.state < 0 ) {// Button is disabled or hidden
			return 0;
		}

		if( this.isPositionOver( user, position ) ) {
			if( this.state === 5 ) {
				this.state = 1;
			}

			if( type === "pointerPress" && this.state !== 2 ) {
				this.state = 3; // Click state
				if( this.useEventOverColor )
					this.ctx.redraw = true;
			} else if( type === "pointerRelease" ) {
				this.state = 4;
				if( this.useEventOverColor )
					this.ctx.redraw = true;
			} else if( this.state !== 2 ) {
				if( this.state !== 1 ) {
					this.state = 5;
					if( this.useEventOverColor )
						this.ctx.redraw = true;
				}
				else
					this.state = 1;
			}

			return 1;
		} else {
			if( this.state !== 0 && this.useEventOverColor )
				this.ctx.redraw = true;
			this.state = 0;

			return 0;
		}
	};

	this.isPositionOver = function(id, position) {
		var x = position.x;
		var y = position.y;

		if( this.alignment === 'centered' && this.hitboxShape === 'box' ) {
			x += this.hitboxWidth/2;
			y += this.hitboxheight/2;
		}

		if( this.hitboxShape === 'box' ) {
			if( x >= this.posX && x <= this.posX + this.hitboxWidth && y >= this.posY && y <= this.posY + this.hitboxheight )
				return true;
			else
				return false;

		} else if( this.hitboxShape === 'circle' ) {
			var distance = Math.sqrt( Math.pow(Math.abs( x - this.posX ), 2) + Math.pow(Math.abs( y - this.posY ), 2) );

			if( distance <= this.hitboxWidth/2 )
				return true;
			else
				return false;
		}
	};

	this.isFirstOver = function() {
		if ( this.state === 5 ) {
			return true;
		} else
			return false;
	};

	this.isOver = function() {
		if ( this.state === 1 ) {
			return true;
		} else
			return false;
	};

	this.isClicked = function() {
		if ( this.state === 3 ) {
			this.state = 2;
			return true;
		} else
			return false;
	};

	this.isReleased = function() {
		if ( this.state === 4 ) {
			this.state = 0;
			return true;
		} else
			return false;
	};

	this.isHidden = function() {
		if ( this.state === -2 ) {
			return true;
		} else {
			return false;
		}
	};

	this.isDisabled = function() {
		if ( this.state === -1 ) {
			return true;
		} else {
			return false;
		}
	};

	this.setHidden = function(val) {
		if ( val ) {
			this.state = -2;
		} else {
			this.state = 0;
		}
	};

	this.setDisabled = function(val) {
		if ( val ) {
			this.state = -1;
		} else {
			this.state = 0;
		}
	};
}
