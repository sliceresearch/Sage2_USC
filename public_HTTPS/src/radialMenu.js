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

var thumbnailWindowWidth = 0.77;
var previewWindowWidth = 0.2;
var previewWindowOffset = 0.78;

// radial menu buttons
var radialMenuCenter = { x: 200, y: 200 }; // overwritten in init - based on window size
var radialMenuSize = { x: 512, y: 512 };
var angleSeparation = 35;
var initAngle = 55;
var angle = 0;
var menuRadius = 100;
var menuButtonSize = 100; // pie image size
var menuButtonHitboxSize = 50;
var overlayIconScale = 0.3; // image, pdf, etc image

function radialMenu(){
	this.element    = null;
	this.ctx        = null;
	
	this.init = function(id) {
		this.element = document.getElementById(id); // gets because pointer is assumed to be created with initial connection (else createElement( canvas tag)
		this.ctx     = this.element.getContext("2d");
		
		this.resrcPath = "images/radialMenu/"
		
		this.menuID = id;
		this.currentMenuState = 'radialMenu'
		this.currentRadialState = 'radialMenu'
		
		this.visible = true;
		this.windowInteractionMode = false;
		
		// load thumbnail icons
		this.idleImageIcon = new Image;
		this.idleImageIcon.src = this.resrcPath +"image2.svg"
		this.idlePDFIcon = new Image;
		this.idlePDFIcon.src = this.resrcPath +"file.svg"
		this.idleVideoIcon = new Image;
		this.idleVideoIcon.src = this.resrcPath +"clapper.svg"
		this.idleAppIcon = new Image;
		this.idleAppIcon.src = this.resrcPath +"rocket.svg"
		this.idleSessionIcon = new Image;
		this.idleSessionIcon.src = this.resrcPath +"upload.svg"
		this.idleSaveSessionIcon = new Image;
		this.idleSaveSessionIcon.src = this.resrcPath +"download.svg"
		this.idleSettingsIcon = new Image;
		this.idleSettingsIcon.src = this.resrcPath +"cog.svg"
		
		// Level 2 icons
		this.idleFolderIcon = new Image;
		this.idleFolderIcon.src = this.resrcPath + "open131.svg"
		this.idleCloseAppIcon = new Image;
		this.idleCloseAppIcon.src = this.resrcPath + "window27.svg"
		this.idleCloseAllIcon = new Image;
		this.idleCloseAllIcon.src = this.resrcPath + "windows24.svg"
		this.idleMaximizeIcon = new Image;
		this.idleMaximizeIcon.src = this.resrcPath + "maximize.svg"
		this.idleTileIcon = new Image;
		this.idleTileIcon.src = this.resrcPath + "large16.svg"
		
		// radial menu icons
		this.radialMenuIcon = new Image;
		this.radialMenuIcon.src = this.resrcPath +"icon_radial_256.png"
		this.radialMenuLevel2Icon = new Image;
		this.radialMenuLevel2Icon.src = this.resrcPath +"icon_radial_level2_360.png"
		this.radialCloseIcon = new Image;
		this.radialCloseIcon.src = this.resrcPath +"icon_close_128.png"
		
		// Create buttons
		this.radialCloseButton = new buttonWidget();
		this.radialCloseButton.init(0, this.ctx, null);
		this.radialCloseButton.setIdleImage( this.radialCloseIcon );
		
		this.radialCloseButton.useBackgroundColor = false;
				
		this.radialImageButton = new buttonWidget();
		this.radialImageButton.init(0, this.ctx, null);
		this.radialImageButton.setIdleImage( this.radialMenuIcon );
		this.radialImageButton.useBackgroundColor = false;
		this.radialImageButton.setOverlayImage( this.idleImageIcon, overlayIconScale );
		
		this.radialPDFButton = new buttonWidget();
		this.radialPDFButton.init(0, this.ctx, null);
		this.radialPDFButton.setIdleImage( this.radialMenuIcon );
		this.radialPDFButton.useBackgroundColor = false;
		this.radialPDFButton.setOverlayImage( this.idlePDFIcon, overlayIconScale );
		
		this.radialVideoButton = new buttonWidget();
		this.radialVideoButton.init(0, this.ctx, null);
		this.radialVideoButton.setIdleImage( this.radialMenuIcon );
		this.radialVideoButton.useBackgroundColor = false;
		this.radialVideoButton.setOverlayImage( this.idleVideoIcon, overlayIconScale );
		
		this.radialAppButton = new buttonWidget();
		this.radialAppButton.init(0, this.ctx, null);
		this.radialAppButton.setIdleImage( this.radialMenuIcon );
		this.radialAppButton.useBackgroundColor = false;
		this.radialAppButton.setOverlayImage( this.idleAppIcon, overlayIconScale );
		
		this.radialSessionButton = new buttonWidget();
		this.radialSessionButton.init(0, this.ctx, null);
		this.radialSessionButton.setIdleImage( this.radialMenuIcon );
		this.radialSessionButton.useBackgroundColor = false;
		this.radialSessionButton.setOverlayImage( this.idleSessionIcon, overlayIconScale );
		
		this.radialSaveSessionButton = new buttonWidget();
		this.radialSaveSessionButton.init(0, this.ctx, null);
		this.radialSaveSessionButton.setIdleImage( this.radialMenuIcon );
		this.radialSaveSessionButton.useBackgroundColor = false;
		this.radialSaveSessionButton.setOverlayImage( this.idleSaveSessionIcon, overlayIconScale );
		
		this.radialSettingsButton = new buttonWidget();
		this.radialSettingsButton.init(0, this.ctx, null);
		this.radialSettingsButton.setIdleImage( this.radialMenuIcon );
		this.radialSettingsButton.useBackgroundColor = false;
		this.radialSettingsButton.setOverlayImage( this.idleSettingsIcon, overlayIconScale );
		
		// Scale buttons different from global thumbnail size
		this.radialCloseButton.setSize( 50, 50 );
		this.radialImageButton.setSize( menuButtonSize, menuButtonSize );
		this.radialPDFButton.setSize( menuButtonSize, menuButtonSize );
		this.radialVideoButton.setSize( menuButtonSize, menuButtonSize );
		this.radialAppButton.setSize( menuButtonSize, menuButtonSize );
		this.radialSessionButton.setSize( menuButtonSize, menuButtonSize );
		this.radialSaveSessionButton.setSize( menuButtonSize, menuButtonSize );
		this.radialSettingsButton.setSize( menuButtonSize, menuButtonSize );
		
		// Set hitbox size (radial buttons are not square and will overlap)
		this.radialImageButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radialPDFButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radialVideoButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radialAppButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radialSessionButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radialSaveSessionButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radialSettingsButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		
		// Button alignment
		this.radialCloseButton.alignment = 'centered';
		this.radialImageButton.alignment = 'centered';
		this.radialPDFButton.alignment = 'centered';
		this.radialVideoButton.alignment = 'centered';
		this.radialAppButton.alignment = 'centered';
		this.radialSessionButton.alignment = 'centered';
		this.radialSaveSessionButton.alignment = 'centered';
		this.radialSettingsButton.alignment = 'centered';
		
		// Place buttons
		this.radialCloseButton.setPosition( radialMenuCenter.x, radialMenuCenter.y );
		
		angle = (initAngle + angleSeparation * 1) * (Math.PI/180);
		this.radialImageButton.setPosition( radialMenuCenter.x - menuRadius * Math.cos(angle), radialMenuCenter.y - menuRadius * Math.sin(angle) );
		this.radialImageButton.setRotation( angle - Math.PI/2 );
		
		angle = (initAngle + angleSeparation * 0) * (Math.PI/180);
		this.radialPDFButton.setPosition( radialMenuCenter.x - menuRadius * Math.cos(angle), radialMenuCenter.y - menuRadius * Math.sin(angle) );
		this.radialPDFButton.setRotation( angle - Math.PI/2 );
		
		angle = (initAngle + angleSeparation * 2) * (Math.PI/180);
		this.radialVideoButton.setPosition( radialMenuCenter.x - menuRadius * Math.cos(angle), radialMenuCenter.y - menuRadius * Math.sin(angle) );
		this.radialVideoButton.setRotation( angle - Math.PI/2 );
		
		angle = (initAngle + angleSeparation * 3) * (Math.PI/180);
		this.radialAppButton.setPosition( radialMenuCenter.x - menuRadius * Math.cos(angle), radialMenuCenter.y - menuRadius * Math.sin(angle) );
		this.radialAppButton.setRotation( angle - Math.PI/2 );
		
		angle = (initAngle + angleSeparation * 4) * (Math.PI/180);
		this.radialSessionButton.setPosition( radialMenuCenter.x - menuRadius * Math.cos(angle), radialMenuCenter.y - menuRadius * Math.sin(angle) );
		this.radialSessionButton.setRotation( angle - Math.PI/2 );
	
		angle = (initAngle + angleSeparation * 5) * (Math.PI/180);
		this.radialSaveSessionButton.setPosition( radialMenuCenter.x - menuRadius * Math.cos(angle), radialMenuCenter.y - menuRadius * Math.sin(angle) );
		this.radialSaveSessionButton.setRotation( angle - Math.PI/2 );
	
		angle = (initAngle + angleSeparation * 8) * (Math.PI/180);
		this.radialSettingsButton.setPosition( radialMenuCenter.x - menuRadius * Math.cos(angle), radialMenuCenter.y - menuRadius * Math.sin(angle) );
		this.radialSettingsButton.setRotation( angle - Math.PI/2 );
		
		// Radial level 2
		var menu2ButtonSize = 140;
		var menuLevel2Radius = menuRadius + menuButtonSize/2 + 10;
		
		this.radial2ImageButton = new buttonWidget();
		this.radial2ImageButton.init(0, this.ctx, null);
		this.radial2ImageButton.setIdleImage( this.radialMenuLevel2Icon );
		this.radial2ImageButton.useBackgroundColor = false;
		this.radial2ImageButton.setOverlayImage( this.idleImageIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );
		
		this.radial2PDFButton = new buttonWidget();
		this.radial2PDFButton.init(0, this.ctx, null);
		this.radial2PDFButton.setIdleImage( this.radialMenuLevel2Icon );
		this.radial2PDFButton.useBackgroundColor = false;
		this.radial2PDFButton.setOverlayImage( this.idlePDFIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );
		
		this.radial2VideoButton = new buttonWidget();
		this.radial2VideoButton.init(0, this.ctx, null);
		this.radial2VideoButton.setIdleImage( this.radialMenuLevel2Icon );
		this.radial2VideoButton.useBackgroundColor = false;
		this.radial2VideoButton.setOverlayImage( this.idleVideoIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );
		
		this.radial2AppButton = new buttonWidget();
		this.radial2AppButton.init(0, this.ctx, null);
		this.radial2AppButton.setIdleImage( this.radialMenuLevel2Icon );
		this.radial2AppButton.useBackgroundColor = false;
		this.radial2AppButton.setOverlayImage( this.idleAppIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );
		
		this.radial2CloseAllButton = new buttonWidget();
		this.radial2CloseAllButton.init(0, this.ctx, null);
		this.radial2CloseAllButton.setIdleImage( this.radialMenuLevel2Icon );
		this.radial2CloseAllButton.useBackgroundColor = false;
		this.radial2CloseAllButton.setOverlayImage( this.idleCloseAllIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );
		
		this.radial2TileButton = new buttonWidget();
		this.radial2TileButton.init(0, this.ctx, null);
		this.radial2TileButton.setIdleImage( this.radialMenuLevel2Icon );
		this.radial2TileButton.useBackgroundColor = false;
		this.radial2TileButton.setOverlayImage( this.idleTileIcon, overlayIconScale * menuButtonSize/menu2ButtonSize );
		
		this.radial2ImageButton.setSize( menu2ButtonSize, menu2ButtonSize );
		this.radial2PDFButton.setSize( menu2ButtonSize, menu2ButtonSize );
		this.radial2VideoButton.setSize( menu2ButtonSize, menu2ButtonSize );
		this.radial2AppButton.setSize( menu2ButtonSize, menu2ButtonSize );
		this.radial2CloseAllButton.setSize( menu2ButtonSize, menu2ButtonSize );
		this.radial2TileButton.setSize( menu2ButtonSize, menu2ButtonSize );
		
		this.radial2ImageButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radial2PDFButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radial2VideoButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radial2AppButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radial2CloseAllButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		this.radial2TileButton.setHitboxSize( menuButtonHitboxSize, menuButtonHitboxSize );
		
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
		
		angle = (initAngle + angleSeparation * 8) * (Math.PI/180);
		this.radial2CloseAllButton.setPosition( radialMenuCenter.x - menuLevel2Radius * Math.cos(angle), radialMenuCenter.y - menuLevel2Radius * Math.sin(angle) );
		this.radial2CloseAllButton.setRotation( angle - Math.PI/2 );
		
		angle = (initAngle + angleSeparation * 7) * (Math.PI/180);
		this.radial2TileButton.setPosition( radialMenuCenter.x - menuLevel2Radius * Math.cos(angle), radialMenuCenter.y - menuLevel2Radius * Math.sin(angle) );
		this.radial2TileButton.setRotation( angle - Math.PI/2 );
	};
	
	this.draw = function() {
		// clear canvas
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
		
		// TEMP: Just to clearly see context edge
		if( this.windowInteractionMode === false )
		{
			this.ctx.fillStyle = "rgba(5, 5, 5, 0.5)"
		}
		else
		{
			this.ctx.fillStyle = "rgba(5, 15, 55, 0.5)"
		}
		
		this.ctx.fillRect(0,0, this.element.width, this.element.height)
			
		this.radialCloseButton.draw();
		
		this.radialImageButton.draw();
		this.radialPDFButton.draw();
		this.radialVideoButton.draw();
		this.radialAppButton.draw();
		this.radialSessionButton.draw();
		this.radialSaveSessionButton.draw();
		this.radialSettingsButton.draw();
	};
	
	this.closeMenu = function() {
		this.visible = false;
		console.log("Closing menu" );
	};
	
	this.onEvent = function(type, position, user, data) {
		//console.log("RadialMenu " + this.menuID + " " + type + " " + position + " " + user + " " + data );
	
		overButton = false;
		
		buttonOverCount = 0; // Count number of buttons have a pointer over it
		
		// Level 0 - Always visible -----------------------------------
		buttonOverCount += this.radialCloseButton.onEvent(type, user.id, position, data);
		if ( this.radialCloseButton.isClicked() )
		{
			this.closeMenu();
		}
		
		buttonOverCount += this.radialSettingsButton.onEvent(type, user.id, position, data);
		
		buttonOverCount += this.radialSessionButton.onEvent(type, user.id, position, data);
		buttonOverCount += this.radialSaveSessionButton.onEvent(type, user.id, position, data);
		
		// Level 1 -----------------------------------
		if( this.currentRadialState === 'radialMenu' )
		{
			buttonOverCount += this.radialImageButton.onEvent(type, user.id, position, data);
			buttonOverCount += this.radialPDFButton.onEvent(type, user.id, position, data);
			buttonOverCount += this.radialVideoButton.onEvent(type, user.id, position, data);
			buttonOverCount += this.radialAppButton.onEvent(type, user.id, position, data);
		}
		
		if( this.radialImageButton.isClicked() || this.radial2ImageButton.isClicked() )
		{
			this.wsio.emit('requestStoredFiles');
			if( this.currentMenuState !== 'imageThumbnailWindow' )
				this.currentMenuState = 'imageThumbnailWindow';
			else
				this.currentMenuState = 'radialMenu';
		}
		if( this.radialPDFButton.isClicked() || this.radial2PDFButton.isClicked() )
		{
			this.wsio.emit('requestStoredFiles');
			if( this.currentMenuState !== 'pdfThumbnailWindow' )
				this.currentMenuState = 'pdfThumbnailWindow';
			else
				this.currentMenuState = 'radialMenu';
		}
		if( this.radialVideoButton.isClicked() || this.radial2VideoButton.isClicked() )
		{
			this.wsio.emit('requestStoredFiles');
			if( this.currentMenuState !== 'videoThumbnailWindow' )
				this.currentMenuState = 'videoThumbnailWindow';
			else
				this.currentMenuState = 'radialMenu';
		}
		if( this.radialAppButton.isClicked() || this.radial2AppButton.isClicked() )
		{
			this.wsio.emit('requestStoredFiles');
			if( this.currentMenuState !== 'appThumbnailWindow' )
				this.currentMenuState = 'appThumbnailWindow';
			else
				this.currentMenuState = 'radialMenu';
		}
		if( this.radialSessionButton.isClicked() )
		{
			if( this.currentMenuState !== 'sessionThumbnailWindow' )
				this.currentMenuState = 'sessionThumbnailWindow';
			else
				this.currentMenuState = 'radialMenu';
		}
		if( this.radialSaveSessionButton.isClicked() )
		{
			this.wsio.emit('saveSesion');
			this.wsio.emit('requestStoredFiles');
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
				thumbButton.onEvent(type, user.id, position, data);

				if ( thumbButton.isReleased() && this.sendsToServer === true )
				{ 
					//console.log(thumbButton+" released" );
					this.addNewElementFromStoredFiles( thumbButton.getData()  );
				}
				if ( thumbButton.isPositionOver(user.id, position)  )
				{
					this.hoverOverText = thumbButton.getData().filename;
					this.hoverOverThumbnail = thumbButton.idleImage;
					this.hoverOverMeta =  thumbButton.getData().meta;
						overButton = true;
				}
			}
		}
		
		
		// windowInteractionMode = true if any active button has an event over it
		if( buttonOverCount > 0 )
			this.windowInteractionMode = true;
		else
			this.windowInteractionMode = false;
	};
}

function buttonWidget() {
	//this.element = null;
	this.ctx = null;
	this.resrcPath = null;
	
	this.posX = 100;
	this.posY = 100;
	this.angle = 0;
	this.width = imageThumbSize;
	this.height = imageThumbSize;
	
	this.hitboxWidth = imageThumbSize;
	this.hitboxheight = imageThumbSize;
	
	this.defaultColor =  "rgba(210, 210, 210, 1.0)";
	this.mouseOverColor = "rgba(210, 210, 10, 1.0 )";
	this.clickedColor = "rgba(10, 210, 10, 1.0 )";
	this.pressedColor = "rgba(10, 210, 210, 1.0 )";
	this.releasedColor = "rgba(10, 10, 210, 1.0 )";
	
	this.idleImage = null;
	this.overlayImage = null;
	
	this.useBackgroundColor = true;
	
	this.alignment = 'left';
	
	// Button states:
	// -1 = Disabled
	// 0  = Idle
	// 1  = Over
	// 2  = Pressed
	// 3  = Clicked
	// 4  = Released
	this.state = 0;
	
	this.buttonData = {};
	
	this.init = function(id, ctx, resrc)
	{
		//this.element = document.getElementById(id);
		this.ctx = ctx
		this.resrcPath = resrc;
		
		//console.log("buttonWidget init()");
	}
	 
	this.setPosition = function( x, y )
	{
		this.posX = x;
		this.posY = y;
	}
	
	this.setRotation = function(a )
	{
		this.angle = a;
	}
	
	this.setData = function( data )
	{
		this.buttonData = data;
	}
	
	this.setIdleImage = function( image )
	{
		this.idleImage = image;
	}
	
	this.setOverlayImage = function( overlayImage, scale )
	{
		this.overlayImage = overlayImage;
		this.overlayScale = scale;
	}
	
	this.setSize = function( w, h )
	{
		this.width = w;
		this.height = h;
	}
	
	this.setHitboxSize = function( w, h )
	{
		this.hitboxWidth = w;
		this.hitboxheight = h;
	}
	
	this.getData = function()
	{
		return this.buttonData;
	}
	
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
			
		if( this.state === 1 )
		{
			this.ctx.fillStyle = this.mouseOverColor;
			
			this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight)
		}
		else if( this.state === 3 )
		{
			this.ctx.fillStyle = this.clickedColor;
			this.state = 2; // Pressed state
			
			this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight)
		}
		else if( this.state === 2 )
		{
			this.ctx.fillStyle = this.pressedColor;
			
			this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight)
		}
		else if( this.state === 4 )
		{
			this.ctx.fillStyle = this.releasedColor;
			this.state = 1;
			
			this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight)
		}
		else if( this.useBackgroundColor )
		{
			this.ctx.fillStyle = this.defaultColor;
			this.ctx.fillRect(offsetHitbox.x, offsetHitbox.y, this.hitboxWidth, this.hitboxheight)
		}
		
		// Draw icon aligned centered
		if( this.idleImage != null )
		{
			this.ctx.rotate( this.angle );
			this.ctx.drawImage( this.idleImage, offset.x, offset.y, this.width, this.height );
		}
		this.ctx.restore();
		
		if( this.overlayImage != null )
		{
			this.ctx.save();
			this.ctx.translate( translate.x, translate.y );
			this.ctx.drawImage( this.overlayImage, -this.width* this.overlayScale/2, -this.height* this.overlayScale/2, this.width * this.overlayScale, this.height * this.overlayScale);
			this.ctx.restore();
		}
	};
	
	this.onEvent = function( type, user, position, data )
	{
		if( this.isPositionOver( user, position ) )
		{
			if( type === "pointerPress" && this.state != 2 )
			{
				this.state = 3; // Click state
			}
			else if( type === "pointerRelease" )
			{
				this.state = 4;
			}
			else if( this.state != 2 )
			{
				this.state = 1;
			}
			
			return 1;
		}
		else
		{
			this.state = 0;
			
			return 0;
		}
	}
	
	this.isPositionOver = function(id, position) {
		x = position.x;
		y = position.y;
		
		if( this.alignment === 'centered' )
		{
			x += this.hitboxWidth/2;
			y += this.hitboxheight/2;
		}
		
		if( x >= this.posX && x <= this.posX + this.hitboxWidth && y >= this.posY && y <= this.posY + this.hitboxheight )
			return true;
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
	}
	
	this.isClicked = function()
	{
		if ( this.state === 3 )
		{
			this.state = 2;
			return true;
		}
		else
			return false;
	}
	
	this.isReleased = function()
	{
		if ( this.state === 4 )
		{
			this.state = 0;
			return true;
		}
		else
			return false;
	}
}