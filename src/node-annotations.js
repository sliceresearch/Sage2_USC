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
var JsonDB      = require('node-json-db');


//////////////////////////////////////////////////////////////////////////////////////////

function annotationSystem() {
	this.filename = "annotationsDB.json";
    this.annotationWindows = {};
    this.config = null;
    this.editableNote = {};
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
    this.db = new JsonDB(fullpath, true, true);
};




annotationSystem.prototype.setDBFilename = function(dbFilename) {
    this.filename = path.resolve(dbFilename);
    this.initializeDB(this.annotationFolder);
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
};

annotationSystem.prototype.saveMarkerForAnnotation = function(filename, annotationID, markerData){
    var key = "/" + filename + "/" + annotationID + "/marker";
    this.push(key,markerData,true);
};

annotationSystem.prototype.saveTextForAnnotation = function(filename, annotationID, textData){
    var key = "/" + filename + "/" + annotationID + "/text";
    this.push(key,textData,true);
};

annotationSystem.prototype.deleteAnnotationFromFile = function(filename, annotationID){
    var key = "/" + filename + "/" + annotationID;
    this.delete(key);
};

annotationSystem.prototype.deleteMarkerFromAnnotation = function(filename, annotationID){
    var key = "/" + filename + "/" + annotationID + "/marker";
    this.delete(key);
};


annotationSystem.prototype.push = function(key, value, overwrite) {
    try {
        this.db.push(key, value, overwrite);
    } catch(error) {
        console.error(error);
    }
};

annotationSystem.prototype.delete = function(key) {
    try {
        this.db.delete(key);
    } catch(error) {
        console.error(error);
    }
};

annotationSystem.prototype.deleteAnnotation = function(filename, annotationID) {
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
        application: appInstance.application,
        filename: appInstance.title,
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
        addNoteButton: {
            id:appInstance.id + "_addNote",
            left:6,
            top:appInstance.height - config.ui.titleBarHeight - 3,
            width:appInstance.width*0.20,
            height:config.ui.titleBarHeight,
            caption:"New Note"
        },
        addSummaryNoteButton: {
            id:appInstance.id + "_addSummaryNote",
            left: 12 + appInstance.width*0.20 ,
            top:appInstance.height - config.ui.titleBarHeight - 3,
            width:appInstance.width*0.20,
            height:config.ui.titleBarHeight,
            caption:"New Summary Note"
        },
        notes:[],
        annotationData: null,
        annotationCount: 0,
        appHandle:appInstance // For easy access to the state of the app
    };
    annotationWindow.annotationData = this.getAllAnnotationsForFile(appInstance.title);
    annotationWindow.annotationCount = (annotationWindow.annotationData)? (function(){
        var count = 0;
        for(var key in annotationWindow.annotationData){
            if (annotationWindow.annotationData.hasOwnProperty(key)){
                count += 1;
            }
        }
        return count;
    })() : 0;
    annotationWindow.button.caption = "Show notes (" + annotationWindow.annotationCount + ")";
    this.annotationWindows[appInstance.id] = annotationWindow;
    this.editableNote[appInstance.id] = {}; 
    this.config = config;
    return annotationWindow;
};

annotationSystem.prototype.deleteAnnotationWindow = function(appId){
    if (this.annotationWindows[appId])
        delete this.annotationWindows[appId];
};

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
            this.setAllNotesAsNonEditable(appId);
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
};

annotationSystem.prototype.updateAnnotationWindowPositionAndSize = function(data){
    if (!this.annotationWindows[data.elemId]) return null;
    var annotationWindow = this.annotationWindows[data.elemId];
    var buttonOffsetLeft = annotationWindow.button.left - annotationWindow.left;
    var buttonOffsetTop = (annotationWindow.height - annotationWindow.button.height)/2.0;
    annotationWindow.left = data.elemLeft + data.elemWidth;
    annotationWindow.height = data.elemHeight;
    annotationWindow.top = data.elemTop + this.config.ui.titleBarHeight;
    annotationWindow.button.left = annotationWindow.left + buttonOffsetLeft;
    annotationWindow.button.top = annotationWindow.top + buttonOffsetTop;
    annotationWindow.addNoteButton.top = data.elemHeight - this.config.ui.titleBarHeight - 3;
    return {appId:data.elemId, left:annotationWindow.left,top:annotationWindow.top, height:annotationWindow.height, button:{left:annotationWindow.button.left,top:annotationWindow.button.top}, addNoteButton:{top:annotationWindow.addNoteButton.top}};
};

annotationSystem.prototype.addNewNote = function(credentials){
    if (!this.annotationWindows[credentials.appId]) return null;
    var annotationWindow = this.annotationWindows[credentials.appId];
    annotationWindow.annotationCount += 1;
    credentials.id = annotationWindow.annotationCount;
    this.editableNote[credentials.appId][credentials.userLabel.toString()] = credentials;
    this.saveAnnotationForFile(annotationWindow.filename, credentials.id, {
        id: credentials.id, 
        userLabel: credentials.userLabel, 
        createdOn: credentials.createdOn, 
        marker: credentials.marker, 
        text: null
    });
    return credentials;
};


annotationSystem.prototype.setNoteAsEditable = function(credentials){
    if (!this.annotationWindows[credentials.appId]) return null;
    this.editableNote[credentials.appId][credentials.userLabel.toString()] = credentials;
};

annotationSystem.prototype.setNoteAsNonEditable = function(credentials){
    if (!this.annotationWindows[credentials.appId]) return null;
    if (this.editableNote[credentials.appId].hasOwnProperty(credentials.userLabel.toString())){
        delete this.editableNote[credentials.appId][credentials.userLabel.toString()];
    }
};

annotationSystem.prototype.setAllNotesAsNonEditable = function(appId){
    if (!this.annotationWindows[appId]) return null;
    if (this.editableNote.hasOwnProperty(appId)){
        delete this.editableNote[appId];
    }
    this.editableNote[appId] = {};
};

annotationSystem.prototype.getAnnotationWindowForApp = function(appId){
    return this.annotationWindows[appId] || null;
};


annotationSystem.prototype.setMarkerPosition = function(elem,click){
    if (!this.annotationWindows[elem.id]) return null;
    var annotationWindow = this.annotationWindows[elem.id];
    if (elem.id in this.editableNote){
        if (click.userLabel.toString() in this.editableNote[elem.id]){
            var noteData = this.editableNote[elem.id][click.userLabel.toString()];
            if (!noteData.marker) return null;
            var position = {};
            position.x = 100 * (click.pointerX - elem.left)/elem.width;
            position.y = 100 * (click.pointerY - (elem.top+this.config.ui.titleBarHeight))/elem.height;
            noteData.marker.position = position;
            noteData.marker.page = annotationWindow.appHandle.data.page || 1;
            this.saveMarkerForAnnotation(annotationWindow.filename, noteData.id, noteData.marker);
            return noteData;
        }
    }
    return null;
};
annotationSystem.prototype.findAnnotationsUnderPointer = function(pointerX, pointerY){
    var data = {
        window: null,
        onButton:false
    };

    for (var appId in this.annotationWindows){
        if (this.annotationWindows.hasOwnProperty(appId)){
            var noteWindow = this.annotationWindows[appId];
            if (noteWindow.show){
                if (pointerX >= noteWindow.left && pointerX <= noteWindow.left + noteWindow.width && pointerY >= noteWindow.top && pointerY <= noteWindow.top + noteWindow.height){
                    data.window = noteWindow;
                    data.onButton = false;
                    return data;
                }
            }
            if(pointerX >= noteWindow.button.left && pointerX <= noteWindow.button.left + noteWindow.button.width && pointerY >= noteWindow.button.top && pointerY <= noteWindow.button.top + noteWindow.button.height){
                data.window = noteWindow;
                data.onButton = true;
                return data;
            }

        }
    }
    return data;
}


module.exports = annotationSystem;
