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

function registryManager() {
    this.registryFile = "fileRegistry.json";
    this.nativeAppsFile = "nativeApps.json";
    this.mimeFile = "custom.types";
}

registryManager.prototype.initialize = function(assetsFolder) {
    this.assetsFolder = assetsFolder;
    console.log("Registry> Initializing registry!");

    if (!fs.existsSync(path.join(assetsFolder, this.registryFile))) {
        fs.writeFileSync(path.join(assetsFolder, this.registryFile), "{}");
    }

    this.db = new jsonDB(path.join(assetsFolder, this.registryFile), true, true);

    // Check if custom.type exists
    if (fs.existsSync(path.join(assetsFolder, this.mimeFile))) {
        mime.load(path.join(assetsFolder, this.mimeFile));
    }

    this.scanNativeApps();

}

registryManager.prototype.mimeRegister = function(fileType) {
    var type = mime.lookup(fileType);

    // XXX -What happens when multiple fileTypes?
    console.log("Found: " + type + " with fileType: " + fileType);
    if (type === undefined || type === null || type === 'application/custom') {
        var map = {};
        map['application/' + fileType] = [ fileType ];
        mime.define(map);
        fs.appendFileSync(this.mimeFile, 'application/' + fileType + ' ' + fileType + '\n');

        type = mime.lookup(fileType);
    }
    console.log("Registered as: " + type);
    return type;
}

registryManager.prototype.scanNativeApps = function() {
    var jsonString = fs.readFileSync(this.nativeAppsFile, 'utf8');
    var nativeApps = json5.parse(jsonString);

    if (nativeApps.applications !== undefined &&
        nativeApps.applications !== null &&
        Array.isArray(nativeApps.applications) ) {

        for(var i=0; i<nativeApps.applications.length; i++) {
            var app = nativeApps.applications[i];
            if (app.name !== undefined && app.name !== null && app.name !== "" &&
                app.types !== undefined && app.types !== null && Array.isArray(app.types) ) {
                this.register(app.name, app.types);
            }
        }
    }
}

registryManager.prototype.register = function(name, types) {
    for(var i=0; i<types.length; i++) {

        var type = '/' + this.mimeRegister(types[i]);

        var newApp = {};
        newApp.applications = [ name ];

        try {
            this.db.push(type, newApp, false);
        } catch(error) {
            console.error(error);
        }

        try {
            this.db.getData(type + '/default');
        } catch(error) {
            this.db.push(type + '/default', name);
        }
    }
}

registryManager.prototype.getDefaultApp = function(file) {
    var defaultApp = "";
    var type = '/' + mime.lookup(file);
    try {
        defaultApp = this.db.getData(type + '/default');
    } catch(error) {
        console.error("No default app for " + file);
    }
    return defaultApp;
}

registryManager.prototype.setDefaultApplication = function(app, type) {
    this.type2app[type] = app;
}

module.exports = new registryManager();
