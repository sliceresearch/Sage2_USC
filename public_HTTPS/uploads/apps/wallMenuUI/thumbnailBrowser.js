// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014
var thumbnailBrowserList = [];
var thumbnailBrowserIDList = [];
var sendsToServer = true;

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
		thumbnailBrowserList.push(this);
				
		// websocket to server for file library access
		hostname = window.location.hostname;
		port = window.location.port;
		if(window.location.protocol == "http:" && port == "") port = "80";
		if(window.location.protocol == "https:" && port == "") port = "443";
		
		wsio = new websocketIO(window.location.protocol, hostname, parseInt(port));
		this.wsio = wsio;
		
		document.title = window.location.hostname.concat(" ", document.title ); 

		wsio.open(function() {
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
			wsio.emit('addClient', clientDescription);
		});

		wsio.on('storedFileList', function(fileList) {
			for( i = 0; i < thumbnailBrowserList.length; i++ )
			{
				thumbnailBrowserList[i].updateFileList(fileList);
			}
		});

		wsio.on('initialize', function(uniqueID, date, startTime) {
			wsio.emit('requestStoredFiles');
		});
		
		wsio.on('disableSendToServer', function() {
			sendsToServer = false;
		});
		
		thumbnailBrowserIDList.push(id);
	},
	
	updateFileList: function(serverFileList)
	{
		console.log("updateFileList: ");
		console.log(serverFileList);
		
		this.thumbnailButtons = [];
		imageList = serverFileList.image;
		
		imageThumbSize = 50;
		thumbSpacer = 5;
		
		if( imageList != null )
		{
			for( i = 0; i < imageList.length; i++ )
			{
				imageThumbButton = new buttonWidget();
				imageThumbButton.init(0, this.ctx, null);
				imageThumbButton.setPosition( i * (imageThumbSize + thumbSpacer), 0 );
				imageThumbButton.setData( {filename: imageList[i]} );
				
				this.thumbnailButtons.push(imageThumbButton);
			}
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
		this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)"
		this.ctx.fillRect(0,0, this.element.width, this.element.height)
		
		// UI
		for( i = 0; i < this.thumbnailButtons.length; i++ )
		{
			thumbButton = this.thumbnailButtons[i];
			thumbButton.draw(date);
		}
	},
	
	resize: function(date)
	{
		this.minDim = Math.min(this.element.width, this.element.height);		
		this.refresh(date);
	},
	
	event: function(eventType, userId, x, y, data, date)
	{
		for( i = 0; i < this.thumbnailButtons.length; i++ )
		{
			thumbButton = this.thumbnailButtons[i];
			thumbButton.onEvent(eventType, userId, x, y, data, date);
			
			if( thumbButton.isClicked() && sendsToServer )
			{ 
				this.addNewElementFromStoredFiles( {application: "image_viewer", filename: thumbButton.getData().filename} );
			}
		}
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
	this.width = 50;
	this.height = 50;
	
	this.defaultColor =  "rgba(100, 100, 100, 1.0)";
	this.mouseOverColor = "rgba(250, 10, 10, 1.0 )";
	this.clickedColor = "rgba(10, 250, 10, 1.0 )";
	this.pressedColor = "rgba(250, 250, 10, 1.0 )";
	this.releasedColor = "rgba(10, 10, 250, 1.0 )";
	
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
	
	this.getData = function()
	{
		return this.buttonData;
	}
	
	this.draw = function(date)
	{
		if( this.state === 1 )
			this.ctx.fillStyle = this.mouseOverColor;
		else if( this.state === 3 )
		{
			this.ctx.fillStyle = this.clickedColor;
			this.state = 2; // Pressed state
		
		}
		else if( this.state === 2 )
			this.ctx.fillStyle = this.pressedColor;
		else if( this.state === 4 )
		{
			this.ctx.fillStyle = this.releasedColor;
			this.state = 1;
		}
		else
			this.ctx.fillStyle = this.defaultColor;
		this.ctx.fillRect(this.posX,this.posY, this.width, this.height)

		//console.log("buttonWidget state: "+this.state);
	};
	
	this.onEvent = function( eventType, userID, x, y, data, date )
	{
		//console.log("buttonWidget onEvent("+eventType+","+userID+","+x+","+y+","+data+","+date+")");
		
		if( this.isOver( userID, x, y ) )
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
		
		//this.draw(date);
	}
	
	this.isOver = function(id, x, y) {
		
		if( x >= this.posX && x <= this.posX + this.width && y >= this.posY && y <= this.posY + this.height )
			return true;
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
	}
}