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
		
		this.src = null;
		this.top = null;
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "img", width, height, resrc, date);
		
		// application specific 'init'
		this.state.src  = null;
		this.state.type = null;
		this.state.exif = null;
		this.state.crct = null;
		
		this.createLayer("rgba(0,0,0,0.85)");
		this.pre = document.createElement('pre');
		this.layer.appendChild(this.pre);
		this.top = 0;
		this.state.crct = false;
	},
	
	load: function(state, date) {
		if (state.src !== undefined && state.src !== null) {
			this.element.src  = "data:" + state.type + ";base64," + state.src;
			this.state.src  = state.src;
			this.state.type = state.type;
			this.state.exif = state.exif;
			this.state.crct = state.crct;

			this.pre.innerHTML = this.syntaxHighlight(state.exif);

			// Fix iPhone picture: various orientations
			var ratio_elmt = this.element.height / this.element.width;
			var ratio_exif = this.state.exif.ImageHeight / this.state.exif.ImageWidth;
			var ratio      = ratio_exif;
			var inv   = 1.0 / ratio;
			if (this.state.exif.Orientation === 'Rotate 90 CW') {
				this.element.style.webkitTransform = "scale(" + ratio + "," + inv + ") rotate(90deg)";
				if (!this.state.crct)
					this.sendResize(this.element.height, this.element.width);
				this.state.crct = true;
			}
			else if (this.state.exif.Orientation === 'Rotate 270 CW') {
				this.element.style.webkitTransform = "scale(" + ratio + "," + inv + ") rotate(-90deg)";
				if (!this.state.crct)
					this.sendResize(this.element.height, this.element.width);
				this.state.crct = true;
			}
			else if (this.state.exif.Orientation === 'Rotate 180') {
				this.element.style.webkitTransform = "rotate(180deg)";
				this.state.crct = true;
			} else {
				this.state.crct = true;
			}
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
			if (this.isLayerHidden()) {
				this.top = 0;
				this.showLayer();
			}
			else {
				this.hideLayer();
			}
		}
		// Scroll events for panning the info pannel
		if (eventType === "pointerScroll") {
			var amount = data.wheelDelta / 64;
			
			this.top += ui.titleTextSize * amount;
			if (this.top > 0) this.top = 0;
			if (this.top < (-(this.layer.clientHeight-this.element.height))) this.top = -(this.layer.clientHeight-this.element.height);
			this.layer.style.top = this.top + "px";
		}
	}
});
