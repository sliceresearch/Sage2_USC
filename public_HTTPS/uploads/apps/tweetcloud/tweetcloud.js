// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var tweetcloud = SAGE2_App.extend( {
	construct: function() {
		// call super-class 'construct'
		arguments.callee.superClass.construct.call(this);
		
		this.svg    = null;
		this.tweets = null;
		this.words  = null;
		this.min    = null;
		this.max    = null;
		this.query  = null;
		
		this.resizeEvents = "continuous";
		this.enableControls = true;
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);
		
		var _this = this;
		
		this.element.id = id + "_div";
		this.element.style.backgroundColor = "#FFFFFF";
		
		var width  = parseInt(this.element.style.width,  10);
		var height = parseInt(this.element.style.height, 10);
		var box    = "0,0,"+width+","+height;
		
		this.svg = d3.select("#" + id + "_div").append("svg")
		.attr("id",      id + "_svg")
		.attr("width",   width)
		.attr("height",  height)
		.attr("viewBox", box);
		
		this.query = "#UIC";
		
		if(isMaster){
			this.searchTweets("tweetResults", {q: this.query, language: "en", count: 100}, false);
		}
		
		this.tweets = [];
		this.words = [];
		this.min = 1;
		this.max = 1;
	
		this.updateWordCloudFunc = this.updateWordCloud.bind(this);
		this.sortByDateFunc = this.sortByDate.bind(this);
		
		this.controls.addTextInput({action: function(text) {
			_this.query = text;
			_this.clear();
			if(isMaster){
				_this.searchTweets("tweetResults", {q: _this.query, language: "en", count: 100}, false);
			}
		}});
		this.controls.finishedAddingControls(); // Important
	},

	load: function(state, date) {
		
	},
	
	tweetResults: function(data) {
		// only executed by master - since only master called searchTweets
		var i;
		this.tweets = [];
		for(i=0; i<data.result.statuses.length; i++){
			var text = data.result.statuses[i].text;
			if(data.result.statuses[i].retweeted_status) text = data.result.statuses[i].retweeted_status.text;
			var date_arr = data.result.statuses[i].created_at.split(" ");
			var time_arr = date_arr[3].split(":");
			var year  = parseInt(date_arr[5], 10);
			var month = this.monthStr2Num(date_arr[1]);
			var day   = parseInt(date_arr[2], 10);
			var hour  = parseInt(time_arr[0], 10);
			var min   = parseInt(time_arr[1], 10);
			var sec   = parseInt(time_arr[2], 10);
			var date = new Date(year, month, day, hour, min, sec, 0);
			this.tweets.push({text: text, date: date});
		}
		this.tweets.sort(this.sortByDateFunc);
		this.tweets = this.tweets.slice(Math.max(0, this.tweets.length-200));
		
		this.createWords(data.query.q);
	},
	
	createWords: function(query) {
		// only executed by master - called by tweetResults
		var i,j;
		var words = [];
		var min = 9e12;
		var max = 0;
		var tweetStats = {hashtags: {}, users: {}};
		
		for(i=0; i<this.tweets.length; i++){
			var hashtag = this.tweets[i].text.match(/#\w+/g) || [];
			var user    = this.tweets[i].text.match(/@\w+/g) || [];
			
			for(j=0; j<hashtag.length; j++){
				if(hashtag[j].toLowerCase() === query.toLowerCase()) continue;
				if(tweetStats.hashtags[hashtag[j]] === undefined) tweetStats.hashtags[hashtag[j]] = 1;
				else                                              tweetStats.hashtags[hashtag[j]]++;
			}
			for(j=0; j<user.length; j++){
				if(tweetStats.users[user[j]] === undefined) tweetStats.users[user[j]] = 1;
				else                                        tweetStats.users[user[j]]++;
			}
		}
		
		for(key in tweetStats.hashtags){
			if(tweetStats.hashtags.hasOwnProperty(key)){
				if(tweetStats.hashtags[key] < min) min = tweetStats.hashtags[key];
				if(tweetStats.hashtags[key] > max) max = tweetStats.hashtags[key];
				words.push({text: key, count: tweetStats.hashtags[key], color: [255, 180, 100], orientation: Math.floor(Math.random()*2) * 90});
			}
		}
		for(key in tweetStats.users){
			if(tweetStats.users.hasOwnProperty(key)){
				if(tweetStats.users[key] < min) min = tweetStats.users[key];
				if(tweetStats.users[key] > max) max = tweetStats.users[key];
				words.push({text: key, count: tweetStats.users[key], color: [100, 180, 255], orientation: Math.floor(Math.random()*2) * 90});
			}
		}
		
		this.generateWordCloud(words, min, max);
	},
	
	generateWordCloud: function(words, min, max) {
		// only executed by master - called by tweetResults --> createWords
		var width  = parseInt(this.element.style.width,  10);
		var height = parseInt(this.element.style.height, 10);
		
		d3.layout.cloud()
		.size([width, height])
		.words(words
		.map(function(d) {
			var scalar = (d.count-min)/(max-min);
			var minDim = Math.min(width, height);
			var result = {
				text:         d.text,
				size:         (minDim*0.025) + (scalar * (minDim*0.20)),
				count:        d.count,
				color:        "rgb("+d.color[0]+","+d.color[1]+","+d.color[2]+")",
				orientation:  d.orientation
			}
			return result;
		}))
		.padding(1)
		.rotate(function(d) {
			return d.orientation;
		})
		.font("Impact")
		.fontSize(function(d) {
			return d.size;
		})
		.on("end", this.updateWordCloudFunc)
		.start();
	},
	
	updateWordCloud: function(words) {
		this.broadcast("drawWordCloud", words);
	},
	
	drawWordCloud: function(words) {
		var width  = parseInt(this.element.style.width,  10);
		var height = parseInt(this.element.style.height, 10);
		
		this.svg
		.append("g")
		.attr("transform", "translate(" + Math.round(width/2) + "," + Math.round(height/2) + ")")
		.selectAll("text")
		.data(words)
		.enter()
		.append("text")
		.style("font-size", function(d) {
			return d.size + "px";
		})
		.style("font-family", "Impact")
		.style("fill", function(d, i) {
			return d.color;
		})
		.attr("text-anchor", "middle")
		.attr("transform", function(d) {
			return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
		})
		.text(function(d) {
			return d.text;
		});
	},
	
	monthStr2Num: function(month) {
		month = month.toLowerCase();
		if(month === "jan" || month === "january")   return  0;
		if(month === "feb" || month === "february")  return  1;
		if(month === "mar" || month === "march")     return  2;
		if(month === "apr" || month === "april")     return  3;
		if(month === "may" || month === "may")       return  4;
		if(month === "jun" || month === "june")      return  5;
		if(month === "jul" || month === "july")      return  6;
		if(month === "aug" || month === "august")    return  7;
		if(month === "sep" || month === "september") return  8;
		if(month === "oct" || month === "october")   return  9;
		if(month === "nov" || month === "november")  return 10;
		if(month === "dec" || month === "december")  return 11;
		return -1;
	},
	
	sortByDate: function(a, b) {
		return a.date.getTime() - b.date.getTime();
	},
	
	clear: function() {
		// clear content
		this.svg.selectAll("*").remove();
		
		var width  = parseInt(this.element.style.width,  10);
		var height = parseInt(this.element.style.height, 10);
		var box    = "0,0,"+width+","+height;
		this.svg.attr("viewBox", box);
	},
	
	draw: function(date) {
		// do nothing - drawing done elsewhere (when tweets are received)
	},

	resize: function(date) {
		this.svg.attr("width",  parseInt(this.element.style.width,  10));
		this.svg.attr("height", parseInt(this.element.style.height, 10));
	},
	
	event: function(eventType, pos, user, data, date) {
		if(eventType === "keyboard"){
			if(data.character === " ") {
				this.clear();
				if(isMaster){
					this.searchTweets("tweetResults", {q: this.query, language: "en", count: 100}, false);
				}
			}
		}
	}
});