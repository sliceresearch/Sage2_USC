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

function registryManager() {
    this.type2app = {};
    this.app2type = {};
    this.registryFile = "fileRegistry.json";
    this.nativeAppsFile = "nativeApps.json";
    this.jsonFile = {}


    console.log("Registry> Initializing registry!");

    if (fs.existsSync(this.registryFile)) {
        console.log("Registry> Registry file found. Reading file...");
        this.readRegistryFile();
    } else {
        console.log("Registry> Registry file " + this.registryFile + " not found. Building registry...");
        this.jsonFile.registry = [];
    }
    this.syncRegistry();
    if (!fs.existsSync(this.registryFile)) {
        console.log("Registry> Registry synced, writing file.");
        this.writeRegistry();
    }

}

registryManager.prototype.readRegistryFile = function() {
    var jsonString = fs.readFileSync(this.registryFile, 'utf8');
    this.jsonFile = json5.parse(jsonString);

    if (this.jsonFile.registry !== undefined &&
        this.jsonFile.registry !== null &&
        Array.isArray(this.jsonFile.registry) ) {

        for(var i=0; i<this.jsonFile.registry.length; i++) {
            var defApp =  this.jsonFile.registry[i];
            this.type2app[defApp.type] = defApp.default;
            console.log("Registry> In registry: " + defApp.type + " with " + defApp.default);
        }
    }

}

registryManager.prototype.syncRegistry = function() {
    this.syncNativeApps();
}

registryManager.prototype.syncNativeApps = function() {
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

                this.register(app.name, app.types);
            }
        }
    }
}

registryManager.prototype.register = function(name, types) {
    for(var i=0; i<types.length; i++) {
        var found = false;
        for(var j=0; j<this.jsonFile.registry.length; j++) {
            var regEntry = this.jsonFile.registry[j];
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
            this.jsonFile.registry.push(newApp);
        }
    }
}

registryManager.prototype.writeRegistry = function() {
    try {
        fs.writeFileSync(this.registryFile, JSON.stringify(this.jsonFile, null));
    }
    catch (err) {
        console.log("Registry> Unable to write registry file", err);
    }
}

registryManager.prototype.getApp = function(type) {
    return this.type2app[type];
}

registryManager.prototype.setApp = function(type) {

}

registryManager.prototype.setDefaultApplication = function(app, type) {
    this.type2app[type] = app;

}

module.exports = registryManager;
