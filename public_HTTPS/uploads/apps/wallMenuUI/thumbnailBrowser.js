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
// S2DMI 'Tsu-mu-i' (SAGE2 Display Menu User Interface)

var thumbnailBrowserList = {};
var thumbnailBrowserIDList = [];
var sendsToServer = true;

// layout parameters
var imageThumbSize = 50;
var thumbSpacer = 5;

var thumbnailBrowser = SAGE2_App.extend( {
	construct: function()
	{
		arguments.callee.superClass.construct.call(this);

		this.ctx = null;
		this.minDim = null;
		this.resizeEvents = "continuous";
	},
	
	init: function(id, width, height, resrc, date)
	{
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
	
		// websocket to server for file library access
		// Note: using a different socket to prevent locking up other app animations
		hostname = window.location.hostname;
		port = window.location.port;
		if(window.location.protocol == "http:" && port == "") port = "80";
		if(window.location.protocol == "https:" && port == "") port = "443";
		
		this.wsio = new websocketIO(window.location.protocol, hostname, parseInt(port));
		
		document.title = window.location.hostname.concat(" ", document.title ); 
		
		// load icons
		this.idleImageIcon = new Image;
		this.idleImageIcon.src = this.resrcPath +"icons/image2.svg"
		this.idlePDFIcon = new Image;
		this.idlePDFIcon.src = this.resrcPath +"icons/file-pdf.svg"
		this.idleVideoIcon = new Image;
		this.idleVideoIcon.src = this.resrcPath +"icons/film.svg"
		this.idleAppIcon = new Image;
		this.idleAppIcon.src = this.resrcPath +"icons/cog.svg"
		this.idleSessionIcon = new Image;
		this.idleSessionIcon.src = this.resrcPath +"icons/upload.svg"
		
		this.hoverOverText = "";
		this.clickedPosition = null;
		
		this.wsio.open(function() {
			console.log("open websocket");
			var clientDescription = {
				clientType: "mediaBrowser",
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
				receivesRemoteServerInfo: false
			};
			thumbnailBrowserList[id].wsio.emit('addClient', clientDescription);
		});

		this.wsio.on('storedFileList', function(fileList) {
			thumbnailBrowserList[id].updateFileList(fileList);
		});
		
		this.wsio.on('initialize', function(uniqueID, date, startTime) {
			thumbnailBrowserList[id].wsio.emit('requestStoredFiles');
		});
		
		this.wsio.on('disableSendToServer', function() {
			sendsToServer = false;
		});
		
		thumbnailBrowserIDList.push(id);
	},
	
	updateFileList: function(serverFileList)
	{
		console.log("updateFileList: ");
		console.log(serverFileList);
		
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

		var curRow = 1;
		var curColumn = 0;
			
		if( imageList != null )
		{
			validImages = 0;
			for( i = 0; i < imageList.length; i++ )
			{
				if( imageList[i].filename.search("Thumbs.db") == -1 )
				{
					thumbnailButton = new buttonWidget();
					thumbnailButton.init(0, this.ctx, null);
					thumbnailButton.setPosition( validImages * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
					thumbnailButton.setData( {application: "image_viewer", filename: imageList[i].filename} );
					thumbnailButton.setIdleImage( this.idleImageIcon );
					
					this.thumbnailButtons.push(thumbnailButton);
					this.imageThumbnailButtons.push(thumbnailButton);
					validImages++;
				}
			}
		}
		
		curRow += 2;
		
		if( pdfList != null )
		{
			for( i = 0; i < pdfList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.ctx, null);
				thumbnailButton.setPosition( i * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
				thumbnailButton.setData( {application: "pdf_viewer", filename: pdfList[i].filename} );
				thumbnailButton.setIdleImage( this.idlePDFIcon );
				
				this.thumbnailButtons.push(thumbnailButton);
				this.pdfThumbnailButtons.push(thumbnailButton);
			}
		}
		
		curRow += 2;
		
		if( videoList != null )
		{
			for( i = 0; i < videoList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.ctx, null);
				thumbnailButton.setPosition( i * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
				thumbnailButton.setData( {application: "movie_player", filename: videoList[i].filename} );
				thumbnailButton.setIdleImage( this.idleVideoIcon );
				
				this.thumbnailButtons.push(thumbnailButton);
				this.videoThumbnailButtons.push(thumbnailButton);
			}
		}
		
		curRow += 2;
		
		if( appList != null )
		{
			for( i = 0; i < appList.length; i++ )
			{
				var nextCol = curColumn * (imageThumbSize + thumbSpacer);
				
				if( nextCol > this.element.width )
				{
					curColumn = 0;
					curRow++;
				}
				
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.ctx, null);
				thumbnailButton.setPosition( curColumn * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
				thumbnailButton.setData( {application: "custom_app", filename: appList[i].filename} );

				if ( appList[i].thumbnail != null )
				{
					customIcon = new Image;
					customIcon.src = appList[i].thumbnail;
					thumbnailButton.setIdleImage( customIcon );
				}
				else
					thumbnailButton.setIdleImage( this.idleAppIcon );

				this.thumbnailButtons.push(thumbnailButton);
				this.appThumbnailButtons.push(thumbnailButton);
				
				curColumn++;
			}
		}
		
		curRow += 2;
		
		if( sessionList != null )
		{
			for( i = 0; i < sessionList.length; i++ )
			{
				thumbnailButton = new buttonWidget();
				thumbnailButton.init(0, this.ctx, null);
				thumbnailButton.setPosition( i * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
				thumbnailButton.setData( {application: "load_session", filename: sessionList[i].filename} );
				thumbnailButton.setIdleImage( this.idleSessionIcon );
				
				this.thumbnailButtons.push(thumbnailButton);
				this.sessionThumbnailButtons.push(thumbnailButton);
			}
		}
		
		this.updateThumbnailPositions();
	},
	
	updateThumbnailPositions: function()
	{
		var curRow = 1;
		var curColumn = 0;
			
		for( i = 0; i < this.imageThumbnailButtons.length; i++ )
		{
			var nextCol = (curColumn + 1) * (imageThumbSize + thumbSpacer) ;
			var currentButton = this.imageThumbnailButtons[i];
			
			if( nextCol > this.element.width )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( curColumn * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		curColumn = 0;
		curRow += 2;
		
		for( i = 0; i < this.pdfThumbnailButtons.length; i++ )
		{
			var nextCol = (curColumn + 1) * (imageThumbSize + thumbSpacer) ;
			var currentButton = this.pdfThumbnailButtons[i];
			
			if( nextCol > this.element.width )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( curColumn * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		curColumn = 0;
		curRow += 2;
		
		for( i = 0; i < this.videoThumbnailButtons.length; i++ )
		{
			var nextCol = (curColumn + 1) * (imageThumbSize + thumbSpacer) ;
			var currentButton = this.videoThumbnailButtons[i];
			
			if( nextCol > this.element.width )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( curColumn * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		curColumn = 0;
		curRow += 2;
		
		for( i = 0; i < this.appThumbnailButtons.length; i++ )
		{
			var nextCol = (curColumn + 1) * (imageThumbSize + thumbSpacer) ;
			var currentButton = this.appThumbnailButtons[i];
			
			if( nextCol > this.element.width )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( curColumn * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
			
			curColumn++;
		}
		curColumn = 0;
		curRow += 2;
		
		for( i = 0; i < this.sessionThumbnailButtons.length; i++ )
		{
			var nextCol = (curColumn + 1) * (imageThumbSize + thumbSpacer) ;
			var currentButton = this.sessionThumbnailButtons[i];
			
			if( nextCol > this.element.width )
			{
				curColumn = 0;
				curRow++;
			}

			currentButton.setPosition( curColumn * (imageThumbSize + thumbSpacer), curRow * (imageThumbSize + thumbSpacer) );
			
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
		this.ctx.fillStyle = "rgba(5, 5, 5, 0.5)"
		this.ctx.fillRect(0,0, this.element.width, this.element.height)
		
		// UI
		for( i = 0; i < this.thumbnailButtons.length; i++ )
		{
			thumbButton = this.thumbnailButtons[i];
			thumbButton.draw(date);
		}
		
		this.ctx.font="24px sans-serif";
		this.ctx.fillStyle = "rgba(250, 250, 250, 1.0)"
		this.ctx.fillText( this.hoverOverText, 5, 24);
	},
	
	resize: function(date)
	{
		this.minDim = Math.min(this.element.width, this.element.height);		
		this.updateThumbnailPositions();
		this.refresh(date);
	},
	
	event: function(eventType, userId, x, y, data, date)
	{
		overButton = false;
		
		for( i = 0; i < this.thumbnailButtons.length; i++ )
		{
			thumbButton = this.thumbnailButtons[i];
			thumbButton.onEvent(eventType, userId, x, y, data, date);
			
			if ( thumbButton.isClicked() && sendsToServer )
			{ 
				this.addNewElementFromStoredFiles( thumbButton.getData()  );
			}
			if ( thumbButton.isPositionOver(userId, x, y)  )
			{
				this.hoverOverText = thumbButton.getData().filename;
				overButton = true;
			}
		}
		
		// Pointer is not on a button, but on an open space (window management mode)
		if ( !overButton && sendsToServer )
		{
			this.sendInteractionMode(MODE.WINDOW_MANAGEMENT);
		}
		else if ( overButton && sendsToServer )
		{
			this.sendInteractionMode(MODE.APP_INTERACTION);
		}

		// Redraw on event (done here instead of in button due to click events)
		this.draw(date);
	},
	
	// Displays files
	addNewElementFromStoredFiles : function( data )
	{
		this.wsio.emit('addNewElementFromStoredFiles', data);
	}
});

function buttonWidget() {
	this.element = null;
	this.ctx = null;
	this.resrcPath = null;
	
	this.posX = 100;
	this.posY = 100;
	this.width = imageThumbSize;
	this.height = imageThumbSize;
	
	this.defaultColor =  "rgba(210, 210, 210, 1.0)";
	this.mouseOverColor = "rgba(210, 210, 10, 1.0 )";
	this.clickedColor = "rgba(10, 210, 10, 1.0 )";
	this.pressedColor = "rgba(10, 210, 210, 1.0 )";
	this.releasedColor = "rgba(10, 10, 210, 1.0 )";
	
	this.idleImage = null;
	
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
	
	this.setData = function( data )
	{
		this.buttonData = data;
	}
	
	this.setIdleImage = function( image )
	{
		this.idleImage = image;
	}
	
	this.getData = function()
	{
		return this.buttonData;
	}
	
	this.draw = function(date)
	{
		
		if( this.state === 1 )
		{
			this.ctx.fillStyle = this.mouseOverColor;
			
			this.ctx.fillRect(this.posX,this.posY, this.width, this.height)
		}
		else if( this.state === 3 )
		{
			this.ctx.fillStyle = this.clickedColor;
			this.state = 2; // Pressed state
			
			this.ctx.fillRect(this.posX,this.posY, this.width, this.height)
		}
		else if( this.state === 2 )
		{
			this.ctx.fillStyle = this.pressedColor;
			
			this.ctx.fillRect(this.posX,this.posY, this.width, this.height)
		}
		else if( this.state === 4 )
		{
			this.ctx.fillStyle = this.releasedColor;
			this.state = 1;
			
			this.ctx.fillRect(this.posX,this.posY, this.width, this.height)
		}
		else
		{
			this.ctx.fillStyle = this.defaultColor;
			this.ctx.fillRect(this.posX,this.posY, this.width, this.height)
		}
		
		
		if( this.idleImage != null )
		{
			this.ctx.drawImage( this.idleImage, this.posX, this.posY, this.width, this.height );
		}
		//console.log("buttonWidget state: "+this.state);
	};
	
	this.onEvent = function( eventType, userID, x, y, data, date )
	{
		//console.log("buttonWidget onEvent("+eventType+","+userID+","+x+","+y+","+data+","+date+")");
		
		if( this.isPositionOver( userID, x, y ) )
		{
			if( eventType === "pointerPress" && this.state != 2 )
			{
				this.state = 3; // Click state
			}
			else if( eventType === "pointerRelease" )
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
		
		if( x >= this.posX && x <= this.posX + this.width && y >= this.posY && y <= this.posY + this.height )
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
}