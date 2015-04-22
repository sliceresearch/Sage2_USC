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
	* Init method, creates an 'div' tag in the DOM
	*
	* @method init
	* @param data {Object} contains initialization values (id, width, height, ...)
	*/
	init: function(data) {
		this.blockStreamInit(data);

		this.firstLoad();
		this.initWidgets();
	},

	/**
	* Builds the widgets to control the movie player
	*
	* @method initWidgets
	*/
	initWidgets: function() {
		this.loopBtn = this.controls.addButton({
			type: "loop",
			sequenceNo: 3,
			action: function(date) {
				this.SAGE2UserModification = true;

				if(this.state.looped === true) {
					console.log("no loop: " + this.div.id);
					if(isMaster) wsio.emit('loopVideo', {id: this.div.id, loop: false});
					this.state.looped = false;
				}
				else {
					console.log("loop: " + this.div.id);
					if(isMaster) wsio.emit('loopVideo', {id: this.div.id, loop: true});
					this.state.looped = true;
				}

				this.refresh(date);
				this.SAGE2UserModification = false;
			}.bind(this)
		});

		this.muteBtn = this.controls.addButton({
			type: "mute",
			sequenceNo: 5,
			action: function(date) {
				this.SAGE2UserModification = true;

				if(this.state.muted === true) {
					console.log("unmute: " + this.div.id);
					if(isMaster) wsio.emit('unmuteVideo', {id: this.div.id});
					this.state.muted = false;
				}
				else {
					console.log("mute: " + this.div.id);
					if(isMaster) wsio.emit('muteVideo', {id: this.div.id});
					this.state.muted = true;
				}

				this.refresh(date);
				this.SAGE2UserModification = false;
			}.bind(this)
		});

		this.playPauseBtn = this.controls.addButton({
			type: "play-pause",
			sequenceNo: 9,
			action: function(date) {
				this.SAGE2UserModification = true;

				if(this.state.paused === true) {
					console.log("play: " + this.div.id);
					if(isMaster) wsio.emit('playVideo', {id: this.div.id});
					this.state.paused = false;
				}
				else {
					console.log("pause: " + this.div.id);
					if(isMaster) wsio.emit('pauseVideo', {id: this.div.id});
					this.state.paused = true;
				}

				this.refresh(date);
				this.SAGE2UserModification = false;
			}.bind(this)
		});
		this.stopBtn = this.controls.addButton({
			type: "stop",
			sequenceNo: 11,
			action: function(date) {
				this.SAGE2UserModification = true;

				console.log("pause: " + this.div.id);
				if(isMaster) wsio.emit('stopVideo', {id: this.div.id});
				this.state.paused = true;
				this.playPauseBtn.state = 0;

				this.refresh(date);
				this.SAGE2UserModification = false;
			}.bind(this)
		});

		this.controls.addSlider({
			begin: 0,
			end: this.state.numframes-1,
			increments: 1,
			appHandle: this,
			property: "state.frame",
			labelFormatFunction: function(value, end) {
				var duration = parseInt(1000 * (value / this.state.framerate), 10);
				return formatHHMMSS(duration);
			}.bind(this),
			lockAction: function(date) {
				this.SAGE2UserModification = true;

				if(this.state.paused === false) {
					console.log("pause: " + this.div.id);
					if(isMaster) {
						wsio.emit('pauseVideo', {id: this.div.id});
					}
				}
				else {
					this.state.playAfterSeek = false;
				}

				this.refresh(date);
				this.SAGE2UserModification = false;
			}.bind(this),
			action: function(date) {
				this.SAGE2UserModification = true;

				if(isMaster) {
					wsio.emit('updateVideoTime', {id: this.div.id, timestamp: (this.state.frame / this.state.framerate), play: !this.state.paused});
				}

				this.refresh(date);
				this.SAGE2UserModification = false;
			}.bind(this)
		});

		this.controls.finishedAddingControls();

		var _this = this;
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
		this.SAGE2Sync(false);
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
	* @param date {Date} time from the server
	*/
	load: function(date) {
		
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
	event: function(type, position, user, data, date) {
		// Space Bar - toggle play/pause
		if (type === "keyboard") {
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

				this.refresh(date);
			}
		}
	}
});
