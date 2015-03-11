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
 * Live decoding of video using the fluent-ffmpeg package (not used anymore)
 *
 * @module livevideodecoder
 * @requires child_process, fluent-ffmpeg
 */

// require variables to be declared
"use strict";

var exec   = require('child_process').exec;  // spawn a process and receive output
var ffmpeg = require('fluent-ffmpeg');       // ffmpeg video manipulator

/**
 * LiveVideoDecoder class
 *
 * @class LiveVideoDecoder
 * @constructor
 */
function LiveVideoDecoder(options) {
	this.options       = options;

	this.url           = null;
	this.width         = null;
	this.height        = null;
	this.numframes     = null;
	this.framerate     = null;
	this.frameSize     = null;

	this.yuvFrame      = null;
	this.frameIdx      = 0;

	this.decode        = null;
	this.startTime     = 0.0;
	this.playAfterSeek = false;

	this.onmetadata    = null;
	this.onstartdecode = null;
	this.onstopdecode  = null;
	this.onnewframe    = null;
}

/**
 *
 *
 * @method initializeLiveDecoder
 */
LiveVideoDecoder.prototype.initializeLiveDecoder = function(url) {
	var _this = this;

	this.url = url;
	var fURL = "\"" + url + "\""; // must quote around url in case there are spaces or other special characters
	var cmd = (this.options.ffmpegPath || "") + "ffprobe";
	exec(cmd + " -of json -show_streams -show_format " + fURL, function (error, stdout, stderr) {
		var data = JSON.parse(stdout);
		if(error) throw error;

		for(var i=0; i<data.streams.length; i++){
			if(data.streams[i].codec_type === "video"){
				_this.width     = data.streams[i].width  + (data.streams[i].width %2); // ensure even width
				_this.height    = data.streams[i].height + (data.streams[i].height%2); // ensure even height
				_this.numframes = data.streams[i].nb_frames;
				_this.frameSize = _this.width*_this.height*1.5;

				var avg_framerate = data.streams[i].avg_frame_rate;
				var div = avg_framerate.indexOf("/");
				var numerator = avg_framerate.substring(0, div);
				var denominator = avg_framerate.substring(div+1, avg_framerate.length);

				_this.framerate = numerator/denominator;

				break;
			}
		}

		if(_this.onmetadata instanceof Function)
			_this.onmetadata(error, {width: _this.width, height: _this.height, numframes: _this.numframes, framerate: _this.framerate});
	});
};

/**
 *
 *
 * @method startLiveDecoding
 */
LiveVideoDecoder.prototype.startLiveDecoding = function() {
	var _this = this;

	var readPosition = 0;
	var frameBuffer  = new Buffer(this.frameSize);

	var command = ffmpeg(this.url).native().seekInput(this.frameIdx/this.framerate).size(this.width+'x'+this.height).outputFormat('rawvideo').outputOptions('-pix_fmt yuv420p');
	if(this.options.ffmpegPath !== undefined) command.setFfmpegPath(this.options.ffmpegPath + "ffmpeg");
	command.on('start', function(commandLine) {
		_this.decode = command;
		if(_this.onstartdecode instanceof Function) _this.onstartdecode();
	});
	command.on('error', function(err) {
		if(_this.onstopdecode instanceof Function) _this.onstopdecode(err.message, false);
		_this.decode = null;
	});
	command.on('end', function() {
		if(_this.onstopdecode instanceof Function) _this.onstopdecode(null, true);
		_this.decode   = null;
		_this.frameIdx = 0;
	});

	var ffstream = command.pipe();
	ffstream.on('data', function(chunk) {
		// next chunk of data does not overflow frame
		if(readPosition+chunk.length <= _this.frameSize){
			chunk.copy(frameBuffer, readPosition);
			readPosition += chunk.length;
			if(readPosition === _this.frameSize){
				_this.yuvFrame = frameBuffer;

				if(_this.onnewframe instanceof Function) _this.onnewframe(_this.frameIdx, _this.yuvFrame);

				_this.frameIdx++;
				readPosition = 0;
			}
		}
		// next chunk of data overflows frame
		else{
			var current  = _this.frameSize - readPosition;
			var overflow = chunk.length - current;

			chunk.copy(frameBuffer, readPosition, 0, current);

			_this.yuvFrame = frameBuffer;

			if(_this.onnewframe instanceof Function) _this.onnewframe(_this.frameIdx, _this.yuvFrame);

			_this.frameIdx++;
			chunk.copy(frameBuffer, 0, current, chunk.length);
			readPosition = overflow;
		}
	});
};

/**
 *
 *
 * @method pauseLiveDecoding
 */
LiveVideoDecoder.prototype.pauseLiveDecoding = function() {
	if(this.decode !== null) this.decode.kill();
};

/**
 *
 *
 * @method stopLiveDecoding
 */
LiveVideoDecoder.prototype.stopLiveDecoding = function() {
	if(this.decode !== null) this.decode.kill();
	this.frameIdx = 0;
};

/**
 *
 *
 * @method startSeekLiveDecoding
 */
LiveVideoDecoder.prototype.startSeekLiveDecoding = function() {
	if(this.decode !== null){
		this.decode.kill();
		this.playAfterSeek = true;
	}
	else {
		this.playAfterSeek = false;
	}
};

/**
 *
 *
 * @method updateSeekLiveDecoding
 */
LiveVideoDecoder.prototype.updateSeekLiveDecoding = function(frameIdx) {
	this.frameIdx = frameIdx;
};

/**
 *
 *
 * @method finishSeekLiveDecoding
 */
LiveVideoDecoder.prototype.finishSeekLiveDecoding = function() {
	if(this.playAfterSeek === true) this.startLiveDecoding();
};

module.exports = LiveVideoDecoder;
