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
		
		this.resizeEvents = "continuous";
	},

	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

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
		
		if(isMaster){
			this.searchTweets("tweetResults", {q: "#UIC", language: "en", count: 100}, true);
		}
		
		this.tweets = [];
		this.words = [];
		this.min = 1; //9e12;
		this.max = 7; //0;
		this.words.push({text: "Hello",  count: 7, color: [255, 180, 100], orientation:  0});
		this.words.push({text: "World",  count: 1, color: [255, 180, 100], orientation: 90});
		this.words.push({text: "Use",    count: 3, color: [100, 180, 255], orientation:  0});
		this.words.push({text: "More",   count: 6, color: [255, 180, 100], orientation:  0});
		this.words.push({text: "Test",   count: 7, color: [255, 180, 100], orientation: 90});
		this.words.push({text: "in",     count: 4, color: [255, 180, 100], orientation: 90});
		this.words.push({text: "FUTURE", count: 2, color: [100, 180, 255], orientation:  0});
	
		this.drawWordCloudFunc = this.drawWordCloud.bind(this);
	},

	load: function(state, date) {
		
	},
	
	tweetResults: function(data) {
		var i;
		
		this.tweets = [];
		for(i=0; i<data.result.statuses.length; i++){
			var text = data.result.statuses[i].text;
			if(data.result.statuses[i].retweeted_status) text = data.result.statuses[i].retweeted_status.text;
			this.tweets.push(text);
		}
	},
	
	generateWordCloud: function() {
		var _this = this;
		var width  = parseInt(this.element.style.width,  10);
		var height = parseInt(this.element.style.height, 10);
		
		d3.layout.cloud()
		.size([width, height])
		.words(this.words
		.map(function(d) {
			var scalar = (d.count-_this.min)/(_this.max-_this.min);
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
		.on("end", this.drawWordCloudFunc)
		.start();
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
	
	draw: function(date) {
		// clear content
		this.svg.selectAll("*").remove();
		
		var width  = parseInt(this.element.style.width,  10);
		var height = parseInt(this.element.style.height, 10);
		var box    = "0,0,"+width+","+height;
		this.svg.attr("viewBox", box);
		
		this.generateWordCloud();
	},

	resize: function(date) {
		this.svg.attr("width",  parseInt(this.element.style.width,  10));
		this.svg.attr("height", parseInt(this.element.style.height, 10));
	},
	
	event: function(eventType, pos, user, data, date) {
		if(eventType === "keyboard"){
			if(data.character === " ") this.refresh(date);
		}
	}
});