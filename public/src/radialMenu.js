// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

// layout parameters
var imageThumbSize = 75;
var thumbSpacer = 5;

var thumbnailWindowWidth = 0.8;
var previewWindowWidth = 0.2;
var previewWindowOffset = 0.74;

// radial menu buttons
var radialMenuScale = 1.0;
var thumbnailWindowMinTextHeight = 24;

var radialMenuCenter = { x: 210 * radialMenuScale, y: 210 * radialMenuScale }; // overwritten in init - based on window size
var radialMenuSize = { x: 425 * radialMenuScale, y: 425 * radialMenuScale };
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
var enableEventRedraw = false;

function radialMenu(){
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

	this.init = function(data, thumbElem, thumbElem2) {
		var id = data.id;
		radialMenuScale = data.radialMenuScale;
		radialMenuCenter = { x: 210 * radialMenuScale, y: 210 * radialMenuScale }; // overwritten in init - based on window size
		this.radialMenuSize = data.radialMenuSize;

		this.thumbnailWindowSize.x = data.thumbnailWindowSize.x;
		this.thumbnailWindowSize.y = data.thumbnailWindowSize.y;
		this.imageThumbSize = imageThumbSize * radialMenuScale;

		this.textHeaderHeight = 32  * radialMenuScale;
		//if( this.textHeaderHeight < thumbnailWindowMinTextHeight )
		//	this.textHeaderHeight = thumbnailWindowMinTextHeight;

		this.element = document.getElementById(id+"_menu"); // gets because pointer is assumed to be created with initial connection (else createElement( canvas tag)
		this.ctx     = this.element.getContext("2d");

		this.resrcPath = "images/radialMenu/";

		this.menuID = id+"_menu";
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

		this.thumbnailWindowDiv = document.getElementById(id+"_menuDiv");
		this.thumbnailWindowDiv.style.left   = (this.element.style.left+this.thumbnailWindowPosition.x).toString() + "px";
		this.thumbnailWindowDiv.style.top    = (this.element.style.top+this.thumbnailWindowPosition.y).toString() + "px";

		// Debug: Show scrolling window background
		//this.thumbnailWindowDiv.style.backgroundColor = "rgba(10,50,200,0.8)";

		this.thumbnailScrollWindowElement = thumbElem;
		this.thumbScrollWindowctx = this.thumbnailScrollWindowElement.getContext("2d");

		this.thumbnailWindowScrollLock = { x: false, y: true };
		this.scrollOpenContentLock = false; // Stop opening content/app if window is scrolling

		this.thumbnailScrollWindowElement.width = this.thumbnailWindowSize.x - this.thumbnailWindowPosition.x;
		this.thumbnailScrollWindowElement.height = this.thumbnailWindowSize.y - this.thumbnailWindowPosition.y;
		this.thumbnailScrollWindowElement.style.display = "block";

		this.hoverOverText = "";

		this.sendsToServer = true;
		radialMenuList[id+"_menu"] = this;

		// websocket to server for file library access
		// Note: using a different socket to prevent locking up other app animations
		/*
		hostname = window.location.hostname;
		port = window.location.port;
		if(window.location.protocol === "http:" && port === "") port = "80";
		if(window.location.protocol === "https:" && port === "") port = "443";
		*/
		this.wsio = new websocketIO();
		this.wsio.open(function() {
			console.log("open websocket: " + id+"_menu");
			var clientDescription = {
				clientType: "radialMenu",
				clientID: id+"_menu",
				sendsPointerData: false,
				sendsMediaStreamFrames: false,
				requestsServerFiles: true,
				sendsWebContentToLoad: false,
				launchesWebBrowser: false,
				sendsVideoSynchonization: false,
				sharesContentWithRemoteServer: false,
				receivesDisplayConfiguration: true,
				receivesClockTime: false,
				requiresFullApps: false,
				requiresAppPositionSizeTypeOnly: false,
				receivesMediaStreamFrames: false,
				receivesWindowModification: false,
				receivesPointerData: false,
				receivesInputEvents: false,
				receivesRemoteServerInfo: false,
				removeMediabrowserID: true
			};
			radialMenuList[id+"_menu"].wsio.emit('addClient', clientDescription);
		});

		this.wsio.on('disableSendToServer', function(ID) {
			radialMenuList[id+"_menu"].sendsToServer = false;
			radialMenuList[id+"_menu"].wsio.close();
		});

		// load thumbnail icons
		this.idleExitIcon = new Image();
		this.idleExitIcon.src = "images/ui/close.svg";

		this.idleImageIcon = new Image();
		this.idleImageIcon.src = "images/ui/images.svg";
		this.idlePDFIcon = new Image();
		this.idlePDFIcon.src = "images/ui/pdfs.svg";
		this.idleVideoIcon = new Image();
		this.idleVideoIcon.src = "images/ui/videos.svg";
		this.idleAppIcon = new Image();
		this.idleAppIcon.src = "images/ui/applauncher.svg";
		this.idleSessionIcon = new Image();
		this.idleSessionIcon.src = "images/ui/loadsession.svg";
		this.idleSaveSessionIcon = new Image();
		this.idleSaveSessionIcon.src = "images/ui/savesession.svg";
		this.idleSettingsIcon = new Image();
		this.idleSettingsIcon.src = "images/ui/arrangement.svg";

		// Level 2 icons
		this.idleFolderIcon = new Image();
		this.idleFolderIcon.src = this.resrcPath + "open131.svg";
		this.idleCloseAppIcon = new Image();
		this.idleCloseAppIcon.src = this.resrcPath + "window27.svg";
		this.idleCloseAllIcon = new Image();
		this.idleCloseAllIcon.src = "images/ui/clearcontent.svg";
		this.idleMaximizeIcon = new Image();
		this.idleMaximizeIcon.src = this.resrcPath + "maximize.svg";
		this.idleTileIcon = new Image();
		this.idleTileIcon.src = "images/ui/tilecontent.svg";

		// radial menu icons
		this.radialMenuIcon = new Image();
		this.radialMenuIcon.src = this.resrcPath + "icon_radial_button_circle.svg";
		this.radialMenuLevel2Icon = new Image();
		this.radialMenuLevel2Icon.src = this.resrcPath + "icon_radial_level2_360.png";
		this.radialCloseIcon = new Image();
		this.radialCloseIcon.src = this.resrcPath + "icon_close_128.png";

		this.radialDragIcon = new Image();
		this.radialDragIcon.src = this.resrcPath + "drag-ring.svg";

		this.glowLine = new Image();
		this.glowLine.src = this.resrcPath + "glow_lines2A_menu_1024.png";

		this.glowLineOpen = new Image();
		this.glowLineOpen.src = this.resrcPath + "glow_lines2A_menu_1024.png";

		this.thumbnailWindowFrame = new Image();
		this.thumbnailWindowFrame.src = this.resrcPath +"thumbnail_window_frame2.png";

		// Create buttons
		// icon, useBackgroundColor, buttonSize, hitboxSize, alignment, hitboxType, radialAnglePos, radialDistance
		this.radialDragButton = this.createRadialButton( this.radialDragIcon, false, 500, this.imageThumbSize, 'centered', 'circle', 0, 0 );

		this.radialCenterButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 0, 0 );

		this.radialCloseButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 9, menuRadius );
		this.radialCloseButton.setOverlayImage( this.idleExitIcon, overlayIconScale );

		this.radialImageButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 1, menuRadius );
		this.radialImageButton.setOverlayImage( this.idleImageIcon, overlayIconScale );

		this.radialPDFButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 0, menuRadius );
		this.radialPDFButton.setOverlayImage( this.idlePDFIcon, overlayIconScale );

		this.radialVideoButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 2, menuRadius );
		this.radialVideoButton.setOverlayImage( this.idleVideoIcon, overlayIconScale );

		this.radialAppButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 3, menuRadius );
		this.radialAppButton.setOverlayImage( this.idleAppIcon, overlayIconScale );

		this.radialSessionButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 4, menuRadius );
		this.radialSessionButton.setOverlayImage( this.idleSessionIcon, overlayIconScale );

		this.radialSaveSessionButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 5, menuRadius );
		this.radialSaveSessionButton.setOverlayImage( this.idleSaveSessionIcon, overlayIconScale );

		this.radialSettingsButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 8, menuRadius );
		this.radialSettingsButton.setOverlayImage( this.idleSettingsIcon, overlayIconScale );

		// Radial level 2
		var menu2ButtonSize = 140;
		var menuLevel2Radius = menuRadius + menuButtonSize/2 + 10;

		this.radial2CloseAllButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 8.325, menuLevel2Radius );
		this.radial2CloseAllButton.setOverlayImage( this.idleCloseAllIcon, overlayIconScale );

		this.radial2TileButton = this.createRadialButton( this.radialMenuIcon, false, menuButtonSize, menuButtonHitboxSize, 'centered', 'circle', 7.675, menuLevel2Radius );
		this.radial2TileButton.setOverlayImage( this.idleTileIcon, overlayIconScale );

		this.radial2ImageButton = new buttonWidget();
		this.radial2ImageButton.init(0, this.ctx, null);
		this.radial2ImageButton.setIdleImage( this.radialMenuIcon );
		this.radial2ImageButton.useBackgroundColor = false;
		this.radial2ImageButton.setOverlayImage( this.idleImageIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );

		this.radial2PDFButton = new buttonWidget();
		this.radial2PDFButton.init(0, this.ctx, null);
		this.radial2PDFButton.setIdleImage( this.radialMenuIcon );
		this.radial2PDFButton.useBackgroundColor = false;
		this.radial2PDFButton.setOverlayImage( this.idlePDFIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );

		this.radial2VideoButton = new buttonWidget();
		this.radial2VideoButton.init(0, this.ctx, null);
		this.radial2VideoButton.setIdleImage( this.radialMenuIcon );
		this.radial2VideoButton.useBackgroundColor = false;
		this.radial2VideoButton.setOverlayImage( this.idleVideoIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );

		this.radial2AppButton = new buttonWidget();
		this.radial2AppButton.init(0, this.ctx, null);
		this.radial2AppButton.setIdleImage( this.radialMenuIcon );
		this.radial2AppButton.useBackgroundColor = false;
		this.radial2AppButton.setOverlayImage( this.idleAppIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );


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

	this.createRadialButton = function( idleIcon, useBackgroundColor, buttonSize, hitboxSize, alignment, hitboxShape, radialPos, buttonRadius )
	{
		button = new buttonWidget();
		button.init(0, this.ctx, null);
		button.setIdleImage( idleIcon );
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

	this.drawImage = function( ctx, image, position, size, color, angle, centered )
	{
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

	this.animate = function( data )
	{
		//console.log(data);
	};

	this.redraw = function() {
		this.thumbScrollWindowctx.redraw = true;

		this.draw();
	};

	this.draw = function() {
		// clear canvas
		this.ctx.clearRect(0,0, this.element.width, this.element.height);

		if( this.thumbScrollWindowctx.redraw || this.currentMenuState === 'radialMenu')
			this.thumbScrollWindowctx.clearRect(0,0, this.thumbnailScrollWindowElement.width, this.thumbnailScrollWindowElement.height);

		if( this.windowInteractionMode === false )
		{
			this.ctx.fillStyle = "rgba(5, 15, 55, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		}
		else if( this.dragThumbnailWindow === true )
		{
			this.ctx.fillStyle = "rgba(55, 55, 5, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		}
		else
		{
			this.ctx.fillStyle = "rgba(5, 5, 5, 0.5)";
			this.thumbScrollWindowctx.fillStyle = this.ctx.fillStyle;
		}

		// TEMP: Just to clearly see context edge
		//this.ctx.fillStyle = "rgba(5, 255, 5, 0.7)";
		//this.ctx.fillRect(0,0, this.element.width, this.element.height)

		if( this.menuState == 'opening' )
		{
			if( this.stateTransition < 1 )
				this.stateTransition += this.stateTransitionTime / 1000;
			else
				this.stateTransition = 0;
		}
		else if( this.menuState == 'open' )
		{
			this.stateTransition = 1;
		}

		this.radialDragButton.draw();

		if( this.currentMenuState !== 'radialMenu' )
		{
			// line from radial menu to thumbnail window
			this.ctx.beginPath();
			this.ctx.moveTo( radialMenuCenter.x + menuButtonSize/4 * radialMenuScale, radialMenuCenter.y );
			this.ctx.lineTo( this.thumbnailWindowPosition.x - 18  * radialMenuScale , radialMenuCenter.y );
			this.ctx.strokeStyle = '#ffffff';
			this.ctx.lineWidth = 5 * radialMenuScale;
			this.ctx.stroke();
		}

		this.drawImage( this.ctx, this.glowLine, this.radialMenuCenter, {x: 510 * this.stateTransition * radialMenuScale, y: 510 * this.stateTransition * radialMenuScale}, "rgba(255, 255, 255, 0.9)", 0, true );

		this.radialCenterButton.draw();
		this.radialCloseButton.draw();
		this.radialSettingsButton.draw();

		if( this.settingMenuOpen )
		{
			this.radial2CloseAllButton.draw();
			this.radial2TileButton.draw();
		}

		if( this.currentRadialState === 'radialMenu' )
		{
			this.radialImageButton.draw();
			this.radialPDFButton.draw();
			this.radialVideoButton.draw();
			this.radialAppButton.draw();
			this.radialSessionButton.draw();
			this.radialSaveSessionButton.draw();

			this.thumbnailWindowDiv.style.backgroundColor = "rgba(10,50,200,0.0)";
		}

		// Thumbnail window
		if( this.currentMenuState !== 'radialMenu' )
		{
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

			if( this.thumbScrollWindowctx.redraw )
			{
				for( i = 0; i < currentThumbnailButtons.length; i++ )
				{
					thumbButton = currentThumbnailButtons[i];
					thumbButton.draw();
				}
				this.thumbScrollWindowctx.redraw = false;
			}

			// Preview window
			previewImageSize = this.element.width * previewWindowWidth;
			previewImageX = this.thumbnailWindowSize.x + this.imageThumbSize/2 - 10;
			previewImageY = 60 + this.textHeaderHeight;

			// Metadata
			metadataLine = 0;
			metadataTextPosX = previewImageX;
			metadataTextPosY = previewImageY + previewImageSize + 20  + this.textHeaderHeight;

			// Preview Window Background
			if( this.currentMenuState !== 'radialMenu' )
			{
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

			if( this.hoverOverMeta )
			{
				this.ctx.font="16px sans-serif";
				this.ctx.fillStyle = "rgba(250, 250, 250, 1.0)";
				metadata = this.hoverOverMeta;
				//console.log( metadata);

				// Generic
				if( metadata.metadata === undefined && metadata.FileName )
				{
					this.ctx.fillText( "File Name: " + metadata.FileName, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.FileSize )
				{
					this.ctx.fillText( "File Size: " + metadata.FileSize, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}

				if( metadata.FileDate )
				{
					this.ctx.fillText( "File Date: " + metadata.FileDate, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}

				// Images
				if( metadata.ImageSize )
				{
					this.ctx.fillText( "Resolution: " + metadata.ImageSize, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.DateCreated )
				{
					this.ctx.fillText( "Date Created: " + metadata.DateCreated, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Copyright )
				{
					this.ctx.fillText( "Copyright: " + metadata.Copyright, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}

				// Photo
				if( metadata.Artist )
				{
					this.ctx.fillText( "Artist: " + metadata.Artist, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Aperture )
				{
					this.ctx.fillText( "Aperture: " + metadata.Aperture, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Exposure )
				{
					this.ctx.fillText( "Exposure: " + metadata.Exposure, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Flash )
				{
					this.ctx.fillText( "Flash: " + metadata.Flash, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.ExposureTime )
				{
					this.ctx.fillText( "Exposure Time: " + metadata.ExposureTime, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.FOV )
				{
					this.ctx.fillText( "FOV: " + metadata.FOV, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.FocalLength )
				{
					this.ctx.fillText( "Focal Length: " + metadata.FocalLength, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Model )
				{
					this.ctx.fillText( "Model: " + metadata.Model, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.LensModel )
				{
					this.ctx.fillText( "Lens Model: " + metadata.LensModel, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.ISO )
				{
					this.ctx.fillText( "ISO: " + metadata.ISO, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.ShutterSpeed )
				{
					this.ctx.fillText( "Shutter Speed: " + metadata.ShutterSpeed, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}

				// GPS
				if( metadata.GPSAltitude )
				{
					this.ctx.fillText( "GPS Altitude: " + metadata.GPSAltitude, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.GPSLatitude )
				{
					this.ctx.fillText( "GPS Latitude: " + metadata.GPSLatitude, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.GPSTimeStamp )
				{
					this.ctx.fillText( "GPS TimeStamp: " + metadata.GPSTimeStamp, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}

				// Video
				if( metadata.Duration )
				{
					this.ctx.fillText( "Duration: " + metadata.Duration, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.CompressorID )
				{
					this.ctx.fillText( "Compressor: " + metadata.CompressorID, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.AvgBitrate )
				{
					this.ctx.fillText( "Avg. Bitrate: " + metadata.AvgBitrate, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.AudioFormat )
				{
					this.ctx.fillText( "Audio Format: " + metadata.AudioFormat, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.AudioChannels )
				{
					this.ctx.fillText( "Audio Channels: " + metadata.AudioChannels, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.AudioSampleRate )
				{
					this.ctx.fillText( "Audio Sample Rate: " + metadata.AudioSampleRate, metadataTextPosX, metadataTextPosY + metadataLine * 20);
					metadataLine++;
				}

				// Apps
				if( metadata.metadata )
				{
					if( metadata.metadata.title )
					{
						this.ctx.fillText( "Title: " + metadata.metadata.title, metadataTextPosX, metadataTextPosY + metadataLine * 20);
						metadataLine++;
					}
					if( metadata.metadata.version )
					{
						this.ctx.fillText( "Version: " + metadata.metadata.version, metadataTextPosX, metadataTextPosY + metadataLine * 20);
						metadataLine++;
					}
					if( metadata.metadata.author )
					{
						this.ctx.fillText( "Author: " + metadata.metadata.author, metadataTextPosX, metadataTextPosY + metadataLine * 20);
						metadataLine++;
					}
					if( metadata.metadata.description )
					{
						this.ctx.fillText( "Description: " + metadata.metadata.description, metadataTextPosX, metadataTextPosY + metadataLine * 20);
						metadataLine++;
					}
					if( metadata.metadata.license )
					{
						this.ctx.fillText( "License: " + metadata.metadata.license, metadataTextPosX, metadataTextPosY + metadataLine * 20);
						metadataLine++;
					}
					if( metadata.metadata.keywords )
					{
						this.ctx.fillText( "Keywords: " + metadata.metadata.keywords, metadataTextPosX, metadataTextPosY + metadataLine * 20);
						metadataLine++;
					}
				}

				// Sessions
				if( metadata.numapps )
				{
					this.ctx.fillText( "Applications: " + metadata.numapps);
					metadataLine++;
				}
			}
		}


		this.ctx.redraw = false;
	};

	this.closeMenu = function() {
		this.visible = false;

		if( this.sendsToServer === true )
			this.wsio.emit('removeRadialMenu', { id: this.menuID } );

		this.currentMenuState = 'radialMenu';
		this.resetRadialButtonLitState();

		console.log("Closing menu" );
	};

	this.setToggleMenu = function(type)
	{
		if( this.currentMenuState !== type )
		{
			this.thumbnailWindowScrollOffset = { x: 0, y: 0 };

			this.currentMenuState = type;
			this.element.width = this.thumbnailWindowSize.x + thumbnailPreviewWindowSize.x;
			this.element.height = this.thumbnailWindowSize.y;
			this.thumbnailScrollWindowElement.style.display = "block";
			this.thumbScrollWindowctx.redraw = true;
			this.updateThumbnailPositions();
			this.draw();

			if( this.sendsToServer === true )
				this.wsio.emit('radialMenuWindowToggle', { id: this.menuID, thumbnailWindowOpen: true } );

			return true;
		}
		else
		{
			this.currentMenuState = 'radialMenu';
			this.element.width = this.radialMenuSize.x;
			this.element.height = this.radialMenuSize.y;
			//this.thumbnailScrollWindowElement.style.display = "None";

			if( this.sendsToServer === true )
				this.wsio.emit('radialMenuWindowToggle', { id: this.menuID, thumbnailWindowOpen: false } );

			return false;
		}
	};

	this.resetRadialButtonLitState = function()
	{
		this.radialImageButton.isLit = false;
		this.radialPDFButton.isLit = false;
		this.radialVideoButton.isLit = false;
		this.radialAppButton.isLit = false;
		this.radialSessionButton.isLit = false;
	};

	this.moveMenu = function( data, offset )
	{
		pointerX = data.x - data.windowX - offset.x;
		pointerY = data.y - data.windowY - offset.y;

		if( this.windowInteractionMode === false && pointerX > 0 && pointerX < this.radialMenuSize.x && pointerY > 0 && pointerY < this.radialMenuSize.y && buttonOverCount === 0 )
		{
			dragOffset = this.dragPosition;

			this.element.style.left    = (data.x - offset.x - dragOffset.x).toString() + "px";
			this.element.style.top     = (data.y - offset.y - dragOffset.y).toString()  + "px";

			if( this.sendsToServer === true )
			{
				this.wsio.emit('radialMenuMoved', { id: this.menuID, x: (data.x - dragOffset.x)+this.radialMenuSize.x/2, y: (data.y - dragOffset.y)+this.radialMenuSize.y/2, radialMenuSize: this.radialMenuSize, thumbnailWindowSize: thumbnailWindowSize } );
			}
		}

		this.thumbnailWindowDiv.style.left   = (data.windowX + this.thumbnailWindowPosition.x - 18  * radialMenuScale).toString() + "px";
		this.thumbnailWindowDiv.style.top    = (data.windowY + this.thumbnailWindowPosition.y + this.textHeaderHeight).toString() + "px";

		this.thumbnailWindowDiv.style.width   = (this.thumbnailWindowSize.x + this.imageThumbSize/2 - 10 - this.radialMenuSize.x - 25 * radialMenuScale).toString() + "px";
		this.thumbnailWindowDiv.style.height    = (this.thumbnailWindowSize.y - this.textHeaderHeight * 2).toString() + "px";
	};

	this.onEvent = function(type, position, user, data) {
		//console.log("RadialMenu " + this.menuID + " " + type + " " + position + " " + user + " " + data );

		overButton = false;


		buttonOverCount = 0; // Count number of buttons have a pointer over it

		// Level 0 - Always visible -----------------------------------
		buttonOverCount += this.radialCloseButton.onEvent(type, user.id, position, data);
		if ( this.radialCloseButton.isClicked() && data.button === "left" )
		{
			this.wsio.emit('radialMenuClick', {button: "closeButton", user: user} );
			this.closeMenu();
		}

		buttonOverCount += this.radialSettingsButton.onEvent(type, user.id, position, data);

		buttonOverCount += this.radialSessionButton.onEvent(type, user.id, position, data);
		buttonOverCount += this.radialSaveSessionButton.onEvent(type, user.id, position, data);

		// Level 1 -----------------------------------
		if( this.currentRadialState === 'radialMenu' )
		{
			//this.element.width = this.radialMenuSize.x;
			//this.element.height = this.radialMenuSize.y;

			buttonOverCount += this.radialImageButton.onEvent(type, user.id, position, data);
			buttonOverCount += this.radialPDFButton.onEvent(type, user.id, position, data);
			buttonOverCount += this.radialVideoButton.onEvent(type, user.id, position, data);
			buttonOverCount += this.radialAppButton.onEvent(type, user.id, position, data);
		}

		if( this.radialSettingsButton.isClicked() )
		{
			if( this.settingMenuOpen )
			{
				this.settingMenuOpen = false;
				this.radialSettingsButton.isLit = false;
				this.wsio.emit('radialMenuClick', {button: "settingsButton", user: user, data: {state: "closed"}} );
			}
			else
			{
				this.settingMenuOpen = true;
				this.radialSettingsButton.isLit = true;
				this.wsio.emit('radialMenuClick', {button: "settingsButton", user: user, data: {state: "opened"}} );
			}
		}

		if( this.settingMenuOpen )
		{
			buttonOverCount += this.radial2CloseAllButton.onEvent(type, user.id, position, data);
			buttonOverCount += this.radial2TileButton.onEvent(type, user.id, position, data);
		}

		if( this.radial2CloseAllButton.isClicked() && this.sendsToServer === true )
		{
			this.wsio.emit('clearDisplay');
			this.wsio.emit('radialMenuClick', {button: "clearDisplay", user: user} );
		}
		if( this.radial2TileButton.isClicked() && this.sendsToServer === true )
		{
			this.wsio.emit('tileApplications');
			this.wsio.emit('radialMenuClick', {button: "tileApplications", user: user} );
		}

		if( this.radialImageButton.isClicked() || this.radial2ImageButton.isClicked() )
		{
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('imageThumbnailWindow') )
			{
				this.radialImageButton.isLit = true;
				this.wsio.emit('radialMenuClick', {button: "imageWindow", user: user, data: {state: "opened"}} );
			}
			else
				this.wsio.emit('radialMenuClick', {button: "imageWindow", user: user, data: {state: "closed"}} );
		}
		if( this.radialPDFButton.isClicked() || this.radial2PDFButton.isClicked() )
		{
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('pdfThumbnailWindow') )
			{
				this.radialPDFButton.isLit = true;
				this.wsio.emit('radialMenuClick', {button: "pdfWindow", user: user,  data: {state: "opened"}} );
			}
			else
				this.wsio.emit('radialMenuClick', {button: "pdfWindow", user: user,  data: {state: "closed"}} );
		}
		if( this.radialVideoButton.isClicked() || this.radial2VideoButton.isClicked() )
		{
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('videoThumbnailWindow') )
			{
				this.radialVideoButton.isLit = true;
				this.wsio.emit('radialMenuClick', {button: "videoWindow", user: user,  data: {state: "opened"}} );
			}
			else
				this.wsio.emit('radialMenuClick', {button: "videoWindow", user: user,  data: {state: "closed"}} );
		}
		if( this.radialAppButton.isClicked() || this.radial2AppButton.isClicked() )
		{
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('appThumbnailWindow') )
			{
				this.radialAppButton.isLit = true;
				this.wsio.emit('radialMenuClick', {button: "appWindow", user: user,  data: {state: "opened"}} );
			}
			else
				this.wsio.emit('radialMenuClick', {button: "appWindow", user: user,  data: {state: "closed"}} );
		}
		if( this.radialSessionButton.isClicked() )
		{
			this.resetRadialButtonLitState();
			if( this.setToggleMenu('sessionThumbnailWindow') )
			{
				this.radialSessionButton.isLit = true;
				this.wsio.emit('radialMenuClick', {button: "sessionWindow", user: user,  data: {state: "opened"}} );
			}
			else
				this.wsio.emit('radialMenuClick', {button: "sessionWindow", user: user, data: {state: "closed"}} );
		}
		if( this.radialSaveSessionButton.isClicked() )
		{
			this.wsio.emit('saveSesion');
			this.wsio.emit('requestStoredFiles');
			this.wsio.emit('radialMenuClick', {button: "saveSession", user: user} );
		}

		// Level 2 -----------------------------------
		if( this.currentRadialState === 'radialAppMenu2' )
		{
			this.radial2ImageButton.onEvent(type, user.id, position, data);
			this.radial2PDFButton.onEvent(type, user.id, position, data);
			this.radial2VideoButton.onEvent(type, user.id, position, data);
			this.radial2AppButton.onEvent(type, user.id, position, data);
		}

		// Thumbnail window ----------------------------
		if( this.currentMenuState !== 'radialMenu' )
		{
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

			for( i = 0; i < currentThumbnailButtons.length; i++ )
			{
				thumbButton = currentThumbnailButtons[i];


				thumbEventPos = { x: position.x - this.thumbnailWindowPosition.x + 18  * radialMenuScale, y: position.y - this.thumbnailWindowPosition.y - this.textHeaderHeight };

				// Prevent clicking on hidden thumbnails under preview window
				var thumbnailWindowDivWidth = this.thumbnailWindowSize.x + this.imageThumbSize/2 - 10 - this.radialMenuSize.x - 25 * radialMenuScale; // Should match where 'this.thumbnailWindowDiv.style.width' is assigned
				if( thumbEventPos.x >= 0 && thumbEventPos.x <= thumbnailWindowDivWidth )
				{
					thumbEventPos.x -= this.thumbnailWindowScrollOffset.x;
					buttonOverCount += thumbButton.onEvent(type, user.id, thumbEventPos, data);

					if ( thumbButton.isReleased() && this.scrollOpenContentLock === false )
					{
						if( this.currentMenuState === 'appThumbnailWindow' )
						{
							this.loadApplication( thumbButton.getData(), user  );
						}
						else
						{
							this.loadFileFromServer( thumbButton.getData(), user  );
						}

					}
					if ( thumbButton.isPositionOver(user.id, thumbEventPos)  )
					{
						this.hoverOverText = thumbButton.getData().filename;
						this.hoverOverThumbnail = thumbButton.idleImage;
						this.hoverOverMeta = thumbButton.getData().meta;
						overButton = true;
					}

					if( thumbButton.isFirstOver()  ) // Only occurs on first pointerMove event over button
						this.ctx.redraw = true; // Redraws radial menu and metadata window (independent of thumbnails)
				}
			}
		}

		// windowInteractionMode = true if any active button has an event over its
		if( type === "pointerPress" && data.button === 'left' )
		{
			// Press over radial menu, drag menu
			if( position.x > 0 && position.x < this.radialMenuSize.x && position.y > 0 && position.y < this.radialMenuSize.y && buttonOverCount === 0 )
			{
				this.windowInteractionMode = false;
				this.dragPosition = position;
			}

			if( position.x > this.radialMenuSize.x && position.x < this.thumbnailWindowSize.x && position.y > 0 && position.y < this.thumbnailWindowSize.y )
			{
				if( this.dragThumbnailWindow === false )
				{
					this.dragThumbnailWindow = true;
					this.thumbnailWindowDragPosition = position;

					this.thumbnailWindowInitialScrollOffset.x = this.thumbnailWindowScrollOffset.x;
					this.thumbnailWindowInitialScrollOffset.y = this.thumbnailWindowScrollOffset.y;
				}
			}
			this.ctx.redraw = true;
		}
		else if( type === "pointerMove" )
		{
			if( this.dragThumbnailWindow === true )
			{
				// Controls the content window scrolling.
				// Note:Scrolling is +right, -left so offset should always be negative
				if( this.thumbnailWindowScrollOffset.x <= 0 && this.notEnoughThumbnailsToScroll === false )
				{
					var scrollDist = 0;

					nextScrollPos = this.thumbnailWindowScrollOffset;

					nextScrollPos.x += (position.x - this.thumbnailWindowDragPosition.x) * thumbnailScrollScale;
					nextScrollPos.y += (position.y - this.thumbnailWindowDragPosition.y) * thumbnailScrollScale;

					if( nextScrollPos.x > 0 )
						nextScrollPos.x = 0;
					if( nextScrollPos.y > 0 )
						nextScrollPos.y = 0;

					if( this.thumbnailWindowScrollLock.x === false )
					{
						this.thumbnailWindowScrollOffset.x = nextScrollPos.x;
						scrollDist += this.thumbnailWindowInitialScrollOffset.x - this.thumbnailWindowScrollOffset.x;
					}
					if( this.thumbnailWindowScrollLock.y === false )
					{
						this.thumbnailWindowScrollOffset.y = nextScrollPos.y;
						scrollDist += this.thumbnailWindowInitialScrollOffset.y - this.thumbnailWindowScrollOffset.y;
					}

					if( scrollDist < 0 )
						scrollDist *= -1;

					if( scrollDist >= thumbnailDisableSelectionScrollDistance )
					{
						this.scrollOpenContentLock = true;
					}

					this.thumbnailScrollWindowElement.style.left = (this.thumbnailWindowScrollOffset.x).toString()+"px";

					this.thumbnailWindowDragPosition = position;
				}
				else
				{
					this.thumbnailWindowScrollOffset.x = 0;
				}
			}

		}
		else if( type === "pointerRelease" )
		{
			if(  this.windowInteractionMode === false )
			{
				this.windowInteractionMode = true;
				this.dragPosition = { x: 0, y: 0 };
			}
			else if( this.dragThumbnailWindow === true )
			{
				this.dragThumbnailWindow = false;
				this.scrollOpenContentLock = false;
			}
		}

	};

	// Displays files
	this.loadFileFromServer = function( data, user )
	{
		if( this.sendsToServer === true )
		{
			this.wsio.emit('loadFileFromServer', { application: data.application, filename: data.filename, user: user} );
		}
	};

	this.loadApplication = function( data, user )
	{
		if( this.sendsToServer === true )
		{
			this.wsio.emit('loadApplication', { application: data.filename, user: user} );
		}
	};

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
		imageList = serverFileList.images;
		pdfList =  serverFileList.pdfs;
		videoList =  serverFileList.videos;
		appList =  serverFileList.apps;

		sessionList =  serverFileList.sessions;

		if( imageList !== null )
		{
			validImages = 0;
			for( i = 0; i < imageList.length; i++ )
			{
				if( imageList[i].filename.search("Thumbs.db") == -1 )
				{
					thumbnailButton = new buttonWidget();
					thumbnailButton.init(0, this.thumbScrollWindowctx, null);
					thumbnailButton.setData( {application: "image_viewer", filename: imageList[i].exif.FileName, meta: imageList[i].exif} );
					thumbnailButton.simpleTint = false;

					// Thumbnail image
					if ( imageList[i].exif.SAGE2thumbnail !== null )
					{
						customIcon = new Image();
						customIcon.src = imageList[i].exif.SAGE2thumbnail+"_256.png";
						thumbnailButton.setIdleImage( customIcon );
					}
					else
						thumbnailButton.setIdleImage( this.idleImageIcon );

					this.thumbnailButtons.push(thumbnailButton);
					this.imageThumbnailButtons.push(thumbnailButton);
					validImages++;
				}
			}
		}
		if( pdfList !== null )
		{
			for( i = 0; i < pdfList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				thumbnailButton.setData( {application: "pdf_viewer", filename: pdfList[i].exif.FileName, meta: pdfList[i].exif} );
				thumbnailButton.simpleTint = false;

				// Thumbnail image
				if ( pdfList[i].exif.SAGE2thumbnail !== null )
				{
					customIcon = new Image();
					customIcon.src = pdfList[i].exif.SAGE2thumbnail+"_256.png";
					thumbnailButton.setIdleImage( customIcon );
				}
				else
					thumbnailButton.setIdleImage( this.idlePDFIcon );


				this.thumbnailButtons.push(thumbnailButton);
				this.pdfThumbnailButtons.push(thumbnailButton);
			}
		}
		if( videoList !== null )
		{
			for( i = 0; i < videoList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				thumbnailButton.setData( {application: "movie_player", filename: videoList[i].exif.FileName, meta: videoList[i].exif} );
				thumbnailButton.simpleTint = false;

				// Thumbnail image
				if ( videoList[i].exif.SAGE2thumbnail !== null )
				{
					customIcon = new Image();
					customIcon.src = videoList[i].exif.SAGE2thumbnail+"_256.png";
					//console.log("uploads/assets/"+imageList[i].exif.SAGE2thumbnail);
					thumbnailButton.setIdleImage( customIcon );
				}
				else
					thumbnailButton.setIdleImage( this.idleVideoIcon );

				this.thumbnailButtons.push(thumbnailButton);
				this.videoThumbnailButtons.push(thumbnailButton);
			}
		}
		if( appList !== null )
		{
			for( i = 0; i < appList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				thumbnailButton.setData( {application: "custom_app", filename: appList[i].exif.FileName, meta: appList[i].exif} );
				thumbnailButton.simpleTint = false;
				thumbnailButton.useBackgroundColor = false;

				thumbnailButton.setSize( this.imageThumbSize * 2, this.imageThumbSize * 2 );
				thumbnailButton.setHitboxSize( this.imageThumbSize * 2, this.imageThumbSize * 2 );

				if ( appList[i].exif.SAGE2thumbnail !== null )
				{
					customIcon = new Image();
					customIcon.src = appList[i].exif.SAGE2thumbnail+"_256.png";
					thumbnailButton.setIdleImage( customIcon );
				}
				else
					thumbnailButton.setIdleImage( this.idleAppIcon );

				this.thumbnailButtons.push(thumbnailButton);
				this.appThumbnailButtons.push(thumbnailButton);
			}
		}
		if( sessionList !== null )
		{
			for( i = 0; i < sessionList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.thumbScrollWindowctx, null);
				thumbnailButton.setData( {application: "load_session", filename: sessionList[i].exif.FileName, meta: sessionList[i].exif} );
				thumbnailButton.setIdleImage( this.idleSessionIcon );
				thumbnailButton.simpleTint = false;

				this.thumbnailButtons.push(thumbnailButton);
				this.sessionThumbnailButtons.push(thumbnailButton);
			}
		}

		this.updateThumbnailPositions();
	};

	this.setThumbnailPosition = function( thumbnailSourceList, imageThumbSize, thumbSpacer, maxRows, neededColumns )
	{
		var curRow = 0;
		var curColumn = 0;

		this.thumbnailScrollWindowElement.width = (imageThumbSize + thumbSpacer) * neededColumns;
		for( i = 0; i < thumbnailSourceList.length; i++ )
		{
			currentButton = thumbnailSourceList[i];


			if( curColumn+1 > neededColumns )
			{
				curColumn = 0;

				if( curRow < maxRows - 1 )
					curRow++;
			}
			currentButton.setPosition( curColumn * (imageThumbSize + thumbSpacer),  curRow * (imageThumbSize + thumbSpacer) );
			curColumn++;
		}
	};

	this.updateThumbnailPositions = function()
	{
		var curRow = 0;
		var curColumn = 0;

		//{ x: 1224, y: 860 };

		var thumbWindowSize = this.thumbnailWindowSize;

		// maxRows is considered a 'hard' limit based on the thumbnail and window size.
		// If maxRows and maxCols is exceeded, then maxCols is expanded as needed.
		var maxRows = Math.floor((thumbWindowSize.y-this.thumbnailWindowPosition.y) / (this.imageThumbSize + thumbSpacer));
		var maxCols = Math.floor((thumbWindowSize.x-this.thumbnailWindowPosition.x) / (this.imageThumbSize + thumbSpacer));

		var neededColumns = maxRows;

		if( this.currentMenuState === 'imageThumbnailWindow' )
		{
			if( this.imageThumbnailButtons.length > (maxRows*maxCols) )
				neededColumns = Math.ceil(this.imageThumbnailButtons.length / maxRows );
		}
		else if( this.currentMenuState === 'pdfThumbnailWindow' )
		{
			if( this.pdfThumbnailButtons.length > (maxRows*maxCols) )
				neededColumns = Math.ceil(this.pdfThumbnailButtons.length / maxRows );
		}
		else if( this.currentMenuState === 'videoThumbnailWindow' )
		{
			if( this.videoThumbnailButtons.length > (maxRows*maxCols) )
				neededColumns = Math.ceil(this.videoThumbnailButtons.length / maxRows );
		}
		else if( this.currentMenuState === 'sessionThumbnailWindow' )
		{
			if( this.sessionThumbnailButtons.length > (maxRows*maxCols) )
				neededColumns = Math.ceil(this.sessionThumbnailButtons.length / maxRows );
		}

		var maxScrollPosX = this.thumbnailWindowPosition.x - (maxCols - neededColumns + 2) * (this.imageThumbSize + thumbSpacer);

		// Special thumbnail size for custom apps
		if( this.currentMenuState === 'appThumbnailWindow' )
		{
			maxRows = Math.floor((this.thumbnailWindowSize.y-this.thumbnailWindowPosition.y) / (this.imageThumbSize * 2 + thumbSpacer));
			maxCols = Math.floor((this.thumbnailWindowSize.x-this.thumbnailWindowPosition.x) / (this.imageThumbSize * 2 + thumbSpacer));
			neededColumns = Math.ceil(this.appThumbnailButtons.length / maxRows );
			maxScrollPosX = this.thumbnailWindowPosition.x - (maxCols - neededColumns + 2) * (this.imageThumbSize * 2 + thumbSpacer);
		}

		this.thumbnailGridSize = { x: maxRows, y: maxCols };
		if( neededColumns > maxRows )
			this.notEnoughThumbnailsToScroll = false;
		else
		{
			this.notEnoughThumbnailsToScroll = true;
			this.thumbnailWindowScrollOffset.x = 0;
			this.thumbnailScrollWindowElement.style.left = (this.thumbnailWindowScrollOffset.x).toString()+"px";
		}

		if( this.currentMenuState === 'imageThumbnailWindow' )
		{
			this.setThumbnailPosition( this.imageThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns );
		}

		if( this.currentMenuState === 'pdfThumbnailWindow' )
		{
			this.setThumbnailPosition( this.pdfThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns );
		}

		if( this.currentMenuState === 'videoThumbnailWindow' )
		{
			this.setThumbnailPosition( this.videoThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns );
		}

		if( this.currentMenuState === 'appThumbnailWindow' )
		{
			this.setThumbnailPosition( this.appThumbnailButtons, this.imageThumbSize * 2, thumbSpacer, maxRows, neededColumns );
		}

		if( this.currentMenuState === 'sessionThumbnailWindow' )
			this.setThumbnailPosition( this.sessionThumbnailButtons, this.imageThumbSize, thumbSpacer, maxRows, neededColumns );

	};

}

function buttonWidget() {
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

	this.idleImage = null;
	this.overlayImage = null;

	this.useBackgroundColor = true;
	this.useEventOverColor = false;
	this.simpleTint = false;

	this.alignment = 'left';
	this.hitboxShape = 'box';

	this.isLit = false;

	// Button states:
	// -1 = Disabled
	// 0  = Idle
	// 1  = Over
	// 2  = Pressed
	// 3  = Clicked
	// 4  = Released
	// 5	= OverEnter (First over event)
	this.state = 0;

	this.buttonData = {};

	this.init = function(id, ctx, resrc)
	{
		//this.element = document.getElementById(id);
		this.ctx = ctx;
		this.resrcPath = resrc;

		//console.log("buttonWidget init()");
	};

	this.setPosition = function( x, y )
	{
		this.posX = x;
		this.posY = y;
	};

	this.setRotation = function( a )
	{
		this.angle = a;
	};

	this.setData = function( data )
	{
		this.buttonData = data;
	};

	this.setIdleImage = function( image )
	{
		this.idleImage = image;
	};

	this.setOverlayImage = function( overlayImage, scale )
	{
		this.overlayImage = overlayImage;
		this.overlayScale = scale;
	};

	this.setSize = function( w, h )
	{
		this.width = w;
		this.height = h;
	};

	this.setHitboxSize = function( w, h )
	{
		this.hitboxWidth = w;
		this.hitboxheight = h;
	};

	this.getData = function()
	{
		return this.buttonData;
	};

	this.draw = function()
	{
		// Default - align 'left'
		var translate = { x: this.posX, y: this.posY };
		var offsetHitbox = { x: 0, y: 0 };
		var offset = { x: 0, y: 0 };

		if( this.alignment === 'centered' )
		{
			offset = { x: -this.width/2, y: -this.height/2 };
			offsetHitbox = { x: -this.hitboxWidth/2, y: -this.hitboxWidth/2 };
		}

		this.ctx.save();
		this.ctx.translate( translate.x, translate.y );

		if( this.state === 5 )
		{
			this.ctx.fillStyle = this.mouseOverColor;
		}
		else if( this.state === 3 )
		{
			this.ctx.fillStyle = this.clickedColor;
			this.state = 2; // Pressed state
		}
		else if( this.state === 2 )
		{
			this.ctx.fillStyle = this.pressedColor;
		}
		else if( this.state === 4 )
		{
			this.ctx.fillStyle = this.releasedColor;
			this.state = 1;
		}
		if( this.useBackgroundColor )
		{
			if( this.isLit )
				this.ctx.fillStyle = this.litColor;
			else
				this.ctx.fillStyle = this.defaultColor;

			if( this.hitboxShape === 'box' )
				this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight);
			else if( this.hitboxShape === 'circle' )
			{
				//this.ctx.arc(0, 0, this.hitboxWidth/2,0,2*Math.PI);
				//this.ctx.fillStyle = this.defaultColor;
				//this.ctx.fill();
			}
		}

		// Draw icon aligned centered
		if( this.idleImage !== null )
		{
			//this.ctx.rotate( this.angle );

			// draw the original image
			this.ctx.drawImage( this.idleImage, offset.x, offset.y, this.width, this.height );

			if( this.isLit === true )
				this.drawTintImage( this.idleImage, offset, this.width, this.height, this.litColor, 0.5 );

			// Tint the image
			if( this.state !== 0 )
			{
				if( this.simpleTint )
				{
					this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight);
				}
				else
				{
					if( this.isLit === false && this.useEventOverColor)
						this.drawTintImage( this.idleImage, offset, this.width, this.height, this.ctx.fillStyle, 0.8 );
				}
			}

		}
		this.ctx.restore();

		if( this.overlayImage !== null )
		{
			this.ctx.save();
			this.ctx.translate( translate.x, translate.y );
			this.ctx.drawImage( this.overlayImage, -this.width* this.overlayScale/2, -this.height* this.overlayScale/2, this.width * this.overlayScale, this.height * this.overlayScale);
			this.ctx.restore();
		}
	};

	this.drawTintImage = function( image, offset, width, height, color, alpha )
	{
		// Tint the image (Part 1)
		// create offscreen buffer,
		buffer = document.createElement('canvas');
		buffer.width = width;
		buffer.height = height;
		bx = buffer.getContext('2d');

		// fill offscreen buffer with the tint color
		bx.fillStyle = color;
		bx.fillRect(0,0,buffer.width,buffer.height);

		// destination atop makes a result with an alpha channel identical to fg, but with all pixels retaining their original color *as far as I can tell*
		bx.globalCompositeOperation = "destination-atop";
		bx.drawImage(image, 0, 0, width, height );

		//then set the global alpha to the amound that you want to tint it, and draw the buffer directly on top of it.
		this.ctx.globalAlpha = alpha;

		// draw the tinted overlay
		this.ctx.drawImage( buffer, offset.x, offset.y, width, height );
	};

	this.onEvent = function( type, user, position, data )
	{
		if( this.isPositionOver( user, position ) )
		{
			if( this.state === 5 )
			{
				this.state = 1;
			}

			if( type === "pointerPress" && this.state !== 2 )
			{
				this.state = 3; // Click state
				if( this.useEventOverColor )
					this.ctx.redraw = true;
			}
			else if( type === "pointerRelease" )
			{
				this.state = 4;
				if( this.useEventOverColor )
					this.ctx.redraw = true;
			}
			else if( this.state !== 2 )
			{
				if( this.state !== 1 )
				{
					this.state = 5;
					if( this.useEventOverColor )
						this.ctx.redraw = true;
				}
				else
					this.state = 1;
			}

			return 1;
		}
		else
		{
			if( this.state !== 0 && this.useEventOverColor )
				this.ctx.redraw = true;
			this.state = 0;

			return 0;
		}
	};

	this.isPositionOver = function(id, position) {
		x = position.x;
		y = position.y;

		if( this.alignment === 'centered' && this.hitboxShape === 'box' )
		{
			x += this.hitboxWidth/2;
			y += this.hitboxheight/2;
		}

		if( this.hitboxShape === 'box' )
		{
			if( x >= this.posX && x <= this.posX + this.hitboxWidth && y >= this.posY && y <= this.posY + this.hitboxheight )
				return true;
			else
				return false;

		}
		else if( this.hitboxShape === 'circle' )
		{
			var distance = Math.sqrt( Math.pow(Math.abs( x - this.posX ), 2) + Math.pow(Math.abs( y - this.posY ), 2) );

			if( distance <= this.hitboxWidth/2 )
				return true;
			else
				return false;
		}
	};

	this.isFirstOver = function()
	{
		if ( this.state === 5 )
		{
			return true;
		}
		else
			return false;
	};

	this.isOver = function()
	{
		if ( this.state === 1 )
		{
			return true;
		}
		else
			return false;
	};

	this.isClicked = function()
	{
		if ( this.state === 3 )
		{
			this.state = 2;
			return true;
		}
		else
			return false;
	};

	this.isReleased = function()
	{
		if ( this.state === 4 )
		{
			this.state = 0;
			return true;
		}
		else
			return false;
	};
}
