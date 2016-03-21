//
// SAGE2 application: Timezone
// by: Andrea Rottigni <arotti2@uic.edu>
//
// Copyright (c) 2015
//

var Timezone = SAGE2_App.extend({

	updateAllDivs: function() {
		for (i in this.state.clocks) {
			var div = d3.select("#" + this.state.clocks[i].id);
			div.style("width", 100 / this.state.clocks.length + "%");
			div.style("height", 100 + "%");
			div.style("position", "absolute");
			div.style("left", 100 / this.state.clocks.length * i + "%");
			div.style("top", 0 + "%");
		}
	},

	addAllClocks: function() {
		for (i in this.state.clocks) {
			this.state.clocks[i].nightMode = false;
			this.addClockToView(this.state.clocks[i]);
		}
		this.updateAllDivs();
	},

	updateAllCaption: function(that) {
		for (i in that.state.clocks) {
			var captionDiv = d3.select("#" + that.state.clocks[i].id + "textDiv");
			var captionP = d3.select("#" + that.state.clocks[i].id + "Text");
			console.log(captionDiv.empty());
			console.log(captionP.empty());
			if (!captionDiv.empty() && !captionP.empty()) {
				captionP.style("font-size",that.minimumFontSize + "px");
				var maxwidth = parseInt(captionDiv.style("width"));
				var textwidth = parseInt(captionP.style("width"));
				var marginLeft = parseInt(maxwidth - textwidth) / 2;
				captionP.style("left",marginLeft + "px");
			}
		}
	},


	setCaptionSize: function(captionDiv, captionP,that) {
		console.log(captionDiv);
		var maxheight = parseInt(captionDiv.style("height"));
		var maxwidth = parseInt(captionDiv.style("width"));
		var fontsize = maxheight;
		captionP.style("font-size",fontsize + "px");
		var textwidth = parseInt(captionP.style("width"));
		var textheight = parseInt(captionP.style("height"));
		while ((textwidth > maxwidth || textheight > maxheight) && fontsize >= 3) {
			fontsize -= 1;
			captionP.style("font-size",fontsize + "px");
			textwidth = parseInt(captionP.style("width"));
			textheight = parseInt(captionP.style("height"));
		}
		if (fontsize < that.minimumFontSize) {
			that.minimumFontSize = fontsize;
		}
		var marginLeft = parseInt(maxwidth - textwidth) / 2;
		captionP.style("left", marginLeft + "px");
	},

	createCaption: function(clock,that) {
		var top = "85%";
		var textdiv = d3.select("#" + clock.id)
						.append("div")
						.attr("id",clock.id + "textDiv")
						.style("height","15%")
						.style("top",top)
						.style("position","absolute")
						.style("width","90%")
						.style("left", "5%");
		var text = textdiv.append("p")
						.attr("id",clock.id + "Text")
						.style("color","white")
						.style("position","absolute")
						.style("white-space","nowrap")
						.text(clock.name.split(',')[0]);
		that.setCaptionSize(textdiv,text,that);
		that.resizeCaption();
		that.updateAllCaption(that);
	},


	addClockToView: function(clock) {
		var div = d3.select("#clocks").append("div").attr("id",clock.id);
		this.ready = false;
		var that = this;
		d3.xml(this.resrcPath + 'clock_svg.svg', "image/svg+xml", function(error, xml) {
			if (error) {
				throw error;
			}
			var div = document.getElementById(clock.id);
			div.appendChild(xml.documentElement);
			that.createCaption(clock,that);
			that.ready = true;
		});
	},

	createButtons: function() {
		this.controls.addTextInput({defaultText: "", label:  "City", identifier: "CityInput" });
	},


	createClockPage: function() {
		this.clockDiv = d3.select(this.element)
							.append("div")
							.attr("id","clocks")
							.style("width", "100%")
							.style("height", "80%")
							.style("position","absolute");
		this.addAllClocks();
		this.createButtons();
	},

	init: function(data) {
		var aaa = data.state.clocks[0];
		this.SAGE2Init("div", data);
		// Set the background to black
		this.element.style.backgroundColor = '#6C6969';
		this.ready = false;
		this.minimumFontSize = Number.MAX_VALUE;
		if (this.state.clocks.length == 0) {
			this.state.clocks.push({name: "Chicago, IL, United States", offset: 0, id: "chicagoDiv", nightMode: false});
		} else {
			for (i in this.state.clocks) {
				this.state.clocks[i].nightMode = false;
			}
		}

		this.createClockPage();
		this.timeZoneOffset = data.date.getTimezoneOffset() * 60;



		// move and resize callbacks
		this.resizeEvents = "continuous";
		this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},

	load: function(date) {
		console.log('Timezone> Load with state value', this.state.value);
		this.refresh(date);
	},

	rotateElement: function(clockId, id, angle) {
		var svgDoc = d3.select("#" + clockId).select('svg');
		svgDoc.select("#" + id).attr('transform', 'rotate(' + angle + ', 100, 100)');
	},

	toggleNightMode: function(index, background, dial) {
		var svgDoc = d3.select("#" + this.state.clocks[index].id).select('svg');
		if (!svgDoc.empty()) {
			svgDoc.select("#" + "background").style("fill",background);
			svgDoc.select("#" + "dial").style("fill",dial);
			svgDoc.select("#" + "hourHand").style("fill",dial);
			svgDoc.select("#" + "minuteHand").style("fill",dial);
		} else {
			this.state.clocks[index].nightMode = !this.state.clocks[index].nightMode;
		}

	},

	draw: function(date) {
		for (i in this.state.clocks) {
			if (this.ready) {
				var secondToHourCostant = 3600;
				var secondToMinuteConstant = 60;
				var hourOffset = Math.floor(this.state.clocks[i].offset / secondToHourCostant);
				var minuteOffset = (this.state.clocks[i].offset % secondToHourCostant) / secondToMinuteConstant;
				var now = date;
				var hours = (now.getHours() + hourOffset) % 24;
				var minutes = (now.getMinutes() + minuteOffset) % 60;
				var seconds = now.getSeconds();
				var millis  = now.getMilliseconds();

				// rotate hour hands
				this.rotateElement(this.state.clocks[i].id, 'hourHand', 30 * hours + 0.5 * minutes);

				// rotate minute hand
				this.rotateElement(this.state.clocks[i].id,'minuteHand',
					6 * minutes + (this.minuteHandBehavior === 'sweeping' ? 0.1 * seconds : 0));
				// handle "stop to go" second hand
				if (this.secondHandStopToGo === 'yes' || this.secondHandStopToGo === 'true') {
					var wait = isNaN(this.secondHandStopTime) ? 1.5 : this.secondHandStopTime;
					var fact = 60 / (60 - Math.min(30, Math.max(0, wait)));
					var time = Math.min(60000, fact * (1000 * seconds + millis));
					seconds  = Math.floor(time / 1000);
					millis   = time % 1000;
				}

				// rotate second hand
				var secondAngle = 6 * seconds;
				if (this.secondHandBehavior === 'sweeping') {
					secondAngle += 0.006 * millis;
				} else if (this.secondHandBehavior === 'swinging') {
					secondAngle += 3 * (1 + Math.cos(Math.PI + Math.PI * (0.001 * millis)));
				}
				this.rotateElement(this.state.clocks[i].id,'secondHand', secondAngle);
				if ((hours >= 19 || hours < 7) && !this.state.clocks[i].nightMode) {
					this.state.clocks[i].nightMode = true;
					this.toggleNightMode(i,"rgba(0,0,0,255)","rgb(235,235,235)");
				} else if ((hours < 19 && hours >= 7) && this.state.clocks[i].nightMode) {
					this.state.clocks[i].nightMode = false;
					this.toggleNightMode(i,"rgba(255,255,255,255)","rgb(40,40,40)");
				}
			}
		}
	},





	resizeCaption: function() {
		this.minimumFontSize = Number.MAX_VALUE;
		for (i in this.state.clocks) {
			var captionDiv = d3.select("#" + this.state.clocks[i].id + "textDiv");
			var captionP = captionDiv.select("#" + this.state.clocks[i].id + "Text");
			if (!captionDiv.empty() && !captionP.empty()) {
				this.setCaptionSize(captionDiv,captionP,this);
				this.updateAllCaption(this);
			}

		}
	},

	resize: function(date) {
		this.resizeCaption();
		this.refresh(date);
	},

	move: function(date) {
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},


	clockSelected: function(lat,lon,cityName) {
		var url = "https://api.timezonedb.com/?lat=" + lat + "&lng=" + lon + "&format=json&key=4R3QHZXPDCOL";
		var that = this;
		d3.json(url, function(error, json) {
			if (error) {
				return console.warn(error);
			}
			var timeOffset = parseInt(json.gmtOffset) + that.timeZoneOffset;
			var id = cityName.toLowerCase() + lat + lon;
			id = id.replace(/ /g, "");
			id = id.replace(/\./g,'');
			that.SAGE2UserModification = true;
			var flag = false;
			for (i in that.state.clocks) {
				if (id === that.state.clocks[i].id) {
					flag = true;
					break;
				}
			}
			if (!flag) {
				var clock = {name: cityName.charAt(0).toUpperCase() + cityName.slice(1),offset: timeOffset, id: id, nightMode: false};
				that.state.clocks.push(clock);
				that.addClockToView(clock);
				that.updateAllDivs();
			}
			this.SAGE2UserModification = false;
		});
	},

	localizeCity: function(city) {
		var url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + city + "&key=AIzaSyCtSvhdjFUTsAeefu3a99VxMs1igYKjk2I";
		var that = this;
		d3.json(url, function(error, json) {
			if (error) {
				return console.warn(error);
			}
			var geometry = json.results[0].geometry;
			var name = json.results[0].address_components[0].long_name;
			if (geometry !== undefined && name !== undefined) {
				var lat = geometry.location.lat;
				var lon = geometry.location.lng;
				that.clockSelected(lat,lon,name);
			}
		});
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
		} else if (eventType === "pointerMove" && this.dragging) {
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
		}
		// Scroll events for zoom
		else if (eventType === "pointerScroll") {
		} else if (eventType === "widgetEvent") {
			if (data.action = "textEnter") {
				this.localizeCity(data.text);
			}
		} else if (eventType === "keyboard") {
			if (data.character === "m") {
				this.refresh(date);
			}
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") { // up
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") { // right
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") { // down
				this.refresh(date);
			}
		}
	}
});
