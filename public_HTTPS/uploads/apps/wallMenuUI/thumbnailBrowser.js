// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014
//
// S2DMUI (SAGE2  Menu User Interface)

var thumbnailBrowserList = {};
var thumbnailBrowserIDList = [];

// layout parameters
var imageThumbSize = 75;
var thumbSpacer = 5;

var thumbnailWindowWidth = 0.77;
var previewWindowWidth = 0.2;
var previewWindowOffset = 0.78;

// radial menu buttons
var radialMenuCenter = { x: 200, y: 200 }; // overwritten in init - based on window size
var angleSeparation = 35;
var initAngle = 55;
var angle = 0;
var menuRadius = 100;
var menuButtonSize = 100; // pie image size
var menuButtonHitboxSize = 50;
var overlayIconScale = 0.3; // image, pdf, etc image

var thumbnailBrowser = SAGE2_App.extend( {
	construct: function()
	{
		arguments.callee.superClass.construct.call(this);

		this.ctx = null;
		this.minDim = null;
		this.resizeEvents = "continuous";
	},
	
	quit: function() {
        // It's the end
		this.wsio.emit("removeRadialMenu", { id: this.appID } );
    },
	
	init: function(id, width, height, resrc, date)
	{
		console.log("resrc "+resrc);
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
		
		// application specific 'init'
		this.ctx     = this.element.getContext("2d");
		this.minDim  = Math.min(this.element.width, this.element.height);
		
		this.thumbnailButtons = [];
		this.imageThumbnailButtons = [];
		this.videoThumbnailButtons = [];
		this.pdfThumbnailButtons = [];
		this.appThumbnailButtons = [];
		this.sessionThumbnailButtons = [];
		
		this.appIconList = null;
		thumbnailBrowserList[id] = this;
		this.appID = id;
		this.currentMenuState = 'radialMenu'; // 'radialMenu', 'imageThumbnailWindow', 'pdfThumbnailWindow', etc.
		this.currentRadialState = 'radialMenu'; // 'radialMenu', 'radialAppMenu'
		this.sendsToServer = true;
		this.thumbnailWindowPos = { x: 0, y: 0 };
		
		radialMenuCenter = { x: menuRadius + menuButtonSize/2, y: height - menuRadius - menuButtonSize/2};
		
		// websocket to server for file library access
		// Note: using a different socket to prevent locking up other app animations
		hostname = window.location.hostname;
		port = window.location.port;
		if(window.location.protocol == "http:" && port == "") port = "80";
		if(window.location.protocol == "https:" && port == "") port = "443";
		
		this.wsio = new websocketIO(window.location.protocol, hostname, parseInt(port));
		
		document.title = window.location.hostname.concat(" ", document.title ); 
		
		// load thumbnail icons
		this.idleImageIcon = new Image;
		this.idleImageIcon.src = this.resrcPath +"icons/image2.svg"
		this.idlePDFIcon = new Image;
		this.idlePDFIcon.src = this.resrcPath +"icons/file-pdf.svg"
		this.idleVideoIcon = new Image;
		this.idleVideoIcon.src = this.resrcPath +"icons/clapper.svg"
		this.idleAppIcon = new Image;
		this.idleAppIcon.src = this.resrcPath +"icons/rocket.svg"
		this.idleSessionIcon = new Image;
		this.idleSessionIcon.src = this.resrcPath +"icons/upload.svg"
		this.idleSaveSessionIcon = new Image;
		this.idleSaveSessionIcon.src = this.resrcPath +"icons/download.svg"
		this.idleSettingsIcon = new Image;
		this.idleSettingsIcon.src = this.resrcPath +"icons/cog.svg"
		
		// Level 2 icons
		this.idleFolderIcon = new Image;
		this.idleFolderIcon.src = this.resrcPath + "icons/open131.svg"
		this.idleCloseAppIcon = new Image;
		this.idleCloseAppIcon.src = this.resrcPath + "icons/window27.svg"
		this.idleCloseAllIcon = new Image;
		this.idleCloseAllIcon.src = this.resrcPath + "icons/windows24.svg"
		this.idleMaximizeIcon = new Image;
		this.idleMaximizeIcon.src = this.resrcPath + "icons/maximize.svg"
		this.idleTileIcon = new Image;
		this.idleTileIcon.src = this.resrcPath + "icons/large16.svg"
		
		// radial menu icons
		this.radialMenuIcon = new Image;
		this.radialMenuIcon.src = this.resrcPath +"icons/icon_radial_256.png"
		this.radialMenuLevel2Icon = new Image;
		this.radialMenuLevel2Icon.src = this.resrcPath +"icons/icon_radial_level2_360.png"
		this.radialCloseIcon = new Image;
		this.radialCloseIcon.src = this.resrcPath +"icons/icon_close_128.png"
		
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
		
		this.hoverOverText = "";
		this.hoverOverThumbnail = null;
		this.hoverOverMeta = null;
		
		this.clickedPosition = null;
		
		this.wsio.open(function() {
			//console.log("open websocket");
			var clientDescription = {
				clientType: "radialMenu",
				clientID: id,
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
			thumbnailBrowserList[id].wsio.emit('addClient', clientDescription);
		});
		
		this.wsio.on('storedFileList', function(fileList) {
			thumbnailBrowserList[id].updateFileList(fileList);
		});
		
		this.wsio.on('initialize', function(uniqueID, date, startTime) {
			thumbnailBrowserList[id].wsio.emit('requestStoredFiles');
		});
		
		this.wsio.on('disableSendToServer', function(ID) {
			thumbnailBrowserList[id].sendsToServer = false;
		});
		
		thumbnailBrowserIDList.push(id);
	},
	
	updateFileList: function(serverFileList)
	{
		//console.log("updateFileList: ");
		//console.log(serverFileList);
		
		this.thumbnailButtons = [];
		this.imageThumbnailButtons = [];
		this.videoThumbnailButtons = [];
		this.pdfThumbnailButtons = [];
		this.appThumbnailButtons = [];
		this.sessionThumbnailButtons = [];
		
		// Server file lists by type
		imageList = serverFileList.image;
		pdfList =  serverFileList.pdf;
		videoList =  serverFileList.video;
		appList =  serverFileList.app;

		sessionList =  serverFileList.session;

		if( imageList != null )
		{
			validImages = 0;
			for( i = 0; i < imageList.length; i++ )
			{
				if( imageList[i].filename.search("Thumbs.db") == -1 )
				{
					thumbnailButton = new buttonWidget();
					thumbnailButton.init(0, this.ctx, null);
					thumbnailButton.setData( {application: "image_viewer", filename: imageList[i].exif.FileName, meta: imageList[i].exif} );
					
					// Thumbnail image
					if ( imageList[i].exif.SAGE2thumbnail != null )
					{
						customIcon = new Image;
						customIcon.src = imageList[i].exif.SAGE2thumbnail;
						//console.log("uploads/assets/"+imageList[i].exif.SAGE2thumbnail);
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
		if( pdfList != null )
		{
			for( i = 0; i < pdfList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.ctx, null);
				thumbnailButton.setData( {application: "pdf_viewer", filename: pdfList[i].exif.FileName, meta: pdfList[i].exif} );
				
				// Thumbnail image
				if ( pdfList[i].exif.SAGE2thumbnail != null )
				{
					customIcon = new Image;
					customIcon.src = pdfList[i].exif.SAGE2thumbnail;
					//console.log("uploads/assets/"+imageList[i].exif.SAGE2thumbnail);
					thumbnailButton.setIdleImage( customIcon );
				}
				else
					thumbnailButton.setIdleImage( this.idlePDFIcon );
						

				this.thumbnailButtons.push(thumbnailButton);
				this.pdfThumbnailButtons.push(thumbnailButton);
			}
		}
		if( videoList != null )
		{
			for( i = 0; i < videoList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.ctx, null);
				thumbnailButton.setData( {application: "movie_player", filename: videoList[i].exif.FileName, meta: videoList[i].exif} );
				
				// Thumbnail image
				if ( videoList[i].exif.SAGE2thumbnail != null )
				{
					customIcon = new Image;
					customIcon.src = videoList[i].exif.SAGE2thumbnail;
					//console.log("uploads/assets/"+imageList[i].exif.SAGE2thumbnail);
					thumbnailButton.setIdleImage( customIcon );
				}
				else
					thumbnailButton.setIdleImage( this.idleVideoIcon );
				
				this.thumbnailButtons.push(thumbnailButton);
				this.videoThumbnailButtons.push(thumbnailButton);
			}
		}
		if( appList != null )
		{
			for( i = 0; i < appList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.ctx, null);
				thumbnailButton.setData( {application: "custom_app", filename: appList[i].exif.FileName, meta: appList[i].exif} );

				if ( appList[i].exif.SAGE2thumbnail != null )
				{
					customIcon = new Image;
					customIcon.src = appList[i].exif.SAGE2thumbnail;
					thumbnailButton.setIdleImage( customIcon );
				}
				else
					thumbnailButton.setIdleImage( this.idleAppIcon );

				this.thumbnailButtons.push(thumbnailButton);
				this.appThumbnailButtons.push(thumbnailButton);
			}
		}
		if( sessionList != null )
		{
			for( i = 0; i < sessionList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.ctx, null);
				thumbnailButton.setData( {application: "load_session", filename: sessionList[i].exif.FileName, meta: sessionList[i].exif} );
				thumbnailButton.setIdleImage( this.idleSessionIcon );
				
				this.thumbnailButtons.push(thumbnailButton);
				this.sessionThumbnailButtons.push(thumbnailButton);
			}
		}
		
		this.updateThumbnailPositions();
	},
	
	updateThumbnailPositions: function()
	{
		 this.thumbnailWindowPos = { x: radialMenuCenter.x * 2 + menuButtonSize/2, y: 0 };
		
		var curRow = 1;
		var curColumn = 0;
			
		for( i = 0; i < this.imageThumbnailButtons.length; i++ )
		{
			var nextCol = (this.thumbnailWindowPos.x + (curColumn + 1) * (imageThumbSize + thumbSpacer)) / this.element.width;
			var currentButton = this.imageThumbnailButtons[i];
			
			if( nextCol > thumbnailWindowWidth )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( this.thumbnailWindowPos.x + curColumn * (imageThumbSize + thumbSpacer),  this.thumbnailWindowPos.y + curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		//curColumn = 0;
		//curRow += 2;
		curRow = 1;
		curColumn = 0;
		for( i = 0; i < this.pdfThumbnailButtons.length; i++ )
		{
			var nextCol = (this.thumbnailWindowPos.x + (curColumn + 1) * (imageThumbSize + thumbSpacer)) / this.element.width;
			var currentButton = this.pdfThumbnailButtons[i];
			
			if( nextCol > thumbnailWindowWidth )
			{
				curColumn = 0;
				curRow++;
			}
			currentButton.setPosition( this.thumbnailWindowPos.x + curColumn * (imageThumbSize + thumbSpacer),  this.thumbnailWindowPos.y + curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		//curColumn = 0;
		//curRow += 2;
		curRow = 1;
		curColumn = 0;
		for( i = 0; i < this.videoThumbnailButtons.length; i++ )
		{
			var nextCol = (this.thumbnailWindowPos.x + (curColumn + 1) * (imageThumbSize + thumbSpacer)) / this.element.width;
			var currentButton = this.videoThumbnailButtons[i];
			
			if( nextCol > thumbnailWindowWidth )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( this.thumbnailWindowPos.x + curColumn * (imageThumbSize + thumbSpacer),  this.thumbnailWindowPos.y + curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		//curColumn = 0;
		//curRow += 2;
		curRow = 1;
		curColumn = 0;
		for( i = 0; i < this.appThumbnailButtons.length; i++ )
		{
			var nextCol = (this.thumbnailWindowPos.x + (curColumn + 1) * (imageThumbSize + thumbSpacer)) / this.element.width;
			var currentButton = this.appThumbnailButtons[i];
			
			if( nextCol > thumbnailWindowWidth )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( this.thumbnailWindowPos.x + curColumn * (imageThumbSize + thumbSpacer),  this.thumbnailWindowPos.y + curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		//curColumn = 0;
		//curRow += 2;
		curRow = 1;
		curColumn = 0;
		for( i = 0; i < this.sessionThumbnailButtons.length; i++ )
		{
			var nextCol = (this.thumbnailWindowPos.x + (curColumn + 1) * (imageThumbSize + thumbSpacer)) / this.element.width;
			var currentButton = this.sessionThumbnailButtons[i];
			
			if( nextCol > thumbnailWindowWidth )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( this.thumbnailWindowPos.x + curColumn * (imageThumbSize + thumbSpacer),  this.thumbnailWindowPos.y + curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		
	},
	
	load: function(state, date)
	{
	},
	
	draw: function(date)
	{
		// clear canvas		
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
	
		// background
		if( this.currentMenuState !== 'radialMenu' )
		{
			this.ctx.fillStyle = "rgba(5, 5, 5, 0.5)"
			this.ctx.fillRect(this.thumbnailWindowPos.x - 10,0, this.element.width, this.element.height)
		}
		
		this.radialCloseButton.draw(date);
		
		if( this.currentRadialState === 'radialMenu' )
		{
			this.radialImageButton.draw(date);
			this.radialPDFButton.draw(date);
			this.radialVideoButton.draw(date);
			this.radialAppButton.draw(date);
			this.radialSessionButton.draw(date);
			this.radialSaveSessionButton.draw(date);
			this.radialSettingsButton.draw(date);
		}
		if( this.currentRadialState === 'radialAppMenu' )
		{
			this.radialSessionButton.draw(date);
			this.radialSaveSessionButton.draw(date);
		}
		if( this.currentRadialState === 'radialAppMenu2' )
		{
			this.radialImageButton.draw(date);
			//this.radialPDFButton.draw(date);
			this.radialVideoButton.draw(date);
			this.radialAppButton.draw(date);
			this.radialSessionButton.draw(date);
			this.radialSaveSessionButton.draw(date);
			this.radialSettingsButton.draw(date);
			
			this.radial2ImageButton.draw(date);
			this.radial2PDFButton.draw(date);
			this.radial2VideoButton.draw(date);
			this.radial2AppButton.draw(date);
			
			this.radial2CloseAllButton.draw(date);
			this.radial2TileButton.draw(date);
		}
			
		// Thumbnail window
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
				thumbButton.draw(date);
			}
			
			// Filename text
			this.ctx.font="24px sans-serif";
			this.ctx.fillStyle = "rgba(250, 250, 250, 1.0)"
			this.ctx.fillText( this.hoverOverText, this.thumbnailWindowPos.x, 24);
			
			// Preview window
			previewImageSize = this.element.width * previewWindowWidth;
			previewWindowX = this.element.width * previewWindowOffset;
			previewWindowY = 50;
			
			if( this.hoverOverThumbnail !== null )
				this.ctx.drawImage( this.hoverOverThumbnail, previewWindowX, previewWindowY, previewImageSize, previewImageSize );
				
			// Metadata
			metadataLine = 0;
			metadataWindowX = previewWindowX;
			metadataWindowY = previewWindowY + previewImageSize + 20;
			if( this.hoverOverMeta !== null )
			{
				this.ctx.font="16px sans-serif";
				metadata = this.hoverOverMeta;
				//console.log( metadata);
				
				// Generic
				if( metadata.FileName )
				{
					this.ctx.fillText( "File Name: " + metadata.FileName, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.FileSize )
				{
					this.ctx.fillText( "File Size: " + metadata.FileSize, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				
				// Images
				if( metadata.ImageSize )
				{
					this.ctx.fillText( "Resolution: " + metadata.ImageSize, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.DateCreated )
				{
					this.ctx.fillText( "Date Created: " + metadata.DateCreated, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Copyright )
				{
					this.ctx.fillText( "Copyright: " + metadata.Copyright, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				
				// Photo
				if( metadata.Artist )
				{
					this.ctx.fillText( "Artist: " + metadata.Artist, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Aperture )
				{
					this.ctx.fillText( "Aperture: " + metadata.Aperture, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Exposure )
				{
					this.ctx.fillText( "Exposure: " + metadata.Exposure, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Flash )
				{
					this.ctx.fillText( "Flash: " + metadata.Flash, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.ExposureTime )
				{
					this.ctx.fillText( "Exposure Time: " + metadata.ExposureTime, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.FOV )
				{
					this.ctx.fillText( "FOV: " + metadata.FOV, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.FocalLength )
				{
					this.ctx.fillText( "Focal Length: " + metadata.FocalLength, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.Model )
				{
					this.ctx.fillText( "Model: " + metadata.Model, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.LensModel )
				{
					this.ctx.fillText( "Lens Model: " + metadata.LensModel, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.ISO )
				{
					this.ctx.fillText( "ISO: " + metadata.ISO, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.ShutterSpeed )
				{
					this.ctx.fillText( "Shutter Speed: " + metadata.ShutterSpeed, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				
				// GPS
				if( metadata.GPSAltitude )
				{
					this.ctx.fillText( "GPS Altitude: " + metadata.GPSAltitude, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.GPSLatitude )
				{
					this.ctx.fillText( "GPS Latitude: " + metadata.GPSLatitude, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.GPSTimeStamp )
				{
					this.ctx.fillText( "GPS TimeStamp: " + metadata.GPSTimeStamp, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				
				// Video
				if( metadata.Duration )
				{
					this.ctx.fillText( "Duration: " + metadata.Duration, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.CompressorID )
				{
					this.ctx.fillText( "Compressor: " + metadata.CompressorID, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.AvgBitrate )
				{
					this.ctx.fillText( "Avg. Bitrate: " + metadata.AvgBitrate, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.AudioFormat )
				{
					this.ctx.fillText( "Audio Format: " + metadata.AudioFormat, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.AudioChannels )
				{
					this.ctx.fillText( "Audio Channels: " + metadata.AudioChannels, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				if( metadata.AudioSampleRate )
				{
					this.ctx.fillText( "Audio Sample Rate: " + metadata.AudioSampleRate, metadataWindowX, metadataWindowY + metadataLine * 20);
					metadataLine++;
				}
				
				// Sessions
				if( metadata.numapps )
				{
					this.ctx.fillText( "Applications: " + metadata.numapps);
					metadataLine++;
				}
			}
		}
	},
	
	resize: function(date)
	{
		this.minDim = Math.min(this.element.width, this.element.height);		
		this.updateThumbnailPositions();
		this.refresh(date);
	},
	
	event: function(type, position, user, data, date)
	{
		overButton = false;
		
		this.radialCloseButton.onEvent(type, user.id, position.x, position.y, data, date);
		if ( this.radialCloseButton.isClicked() && this.sendsToServer )
		{
			this.closeMenu();
		}
		
		
		this.radialSessionButton.onEvent(type, user.id, position.x, position.y, data, date);
		this.radialSaveSessionButton.onEvent(type, user.id, position.x, position.y, data, date);
			
		if( this.currentRadialState === 'radialMenu' )
		{
			this.radialImageButton.onEvent(type, user.id, position.x, position.y, data, date);
			this.radialPDFButton.onEvent(type, user.id, position.x, position.y, data, date);
			this.radialVideoButton.onEvent(type, user.id, position.x, position.y, data, date);
			this.radialAppButton.onEvent(type, user.id, position.x, position.y, data, date);
			
		}
		
		// Level 2
		if( this.currentRadialState === 'radialAppMenu2' )
		{
			this.radial2ImageButton.onEvent(type, user.id, position.x, position.y, data, date);
			this.radial2PDFButton.onEvent(type, user.id, position.x, position.y, data, date);
			this.radial2VideoButton.onEvent(type, user.id, position.x, position.y, data, date);
			this.radial2AppButton.onEvent(type, user.id, position.x, position.y, data, date);
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
				thumbButton.onEvent(type, user.id, position.x, position.y, data, date);

				if ( thumbButton.isReleased() && this.sendsToServer === true )
				{ 
					//console.log(thumbButton+" released" );
					this.addNewElementFromStoredFiles( thumbButton.getData()  );
				}
				if ( thumbButton.isPositionOver(user.id, position.x, position.y)  )
				{
					this.hoverOverText = thumbButton.getData().filename;
					this.hoverOverThumbnail = thumbButton.idleImage;
					this.hoverOverMeta =  thumbButton.getData().meta;
						overButton = true;
				}
			}
		}
		
		//if( this.currentMenuState === 'radialMenu' )
		//{
		//	this.sendResize( 300, 600 );
		//}
		//else
		//{
		//	this.sendResize( 1200, 600 );
		//}
		
		// Redraw on event (done here instead of in button due to click events)
		this.draw(date);
	},
	
	// Displays files
	addNewElementFromStoredFiles : function( data )
	{
		//console.log("addNewElementFromStoredFiles: " + data);
		this.wsio.emit('addNewElementFromStoredFiles', data);
	},
	
	closeMenu : function()
	{
		this.wsio.emit("removeRadialMenu", { id: this.appID } );
	}
});

function buttonWidget() {
	this.element = null;
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
		this.element = document.getElementById(id);
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
	
	this.draw = function(date)
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
	
	this.onEvent = function( type, user, x, y, data, date )
	{
		//console.log("buttonWidget onEvent("+eventType+","+userID+","+x+","+y+","+data+","+date+")");
		
		if( this.isPositionOver( user, x, y ) )
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
		}
		else
		{
			this.state = 0;
		}
	}
	
	this.isPositionOver = function(id, x, y) {
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