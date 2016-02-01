// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

"use strict";

/**
 * SAGE2 Audio Manager, renders the audio streams for a given site
 *
 * @module client
 * @submodule SAGE2_AudioManager
 * @class SAGE2_AudioManager
 */

var clientID;
var wsio;
var autoplay;
// default initial volume for applications
var initialVolume;
var hostAlias = {};

// Explicitely close web socket when web browser is closed
window.onbeforeunload = function() {
	if (wsio !== undefined) {
		wsio.close();
	}
};

/**
 * Entry point of the application
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// Just a given number
	clientID = -2;

	// Detect which browser is being used
	SAGE2_browser();

	autoplay = false;
	initialVolume = 8;
	wsio = new WebsocketIO();

	console.log("Connected to server: ", window.location.origin);

	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		var clientDescription = {
			clientType: "audioManager",
			requests: {
				config: true,
				version: false,
				time: false,
				console: false
			}
		};
		wsio.emit('addClient', clientDescription);
	});

	// Socket close event (ie server crashed)
	wsio.on('close', function(evt) {
		var i, tracks;
		// Pause all video tracks
		tracks = document.getElementsByTagName('video');
		for (i = 0; i < tracks.length; i++) {
			if (tracks[i].parentNode) {
				tracks[i].pause();
				// tracks[i].parentNode.removeChild(tracks[i]);
			}
		}
		// Pause all audio tracks
		tracks = document.getElementsByTagName('audio');
		for (i = 0; i < tracks.length; i++) {
			if (tracks[i].parentNode) {
				tracks[i].pause();
				// tracks[i].parentNode.removeChild(tracks[i]);
			}
		}
		// Try to reload
		var refresh = setInterval(function() {
			// make a dummy request to test the server every 2 sec
			var xhr = new XMLHttpRequest();
			xhr.open("GET", "/", true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4 && xhr.status === 200) {
					console.log("server ready");
					// when server ready, clear the interval callback
					clearInterval(refresh);
					// and reload the page
					if (__SAGE2__.browser.isFirefox) {
						var main = document.getElementById('main');
						while (main.firstChild) {
							main.removeChild(main.firstChild);
						}
						window.open(window.location, '_blank');
					} else {
						window.location.reload();
					}
				}
			};
			xhr.send();
		}, 2000);
	});
}

function setupListeners() {
	wsio.on('initialize', function(data) {
	});

	wsio.on('setupDisplayConfiguration', function(json_cfg) {
		var i;
		var http_port;
		var https_port;

		console.log(json_cfg);

		http_port  = json_cfg.port === 80 ? "" : ":" + json_cfg.port;
		https_port = json_cfg.secure_port === 443 ? "" : ":" + json_cfg.secure_port;
		hostAlias["http://"  + json_cfg.host + http_port]  = window.location.origin;
		hostAlias["https://" + json_cfg.host + https_port] = window.location.origin;
		for (i = 0; i < json_cfg.alternate_hosts.length; i++) {
			hostAlias["http://"  + json_cfg.alternate_hosts[i] + http_port]  = window.location.origin;
			hostAlias["https://" + json_cfg.alternate_hosts[i] + https_port] = window.location.origin;
		}

		// Load the initial volume value from the configuration object
		if (json_cfg.audio && json_cfg.audio.initialVolume !== undefined) {
			// Making sure the value is between 0 and  10
			initialVolume = parseInt(json_cfg.audio.initialVolume, 10);
			initialVolume = Math.max(Math.min(initialVolume, 10), 0);
			console.log("Configuration> initialVolume = ", initialVolume);
		}

		// play the jinggle
		var jinggle_elt = document.getElementById('jinggle');
		if (json_cfg.ui.startup_sound) {
			var jinggle_src = document.getElementById('jinggle_src');
			jinggle_src.src = json_cfg.ui.startup_sound;
		}
		jinggle_elt.load();
		jinggle_elt.volume = initialVolume / 10;
		jinggle_elt.play();
	});

	wsio.on('createAppWindow', function(data) {
		if (data.application === "movie_player") {
			var main = document.getElementById('main');
			var videosTable = document.getElementById('videos');

			var vid;
			if (__SAGE2__.browser.isFirefox) {
				// Firefox seems to crash with audio elements
				vid = document.createElement('video');
			} else {
				vid = document.createElement('audio');
			}
			vid.id  = data.id;
			vid.volume = initialVolume / 10;
			vid.firstPlay = true;
			vid.startPaused = data.data.paused;
			vid.style.display = "none";
			vid.addEventListener('canplaythrough', function() {
				// Video is loaded and can be played
				if (vid.firstPlay && vid.sessionTime) {
					// Update the local time
					vid.currentTime = vid.sessionTime;
				}
				vid.firstPlay = false;
				if (autoplay === true) {
					playVideo(data.id);
				}
			}, false);
			vid.addEventListener('ended', function() {
				if (autoplay === true) {
					vid.currentTime = 0;
				}
			}, false);
			vid.addEventListener('timeupdate', function() {
				var vid_time = document.getElementById(data.id + "_time");
				if (vid_time) {
					vid_time.textContent = formatHHMMSS(vid.currentTime);
				}
			}, false);

			var url    = cleanURL(data.data.audio_url);
			var source = document.createElement('source');
			var param  = url.indexOf('?');
			if (param >= 0) {
				source.src = url + "&clientID=audio";
			} else {
				source.src = url + "?clientID=audio";
			}
			source.type = data.data.audio_type;
			vid.appendChild(source);

			var videoRow = document.createElement('tr');
			videoRow.id  = data.id + "_row";
			var title    = document.createElement('td');
			title.id     = data.id + "_title";
			title.className   = "videoTitle";
			title.textContent = data.title;

			var volume = document.createElement('td');
			volume.id  = data.id + "_volume";
			volume.className = "videoVolume";
			var volumeMute   = document.createElement('span');
			volumeMute.id    = data.id + "_mute";
			volumeMute.className = "videoVolumeMute";
			volumeMute.innerHTML = "&#x2713;";
			var volumeSlider = document.createElement('input');
			volumeSlider.id  = data.id + "_volumeSlider";
			volumeSlider.className = "videoVolumeSlider";
			volumeSlider.type  = "range";
			volumeSlider.min   = 0;
			volumeSlider.max   = 10;
			volumeSlider.step  = 1;
			volumeSlider.value = initialVolume;
			volumeSlider.addEventListener('input', changeVolume, false);
			volume.appendChild(volumeMute);
			volume.appendChild(volumeSlider);

			var time = document.createElement('td');
			time.id  = data.id + "_time";
			time.className   = "videoTime";
			time.textContent = "00:00:00";

			var play = document.createElement('td');
			play.id  = data.id + "_play";
			play.className   = "videoPlay";
			play.textContent = "Paused";

			videoRow.appendChild(title);
			videoRow.appendChild(volume);
			videoRow.appendChild(time);
			videoRow.appendChild(play);

			main.appendChild(vid);
			videosTable.appendChild(videoRow);
		}
	});

	wsio.on('setVolume', function(data) {
		console.log("setVolume ", data.id, " ", data.level);
		var slider = document.getElementById(data.id + "_volumeSlider");
		slider.value = data.level * 10;
		changeVideoVolume(data.id, data.level);
	});

	wsio.on('videoPlaying', function(data) {
		console.log("videoPlaying");
		var vid = document.getElementById(data.id);
		if (vid) {
			vid.play();
		}
		var vid_play = document.getElementById(data.id + "_play");
		if (vid_play) {
			vid_play.textContent = "Playing";
		}
	});

	wsio.on('videoPaused', function(data) {
		var vid      = document.getElementById(data.id);
		var vid_play = document.getElementById(data.id + "_play");
		if (vid) {
			vid.pause();
		}
		if (vid_play) {
			vid_play.textContent = "Paused";
		}
	});

	wsio.on('videoEnded', function(data) {
		var vid      = document.getElementById(data.id);
		var vid_play = document.getElementById(data.id + "_play");
		if (vid) {
			vid.pause();
		}
		if (vid_play) {
			vid_play.textContent = "Paused";
		}
	});

	wsio.on('videoMuted', function(data) {
		var vid      = document.getElementById(data.id);
		var vid_mute = document.getElementById(data.id + "_mute");
		if (vid) {
			vid.muted = true;
		}
		if (vid_mute) {
			vid_mute.innerHTML = "&#x2717;";
		}
	});

	wsio.on('videoUnmuted', function(data) {
		var vid      = document.getElementById(data.id);
		var vid_mute = document.getElementById(data.id + "_mute");
		if (vid) {
			vid.muted = false;
		}
		if (vid_mute) {
			vid_mute.innerHTML = "&#x2713;";
		}
	});

	wsio.on('updateVideoItemTime', function(data) {
		var vid = document.getElementById(data.id);
		if (vid) {
			if (vid.firstPlay) {
				// if not fully loaded, just store the time
				vid.sessionTime = data.timestamp;
			} else {
				vid.currentTime = data.timestamp;
			}
		}
	});

	wsio.on('deleteElement', function(elem_data) {
		deleteElement(elem_data.elemId);
		deleteElement(elem_data.elemId + "_row");
	});
}

/**
 * Handler for the volume slider
 *
 * @method changeVolume
 * @param event {Event} event data
 */
function changeVolume(event) {
	var vol     = document.getElementById(event.target.id).value / 10;
	var videoId = event.target.id.substring(0, event.target.id.length - 13);
	wsio.emit("setVolume", {id: videoId, level: vol});
	changeVideoVolume(videoId, vol);
}

/**
 * Change the volume of a video
 *
 * @method changeVideoVolume
 * @param videoId {String} id of the video
 * @param volume {Number} new volume value
 */
function changeVideoVolume(videoId, volume) {
	document.getElementById(videoId).volume = volume;
}

/**
 * Play a video
 *
 * @method playVideo
 * @param videoId {String} id of the video
 */
function playVideo(videoId) {
	wsio.emit('playVideo', {id: videoId});
}

/**
 * Uptime video time
 *
 * @method updateVideotime
 * @param videoId {String} id of the video
 */
function updateVideotime(videoId, timestamp, play) {
	wsio.emit('updateVideoTime', {id: videoId, timestamp: timestamp, play: play});
}
