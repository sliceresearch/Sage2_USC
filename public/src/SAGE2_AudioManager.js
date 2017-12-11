// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-15

/* global createjs */
"use strict";

/**
 * SAGE2 Audio Manager, renders the audio streams for a given site
 *
 * @module client
 * @submodule SAGE2_AudioManager
 * @class SAGE2_AudioManager
 */

// Global variable (needed by runtime)
var hostAlias = {};
// Websocket handle
var wsio;
// default settings for applications
var autoplay = false;
var initialVolume = 8;
// WebAudio API variables
var audioCtx;
var audioGainNodes   = {};
var audioPannerNodes = {};

// Number of sound instances being played at once
var numberOfSounds    = 0;
// Max number of sound played at once
var maxNumberOfSounds = 5;

// Explicitely close web socket when web browser is closed
window.onbeforeunload = function() {
	if (wsio !== undefined) {
		wsio.close();
	}
};

/**
 * When the page loads, starts the audio manager
 *
 */
window.addEventListener('load', function(event) {
	SAGE2_init();
});

/**
 * Entry point of the application
 *
 * @method SAGE2_init
 */
function SAGE2_init() {
	// SoundJS library
	//
	// Load the SoundJS library and plugins
	if (!createjs.Sound.initializeDefaultPlugins()) {
		console.log('SoundJS> cannot load library');
		return;
	} else {
		console.log('SoundJS> library loaded - version', createjs.SoundJS.version);
	}
	///////////

	// Detect which browser is being used
	SAGE2_browser();

	wsio = new WebsocketIO();

	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		// Get the cookie for the session, if there's one
		var session = getCookie("session");

		var clientDescription = {
			clientType: "audioManager",
			requests: {
				config:  true,
				version: false,
				time:    false,
				console: false
			},
			session: session
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

		// Play an audio blop
		createjs.Sound.play("down");

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
	// wall values
	var totalWidth;

	wsio.on('initialize', function(data) {
		// Reset the counter for number sounds
		numberOfSounds = 0;
	});

	wsio.on('setupDisplayConfiguration', function(json_cfg) {
		var i;
		var http_port;
		var https_port;

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

		// Select the jinggle sound (default or configuration file)
		// var jingle = "sage2_jinggle.mp3";
		// var jingle = "kola-startup.mp3";
		// var jingle = "blues_lick_in_a.mp3";
		var jingle = "waipio-jingle.mp3";
		if (json_cfg.ui.startup_sound) {
			// use the jingle file if specificied in configuration file
			jingle = json_cfg.ui.startup_sound;
		}

		// folder for audio files (relative to public/)
		var audioPath   = "sounds/";
		// Default settings
		var defaults =  {
			volume: initialVolume / 20, // volume [0:1] - value 0-10 and half volume for special effects
			delay:  0, // amount of time to delay the start of audio playback, in milliseconds
			loop:   0, // times the audio loops when it reaches the end of playback, 0 no loops, -1 infinite
			offset: 0, // offset from the start of the audio to begin playback, in milliseconds
			pan:    0  // left-right pan of the sound, -1 (left) and 1 (right).
		};
		var lowdefaults =  {
			volume: initialVolume / 80, // low volume for some events
			delay:  0, loop:   0,
			offset: 0, pan:    0
		};
		// Array of assets to preload
		var soundAssets = [
			{id: "startup",   src: jingle,          defaultPlayProps: defaults},
			{id: "newapp",    src: "newapp2.mp3",   defaultPlayProps: defaults},
			{id: "deleteapp", src: "deleteapp.mp3", defaultPlayProps: defaults},
			{id: "remote",    src: "remote.mp3",    defaultPlayProps: lowdefaults},
			{id: "send",      src: "send.mp3",      defaultPlayProps: defaults},
			{id: "down",      src: "down.mp3",      defaultPlayProps: lowdefaults}
		];
		// If the file cannot load, try other formats (need the files)
		createjs.Sound.alternateExtensions = ["ogg", "mp3"];
		// Callback when the assets are loaded
		createjs.Sound.on("fileload", handleSoundJSLoad);
		// Load the assets (will trigger the callbac when done)
		createjs.Sound.registerSounds(soundAssets, audioPath);

		// Main audio context (for low-level operations)
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		audioCtx.listener.setPosition(0, 0, 0);
		totalWidth  = json_cfg.totalWidth;
	});

	wsio.on('createAppWindow', function(data) {
		// Limit the number of sounds
		if (numberOfSounds < maxNumberOfSounds) {
			numberOfSounds = numberOfSounds + 1;

			// Play an audio blip
			var newAppSound = createjs.Sound.play("newapp");

			// Callback when sound is done playing
			newAppSound.on('complete', function(evt) {
				numberOfSounds = numberOfSounds - 1;
			});
		}

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
			vid.id            = data.id;
			// vid.volume        = initialVolume / 10;
			vid.firstPlay     = true;
			vid.startPaused   = data.data.paused;
			vid.controls      = false;
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
					// time second, converted to millis, and to string
					vid_time.textContent = formatHHMMSS(1000.0 * vid.currentTime);
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

			// WebAudio API
			var audioSource = audioCtx.createMediaElementSource(vid);
			var gainNode    = audioCtx.createGain();
			audioGainNodes[vid.id] = gainNode;

			var panNode = audioCtx.createPanner();
			panNode.panningModel = 'equalpower';
			audioPannerNodes[vid.id] = panNode;

			// source -> gain -> pan -> speakers
			audioSource.connect(gainNode);
			gainNode.connect(panNode);
			panNode.connect(audioCtx.destination);
			// webaudio end

			var videoRow = document.createElement('tr');
			videoRow.className = "rowNoBorder";
			videoRow.id  = data.id + "_row";

			var icon = document.createElement('td');
			icon.setAttribute("rowspan", 2);
			var link = document.createElement("img");
			if (data.icon) {
				link.src = data.icon + '_256.jpg';
			} else {
				link.src = "images/unknownapp_256.jpg";
			}
			link.width = 120;
			icon.appendChild(link);

			var title    = document.createElement('td');
			title.id     = data.id + "_title";
			title.className   = "videoTitle";
			title.textContent = data.title;

			var time = document.createElement('td');
			time.id  = data.id + "_time";
			time.className   = "videoTime";
			time.textContent = "00:00:00";

			var play = document.createElement('td');
			play.id  = data.id + "_play";
			play.className   = "videoPlay";
			play.textContent = "Paused";

			var volumeMute   = document.createElement('td');
			volumeMute.id    = data.id + "_mute";
			volumeMute.className = "videoVolumeMute";
			volumeMute.innerHTML = "&#x2713;";

			videoRow.appendChild(icon);
			videoRow.appendChild(title);
			videoRow.appendChild(time);
			videoRow.appendChild(volumeMute);
			videoRow.appendChild(play);

			var videoRow2 = document.createElement('tr');
			videoRow2.className = "rowWithBorder";
			videoRow2.id  = data.id + "_row2";

			var volume = document.createElement('td');
			volume.setAttribute("colspan", 4);
			volume.id  = data.id + "_volume";
			volume.className = "videoVolume";
			var volumeSlider = document.createElement('input');
			volumeSlider.id  = data.id + "_volumeSlider";
			volumeSlider.className = "videoVolumeSlider";
			volumeSlider.type  = "range";
			volumeSlider.appid = data.id;
			volumeSlider.min   = 0;
			volumeSlider.max   = 1;
			volumeSlider.step  = 0.05;
			// Set the initial value
			volumeSlider.value = initialVolume / 10;
			// Setup a callback for slider
			volumeSlider.addEventListener('input', changeVolume, false);
			// set the initial volume
			changeVolume({target: volumeSlider});
			// Add slider to the DOM
			volume.appendChild(volumeSlider);

			videoRow2.appendChild(volume);

			main.appendChild(vid);
			videosTable.appendChild(videoRow);
			videosTable.appendChild(videoRow2);
		}
	});

	wsio.on('setItemPosition', function (data) {
		if (audioPannerNodes[data.elemId]) {
			// Calculate center of the application window
			var halfTotalWidth = totalWidth / 2;
			var centerX = data.elemLeft + data.elemWidth / 2 - halfTotalWidth;
			if (centerX < -totalWidth) {
				centerX = -totalWidth;
			}
			if (centerX > totalWidth) {
				centerX = totalWidth;
			}
			// Update the panner position
			var panX = centerX / totalWidth;
			var panY = 0;
			var panZ = 1 - Math.abs(panX);
			var panNode = audioPannerNodes[data.elemId];
			panNode.setPosition(panX, panY, panZ);
		}
	});

	wsio.on('setItemPositionAndSize', function (data) {
		if (audioPannerNodes[data.elemId]) {
			// Calculate center of the application window
			var halfTotalWidth = totalWidth / 2;
			var centerX = data.elemLeft + data.elemWidth / 2 - halfTotalWidth;
			if (centerX < -totalWidth) {
				centerX = -totalWidth;
			}
			if (centerX > totalWidth) {
				centerX = totalWidth;
			}
			// Update the panner position
			var panX = centerX / totalWidth;
			var panY = 0;
			var panZ = 1 - Math.abs(panX);
			var panNode = audioPannerNodes[data.elemId];
			panNode.setPosition(panX, panY, panZ);
		}
	});

	wsio.on('setVolume', function(data) {
		// Get the slider element
		var slider = document.getElementById(data.id + "_volumeSlider");
		// Change its value
		slider.value = data.level;
		// Go change the actual volume (gain)
		changeVideoVolume(data.id, data.level);
	});

	wsio.on('videoPlaying', function(data) {
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

	wsio.on('deleteElement', function(data) {
		// Limit the number of sounds
		if (numberOfSounds < maxNumberOfSounds) {
			numberOfSounds = numberOfSounds + 1;

			// Play an audio blop
			var deleteSound = createjs.Sound.play("deleteapp");

			// Callback when sound is done playing
			deleteSound.on('complete', function(evt) {
				numberOfSounds = numberOfSounds - 1;
			});
		}

		// Stop video
		var vid = document.getElementById(data.elemId);
		if (vid) {
			vid.pause();
		}

		// Clean up the DOM
		deleteElement(data.elemId);
		deleteElement(data.elemId + "_row");
		deleteElement(data.elemId + "_row2");

		// Delete also the webaudio nodes
		delete audioPannerNodes[data.elemId];
		delete audioGainNodes[data.elemId];
	});

	wsio.on('connectedToRemoteSite', function(data) {
		// Play an audio blop when a remote site comes up or down
		if (data.connected === "on") {
			createjs.Sound.play("remote");
		}
		if (data.connected === "off") {
			createjs.Sound.play("down");
		}
	});

	wsio.on('setAppSharingFlag', function(data) {
		// Play an audio blop when sending an app to a remote site
		if (data.sharing) {
			createjs.Sound.play("send");
		}
	});

}

/**
 * Callback for Soundjs library when all audio assets loaded
 *
 * @method handleSoundJSLoad
 * @param event {Event} event data
 */
function handleSoundJSLoad(event) {
	if (event.id === "startup") {
		// Play the startup jingle at load
		var instance = createjs.Sound.play(event.src);
		// Set the volume
		instance.volume = initialVolume / 10;
	}
	console.log('SoundJS> asset loaded', event.id);
}


/**
 * Handler for the volume slider
 *
 * @method changeVolume
 * @param event {Event} event data
 */
function changeVolume(event) {
	var volumeSlider = event.target;
	var vol = volumeSlider.value;
	wsio.emit("setVolume", {id: volumeSlider.appid, level: vol});

	// Dont need to change volume since the server will send message
	// changeVideoVolume(volumeSlider.appid, vol);
}

/**
 * Change the volume of a video
 *
 * @method changeVideoVolume
 * @param videoId {String} id of the video
 * @param volume {Number} new volume value
 */
function changeVideoVolume(videoId, volume) {
	// Change the gain (0 to 1)
	audioGainNodes[videoId].gain.value = volume;
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
