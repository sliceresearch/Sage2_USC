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
 * @module server
 * @submodule registry
 */

// require variables to be declared
"use strict";

var fs          = require('fs');
var path        = require('path');

var json5       = require('json5');
var JsonDB      = require('node-json-db');
var mime        = require('mime');

var sageutils   = require('../src/node-utils');  // for fileExists function


function RegistryManager() {
    this.registryFile   = "fileRegistry.json";
    this.nativeAppsFile = path.join("config", "nativeApps.json");
    this.mimeFile       = path.join("config", "custom.types");

    // Set the default mime type for SAGE to be a custom app
    mime.default_type   = "application/custom";
}

RegistryManager.prototype.initialize = function(assetsFolder) {
    this.assetsFolder = assetsFolder;

    var fullpath = path.join(assetsFolder, this.registryFile);

    console.log(sageutils.header("Registry") + "Initializing registry", fullpath);

    if (!sageutils.fileExists(fullpath)) {
        fs.writeFileSync(fullpath, "{}");
    }

    // Create the database
	// The second argument is used to tell the DB to save after each push
	// The third argument is to ask JsonDB to save the database in an human readable format
    this.db = new JsonDB(fullpath, true, true);

    // Check if custom.type exists
    if (!sageutils.fileExists(this.mimeFile)) {
        fs.writeFileSync(this.mimeFile, "");
    }
    mime.load(path.join(this.mimeFile));

    this.scanNativeApps();
};

RegistryManager.prototype.mimeRegister = function(fileType) {
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

RegistryManager.prototype.scanNativeApps = function() {
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

RegistryManager.prototype.register = function(name, types, directory, mimeType) {
    var type;
    for (var i=0; i<types.length; i++) {
        if (mimeType) type = '/' + types[i];
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

RegistryManager.prototype.push = function(key, value, overwrite) {
    try {
        this.db.push(key, value, overwrite);
    } catch(error) {
        console.error(error);
    }

};

RegistryManager.prototype.getDefaultApp = function(file) {
    var defaultApp = "";
    var type = '/' + mime.lookup(file);
    try {
        defaultApp = this.db.getData(type + '/default');
    } catch(error) {
        console.error("No default app for " + file);
    }
    return defaultApp;
};

RegistryManager.prototype.getDefaultAppFromMime = function(type) {
    var defaultApp = "";
    try {
        defaultApp = this.db.getData('/' + type + '/default');
    } catch(error) {
        console.error("No default app for " + type);
    }
    return defaultApp;
};

RegistryManager.prototype.getDirectory = function(file) {
    var dir = "";
    var type = '/' + mime.lookup(file);
    try {
        dir = this.db.getData(type + '/directory');
    } catch(error) {
        console.error("No directory for " + file);
    }
    return dir;

};

RegistryManager.prototype.setDefaultApplication = function(app, type) {
};

module.exports = new RegistryManager();
