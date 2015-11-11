// Copyright 2012 Luc Renambot, University of Illinois at Chicago.
//    All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Contact: Luc Renambot - renambot@gmail.com


//AppView class: Our main app view.
Views = {};

Views.AppView = Backbone.View.extend({    

  //el: $('body'), // attaches `this.el` to an existing element.

  events: {
    'click    .sabijs':  'pressed',
    'expand   .sabijs':  'expanded',
    'collapse .sabijs':  'collapsed',
    'change   .sabijs':  'changed',
    'expand   .nothing':  'nothing'   // stop propagating events this hierarchy
  },

  //initialize(): Automatically called upon instantiation. Where you make all types of bindings, excluding UI events, such as clicks
  initialize: function(){
	 // fixes loss of context for 'this' within methods
    _.bindAll(this,  'nothing',  'load', 'sendCall', 'modelUpdate', 'sendOSC', 'sendSerialPort', 'sendMacro',
                    'pressed', 'expanded', 'changed', 'head_tracker','head_tracker_stop', 'collapsed');

    this.model.bind('change', this.modelUpdate);
    this.render();
  },

  load: function(filename) {
    // Get the configuration file from the web server
    // var	objXml = new XMLHttpRequest();
    // console.log('Trying to load file: ', filename);
    // objXml.open("GET",filename,false);
    // objXml.send(null);
    // var data = objXml.responseText;

    // // Parse the JSON file got from the server
    // this.cfg = JSON.parse(data);

    var objXml = new XMLHttpRequest();
    console.log('Trying to load file: ', filename);
    var _this = this;
    objXml.open("GET",filename, true);
    objXml.onload = function() {
      var data = objXml.response;
      // Parse the JSON file got from the server
      _this.cfg = JSON.parse(data);
    };
    objXml.send(null);
  },

  sendCall: function (namefunc, param) {
    console.log('Send Call: ', namefunc, param);
    socket.emit('RPC', {method: namefunc, value: param});
    socket.once('return', function (data) {
      console.log("status: ", data);
    });
  },

  sendEdit: function (namefunc, param) {
    console.log('Send edit: ', namefunc, param);
    socket.emit('EDITOR', {method: namefunc, action: param[0], value: param[1]});
    socket.once('return', function (data) {
      console.log("status: ", data);
    });
  },

  sendSerialPort: function (omessage, baud, port) {
    console.log('Send serial port command: ', omessage, baud, port);
    socket.emit('SERIALPORT', {message: omessage, baud: baud, port:port});
    socket.once('return', function (data) {
      console.log("status: ", data);
    });
  },

  sendMacro: function (omessage) {
    console.log('Send Macro: ', omessage);
    socket.emit('Macro', omessage);
    socket.once('return', function (data) {
      console.log("status: ", data);
    });
  },

  sendOSC: function (omessage, oserver, params) {
    console.log('Send Call: ', omessage, oserver, params);
    if (params)
      socket.emit('OSC', {message: omessage, server: oserver, parameters: params});
    else
      socket.emit('OSC', {message: omessage, server: oserver});
    socket.once('return', function (data) {
      console.log("status: ", data);
    });
  },

  sendCallandProcess: function (namefunc, param) {
    console.log('sendCallandProcess: ', namefunc, param);
    socket.emit('RPC', {method: namefunc, value: param});
    socket.once('return', function (data) {
      //console.log("status callandprocess: ", data.status);
      // Get the pertinent div
      var func = param[0];
      var elt = $("div#" + func + " div[data-role='fieldcontain']");
      // Clear the previous entry
      elt.empty();
      // Collect the lines into content
      var lines = data.stdout.split("\n");
      var count = 0;
      var content = '<div data-role=collapsible-set data-theme="a" data-content-theme="c" data-mini="true" data-collapsed-icon="arrow-r" data-expanded-icon="arrow-d">';
      for (var i=0; i<lines.length; i++) {
        if (lines[i].match('^### ')) {  // outputs from tentakel
          var name = lines[i].substring(4,lines[i].length-1);
          var id = func + '-' + name;
          var role = ' class=nothing  data-role=collapsible ';
          if (i!==0)
            content += '</dl></div>';
          if (i===0)
            content +=  '<div id=' + id + role + 'data-collapsed=false>';
          else
            content +=  '<div id=' + id + role + 'data-collapsed=true>';
          content += '<h3>'+name+'</h3> <dl>';
          count += 1;
        }
        else {
        if (lines[i] !== "\n") {
          if (lines[i].match('^   '))
            content += '<dd>' + lines[i] + '</dd>' ;
          else
           content += '<dt>' + lines[i] + '</dt>' ;
          }
        }
      }
      content += '</dl></div>';
      content += '</div>';
      // Add the new content
      elt.append("<fieldset data-role='controlgroup'>" + content + "</fieldset>");
      // Tigger an event to create the jqm look
      elt.trigger('create');
    });
  },

  nothing: function(event) {
  	// stop propagating events this hierarchy
  	return false;
  },

  // Main function triggered by sliders
  changed: function(e) {
    var clickedElement = $(e.currentTarget);
    var id = clickedElement.attr("id");
    var val = clickedElement.val();
    console.log("Slider: ", id, val);
    var actions = this.cfg.actions;
    for (var act in actions) {
      if (act == id) {
        if ( actions[act].oscmessage ) {
            // the action is an OSC message
            //this.sendOSC(actions[act].oscmessage, actions[act].server, [val/100.0]); // percentage value
            this.sendOSC(actions[act].oscmessage, actions[act].server, [val]); // range is specified in slider definition
        }
      }
    }
  },

  // Main function triggered by buttons
  pressed: function(e) {
    var clickedElement = $(e.currentTarget);
    var id = clickedElement.attr("id");
    // console.log("Pressed: ", id);

    var actions = this.cfg.actions;
    var macros  = this.cfg.macros;

    // Is it a macro ?
    if (macros && id in macros) {
    	console.log("Found macro:",id);
    	this.sendMacro(id);
    }
    // Is it an action ?
    if (actions && id in actions) {
      // if the id is an action
      var act = id;
      if ( actions[act].oscmessage ) {
          // the action is an OSC message
          if (actions[act].parameters)
            this.sendOSC(actions[act].oscmessage, actions[act].server, [ actions[act].parameters ] );
          else
            this.sendOSC(actions[act].oscmessage, actions[act].server);
      }
      else if ( actions[act].serial ) {
        // the action is a serial-port message
        if (actions[act].server) {
      		var url = 'http://' + actions[act].server;
      		var remotesocket = io.connect( url );
      		console.log("Connected to server: " + url);
      		remotesocket.emit('SERIALPORT', {message: actions[act].serial, baud: actions[act].baud, port:actions[act].port});
      		remotesocket.once('return', function (data) {
      		console.log("remote status: ", data);
      		});
        }
        else {
		      this.sendSerialPort(actions[act].serial, actions[act].baud, actions[act].port);
	     }
    }
    else if ( actions[act].command ) {
        // the action is a command (as opposed to a script)
        console.log("Command", actions[act].command);
        this.sendCall('command', [act, actions[act].command]);
    }
    else if ( actions[act].editor ) {
        // the action is to edit a file
        console.log("Editor", actions[act].editor);
        this.sendEdit('editor', [act, actions[act].editor]);
    }
    else if ( actions[act].openurl ) {
        // the action is to open a webpage
        console.log("OpenURL", actions[act].openurl);
        window.open(actions[act].openurl, "_parent");
    }
    else {
        // The action is a script on a machine (remote or local)
        // if it's on a different server
        if (actions[act].server) {
          var url = 'http://' + actions[act].server;
          var remotesocket = io.connect( url );
          console.log("Connected to server: " + url);
          remotesocket.emit('RPC', {method: 'action', value: [act, actions[act].script]});
          remotesocket.once('return', function (data) {
          console.log("remote status: ", data);
          });
        }
        else {
          //console.log("Should trigger:", actions[act].script);
          if (actions[act].return == "process")
            this.sendCallandProcess('action', [act, actions[act].script]);
          else
            this.sendCall('action', [act, actions[act].script]);
        }
      }
    }
  },

  // Main function triggered by buttons
  expanded: function(e) {
    var clickedElement = $(e.currentTarget);
    var id = clickedElement.attr("id");
    console.log("Expanded: ", id);
    if (id == "head") {
      this.head_tracker(e);
    } else {
      var actions = this.cfg.actions;
      for (var act in actions) {
        if (act == id) {
          console.log("Should trigger:", actions[act].script);
          if (actions[act].return === "process")
            this.sendCallandProcess('action', [act, actions[act].script]);
          else
            this.sendCall('action', [act, actions[act].script]);
        }
      }
    }
  },

  // Main function triggered by buttons
  collapsed: function(e) {
    var clickedElement = $(e.currentTarget);
    var id = clickedElement.attr("id");
    console.log("collapsed: ", id);
    if (id == "head") {
      this.head_tracker_stop(e);
    } else {
    }
  },

head_tracker: function(event) {
  var namefunc = 'head_tracker';
  console.log(namefunc);
  $("div#wand").trigger('expand');
  $("div#wand2").trigger('expand');
  socket.emit('RPC', {method: namefunc});
  socket.on('return', function (data) {
    // Collect the lines into content
    var lines = data.stdout.split("\n");
    // Add the new content
    var content = '';
    for (var i=0; i<lines.length; i++) {
      content += lines[i] + '<br>';
    }
    // Get the pertinent div
    var elt;
    if (data.source == "head")
      elt = $("div#head div[data-role='fieldcontain']");
    else if (data.source == "wand")
      elt = $("div#wand div[data-role='fieldcontain']");
    else
      elt = $("div#wand2 div[data-role='fieldcontain']");
    // Clear the previous entry
    elt.empty();
    elt.append("<fieldset data-role='controlgroup'>" + content + "</fieldset>");
    // Tigger an event to create the jqm look
    elt.trigger('create');
  });
},

  head_tracker_stop: function(event) {
    var namefunc = 'head_tracker_stop';
    console.log(namefunc);
    socket.emit('RPC', {method: namefunc});
    $("#wand").trigger('collapse');
    $("#wand2").trigger('collapse');
  },

  modelUpdate: function() {
        console.log("Model update");
  },

  //render(): Function in charge of rendering the entire view in this.el. Needs to be manually called by the user.
  render: function(){
        console.log("Render appview");
 },

}); // End of AppView

