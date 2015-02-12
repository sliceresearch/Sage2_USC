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
 * @module registry
 */

var fs          = require('fs');
var json5       = require('json5');
var path        = require('path');
var mime        = require('mime');
var jsonDB      = require('node-json-db');
var sageutils   = require('../src/node-utils');  // for fileExists function

function registryManager() {
    this.registryFile   = "fileRegistry.json";
    this.nativeAppsFile = path.join("config", "nativeApps.json");
    this.mimeFile       = path.join("config", "custom.types");
}

registryManager.prototype.initialize = function(assetsFolder) {
    this.assetsFolder = assetsFolder;

    var fullpath = path.join(assetsFolder, this.registryFile);

    console.log("Registry> Initializing registry", fullpath);

    if (!sageutils.fileExists(fullpath)) {
        fs.writeFileSync(fullpath, "{}");
    }

    // Create the database
	// The second argument is used to tell the DB to save after each push
	// The third argument is to ask JsonDB to save the database in an human readable format
    this.db = new jsonDB(fullpath, true, true);

    // Check if custom.type exists
    if (!sageutils.fileExists(this.mimeFile)) {
        fs.writeFileSync(this.mimeFile);
    }
    mime.load(path.join(this.mimeFile));

    this.scanNativeApps();
};

registryManager.prototype.mimeRegister = function(fileType) {
    var type = mime.lookup(fileType);

    if (type === undefined || type === null || type === 'application/custom') {
        var map = {};
        map['application/' + fileType] = [ fileType ];
        mime.define(map);
        fs.appendFileSync(this.mimeFile, 'application/' + fileType + ' ' + fileType + '\n');

        type = mime.lookup(fileType);
    }
    return type;
};

registryManager.prototype.scanNativeApps = function() {
    var jsonString = fs.readFileSync(this.nativeAppsFile, 'utf8');
    var nativeApps = json5.parse(jsonString);

    if (nativeApps.applications !== undefined &&
        nativeApps.applications !== null &&
        Array.isArray(nativeApps.applications) ) {

        for(var i=0; i<nativeApps.applications.length; i++) {
            var app = nativeApps.applications[i];
            if (app.name  !== undefined && app.name  !== null && app.name !== "" &&
                app.types !== undefined && app.types !== null && Array.isArray(app.types) ) {
                this.register(app.name, app.types, app.directory, true);
            }
        }
    }
};

registryManager.prototype.register = function(name, types, directory, mime) {
    var type;
    for(var i=0; i<types.length; i++) {
        
        if(mime) type = '/' + types[i];
        else type = '/' + this.mimeRegister(types[i]);

        var newApp = {};
        newApp.applications = [ name ];

        // Check if the entry exists
        try {
            var apps = this.db.getData(type + '/applications');
            if (apps.indexOf(name) < 0) {
                this.push(type, newApp, false);
            }
        } catch(error) {
            // Entry does not exist. Add it.
            this.push(type, newApp, false);
        }
        this.push(type + '/directory', directory, true);


        try {
            this.db.getData(type + '/default');
        } catch(error) {
            this.push(type + '/default', name, true);
        }
    }
};

registryManager.prototype.push = function(key, value, overwrite) {
    try {
        this.db.push(key, value, overwrite);
    } catch(error) {
        console.error(error);
    }

};

registryManager.prototype.getDefaultApp = function(file) {
    var defaultApp = "";
    var type = '/' + mime.lookup(file);
    try {
        defaultApp = this.db.getData(type + '/default');
    } catch(error) {
        console.error("No default app for " + file);
    }
    return defaultApp;
};

registryManager.prototype.getDefaultAppFromMime = function(type) {
    var defaultApp = "";
    try {
        defaultApp = this.db.getData('/' + type + '/default');
    } catch(error) {
        console.error("No default app for " + type);
    }
    return defaultApp;
};

registryManager.prototype.getDirectory = function(file) {
    var dir = "";
    var type = '/' + mime.lookup(file);
    try {
        dir = this.db.getData(type + '/directory');
    } catch(error) {
        console.error("No directory for " + file);
    }
    return dir;

};

registryManager.prototype.setDefaultApplication = function(app, type) {
};

module.exports = new registryManager();
