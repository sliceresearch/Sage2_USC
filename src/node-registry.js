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

function registryManager() {
    this.type2app = {};
    this.type2dir = {};
    this.registryFile = "fileRegistry.json";
    this.nativeAppsFile = "nativeApps.json";
    this.mimeFile = "custom.types";
    this.registryMap = {}


    console.log("Registry> Initializing registry!");

    // Check if custom.type exists
    if (fs.existsSync(this.mimeFile)) {
        mime.load(this.mimeFile);
    }


    // Check if registry file exists
    if (fs.existsSync(this.registryFile)) {
        console.log("Registry> Registry file found. Reading file...");
        this.readRegistryFile();
    } else {
        console.log("Registry> Registry file " + this.registryFile + " not found. Building registry...");
        this.registryMap.registry = [];
    }

    /**
    * Sync the registry.
    * If registry is empty, create it and write the file.
    * If registry is not empty, scan for changes and update.
    * **/
    this.scanNativeApps();
    if (!fs.existsSync(this.registryFile)) {
        console.log("Registry> Registry synced, writing file.");
        this.writeRegistry();
    }

}

registryManager.prototype.readRegistryFile = function() {
    var jsonString = fs.readFileSync(this.registryFile, 'utf8');
    this.registryMap = json5.parse(jsonString);

    if (this.registryMap.registry !== undefined &&
        this.registryMap.registry !== null &&
        Array.isArray(this.registryMap.registry) ) {

        for(var i=0; i<this.registryMap.registry.length; i++) {
            var defApp =  this.registryMap.registry[i];
            this.type2app[defApp.type] = defApp.default;
            if (defApp.directory !== null && defApp.directory !== undefined && defApp.directory !== "")
                this.type2dir[defApp.type] = defApp.directory;
            //this.mimeRegister(defApp.type);

            console.log("Registry> In registry: " + defApp.type + " with " + defApp.default);
        }
    }

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

                console.log("Registry> Syncing: [" + app.name + "] Supported FileTypes: " + app.types);

                this.registerMime(app.name, app.types);
            }
        }
    }
}

registryManager.prototype.register = function(name, types, directory) {
    for(var i=0; i<types.length; i++) {

        var type = this.mimeRegister(types[i]);

        var found = false;
        for(var j=0; j<this.registryMap.registry.length; j++) {
            var regEntry = this.registryMap.registry[j];
            if (regEntry.type === type) {
                regEntry.applications.push(name);
                if (directory !== null && directory !== undefined && directory !== "") {
                    this.type2dir[type] = directory;
                    regEntry.directory = directory;
                }
                var found = true;
            }
        }

        // This type is not in the registry, add a new app
        // and set as default
        if (!found) {
            console.log("Registry> Type " + type + " not in registry. Adding for app " + name);
            var newApp = {};
            newApp.type = type;
            newApp.applications = [ name ];
            if (directory !== null && directory !== undefined && directory !== "") {
                this.type2dir[type] = directory;
                newApp.directory = directory;
            }
            newApp.default = name;
            this.setDefaultApplication(name, type);
            this.registryMap.registry.push(newApp);
        }
    }
}

registryManager.prototype.registerMime = function(name, types) {
    for(var i=0; i<types.length; i++) {
        var found = false;
        for(var j=0; j<this.registryMap.registry.length; j++) {
            var regEntry = this.registryMap.registry[j];
            if (regEntry.type === types[i]) {
                regEntry.applications.push(name);
                var found = true;
            }
        }

        // This type is not in the registry, add a new app
        // and set as default
        if (!found) {
            console.log("Registry> Type " + types[i] + " not in registry. Adding for app " + name);
            var newApp = {};
            newApp.type = types[i];
            newApp.applications = [ name ];
            newApp.default = name;
            this.setDefaultApplication(name, types[i]);
            this.registryMap.registry.push(newApp);
        }
    }
}

registryManager.prototype.writeRegistry = function() {
    try {
        fs.writeFileSync(this.registryFile, JSON.stringify(this.registryMap, null));
    }
    catch (err) {
        console.log("Registry> Unable to write registry file", err);
    }
}

registryManager.prototype.setDefaultApplication = function(app, type) {
    this.type2app[type] = app;

}

module.exports = registryManager;
