// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

"use strict";

var ParaSAGE = SAGE2_App.extend( {
    init: function(data) {
        // data: contains initialization parameters, such as `x`, `y`, `width`, `height`, and `date`
        this.SAGE2Init("div", data);
        this.element.id = "div" + data.id;
        this.resizeEvents = "continous";
        this.passSAGE2PointerAsMouseEvents = true;

        // Custom app variables initialization
        this.element.style.background = "white"; // white washes the app.
        // Info div for a larget notification zone
        this.infoDiv = document.createElement('div');
        this.infoDiv.style.width     = "100%";
        this.infoDiv.style.height    = "100%";
        this.infoDiv.style.position  = "absolute";
        this.infoDiv.style.left      = "0px";
        this.infoDiv.style.top       = "0px";
        this.infoDiv.style.fontSize  = ui.titleTextSize;
        this.infoDiv.textContent     = "App performing initialization...";
        this.element.appendChild(this.infoDiv);
        // Image from ParaViewWeb
        this.imageFromPvw = document.createElement('img');
        this.imageFromPvw.style.width  = "100%";
        this.imageFromPvw.style.height = "100%";
        this.element.appendChild(this.imageFromPvw);
        // Current implementation will ignore the canvas, since that will require additional time to draw.
        this.isConnected = false;
        this.setupPvwConnection();
        this.setupImageEventListerers();
        this.updateTitle("ParaView [Not connected]");
        this.openWebSocketToPvwServer();
    },

    setupPvwConnection: function() {
        this.availableDataSetsOnServer = [];
        this.activePipeLines = [];
        this.pvwConfig   = {
            application: "visualizer",
            sessionURL:  "ws://10.232.6.218:8080/ws",
            secret:      "vtkweb-secret" // because for some reason it is always this value. note: unsure what happens if this changes.
        };
        this.logInformation = {
            imageRoundTrip:        -1,
            imageServerProcessing: -1
        };
        this.lastMTime     = 0;
        this.renderOptions = {
            session: null,
            view: -1,
            enableInteractions: true,
            renderer: "image",
            interactiveQuality: 30,
            stillQuality: 100,
            currentQuality: 100,
            vcrPlayStatus: false
        };
        this.button_state = {
            action_pending: false,
            left:    false,
            right:   false,
            middle : false,
            rmbScrollTracker: 0
        };
    },

    openWebSocketToPvwServer: function() {
        var selfReference = this;
        if (selfReference.pvwConfig.sessionURL.indexOf("ws") < 0) {
            selfReference.updateTitle("ParaView [Invalid sessionURL:" + selfReference.pvwConfig.sessionURL + "]");
            return;
        }
        selfReference.updateTitle("ParaView [Connecting to:" + selfReference.pvwConfig.sessionURL + "...]");
        selfReference.infoDiv.textContent = "Connecting to " + selfReference.pvwConfig.sessionURL + "...";
        var transports = [{
            type: "websocket",
            url: selfReference.pvwConfig.sessionURL
        }];
        // create the autobahn connection.
        selfReference.pvwConfig.connection = new autobahn.Connection({
            transports: transports,
            realm: "vtkweb",
            authmethods: ["wampcra"],
            authid: "vtkweb",
            max_retries: 3,
            onchallenge: function(session, method, extra) {
                if (method === "wampcra") {
                    var secretKey = autobahn.auth_cra.derive_key(selfReference.pvwConfig.secret, "salt123");
                    return autobahn.auth_cra.sign(secretKey, extra.challenge);
                } else {
                    selfReference.updateTitle("ParaView [Connection refused, challenge failed]");
                    throw "don't know how to authenticate using:" + method;
                }
            }
        });
        // setup what to do after connection open.
        selfReference.pvwConfig.connection.onopen = function(session, details) {
            try {
                selfReference.updateTitle("ParaView [CONNECTED to:" + selfReference.pvwConfig.sessionURL + "]");
                selfReference.pvwConfig.session = session;
                selfReference.afterConnection();
                selfReference.isConnected = true;
                selfReference.infoDiv.textContent = "";
                selfReference.infoDiv.style.width = "0%";
                selfReference.infoDiv.style.height = "0%";
            } catch(e) { console.log("Error on opening connection."); console.log(e); }
        }
        // setup what to do on connection close.
        selfReference.pvwConfig.connection.onclose = function() {
            selfReference.updateTitle("ParaView [DISCONNECTED from:" + selfReference.pvwConfig.sessionURL + "]");
            selfReference.isConnected = false;
            selfReference.imageFromPvw.src = "";
            selfReference.infoDiv.textContent = "DISCONNECTED from:" + selfReference.pvwConfig.sessionURL;
            selfReference.infoDiv.style.width = "100%";
            selfReference.infoDiv.style.height = "100%";
            return false;
        }
        // attempt to open the connection
        selfReference.pvwConfig.connection.open();
    },

    afterConnection: function() {
        var selfReference = this;
        selfReference.pvwRender();
        selfReference.getAvailableDataSetsOnServer();
    },

    /*
    Response to file.server.directory.list will be an object:
    {
        dirs    []
        files   [] <- files in the requested directory.
            each entry is an object with property "label" containing the name of the file.
        groups  []
        label   []
        path    []
    }
    */
    getAvailableDataSetsOnServer: function() {
        var selfReference = this;
        selfReference.pvwConfig.session.call("file.server.directory.list", ["."])
        .then(function(reply) {
            selfReference.availableDataSetsOnServer = [];
            for (var i = 0; i < reply.files.length; i++) {
                selfReference.availableDataSetsOnServer.push(reply.files[i].label);
            }
            selfReference.getFullContextMenuAndUpdate();
        });
    },

    // Keep this as a just in case
    pvwRequestDataSetCan: function() {
        var selfReference = this;
        var fullpathFileList = ["can.ex2"];
        selfReference.pvwConfig.session.call("pv.proxy.manager.create.reader", fullpathFileList)
        .then(function(response) {
            selfReference.pvwRender();
        });
    },

    pvwRender: function(fetch = true) {
        var selfReference = this;
        var renderCfg = {
            size: [parseInt(selfReference.sage2_width), parseInt(selfReference.sage2_height)],
            view: Number(selfReference.renderOptions.view),
            mtime: fetch ? 0 : selfReference.lastMTime,
            quality: selfReference.renderOptions.currentQuality, // Might replace later with selfReference.renderOptions.vcrPlayStatus ? selfReference.renderOptions.interactiveQuality : selfReference.renderOptions.stillQuality
            localTime: new Date().getTime()
        };
        selfReference.pvwConfig.session.call("viewport.image.render", [renderCfg])
        .then(function(response){
            selfReference.renderOptions.view = Number(response.global_id);
            selfReference.lastMTime = response.mtime;
            if (response.hasOwnProperty("image") & response.image !== null) {
                selfReference.imageFromPvw.width = response.size[0];
                selfReference.imageFromPvw.height = response.size[1];
                selfReference.imageFromPvw.src = "data:image/" + response.format + "," + response.image;

                selfReference.logInformation.imageRoundTrip = Number(new Date().getTime() - response.localTime) - response.workTime;
                selfReference.logInformation.imageServerProcessing = Number(response.workTime);
            }
            // If server still doing renders need to grab next frame
            if (response.stale === true) { setTimeout( function() { selfReference.pvwRender(); } , 0); }
        });
    },

    pvwVcrPlay: function() {
        this.renderOptions.vcrPlayStatus = true;
        this.getFullContextMenuAndUpdate(); // Check inside to swap Play / Pause
        this.pvwRunAnimationLoop();
    },

    pvwVcrStop: function() {
        var selfReference = this;
        selfReference.renderOptions.vcrPlayStatus = false;
        selfReference.getFullContextMenuAndUpdate(); // Check inside to swap Play / Pause
        selfReference.renderOptions.currentQuality = selfReference.renderOptions.stillQuality;
        setTimeout( function() { selfReference.pvwRender(); } , 50);
    },

    pvwRunAnimationLoop: function() {
        var selfReference = this;
        if (selfReference.renderOptions.vcrPlayStatus) {
            selfReference.pvwConfig.session.call("pv.vcr.action", ["next"])
            .then(function(timeValue) {
                selfReference.renderOptions.currentQuality = selfReference.renderOptions.interactiveQuality;
                selfReference.pvwRender();
                setTimeout( function() { selfReference.pvwRunAnimationLoop(); } , 50); // ms where 50 is 1/20 second
            })
        }
    },

    setupImageEventListerers: function() {
        var selfReference = this;
        this.imageFromPvw.addEventListener("click",      function(e) { selfReference.imageEventHandler(e); });
        this.imageFromPvw.addEventListener("mousemove",  function(e) { selfReference.imageEventHandler(e); });
        this.imageFromPvw.addEventListener("mousedown",  function(e) { selfReference.imageEventHandler(e); });
        this.imageFromPvw.addEventListener("mouseup",    function(e) { selfReference.imageEventHandler(e); });
        this.imageFromPvw.addEventListener("mouseenter", function(e) { selfReference.imageEventHandler(e); });
        this.imageFromPvw.addEventListener("mouseleave", function(e) { selfReference.imageEventHandler(e); });
        this.imageFromPvw.addEventListener("mouseout",   function(e) { selfReference.imageEventHandler(e); });
        this.imageFromPvw.addEventListener("mouseover",  function(e) { selfReference.imageEventHandler(e); });
        this.imageFromPvw.addEventListener("wheel",      function(e) { selfReference.imageEventHandler(e); });
    },

    imageEventHandler: function(evt) {
        // Old debug
        // this.updateTitle( "Event(" + evt.type + ") pos(" + evt.x + "," + evt.y + ") move " + evt.movementX + "," + evt.movementY);

        // Update quality based on the type of the event
        if (evt.type === 'mouseup' || evt.type === 'dblclick' || evt.type === 'wheel') {
            this.renderOptions.currentQuality = this.renderOptions.stillQuality;
        } else {
            this.renderOptions.currentQuality = this.renderOptions.interactiveQuality;
        }

        var buttonLeft;
        if (evt.type === "mousedown" && evt.button === 0) {
            buttonLeft = true;
        } else if (evt.type === "mouseup" && evt.button === 0) {
            buttonLeft = false;
        } else { buttonLeft = this.button_state.left; }
        var buttonMiddle;
        if (evt.type === "mousedown" && evt.button === 1) {
            buttonMiddle = true;
        } else if (evt.type === "mouseup" && evt.button === 1) {
            buttonMiddle = false;
        } else { buttonMiddle = this.button_state.middle; }
        var buttonRight;
        if (evt.type === "mousedown" && evt.button === 2) {
            buttonRight = true;
        } else if (evt.type === "mouseup" && evt.button === 2) {
            buttonRight = false;
        } else { buttonRight = this.button_state.right; }

        var vtkWeb_event = {
            view:     Number(this.renderOptions.view),
            action:   evt.type,
            charCode: evt.charCode,
            altKey:   evt.altKey,
            ctrlKey:  evt.ctrlKey,
            shiftKey: evt.shiftKey,
            metaKey:  evt.metaKey,
            buttonLeft:   buttonLeft, // Potentially problematic because default value of button is 0. For example mousemove.
            buttonMiddle: buttonMiddle,
            buttonRight:  buttonRight
        };
        
        // Force wheel events into right click drag. For some reason scroll packet doesn't work.
        if (evt.type === 'wheel') {
            vtkWeb_event.action = "mousemove";
            vtkWeb_event.buttonLeft = false;
            vtkWeb_event.buttonRight = true;
            vtkWeb_event.buttonMiddle = false;
            vtkWeb_event.x = 0;
            vtkWeb_event.y = evt.deltaY / 100 + this.button_state.rmbScrollTracker;
            this.button_state.rmbScrollTracker = vtkWeb_event.y;
        } else { // The x and y should be given relative to app position when using SAGE2MEP.
            vtkWeb_event.x = evt.x / this.imageFromPvw.width;
            vtkWeb_event.y = 1.0 - (evt.y / this.imageFromPvw.height);
            if (vtkWeb_event.buttonRight) { this.button_state.rmbScrollTracker = vtkWeb_event.y; }
        }
        if (evt.type !== "wheel" && this.eatMouseEvent(vtkWeb_event)) {
            return;
        }
        this.button_state.action_pending = true;
        var selfReference = this;
        selfReference.pvwConfig.session.call("viewport.mouse.interaction", [vtkWeb_event]).then(function (res) {
            if (res) {
                selfReference.button_state.action_pending = false;
                selfReference.pvwRender();
            }
        }, function(error) {
            console.log("Call to viewport.mouse.interaction failed");
            console.log(error);
        });
    },

    eatMouseEvent: function(event) {
        var force_event = (this.button_state.left !== event.buttonLeft
            || this.button_state.right  !== event.buttonRight
            || this.button_state.middle !== event.buttonMiddle);
        if (!force_event && !event.buttonLeft && !event.buttonRight && !event.buttonMiddle && !event.wheel) {
            return true;
        }
        if (!force_event && this.button_state.action_pending) {
            return true;
        }
        this.button_state.left   = event.buttonLeft;
        this.button_state.right  = event.buttonRight;
        this.button_state.middle = event.buttonMiddle;
        return false;
    },

    pvwRequestProxyManagerList: function (response) {
        var selfReference = this;
        selfReference.pvwConfig.session.call("pv.proxy.manager.list", [])
        .then(function(data) {
            /*
            Data is
                 {
                    [
                        {
                            id: string number
                            name: "filename"
                            parent: ??? dunno ???
                            rep: string number
                            visible: string 1 or 0. 
                        }
                        {}
                        ...
                    ]
                    view: ""
                 }
            */
            // This can be more efficient if, it prevented context update on no change.
            // The load data could be more efficient, if it prevented multiple requests (isMaster) and prevent double loads (alreayd loaded).
            var alreadyKnownPipeline = false;
            for (var responseIndex = 0; responseIndex < data.sources.length; responseIndex++) {
                alreadyKnownPipeline = false;
                for (var knownPipesIndex = 0; knownPipesIndex < selfReference.activePipeLines.length; knownPipesIndex++) {
                    if (selfReference.activePipeLines[knownPipesIndex].filename === data.sources[responseIndex].name) {
                        alreadyKnownPipeline = true;
                        if (selfReference.activePipeLines[knownPipesIndex].repNumbers.indexOf(data.sources[responseIndex].rep) === -1) {
                            selfReference.activePipeLines[knownPipesIndex].repNumbers.push(data.sources[responseIndex].rep);
                        }
                        break; // breaks out of checking known pipelines, goes onto next response value.
                    }
                }
                if (!alreadyKnownPipeline) {
                    selfReference.activePipeLines.push({
                        filename: data.sources[responseIndex].name,
                        repNumbers: [data.sources[responseIndex].rep],
                        visible: data.sources[responseIndex].visible
                    });
                }
            }
            selfReference.getFullContextMenuAndUpdate();
        }, function(err){
            console.log('pipeline error');
            console.log(err);
        });
    },


    /*
    Context menu callbacks defined *mostly* below.
    */
    getContextEntries: function() {
        var entries = [];
        var entry;

        entry = {};
        entry.description = "New width:";
        entry.callback = "setWidth";
        entry.parameters     = {};
        entry.inputField     = true;
        entry.inputFieldSize = 6;
        entries.push(entry);

        entry = {};
        entry.description = "New height:";
        entry.callback = "setHeight";
        entry.parameters     = {};
        entry.inputField     = true;
        entry.inputFieldSize = 6;
        entries.push(entry);

        entry = {};
        entry.description = "Connect to new session URL:";
        entry.callback = "setSessionURL";
        entry.parameters     = {};
        entry.inputField     = true;
        entry.inputFieldSize = 20;
        entries.push(entry);

        entry = {};
        entry.description = "Restart WebSocket connection";
        entry.callback    = "openWebSocketToPvwServer";
        entry.parameters  = {};
        entries.push(entry);

        entry = {};
        entry.description = "Refresh render view";
        entry.callback    = "pvwRender";
        entry.parameters  = {};
        entries.push(entry);

        // Switch out the play / pause option.
        if (this.renderOptions.vcrPlayStatus) {
            entry = {};
            entry.description = "Pause";
            entry.callback    = "pvwVcrStop";
            entry.parameters  = {};
            entries.push(entry);
        }
        else {
            entry = {};
            entry.description = "Play";
            entry.callback    = "pvwVcrPlay";
            entry.parameters  = {};
            entries.push(entry);
        }

        entry = {};
        entry.description = "What does manager list do?";
        entry.callback    = "pvwRequestProxyManagerList";
        entry.parameters  = {};
        entries.push(entry);

        for (var i = 0; i < this.activePipeLines.length; i++) {
            entry = {};
            entry.description = "Toggle visibility of " + this.activePipeLines[i].filename;
            entry.callback    = "pvwToggleVisibilityOfData";
            entry.parameters  = {
                index: i
            };
            entries.push(entry);
        }

        entry = {};
        entry.description = "Backup data request Can";
        entry.callback    = "pvwRequestDataSetCan";
        entry.parameters  = {};
        entries.push(entry);

        for (var i = 0; i < this.availableDataSetsOnServer.length; i++) {
            entry = {};
            entry.description = "Load dataset:" + this.availableDataSetsOnServer[i];
            entry.callback    = "pvwRequestDataSet";
            entry.parameters  = {
                filename: ("" + this.availableDataSetsOnServer[i])
            };
            entries.push(entry);
        }

        return entries;
    },

    // receive an from the webui use .clientInput for what they typed
    setWidth: function(response) { this.sendResize(parseInt(response.clientInput), this.sage2_height); },

    // receive an from the webui use .clientInput for what they typed
    setHeight: function(response) { this.sendResize(this.sage2_width, parseInt(response.clientInput)); },

    setSessionURL: function(response) { this.pvwConfig.sessionURL = response.clientInput;  },


    pvwRequestDataSet: function(responseObject) {
        var selfReference = this;
        var fullpathFileList = [("" + responseObject.filename)];
        selfReference.pvwConfig.session.call("pv.proxy.manager.create.reader", fullpathFileList)
        .then(function(response) {
            selfReference.pvwRender();
            // After reading in a date set, ask the server what the id is.
            // NOTE: currently each connection will makes a request for data, meaning x Displays amount of rendered datasets.
            selfReference.pvwRequestProxyManagerList();
        });
    },

    pvwToggleVisibilityOfData: function (responseObject) {
        var selfReference = this;
        var index = responseObject.index;
        var dataToSend = [];
        selfReference.activePipeLines[index].visible = selfReference.activePipeLines[index].visible ? 0 : 1; // switch 1 and 0. Works because 0 is false, non-zero is true

        for (var i = 0; i < selfReference.activePipeLines[index].repNumbers.length; i++) {
            dataToSend.push({
                id: selfReference.activePipeLines[index].repNumbers[i],
                name: "Visibility",
                value: selfReference.activePipeLines[index].visible
            });
        }

        selfReference.pvwConfig.session.call("pv.proxy.manager.update", [dataToSend])
        .then(function() {
            selfReference.pvwRender(); // update the view
        }, function(err) {
            console.log('pipeline update error');
            console.log(err);
        });
    },

    event: function(type, position, user, data, date) { },

    //load function allows application to begin with a particular state.  Needed for remote site collaboration.
    load: function(date) { },

    move: function(date) { },

    // image style should handle this...
    resize: function(date) { },

    // not really used since the image will be based upon data from paraview
    draw: function(date) { },

    quit: function() { }
});






















