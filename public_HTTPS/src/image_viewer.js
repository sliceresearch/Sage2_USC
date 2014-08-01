// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


var image_viewer = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);
		
		this.src   = null;
		this.panel = null;
		this.top   = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "img", width, height, resrc, date);
		
		// application specific 'init'
		this.state.src  = null;
		this.state.type = null;
		this.state.exif = null;
		
		this.top = 0;

		this.panel = document.createElement('pre');
		this.panel.style.backgroundColor  = "rgba(0,0,0,0.85)";
		this.panel.style.position = "absolute";
		this.panel.style.padding  = "0px";
		this.panel.style.margin   = "0px";
		this.panel.style.left     = "0px";
		this.panel.style.top      = "0px";
		this.panel.style.width    = "100%";
		this.panel.style.color    = "#FFFFFF";
		this.panel.style.display  = "none";
		this.panel.style.overflow = "visible";
		this.panel.style.zIndex   = parseInt(this.element.parentNode)+1;
		this.panel.style.fontSize = Math.round(ui.titleTextSize) + "px";

		this.element.parentNode.appendChild(this.panel);
	},
	
	load: function(state, date) {
		if (state.src !== undefined && state.src !== null) {
			this.element.src  = "data:" + state.type + ";base64," + state.src;
			this.state.src  = state.src;
			this.state.type = state.type;
			this.state.exif = state.exif;
			this.panel.innerHTML = this.syntaxHighlight(state.exif);
		}
	},
	
	draw: function(date) {
	},
	
	resize: function(date) {
		
	},

	// Parse JSON object and add colors
	syntaxHighlight: function(json) {
		if (typeof json != 'string') {
			json = JSON.stringify(json, undefined, 4);
		}
		json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
			var cls = 'color: darkorange;';
			if (/^"/.test(match)) {
				if (/:$/.test(match)) {
					cls = 'color: CadetBlue;';
				} else {
					cls = 'color: green;';
				}
			} else if (/true|false/.test(match)) {
				cls = 'color: blue;';
			} else if (/null/.test(match)) {
				cls = 'color: magenta;';
			}
			return '<span style="' + cls + '">' + match + '</span>';
		});
	},
	
	event: function(eventType, position, user_id, data, date) {
		// Press 'i' to display EXIF information
		if (eventType === "keyboard" && data.character==="i") {
			if (this.panel.style.display === "none") {
				this.top = 0;
				this.panel.style.top = "0px";
				this.panel.style.display = "block";
			}
			else {
				this.panel.style.display = "none";
			}
		}
		// Scroll events for zoom
		if (eventType === "pointerScroll") {
			var amount = data.scale;
			if (amount >= 1) {
				this.top -= ui.titleTextSize * amount;
				this.panel.style.top = this.top + "px";
			}
			else if (amount <= 1) {
				this.top += ui.titleTextSize * amount;
				if (this.top > 0) this.top = 0;
				this.panel.style.top = this.top + "px";
			}
		}
	}
});
