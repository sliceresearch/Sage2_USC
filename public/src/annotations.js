// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 * Annotations client side functionality
 *
 * @class SAGE2Annotations
 */

var SAGE2Annotations = function (){
	this.id = null;
	this.appId = null;
	this.data = null;
	this.windowDiv = null;
	this.show = null;
	this.buttonDiv = null;
	this.textAreas = [];
	this.textAreaHeight = ui.titleBarHeight*4.5;
	this.newTextAreaOffset = 10;
	this.markers = {};
	this.editables = {};
	this.currentTime = null;
}

SAGE2Annotations.prototype.makeWindow = function(data){
	var translate = "translate(" + (-ui.offsetX).toString()  + "px," + (-ui.offsetY).toString() + "px)";
	var buttontransform = "transform-origin: left bottom 0; rotate(90deg);";

	//data.button.width = ui.titleBarHeight;
	this.id = data.id;
	this.appId = data.appId;
	this.data = data.annotationData;
	this.show = data.show;
	this.windowDiv = document.createElement("div");
	this.windowDiv.id = data.id;
	this.windowDiv.style.left = data.left.toString()+ "px";
	this.windowDiv.style.top = data.top.toString()+ "px";
	this.windowDiv.style.width = data.width.toString() + "px";
	this.windowDiv.style.height = data.height.toString() + "px";
	this.windowDiv.style.webkitTransform = translate;
	this.windowDiv.style.mozTransform    = translate;
	this.windowDiv.style.transform       = translate;
	this.windowDiv.style.display		 = "block";
	this.windowDiv.className = "annotationWindow";
	


	this.buttonDiv 							= document.createElement("div");
	this.buttonDiv.className 				= "annotationButton";
	this.buttonDiv.style.left 				= data.button.left.toString()+ "px";
	this.buttonDiv.style.top 				= data.button.top.toString()+ "px";
	this.buttonDiv.style.width 				= data.button.width.toString() + "px";
	this.buttonDiv.style.height 			= data.button.height.toString() + "px";
	this.buttonDiv.style.webkitTransform 	= translate;
	this.buttonDiv.style.mozTransform    	= translate;
	this.buttonDiv.style.transform       	= translate;
	
	var buttonText = document.createElement("p");
	buttonText.className 					= "annotationButton-text";
	buttonText.textContent					= data.button.caption;
	buttonText.style.lineHeight 			= parseInt(ui.titleBarHeight) + "px";
	buttonText.style.fontSize				= parseInt(ui.titleTextSize) + "px";
	this.buttonText 						= buttonText;
	this.buttonDiv.appendChild(buttonText);
	ui.main.appendChild(this.buttonDiv);

	this.makeButtonsForAnnotationWindow(data);
	this.prepareWindow();
	this.populateWindow(data.annotationData);
	this.updateTime(data.now);
	
};

SAGE2Annotations.prototype.setOrder = function (zval){
	this.windowDiv.style.zIndex = (zval).toString();
	this.buttonDiv.style.zIndex = (zval).toString();
};

SAGE2Annotations.prototype.deleteWindow = function(){
	if (this.show === true){
		ui.main.removeChild(this.windowDiv);
	}
	ui.main.removeChild(this.buttonDiv);
}

SAGE2Annotations.prototype.populateWindow = function(data){
	//A for loop to add individual comments
	//var arr = [];
	for (var key in data){
		this.addNote(data[key]);
	}
	setTimeout(function(){
		for (var key in data){
			if (data[key].marker){
				this.createMarker(data[key]);
			}
		}
	}.bind(this), 2000);
};

SAGE2Annotations.prototype.makeButtonsForAnnotationWindow = function(data){
	this.addNoteButton						= document.createElement("img");
	this.addNoteButton.style.left 				= data.addNoteButton.left.toString() + "px";
	this.addNoteButton.style.top 				= data.addNoteButton.top.toString() + "px";
	//this.addNoteButton.style.width 				= data.addNoteButton.width.toString() + "px";
	this.addNoteButton.style.height 			= data.addNoteButton.height.toString() + "px";
	this.addNoteButton.id 						= data.addNoteButton.id;
	this.addNoteButton.display 					= "block";
	this.addNoteButton.style.borderRadius		= "2px";
	this.addNoteButton.src 						= "images/newNoteAndMarker.svg";
	this.addNoteButton.className 				= "annotationButton";

	this.addSummaryNoteButton							= document.createElement("img");
	this.addSummaryNoteButton.style.left 				= data.addSummaryNoteButton.left.toString() + "px";
	this.addSummaryNoteButton.style.top 				= data.addSummaryNoteButton.top.toString() + "px";
	//this.addSummaryNoteButton.style.width 			= data.addSummaryNoteButton.width.toString() + "px";
	this.addSummaryNoteButton.style.height 				= data.addSummaryNoteButton.height.toString() + "px";
	this.addSummaryNoteButton.id 						= data.addSummaryNoteButton.id;
	this.addSummaryNoteButton.display 					= "block";
	this.addSummaryNoteButton.style.borderRadius		= "2px";
	this.addSummaryNoteButton.src 						= "images/newNoteOnly.svg";
	this.addSummaryNoteButton.className 				= "annotationButton";
	this.windowDiv.appendChild(this.addNoteButton);
	this.windowDiv.appendChild(this.addSummaryNoteButton);
}

SAGE2Annotations.prototype.addNote = function(data){
	// Create a new text area and set its properties

	var textArea = new TextArea();
	textArea.init(this.innerDiv, {id: data.id, appId:this.appId, createdOn:data.createdOn||null,marker: data.marker|| null, userLabel:data.userLabel||null, text:data.text||null, left: 10, top: 0, width: parseInt(this.innerDiv.style.width)-20, height:this.textAreaHeight});
	//textArea.showCredentials();
	this.textAreas.push(textArea);
	Object.observe(textArea.credentials,function(changes){
		for (var i=0; i<changes.length; i++){
			if (changes[i].name === "changeFlag" && changes[i].oldValue === false){
				sendNoteToServer(changes[i].object, textArea.getText());
				changes[i].object.changeFlag = false;
			}
		}
	});
	for (var i = this.textAreas.length-1; i>=0; i--){
		this.textAreas[i].setTop(10 + (this.textAreas.length-1-i)*(this.textAreaHeight+this.newTextAreaOffset));
	}
	this.scrollKnob.style.height = this.computeKnobHeight();
	this.moveScrollKnob({x:0,y:0});
	this.updateShowButtonCaption();
	
};

SAGE2Annotations.prototype.updateShowButtonCaption = function(){
	if (this.show===true){
		this.buttonText.textContent = "Hide notes (" + this.textAreas.length + ")"; 
	}else{
		this.buttonText.textContent = "Show notes (" + this.textAreas.length + ")"; 
	}
};

SAGE2Annotations.prototype.computeKnobHeight = function(){
		var val = parseInt(this.scrollBar.style.height) * parseInt(this.innerDiv.style.height) / parseInt(this.innerDiv.scrollHeight) ;
		return (val-4).toString() + "px";
};



sendNoteToServer = function(credentials, text){
	var note = {
		credentials:credentials,
		text: text
	};
	if (isMaster){
		wsio.emit('annotationUpdate',note);
	}
};

SAGE2Annotations.prototype.deleteNote = function(credentials){
	var markedForDeletion = null;
	for(var i=0;i<this.textAreas.length;i++){
		if (this.textAreas[i].credentials.id === credentials.id){
			markedForDeletion = i;
			break;
		}
	}
	if (markedForDeletion!==null){
		this.deleteMarker(credentials.id);
		this.textAreas[markedForDeletion].kill();
		this.textAreas.splice(markedForDeletion,1);
		for (var i = this.textAreas.length-1; i>=0; i--){
			this.textAreas[i].setTop(10 + (this.textAreas.length-1-i)*(this.textAreaHeight+this.newTextAreaOffset));
		}
		this.scrollKnob.style.height = this.computeKnobHeight();
		this.updateShowButtonCaption();
	}
};


SAGE2Annotations.prototype.prepareWindow = function(){
	var scrollBarWidth = parseInt(ui.titleBarHeight*0.6);
	this.innerDiv = document.createElement("div");
	this.innerDiv.id = "innerWindowID";
	this.innerDiv.className = "innerWindow";
	this.innerDiv.style.left = "6px";
	this.innerDiv.style.top = "6px";
	this.innerDiv.style.width = (parseInt(this.windowDiv.style.width) - scrollBarWidth - 15).toString() + "px";
	this.innerDiv.style.height = (parseInt(this.windowDiv.style.height) - scrollBarWidth - 15).toString() + "px";
	this.innerDiv.style.display = "block";
	this.innerDiv.style.position = "relative";
	this.innerDiv.style.borderRadius = "3px 3px 3px 3px";
	this.innerDiv.style.backgroundColor = "#afbdd4";//"#89a455";
	this.innerDiv.style.overflow = "hidden";
	this.windowDiv.appendChild(this.innerDiv);

	

	this.scrollBar = document.createElement("div");
	this.scrollBar.id = "scrollBar";
	this.scrollBar.style.left = (parseInt(this.windowDiv.style.width) - scrollBarWidth - 6).toString() + "px";
	this.scrollBar.style.top = "6px";
	this.scrollBar.style.width = scrollBarWidth + "px";
	this.scrollBar.style.height = (parseInt(this.windowDiv.style.height) - ui.titleBarHeight - 15).toString() + "px";
	this.scrollBar.style.display = "block";
	this.scrollBar.style.position = "absolute";
	this.scrollBar.style.borderRadius = "3px 3px 3px 3px";
	this.scrollBar.style.backgroundColor = "#afbdd4";

	this.windowDiv.appendChild(this.scrollBar);

	this.scrollKnob = document.createElement("div");
	this.scrollKnob.id = "scrollKnob";
	this.scrollKnob.style.left = "1px";
	this.scrollKnob.style.top = "2px";
	this.scrollKnob.style.width = (parseInt(this.scrollBar.style.width)-4).toString() + "px";
	this.scrollKnob.style.height = (parseInt(this.scrollBar.style.height)-4).toString() + "px";
	this.scrollKnob.style.display = "block";
	this.scrollKnob.style.position = "absolute";
	this.scrollKnob.style.borderRadius = "3px 3px 3px 3px";
	this.scrollKnob.style.border = "solid 1px #000000";
	this.scrollKnob.style.backgroundColor = "#999999";
	this.scrollBar.appendChild(this.scrollKnob);
}	

SAGE2Annotations.prototype.showWindow = function(data){
	if (this.show===false){
		this.windowDiv.style.left = data.left.toString() + "px";;
		this.windowDiv.style.top = data.top.toString() + "px";;
		this.buttonDiv.style.top = data.button.top.toString() + "px";;
		this.buttonDiv.style.left = data.button.left.toString() + "px";;
		ui.main.appendChild(this.windowDiv);
		this.scrollKnob.style.height = this.computeKnobHeight();
		this.show = true;
		this.setWindowScroll();
		this.updateShowButtonCaption();
	}
}

SAGE2Annotations.prototype.hideWindow = function(data){
	if (this.show===true){
		this.buttonDiv.style.top = data.button.top.toString() + "px";;
		this.buttonDiv.style.left = data.button.left.toString() + "px";;
		ui.main.removeChild(this.windowDiv);
		this.show = false;
		this.updateShowButtonCaption(); 
		this.makeAllNotesNonEditable();
	}
}

SAGE2Annotations.prototype.hideMarkersForPage = function(data){
	var appWindow = document.getElementById(data.appId);
	var showPage = data.page || 1;
	if (appWindow){
		var markerPage = this.markers[showPage];
		for (var id in markerPage){
			if (markerPage.hasOwnProperty(id) && markerPage[id].parentNode === appWindow){
				appWindow.removeChild(markerPage[id]);
			}
		}
	}
};

SAGE2Annotations.prototype.hideAllMarkers = function(appId){
	var appWindow = document.getElementById(appId);
	if (appWindow){
		for (var page in this.markers){
			if (this.markers.hasOwnProperty(page)){
				var markerPage = this.markers[page];
				for (var id in markerPage){
					if (markerPage.hasOwnProperty(id) &&  markerPage[id].parentNode === appWindow){
						appWindow.removeChild(markerPage[id]);
					}
				}
			}
		}
	}
};

SAGE2Annotations.prototype.showMarkersForPage = function(data){
	console.log("in showMarkersForPage->",data,this.show);
	if (this.show===false) return;
	var appWindow = document.getElementById(data.appId);
	var id, markerPage, showPage = data.page || 1;
	if (appWindow){
		for (var page in this.markers){
			if (this.markers.hasOwnProperty(page)){
				markerPage = this.markers[page];
				if (page.toString() === showPage.toString()){
					for (id in markerPage){
						if (markerPage.hasOwnProperty(id) && markerPage[id].parentNode !== appWindow){
							appWindow.appendChild(markerPage[id]);
						}
					}
				}
				else{
					for (id in markerPage){
						if (markerPage.hasOwnProperty(id) &&  markerPage[id].parentNode === appWindow){
							appWindow.removeChild(markerPage[id]);
						}
					}
				}
			}
		}
	}
};

SAGE2Annotations.prototype.deleteMarker = function(id){
	var marker = null;
	for (var page in this.markers){
		if (this.markers.hasOwnProperty(page) && this.markers[page].hasOwnProperty(id)){
			marker = this.markers[page][id];
			var appWindow = document.getElementById(this.appId);
			if (appWindow === marker.parentNode){
				marker.parentNode.removeChild(marker);
			}
			delete this.markers[page][id];
		}
	}
};

SAGE2Annotations.prototype.setMarkerPosition = function(data){
	var appWindow = document.getElementById(this.appId);
	if (!appWindow) return;
	var markerInfo = this.getMarkerDiv(data.id);
	if (markerInfo === null){
		return;
	}	
	delete this.markers[markerInfo.page][markerInfo.id];
	var marker = markerInfo.markerDiv;
	if (!this.markers[data.marker.page]){
		this.markers[data.marker.page] = {};
	}
	this.markers[data.marker.page][data.id]= marker;
	var itemWidth, itemHeight;
	var child = appWindow.getElementsByClassName("sageItem");
	if(child[0].tagName.toLowerCase() == "div") {
		itemWidth = parseInt(child[0].style.width);
		itemHeight = (child[0].style.height);
	}
	else{
		// if it's a canvas, just use width and height
	 	itemWidth =	parseInt(child[0].width);
		itemHeight = parseInt(child[0].height);
	}
	marker.style.left 					= parseInt(data.marker.position.x*itemWidth/100.0 - parseInt(marker.style.width)/2.0) + "px";
	marker.style.top 					= parseInt(data.marker.position.y*itemHeight/100.0 - parseInt(marker.style.height)/2.0) + "px";
	if (marker.parentNode !== appWindow){
		appWindow.appendChild(marker);	
	}
	var textArea = this.getNoteForCredentials(data);
	if (textArea){
		textArea.credentials.marker = data.marker;
	}
};

SAGE2Annotations.prototype.getNoteForCredentials = function(credentials){
	for (var i=0;i<this.textAreas.length;i++){
		if (this.textAreas[i].credentials.id === credentials.id){
			return this.textAreas[i];
		}
	}
	return null;
}

SAGE2Annotations.prototype.createMarker = function(data){
	var appWindow = document.getElementById(this.appId);
	if (!appWindow) return;
	var child = appWindow.getElementsByClassName("sageItem");
	var markerInfo = this.getMarkerDiv(data.id);
	if (!markerInfo){
		var marker 							= document.createElement("div");
		marker.style.height					= parseInt(ui.titleBarHeight) + "px";
		marker.style.lineHeight				= parseInt(ui.titleBarHeight) + "px";
		marker.style.fontSize				= parseInt(ui.titleBarHeight /2) + "px";
		marker.style.width 					= parseInt(parseInt(marker.style.height) * 1.2)+ "px";
		marker.id 							= "marker_" + data.id;
		//marker.style.zIndex					= "20";
		marker.display 						= "block";
		marker.className 					= "annotationMarker";
		marker.innerHTML					= data.id;
		if (this.show){
			appWindow.appendChild(marker);
		}
		if (!this.markers[data.marker.page]){
			this.markers[data.marker.page] = {};
		}
		this.markers[data.marker.page][data.id]= marker;
		var itemWidth, itemHeight;
		if(child[0].tagName.toLowerCase() == "div") {
			itemWidth = parseInt(child[0].style.width);
			itemHeight = (child[0].style.height);
		}
		else{
			// if it's a canvas, just use width and height
		 	itemWidth =	parseInt(child[0].width);
			itemHeight = parseInt(child[0].height);
		}
		marker.style.left 					= parseInt(data.marker.position.x*itemWidth/100.0 - parseInt(marker.style.width)/2.0) + "px";
		marker.style.top 					= parseInt(data.marker.position.y*itemHeight/100.0 - parseInt(marker.style.height)/2.0) + "px";
		var textArea = this.getNoteForCredentials(data);
		if (textArea){
			textArea.credentials.marker = data.marker;
			textArea.toggleNoteType();
		}
	}
};

SAGE2Annotations.prototype.removeMarker = function(data){
	var markerInfo = this.getMarkerDiv(data.id);
	if (markerInfo!==null){
		delete this.markers[markerInfo.page][markerInfo.id];
		if (markerInfo.markerDiv.parentNode){
			markerInfo.markerDiv.parentNode.removeChild(markerInfo.markerDiv);
		}
		var textArea = this.getNoteForCredentials(data);
		if (textArea){
			textArea.credentials.marker = null;
			textArea.toggleNoteType();
		}
	}
}

SAGE2Annotations.prototype.setAllMarkerPositionsAfterResize = function(){
	var appWindow = document.getElementById(this.appId);
	if (!appWindow) return;
	var child = appWindow.getElementsByClassName("sageItem");
	var itemWidth, itemHeight;
	if(child[0].tagName.toLowerCase() == "div") {
		itemWidth = parseInt(child[0].style.width);
		itemHeight = (child[0].style.height);
	}
	else{
		// if it's a canvas, just use width and height
	 	itemWidth =	parseInt(child[0].width);
		itemHeight = parseInt(child[0].height);
	}
	var credentials;
	var marker;
	var markerDiv;
	var page;
	for (var i=0; i<this.textAreas.length; i++){
		credentials = this.textAreas[i].credentials;
		marker = credentials? credentials.marker : null;
		page = marker ? this.markers[marker.page] : null;
		markerDiv = page ? page[credentials.id] : null;
		if (markerDiv){
			markerDiv.style.left 					= parseInt(marker.position.x*itemWidth/100.0 - parseInt(markerDiv.style.width)/2.0) + "px";
			markerDiv.style.top 					= parseInt(marker.position.y*itemHeight/100.0 - parseInt(markerDiv.style.height)/2.0) + "px";
		}
	}
};


SAGE2Annotations.prototype.setPosition = function(data){
	//var buttonOffsetLeft = parseInt(this.buttonDiv.style.left) - parseInt(this.windowDiv.style.left);
	//var buttonOffsetTop = parseInt(this.buttonDiv.style.top) - parseInt(this.windowDiv.style.top);
	this.windowDiv.style.left = data.left.toString() + "px";
	this.windowDiv.style.top  = data.top.toString() + "px";
	this.buttonDiv.style.left = (data.button.left).toString() + "px";
	this.buttonDiv.style.top = (data.button.top).toString() + "px";
};

SAGE2Annotations.prototype.setPositionAndSize = function(data){
	this.windowDiv.style.left = data.left.toString() + "px";
	this.windowDiv.style.top  = data.top.toString() + "px";
	this.windowDiv.style.height = data.height.toString() + "px";
	this.buttonDiv.style.left = (data.button.left).toString() + "px";
	this.buttonDiv.style.top = (data.button.top).toString() + "px";
	this.innerDiv.style.height = (parseInt(this.windowDiv.style.height) - ui.titleBarHeight - 15).toString() + "px";
	this.scrollBar.style.height = (parseInt(this.windowDiv.style.height) - ui.titleBarHeight - 15).toString() + "px";
	this.scrollKnob.style.height = this.computeKnobHeight();
	this.scrollKnob.style.top = parseInt(this.innerDiv.scrollTop / this.innerDiv.scrollHeight * parseInt(this.scrollBar.style.height)) + "px";
	this.addNoteButton.style.top = data.addNoteButton.top.toString() + "px";
	this.addSummaryNoteButton.style.top = data.addNoteButton.top.toString() + "px";
};

SAGE2Annotations.prototype.moveScrollKnob = function(position){
	var top = (position.y - parseInt(this.scrollBar.style.top)) -  parseInt(this.scrollKnob.style.height)/2;
	top = Math.min(Math.max(top,0),parseInt(this.scrollBar.style.height) - parseInt(this.scrollKnob.style.height));
	this.scrollKnob.style.top = top + "px";
	this.setWindowScroll();	
}; 	

SAGE2Annotations.prototype.setWindowScroll = function(){
	this.innerDiv.scrollTop = parseInt(this.scrollKnob.style.top)/parseInt(this.scrollBar.style.height) * this.innerDiv.scrollHeight;		
};

SAGE2Annotations.prototype.requestForNewNote = function(data){
	if (isMaster){
		wsio.emit('requestForNewNote', {appId: this.appId, uniqueID: data.user.uniqueID, requestMarker: data.requestMarker });
	}
};

SAGE2Annotations.prototype.getMarkerDiv = function(id){
	var marker = null;
	for (var page in this.markers){
		if (this.markers.hasOwnProperty(page) && this.markers[page].hasOwnProperty(id)){
			return {page: page, id:id, markerDiv: this.markers[page][id]};
		}
	}
	return null;
}

SAGE2Annotations.prototype.makeNoteNonEditable = function(credentials){
	var appWindow = document.getElementById(this.appId);
	if (!appWindow) return;
	if (this.editables.hasOwnProperty(credentials.userLabel)){
		var textArea = this.editables[credentials.userLabel];
		textArea.changeToNonEditable();
		var markerInfo = this.getMarkerDiv(credentials.id);
		if (markerInfo){
			var marker = markerInfo.markerDiv;
			marker.className = "annotationMarker";
			marker.style.backgroundColor = "rgba(252, 240, 173, 0.6)";
		}
		delete this.editables[credentials.userLabel];
	}
}

SAGE2Annotations.prototype.makeNoteEditable = function(data){
	var credentials = data.credentials;
	var appWindow = document.getElementById(this.appId);
	if (!appWindow) return;
	var textArea;
	if (this.editables.hasOwnProperty(credentials.userLabel)){
		textArea = this.editables[credentials.userLabel];
		this.makeNoteNonEditable(textArea.credentials);
	}
	for (var i=0; i<this.textAreas.length; i++){
		if (credentials.id === this.textAreas[i].credentials.id){
			this.textAreas[i].changeToEditable(data.color);
			this.editables[credentials.userLabel] = this.textAreas[i];
			break;
		}
	}
	var markerInfo = this.getMarkerDiv(credentials.id);
	if (markerInfo){
		var marker = markerInfo.markerDiv;
		marker.className = "annotationMarkerEditable";
		console.log("color:", data.color);	
		if (data.color !== undefined && data.color !== null){
			marker.style.backgroundColor = data.color;

		}
	}
	
};

SAGE2Annotations.prototype.makeAllNotesNonEditable = function(){
	for (var key in this.editables){
		if (this.editables.hasOwnProperty(key)){
			var textArea = this.editables[key];
			textArea.changeToNonEditable();
			var markerInfo = this.getMarkerDiv(textArea.credentials.id);
			if (markerInfo){
				var marker = markerInfo.markerDiv;
				marker.className = "annotationMarker";
			}
			delete this.editables[key];
		}
	}
};

SAGE2Annotations.prototype.event = function(eventType, position, user, data, date) {
	if (eventType === "pointerPress" && (data.button === "left")){
		if (position.x > parseInt(this.addNoteButton.style.left) && position.x < parseInt(this.addNoteButton.style.left) + parseInt(this.addNoteButton.width) && position.y > parseInt(this.addNoteButton.style.top) && position.y < parseInt(this.addNoteButton.style.top) + parseInt(this.addNoteButton.style.height)){
			this.requestForNewNote({user:user, requestMarker:true});
		}
		else if (position.x > parseInt(this.addSummaryNoteButton.style.left) && position.x < parseInt(this.addSummaryNoteButton.style.left) + parseInt(this.addSummaryNoteButton.width) && position.y > parseInt(this.addSummaryNoteButton.style.top) && position.y < parseInt(this.addSummaryNoteButton.style.top) + parseInt(this.addSummaryNoteButton.style.height)){
			this.requestForNewNote({user:user, requestMarker:false});
		}
		else if (position.x >parseInt(this.scrollBar.style.left) && position.x < parseInt(this.scrollBar.style.left) + parseInt(this.scrollBar.style.width) && position.y > parseInt(this.scrollBar.style.top) && position.y < parseInt(this.scrollBar.style.top) + parseInt(this.scrollBar.style.height)){
			this.moveScrollKnob(position);
		}
		else{
			position.y = position.y + (this.innerDiv.scrollTop - parseInt(this.innerDiv.style.top));
			position.x = position.x - parseInt(this.innerDiv.style.left);
			var i;
			var onDelete = false;
			var onDeleteOK = false;
			var onToggleNote = false;
			var markedForDeletion = -1;
			for (i=this.textAreas.length-1;i>=0;i--){
				onDelete = this.textAreas[i].onDeleteButton(position);
				if (onDelete){
					this.textAreas[i].setDeletionConfirm(user);
					break;
				}
				else if(this.textAreas[i].deleteConfirm=== true){
					onDeleteOK = this.textAreas[i].onDeleteOKButton(position);
					if (onDeleteOK){
						markedForDeletion = i;
					}
					else {
						this.textAreas[i].clearDeletionConfirm(user);
					}
					break;
				}
				onToggleNote = this.textAreas[i].onToggleNoteButton(position);
				if (onToggleNote){
					var credentials = this.textAreas[i].credentials;
					if (credentials.marker){
						wsio.emit('requestForMarkerDeletion', credentials);	
					}
					else{
						wsio.emit('requestForMarkerAddition', {credentials: credentials, color:user.color});	
					}
					break;
				}
					
			}
			if (markedForDeletion>-1 && isMaster){
				wsio.emit('requestForNoteDeletion', this.textAreas[markedForDeletion].credentials);
			}
			else{
				var clickedIn = false;
				for (i=this.textAreas.length-1;i>=0;i--){
					clickedIn = this.textAreas[i].event(eventType,position,user,data,date);
					if (clickedIn && isMaster){
						wsio.emit("setNoteAsEditable", {credentials:this.textAreas[i].credentials, color:user.color});
					}
				}
			}
			
		}
	}
	else{
		position.y = position.y + (this.innerDiv.scrollTop - parseInt(this.innerDiv.style.top));
		position.x = position.x - parseInt(this.innerDiv.style.left);
		console.log(String.fromCharCode(data.code));
		if (this.editables.hasOwnProperty(user.label)){
			var textArea = this.editables[user.label];
			textArea.event(eventType,position,user,data,date);
		}
	}
};

SAGE2Annotations.prototype.updateTime = function(now){
	for (var i=0;i<this.textAreas.length;i++){
		this.textAreas[i].updateTime(now);
	}
}


function TextArea(){
	this.newText = true;
	this.positionEditable = true;
	this.deleteConfirm = false;
	this.credentials = {
		id: null,
		appId: null,
		userLabel: null,
		createdOn: null,
		modifiedOn: null,
		changeFlag:false,
		marker:null
	};
	this.div = null;
}

TextArea.prototype.toggleNoteType = function(){
	if (this.credentials.marker!== null){
		this.element.style.background = "#FCF0AD";
		this.toggleNoteBox.src = "images/removeMarker.svg";
	}
	else{
		this.element.style.background = "#BBEEBB";
		this.toggleNoteBox.src = "images/addMarker.svg";
	}
};

TextArea.prototype.changeToEditable = function(color){
	this.element.style.boxShadow = "inset 0px 0px 4px 4px " + color;
	//this.showCaret();
};

TextArea.prototype.changeToNonEditable = function(){
	this.element.style.boxShadow = "none";
	//this.hideCaret();
};

TextArea.prototype.kill = function(){
	var parentNode;
	parentNode = this.element.parentNode;
	if (parentNode){
		parentNode.removeChild(this.element);
	}
	parentNode = this.credentialBar.parentNode;
	if (parentNode){
		parentNode.removeChild(this.credentialBar);
	}
	parentNode = this.deletionConfirmationAlertWindow.parentNode;
	if (parentNode){
		parentNode.removeChild(this.deletionConfirmationAlertWindow);
	}
};


TextArea.prototype.setTop = function(val){
	this.element.style.top = parseInt(val) + "px";
	this.deletionConfirmationAlertWindow.style.top = parseInt(val) + "px";
	this.credentialBar.style.top = parseInt(this.element.style.top) + parseInt(this.element.style.height) + "px";
};

TextArea.prototype.getTop = function(val){
	return parseInt(this.element.style.top);
};

TextArea.prototype.isChanged = function(){
	return this.credentials.changeFlag;
};

TextArea.prototype.setChanged = function(date){
	this.credentials.changeFlag = true;
	this.credentials.modifiedOn = date;
};

TextArea.prototype.getText = function(){
	return this.prefixText.innerHTML.replace(/<br>/gi, "\n\r") + this.suffixText.innerHTML.replace(/<br>/gi, "\n\r");
};

TextArea.prototype.setText = function(text){
	this.prefixText.innerHTML = text.replace("\n\r", "<br>");
	this.suffixText.innerHTML = "";
};

TextArea.prototype.setCredentials = function(data){
	this.credentials.id = data.id;
	this.credentials.createdOn = data.createdOn;
	this.credentials.userLabel = data.userLabel;
	this.credentials.marker = data.marker;
	if (data.text){
		this.setText(data.text);
		this.newText = false;
	}
	this.idBox.innerHTML = this.credentials.id;
	var dt = new Date(data.createdOn);
	this.dateBox.innerHTML = this.formatTime(data.createdOn, data.createdOn);	
	this.userNameBox.innerHTML = data.userLabel;
};

TextArea.prototype.updateTime = function(now){
	this.dateBox.innerHTML = this.formatTime(this.credentials.createdOn,now);
};

TextArea.prototype.formatTime = function(createdOn, nowInms){
	moment.locale('en', {
	    calendar : {
	        lastDay : '[Yesterday,] LT',
	        sameDay : '[Today,] LT',
	        nextDay : '[Tomorrow,] LT',
	        lastWeek : '[last] ddd[,] LT',
	        nextWeek : 'ddd[,] LT',
	        sameElse : 'L'
	    }
	});
	var then = moment(createdOn);
	var now = moment(nowInms);
	/*if (now.diff(then, 'milliseconds') < 86400000){
		return then.from(now).replace("minute", "min");
	}*/
	return then.calendar();
};

TextArea.prototype.setFirstEditCallBack = function (callback){
	this.firstEditCallBack = callback;
};

TextArea.prototype.init = function(div, data){

	this.makeCredentialBar(div,data);

	this.credentials.appId = data.appId;
	data.height = 5.0/6.0 * data.height;
	this.element = document.createElement("span");
	this.element.id = data.id;
	this.element.style.background = "#BBEEBB";
	this.element.style.position = "absolute";
	this.element.style.left = parseInt(data.left) + "px";
	this.element.style.top = parseInt(data.top) + "px";
	this.element.style.width = parseInt(data.width) +"px";
	this.element.style.height = parseInt(data.height) + "px";
	this.element.style.border = "solid 1px black";
	this.element.style.display = "block";
	this.element.style.overflow = "hidden";
	div.appendChild(this.element);

	this.insetElement = document.createElement("span");
	this.insetElement.style.position = "absolute";
	this.insetElement.style.left = parseInt(0.05*data.width) +"px";
	this.insetElement.style.top = parseInt(0.05*data.height) + "px";
	this.insetElement.style.width = parseInt(0.9*data.width) +"px";
	this.insetElement.style.height = parseInt(0.9*data.height) +"px";
	this.insetElement.style.display = "block";
	this.element.appendChild(this.insetElement);
	
	this.startMarker = document.createElement("span");
	this.startMarker.style.width = "0px";
	this.startMarker.style.height = "0px";
	this.startMarker.style.border = "none";
	this.insetElement.appendChild(this.startMarker);

	this.prefixText = document.createElement("p");
	this.prefixText.id = "prefix";
	this.prefixText.style.wordWrap = "break-word";
	this.prefixText.style.display = "inline";
	this.prefixText.innerHTML = "";//"Lorem ipsum dolor sit amet,<br> consectetur adipiscing elit.";//" Donec sollicitudin mattis metus, ut dignissim quam consequat id. Quisque massa est, scelerisque a diam nec, condimentum malesuada purus. Phasellus consectetur massa ut mollis sagittis. Nullam ullamcorper augue vitae tempor auctor.";//" Maecenas vitae semper ante. Donec ex justo, tempus eu convallis non, tincidunt nec arcu. Fusce mollis dui a mauris tempor efficitur. Nam eget mollis nulla. Suspendisse feugiat suscipit blandit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi scelerisque nec diam vel molestie. Mauris tristique cursus accumsan. Pellentesque commodo bibendum ex vitae viverra. Vestibulum vitae nisl est. Vivamus imperdiet pulvinar tempus. Proin nec velit metus.";
	this.prefixText.style.textAlign = "justify";
	this.insetElement.appendChild(this.prefixText);

	this.caret = document.createElement("span");
	this.insetElement.appendChild(this.caret);


	this.suffixText = document.createElement("p");
	this.suffixText.id = "prefix";
	this.suffixText.style.textAlign = "justify";
	this.suffixText.style.wordWrap = "break-word";
	this.suffixText.style.display = "inline";
	this.insetElement.appendChild(this.suffixText);
	
	this.endMarker = document.createElement("span");
	this.insetElement.appendChild(this.endMarker);
	if (data.createdOn){
		this.setCredentials(data);
	}

	this.deletionConfirmationAlertWindow = document.createElement("span");
	this.deletionConfirmationAlertWindow.id = data.id+"deleteConfirm";
	this.deletionConfirmationAlertWindow.style.background = "#EE8888";
	this.deletionConfirmationAlertWindow.style.position = "absolute";
	this.deletionConfirmationAlertWindow.style.left = parseInt(data.left) + "px";
	this.deletionConfirmationAlertWindow.style.top = parseInt(data.top) + "px";
	this.deletionConfirmationAlertWindow.style.width = parseInt(data.width) +"px";
	this.deletionConfirmationAlertWindow.style.height = parseInt(data.height) + "px";
	this.deletionConfirmationAlertWindow.style.border = "solid 1px black";
	this.deletionConfirmationAlertWindow.style.display = "block";
	
	this.alertText = document.createElement("p");
	this.alertText.style.textAlign = "center";
	this.alertText.style.lineHeight = 1.2;
	this.alertText.style.fontSize = parseInt(ui.titleBarHeight - 3) + "px";
	this.alertText.style.fontFamily = 'arial';
	this.alertText.style.color = 'white';
	this.alertText.style.wordWrap = "break-word";
	this.alertText.style.overflow = "hidden";
	this.alertText.style.display = "block";
	this.alertText.style.margin = parseInt(ui.titleBarHeight) + "px";
	this.alertText.innerText = "Click OK to confirm note deletion!";
	this.deletionConfirmationAlertWindow.appendChild(this.alertText);
	this.deletionConfirmationButton =  document.createElement("span");
	this.deletionConfirmationButton.style.background = "#EE6666";
	this.deletionConfirmationButton.style.position = "absolute";
	this.deletionConfirmationButton.style.left = (parseInt(data.width)/2 - ui.titleBarHeight) + "px";
	this.deletionConfirmationButton.style.bottom = parseInt(ui.titleBarHeight) + "px";
	this.deletionConfirmationButton.style.width = parseInt(2*ui.titleBarHeight) +"px";
	this.deletionConfirmationButton.style.height = parseInt(ui.titleBarHeight) + "px";
	this.deletionConfirmationButton.style.border = "solid 1px black";
	this.deletionConfirmationButton.style.display = "block";
	this.deletionConfirmationButton.style.textAlign = "center";
	this.deletionConfirmationButton.style.lineHeight = parseInt(ui.titleBarHeight) + "px";
	this.deletionConfirmationButton.style.fontSize = parseInt(ui.titleBarHeight*0.6) + "px";
	this.deletionConfirmationButton.style.fontFamily = 'arial';
	this.deletionConfirmationButton.style.verticalAlign = "middle";
	this.deletionConfirmationButton.style.color = 'white';
	this.deletionConfirmationButton.innerText = "OK";
	this.deletionConfirmationAlertWindow.appendChild(this.deletionConfirmationButton);
	this.div = div;
	this.setCredentialBarFontSize(data.height/6.0);
	this.setFontSize(ui.titleTextSize*0.8);
};

TextArea.prototype.setFontSize = function(fontSize){
	this.prefixText.style.lineHeight = 1.2;
	this.caret.style.lineHeight = 1.2;
	this.suffixText.style.lineHeight = 1.2;
	this.prefixText.style.fontSize = parseInt(fontSize) + "px";
	this.caret.style.fontSize = parseInt(fontSize) + "px";
	this.suffixText.style.fontSize = parseInt(fontSize) + "px";
	this.prefixText.style.fontFamily = 'arial';
	this.suffixText.style.fontFamily = 'arial';
},

TextArea.prototype.setCredentialBarFontSize = function(credBarHeight){
	var credBarTextSize = parseInt(credBarHeight*0.6) + "px";
	this.idBox.style.fontSize = credBarTextSize;
	this.idBox.style.fontFamily = 'arial';
	this.userNameBox.style.fontSize = credBarTextSize;
	this.userNameBox.style.fontFamily = 'arial';
	this.dateBox.style.fontSize = credBarTextSize;
	this.dateBox.style.fontFamily = 'arial';
	this.deletionConfirmationButton.style.fontSize = parseInt(parseInt(credBarTextSize)*1.2) + "px";
	this.deletionConfirmationButton.style.fontFamily = 'arial';
	this.alertText.style.fontSize = parseInt(parseInt(credBarTextSize)*1.2) + "px";
	this.alertText.style.fontFamily = 'arial';
};

TextArea.prototype.makeCredentialBar = function(div, data){
	var credBarHeight = data.height / 6.0;
	var credBarTextSize = parseInt(credBarHeight*0.4) + "px";
	var credBarTop = data.top + data.height*(5.0/6.0);
	this.credentialBar = document.createElement("span");

	this.credentialBar.style.background = "#777777";
	this.credentialBar.style.position = "absolute";
	this.credentialBar.style.left = parseInt(data.left) + "px";
	this.credentialBar.style.top = parseInt(credBarTop) + "px";
	this.credentialBar.style.width = parseInt(data.width) +"px";
	this.credentialBar.style.height = parseInt(credBarHeight) + "px";
	this.credentialBar.style.border = "solid 1px black";
	this.credentialBar.style.display = "block";
	this.credentialBar.style.overflow = "hidden";
	div.appendChild(this.credentialBar);

	this.toggleNoteBox = document.createElement("img");
	this.toggleNoteBox.style.position = "absolute";
	this.toggleNoteBox.style.left = "0px";
	this.toggleNoteBox.style.top = "1px";
	this.toggleNoteBox.style.height = parseInt(credBarHeight -2) +"px";
	this.toggleNoteBox.style.display = "block";
	this.toggleNoteBox.src = "images/addMarker.svg";
	this.credentialBar.appendChild(this.toggleNoteBox);

	this.idBox = document.createElement("span");
	this.idBox.style.position = "absolute";
	this.idBox.style.left = parseInt(0.10*data.width) + "px";
	this.idBox.style.bottom = "0px";
	this.idBox.style.width = parseInt(0.15*data.width) +"px";
	this.idBox.style.lineHeight = parseInt(credBarHeight) +"px";
	this.idBox.style.display = "block";
	this.idBox.style.fontSize = credBarTextSize;
	this.idBox.style.fontFamily = 'arial';
	this.idBox.style.color = "white";
	this.idBox.style.display = "block";
	//this.idBox.style.paddingLeft = "4px";
	this.idBox.style.verticalAlign = "middle";
	this.credentialBar.appendChild(this.idBox);
	
	this.userNameBox = document.createElement("span");
	this.userNameBox.style.position = "absolute";
	this.userNameBox.style.left = parseInt(this.idBox.style.left) + parseInt(this.idBox.style.width) +"px";
	this.userNameBox.style.bottom = "0px";
	this.userNameBox.style.width = parseInt(0.3*data.width) +"px";
	this.userNameBox.style.fontSize = credBarTextSize;
	this.userNameBox.style.lineHeight = parseInt(credBarHeight) +"px";
	this.userNameBox.style.fontFamily = 'arial';
	this.userNameBox.style.color = "white";
	this.userNameBox.style.display = "block";
	this.userNameBox.style.verticalAlign = "middle";
	this.credentialBar.appendChild(this.userNameBox);

	this.dateBox = document.createElement("span");
	this.dateBox.style.position = "absolute";
	this.dateBox.style.left = parseInt(this.userNameBox.style.left) + parseInt(this.userNameBox.style.width) +"px";
	this.dateBox.style.marginRight = "3px";
	this.dateBox.style.bottom = "0px";
	this.dateBox.style.width = parseInt(0.35*data.width) +"px";
	this.dateBox.style.fontSize = credBarTextSize;
	this.dateBox.style.lineHeight = parseInt(credBarHeight) +"px";
	this.dateBox.style.fontFamily = 'arial';
	this.dateBox.style.color = "white";
	this.dateBox.style.display = "block";
	this.dateBox.style.textAlign = "right";
	this.dateBox.style.verticalAlign = "middle";
	this.credentialBar.appendChild(this.dateBox);

	this.deleteNoteBox = document.createElement("img");
	this.deleteNoteBox.style.position = "absolute";
	this.deleteNoteBox.style.right = "0px";
	this.deleteNoteBox.style.top = "1px";
	this.deleteNoteBox.style.height = parseInt(credBarHeight -2) +"px";
	this.deleteNoteBox.style.display = "block";
	this.deleteNoteBox.src = "images/close.svg";
	this.credentialBar.appendChild(this.deleteNoteBox);
};

TextArea.prototype.hideCaret = function(){
	this.caret.style.border = "none";
};

TextArea.prototype.showCaret = function(){
	this.caret.style.border = "solid 1px black";
};

TextArea.prototype.setDeletionConfirm = function(){
	if (this.element.parentNode === this.div){
		this.div.removeChild(this.element);
	}
	
	this.div.appendChild(this.deletionConfirmationAlertWindow);
	this.deleteConfirm = true;
};

TextArea.prototype.clearDeletionConfirm = function(){
	this.div.appendChild(this.element);
	if (this.deletionConfirmationAlertWindow.parentNode === this.div){
		this.div.removeChild(this.deletionConfirmationAlertWindow);
	}
	this.deleteConfirm = false;
};


TextArea.prototype.onDeleteOKButton = function(position){
	if (this.deletionConfirmationAlertWindow.parentNode === this.div){
		var height = parseInt(this.deletionConfirmationButton.style.height);
		var width = parseInt(this.deletionConfirmationButton.style.width);
		var x = parseInt(position.x - parseInt(this.deletionConfirmationAlertWindow.style.left) - parseInt(this.deletionConfirmationButton.style.left));
		var top = parseInt(this.element.style.top) + (parseInt(this.element.style.height) - parseInt(this.deletionConfirmationButton.style.bottom) - height);
		var y = parseInt(position.y - top);
		//console.log(x,y, width,height);
		if (y >= 0 && y <= height && x >= 0 && x <= width){
			return true;
		}	
	}
	return false;
}

TextArea.prototype.onDeleteButton = function(position){
	var y = parseInt(position.y - parseInt(this.credentialBar.style.top));
	var height = parseInt(this.deleteNoteBox.style.height);
	var width = parseInt(this.deleteNoteBox.width);
	var x = parseInt(position.x - parseInt(this.credentialBar.style.left) - (parseInt(this.credentialBar.style.width) - width));
	//console.log(width,y,x);
	if (y >= 0 && y <= height && x >= 0 && x <= width){
		return true;
	}
	return false;
};

TextArea.prototype.onToggleNoteButton = function(position){
	var y = parseInt(position.y - parseInt(this.credentialBar.style.top));
	var height = parseInt(this.toggleNoteBox.style.height);
	var width = parseInt(this.toggleNoteBox.width);
	var x = parseInt(position.x - parseInt(this.credentialBar.style.left) - parseInt(this.toggleNoteBox.style.left));
	//console.log(width,y,x);
	if (y >= 0 && y <= height && x >= 0 && x <= width){
		return true;
	}
	return false;
};

TextArea.prototype.updateCaret = function(){
	this.caret.className = "blinking-cursor";
	this.caret.innerHTML = "|";
	if (this.timeoutId!==undefined&&this.timeoutId!==null){
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}
	this.timeoutId = setTimeout(function(){
		this.caret.className = "";
		this.caret.innerHTML = "";
	}.bind(this),5000);
};

TextArea.prototype.event = function(eventType, position, user, data, date) {
	
	
	if (eventType === "pointerPress" && (data.button === "left")) {
		if (position.x < parseInt(this.element.style.left) || position.x > (parseInt(this.element.style.left) + parseInt(this.element.style.width)) || position.y < parseInt(this.element.style.top) || position.y > (parseInt(this.element.style.top)+parseInt(this.element.style.height)))
			return false;
		if (user.label !== this.credentials.userLabel)
			return false;
		//console.log(position.x,position.y);
		this.updateCaretPos(position.x,position.y);
		/*if (this.caret.style.display === "none")
			this.caret.style.display = "inline";*/
		this.updateCaret();
		return true;

	}
	else if (eventType === "pointerRelease" && (data.button === "left")) {
	}

	else if (eventType === "keyboard") {
		if (data.code ===13)
			this.prefixText.innerHTML = this.prefixText.innerHTML + "<br>";
		else
			this.prefixText.innerHTML = this.prefixText.innerHTML + data.character;
		this.setChanged(date);
	}

	else if (eventType === "specialKey") {
		var split;
		if (data.code === 37 && data.state === "down") { // left arrow
			if (this.prefixText.innerHTML.length>0){
				split = this.splitLastChar(this.prefixText.innerHTML);
				this.suffixText.innerHTML = split.last + this.suffixText.innerHTML;
				this.prefixText.innerHTML = split.first;
			}
		}
		else if (data.code === 38 && data.state === "down") { // up arrow
			this.updateCaretPos(this.caret.offsetLeft,this.caret.offsetTop-parseInt(this.caret.style.height));
		}
		else if (data.code === 39 && data.state === "down") { // right arrow
			if (this.suffixText.innerHTML.length>0){
				split = this.splitFirstChar(this.suffixText.innerHTML);
				this.prefixText.innerHTML = this.prefixText.innerHTML + split.first;
				this.suffixText.innerHTML = split.last;
			}
		}
		else if (data.code === 40 && data.state === "down") { // down arrow
			this.updateCaretPos(this.caret.offsetLeft,this.caret.offsetTop+parseInt(this.caret.style.height));
		}	
		else if (data.code === 46 && data.state === "down"){ // delete
			if (this.suffixText.innerHTML.length>0){
				this.suffixText.innerHTML = this.splitFirstChar(this.suffixText.innerHTML).last;
				this.setChanged(date);
			}
		}	
		else if (data.code === 8 && data.state === "down"){ // backspace
			if (this.prefixText.innerHTML.length>0){
				this.prefixText.innerHTML = this.splitLastChar(this.prefixText.innerHTML).first;
				this.setChanged(date);
			}
		}		
	}
	this.updateCaret();
	return true;
}

TextArea.prototype.updateCaretPos = function(x,y){
	var paddingLeft = this.insetElement.offsetLeft;
	var paddingTop = this.insetElement.offsetTop;
	x = x - paddingLeft;
	y = y - paddingTop;
	
	var cx = parseInt(this.caret.offsetLeft);
	var cyH = parseInt(this.caret.offsetTop);
	var lineHeight = parseInt(this.caret.style.height);
	y = (parseInt(y/lineHeight) + 0.5) * lineHeight;
	var cyL = cyH + lineHeight;

	var sx = parseInt(this.startMarker.offsetLeft);
	var syH = parseInt(this.startMarker.offsetTop);
	var syL = syH + parseInt(this.caret.style.height);

	var ex = parseInt(this.endMarker.offsetLeft);
	var eyH = parseInt(this.endMarker.offsetTop);
	var eyL = eyH + parseInt(this.caret.style.height);

	if (y < syH || (y < syL && x < sx)){
		this.suffixText.innerHTML = this.prefixText.innerHTML + this.suffixText.innerHTML;
		this.prefixText.innerHTML = "";
		return;
	}
	else if (y > eyL || (y > eyH && x > ex)){
		this.prefixText.innerHTML = this.prefixText.innerHTML + this.suffixText.innerHTML;
		this.suffixText.innerHTML = "";
		return;
	}

	/*
	var buffer;
	var editVal;

	//assuming we are searching current suffix
	var low = 0;
	var high = this.prefixText.nodeValue.length +this.suffixText.nodeValue.length - 1;

	var fhalf;
	var shalf;
	while(low < high){
		mid = (low+high)/2;
		fhalf = (this.prefixText.nodeValue + this.suffixText.nodeValue).slice(0,mid);
		shalf = (this.prefixText.nodeValue + this.suffixText.nodeValue).slice(mid);
		this.prefixText.nodeValue = fhalf;
		this.suffixText.nodeValue = shalf;
		console.log(fhalf.length +","+shalf.length);
		cyH = parseInt(this.caret.offsetTop);
		cx = parseInt(this.caret.offsetLeft);
		cyL = cyH + lineHeight;
		if (whitinRangeOfPoint(x,y,cx-4,cyH,cx+4,cyL)){
			console.log("whitinRangeOfPoint");
			break;
		}
		else if(isPoint1BehindPoint2(x,y,cx,cyH)){
			high = mid -1;
			
		}
		else{
			low = mid + 1;
			
		}
	}
	//console.log(text);
	*/
}

TextArea.prototype.splitLastChar = function(htmlText){
	var numberOfChars = 1;
	if (htmlText.lastIndexOf("<br>") >= htmlText.length-4) numberOfChars =htmlText.length-htmlText.lastIndexOf("<br>");
	return {first:htmlText.slice(0,-numberOfChars),last:htmlText.slice(-numberOfChars)};
},
TextArea.prototype.splitFirstChar = function(htmlText){
	var numberOfChars = 1;
	if (htmlText.indexOf("<br>") === 0) numberOfChars = 4;
	return {first:htmlText.slice(0,numberOfChars),last:htmlText.slice(numberOfChars)};
}

isPoint1BehindPoint2 = function(x1,y1,x2,y2){
	if (y1 < y2)
		return true;
	else if (y1 > y2)
		return false;
	if (x1 < x2)
		return true;
	return false;
}

whitinRangeOfPoint = function(x, y, xmin, ymin, xmax, ymax){
	if (x > xmin && x <= xmax && y > ymin && y < ymax )
		return true;
	return false;
}