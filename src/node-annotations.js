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
 * @module annotationSystem
 */


var fs        = require('fs');
var path      = require('path');
var sageutils = require('../src/node-utils');    // provides utility functions



//////////////////////////////////////////////////////////////////////////////////////////

function annotationSystem() {
	this.filename = "annotationsDB.json";
    this.annotationWindows = {};
    this.config = null;
    this.newNoteRequests = {};
}

annotationSystem.prototype.initializeDB = function(folder) {
    this.annotationFolder = folder;

    var fullpath = path.join(folder, this.filename);

    //console.log("Annotations> Initializing ...", fullpath);

    if (!sageutils.fileExists(fullpath)) {
        fs.writeFileSync(fullpath, "{}");
    }

    // Create the database
    // The second argument is used to tell the DB to save after each push
    // The third argument is to ask JsonDB to save the database in a human readable format
    this.db = new jsonDB(fullpath, true, true);
};




annotationSystem.prototype.setDBFilename = function(dbFilename) {
    this.filename = path.resolve(dbFilename);
};

annotationSystem.prototype.getAllAnnotationsForFile = function(filename){
    var annotations;
    try {
        annotations = this.db.getData('/' + filename );
    } catch(error) {
        annotations = "";
    }
    return annotations;
}

annotationSystem.prototype.getAnnotationForFile = function(filename, annotationID){
    var annotation = "";
    try {
        annotation = this.db.getData('/' + filename + '/' + annotationID);
    } catch(error) {
        console.error("Annotation not found for " + filename + ":" + annotationID);
    }
    return annotation;
}
annotationSystem.prototype.saveAnnotationForFile = function(filename, annotationID, data){
    var key = "/" + filename + "/" + annotationID;
    this.push(key,data,true);
}

annotationSystem.prototype.push = function(key, value, overwrite) {
    try {
        this.db.push(key, value, overwrite);
    } catch(error) {
        console.error(error);
    }
};


annotationSystem.prototype.loadAnnotations = function(appInstance, config){
    if (!appInstance.annotation) return;
    var annotationWindow = {
        id: appInstance.id + "_notes",
        appId:appInstance.id,
        left: appInstance.left  + appInstance.width,
        top:appInstance.top + config.ui.titleBarHeight,
        width:appInstance.width*0.65,
        height:appInstance.height,
        show:false,
        button: {
            id: appInstance.id + "_showNote",
            left:appInstance.left  + appInstance.width,
            top:appInstance.top + config.ui.titleBarHeight + appInstance.height*0.4,
            width:config.ui.titleBarHeight, // Set this to ui.titleBarHeight
            height: appInstance.height*0.2,
            caption:"Show notes"
        },
        addButton: {
            id:appInstance.id + "_addNote",
            left:6,
            top:appInstance.height - config.ui.titleBarHeight - 3,
            width:appInstance.width*0.20,
            height:config.ui.titleBarHeight,
            caption:"Add Note"
        },
        expectsClickFrom: {},
        notes:[],
        annotationData: null
    };
    annotationWindow.annotationData = this.getAllAnnotationsForFile(appInstance.title);
    this.annotationWindows[appInstance.id] = annotationWindow;
    this.config = config;
    return annotationWindow;
}

annotationSystem.prototype.removeAnnotationWindow = function(appId){
    if (this.annotationWindows[appId])
        delete this.annotationWindows[appId];
}

annotationSystem.prototype.showAnnotationWindow = function(appId){
    if (this.annotationWindows[appId]) {
        var annotationWindow = this.annotationWindows[appId];
        if (annotationWindow.show === false){
            annotationWindow.show = true;
            annotationWindow.button.left += annotationWindow.width;
            return {appId:appId,left:annotationWindow.left,top:annotationWindow.top,button:{left:annotationWindow.button.left,top:annotationWindow.button.top}};
        }
    }
    return null;
}

annotationSystem.prototype.hideAnnotationWindow = function(appId){
    if (this.annotationWindows[appId]) {
        var annotationWindow = this.annotationWindows[appId];
        if (annotationWindow.show === true){
            annotationWindow.show = false;
            annotationWindow.button.left -= annotationWindow.width;
            return {appId:appId,button:{left:annotationWindow.button.left,top:annotationWindow.button.top}};
        }
    }
    return null;
}


annotationSystem.prototype.updateAnnotationWindowPosition = function(data){
    if (!this.annotationWindows[data.elemId]) return null;
    var annotationWindow = this.annotationWindows[data.elemId];
    var buttonOffsetLeft = annotationWindow.button.left - annotationWindow.left;
    var buttonOffsetTop = annotationWindow.button.top - annotationWindow.top;
    annotationWindow.left = data.elemLeft + data.elemWidth;
    annotationWindow.top = data.elemTop + this.config.ui.titleBarHeight;
    annotationWindow.button.left = annotationWindow.left + buttonOffsetLeft;
    annotationWindow.button.top = annotationWindow.top + buttonOffsetTop;
    return {appId:data.elemId, left:annotationWindow.left,top:annotationWindow.top,button:{left:annotationWindow.button.left,top:annotationWindow.button.top}};
}

annotationSystem.prototype.addNote = function(noteData){
    if (!this.annotationWindows[noteData.appId]) return null;
    
    this.annotationWindows[noteData.appId].expectsClickFrom[noteData.uniqueID] = true;
    if (noteData.appId in this.newNoteRequests)
        this.newNoteRequests[noteData.appId].push(noteData);
    else
        this.newNoteRequests[noteData.appId] = [noteData];
    return noteData;
}

annotationSystem.prototype.expectsClick = function(appId,userId){
    console.log(appId,userId);
    if (!this.annotationWindows[appId]) return false;
    if (userId in this.annotationWindows[appId].expectsClickFrom)
        return this.annotationWindows[appId].expectsClickFrom[userId];
    return false;
}

annotationSystem.prototype.createOrSetMarker = function(appId,click){
    if (!this.annotationWindows[appId]) return null;
    if (!this.newNoteRequests[appId]) return null;
    var found = false;
    var newNote = null;
    var notes = this.newNoteRequests[appId];
    for(var i=notes.length-1;i>=0;i--){
        if (notes[i].uniqueID === click.uniqueID){
            newNote = {
                id: notes[i].user + notes[i].createdOn.toString(),
                user:notes[i].user,
                createdOn:notes[i].createdOn,
                appId:notes[i].appId,
                position: {pointerX:click.pointerX, pointerY:click.pointerY}
            }
            found = true;
            break;
        }
    }
        
    if (found){
        notes = this.annotationWindows[appId].notes;
        for(var i=notes.length-1;i>=0;i--){
            if (notes[i].id === newNote.id){
                notes[i].position = newNote.position;
                return notes[i];
            }
        }
        this.annotationWindows[appId].notes.push(newNote);
        return newNote;
    }
    return null;
}
annotationSystem.prototype.findAnnotationsUnderPointer = function(pointerX, pointerY){
    var data = {
        annotation: null,
        onButton:false,
        onAddButton:false
    };

    for (var appId in this.annotationWindows){
        if (this.annotationWindows.hasOwnProperty(appId)){
            var noteWindow = this.annotationWindows[appId];
            console.log(noteWindow);
            if (noteWindow.show){
                if (pointerX >= noteWindow.left && pointerX <= noteWindow.left + noteWindow.width && pointerY >= noteWindow.top && pointerY <= noteWindow.top + noteWindow.height){
                    data.annotation = noteWindow;
                    data.onButton = false;
                    var withinX = pointerX - noteWindow.left;
                    var withinY = pointerY - noteWindow.top; 
                    var addButton = noteWindow.addButton;
                    if (withinX >= addButton.left && withinX <= addButton.left + addButton.width && withinY >= addButton.top && withinY <= addButton.top + addButton.height){
                        data.onAddButton = true;
                    }
                    return data;
                }
            }
            if(pointerX >= noteWindow.button.left && pointerX <= noteWindow.button.left + noteWindow.button.width && pointerY >= noteWindow.button.top && pointerY <= noteWindow.button.top + noteWindow.button.height){
                data.annotation = noteWindow;
                data.onButton = true;
                data.onAddButton = false;
                return data;
            }

        }
    }
    return data;
}


module.exports = annotationSystem;
