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
 * @module client
 * @submodule image_viewer
 */

/**
 * Movie player application, inherits from SAGE2_BlockStreamingApp
 *
 * @class movie_player
 */
var movie_player = SAGE2_BlockStreamingApp.extend( {
	/**
	* Constructor
	*
	* @class image_viewer
	* @constructor
	*/
	construct: function() {
		arguments.callee.superClass.construct.call(this);
	},

	/**
	* Init method, creates an 'div' tag in the DOM
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "div", data);
	},

	/**
	* Builds the widgets to control the movie player
	*
	* @method initWidgets
	*/
	initWidgets: function() {
		var _this = this;

		this.loopBtn = this.controls.addButton({
			id:"Loop",
			type: "loop",
			sequenceNo: 6
		});

		this.muteBtn = this.controls.addButton({
			id:"Mute",
			type: "mute",
			sequenceNo: 2
		});

		this.playPauseBtn = this.controls.addButton({
			id:"PlayPause",
			type: "play-pause",
			sequenceNo: 3
		});
		this.stopBtn = this.controls.addButton({
			id:"Stop",
			type: "stop",
			sequenceNo: 5
		});

		this.controls.addSlider({
			id:"Seek",
			begin: 0,
			end: this.state.numframes-1,
			increments: 1,
			appHandle: this,
			property: "state.frame",
			labelFormatFunction: function(value, end) {
				var duration = parseInt(1000 * (value / _this.state.framerate), 10);
				return formatHHMMSS(duration);
			}
		});

		this.controls.finishedAddingControls();

		setTimeout(function() {
			_this.muteBtn.state      = _this.state.muted  ? 0 : 1;
			_this.loopBtn.state      = _this.state.looped ? 0 : 1;
			_this.playPauseBtn.state = _this.state.paused ? 0 : 1;
		}, 500);
	},

	/**
	* Set to movie player to a given frame
	*
	* @method setVideoFrame
	* @param frameIdx {Number} change the current frame number
	*/
    setVideoFrame: function(frameIdx) {
		this.state.frame = frameIdx;
	},

	/**
	* Pause the movie if not in loop mode
	*
	* @method videoEnded
	*/
	videoEnded: function() {
		if (this.state.looped === false) {
			this.state.paused = true;
			// must change play-pause button (should show 'play' icon)
			this.playPauseBtn.state = 1;
		}
	},

	/**
	* Load the app from a previous state and builds the widgets
	*
	* @method load
	* @param state {Object} object to initialize or restore the app
	* @param date {Date} time from the server
	*/
	load: function(state, date) {
		arguments.callee.superClass.load.call(this, state, date);

		this.state.width                = state.width;
		this.state.height               = state.height;
		this.state.video_url            = state.video_url;
		this.state.video_type           = state.video_type;
		this.state.audio_url            = state.audio_url;
		this.state.audio_type           = state.audio_type;
		this.state.paused               = state.paused;
		this.state.frame                = state.frame;
		this.state.numframes            = state.numframes;
		this.state.framerate            = state.framerate;
		this.state.display_aspect_ratio = state.display_aspect_ratio;
		this.state.muted                = state.muted;
		this.state.looped               = state.looped;

		this.initWidgets();
	},

	/**
	* Handles event processing, arrow keys to navigate, and r to redraw
	*
	* @method event
	* @param eventType {String} the type of event
	* @param position {Object} contains the x and y positions of the event
	* @param user_id {Object} data about the user who triggered the event
	* @param data {Object} object containing extra data about the event,
	* @param date {Date} current time from the server
	*/
	event: function(eventType, position, user, data, date) {
		// Space Bar - toggle play/pause
		if (eventType === "keyboard") {
			if (data.character === " ") {
				if (this.state.paused === true) {
					console.log("play: " + this.div.id);
					if(isMaster) wsio.emit('playVideo', {id: this.div.id});
					this.state.paused = false;
				}
				else {
					console.log("pause: " + this.div.id);
					if(isMaster) wsio.emit('pauseVideo', {id: this.div.id});
					this.state.paused = true;
				}
			}
		}
		else if (eventType === "widgetEvent"){
			var _this = this;
			switch(data.ctrlId){
				case "Loop":
					if(_this.state.looped === true) {
						console.log("no loop: " + _this.div.id);
						if(isMaster) wsio.emit('loopVideo', {id: _this.div.id, loop: false});
						_this.state.looped = false;
					}
					else {
						console.log("loop: " + _this.div.id);
						if(isMaster) wsio.emit('loopVideo', {id: _this.div.id, loop: true});
						_this.state.looped = true;
					}
					break;
				case "Mute":
					if(_this.state.muted === true) {
						console.log("unmute: " + _this.div.id);
						if(isMaster) wsio.emit('unmuteVideo', {id: _this.div.id});
						_this.state.muted = false;
					}
					else {
						console.log("mute: " + _this.div.id);
						if(isMaster) wsio.emit('muteVideo', {id: _this.div.id});
						_this.state.muted = true;
					}
					break;
				case "PlayPause":
					if(_this.state.paused === true) {
						console.log("play: " + _this.div.id);
						if(isMaster) wsio.emit('playVideo', {id: _this.div.id});
						_this.state.paused = false;
					}
					else {
						console.log("pause: " + _this.div.id);
						if(isMaster) wsio.emit('pauseVideo', {id: _this.div.id});
						_this.state.paused = true;
					}
					break;
				case "Stop":
					console.log("pause: " + _this.div.id);
					if(isMaster) wsio.emit('stopVideo', {id: _this.div.id});
					_this.state.paused = true;
					_this.playPauseBtn.state = 0;
					break;
				case "Seek":
					switch (data.action){
						case "sliderLock":
							if(_this.state.paused === false) {
								console.log("pause: " + _this.div.id);
								if(isMaster) {
									wsio.emit('pauseVideo', {id: _this.div.id});
								}
							}
							else {
								_this.state.playAfterSeek = false;
							}
							break;
						case "sliderUpdate":
							break;
						case "sliderRelease":
							if(isMaster) {
								wsio.emit('updateVideoTime', {id: _this.div.id, timestamp: (_this.state.frame / _this.state.framerate), play: !_this.state.paused});
							}
							break;
					}
					break;
				default:
					console.log("No handler for:", data.ctrlId);
			}
		}
	}
});
