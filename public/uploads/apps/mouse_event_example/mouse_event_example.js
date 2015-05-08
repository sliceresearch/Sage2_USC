// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

var mouse_event_example = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.minDim = null;
		this.stage  = null;
		this.layer1 = null;
		this.width  = null;
		this.height = null;
		this.resizeEvents = "continuous";
	},

	init: function(data) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, "div",  data);

		this.maxFPS = 30;

		this.element.id = "div" + data.id;
		this.width  = this.element.clientWidth;
		this.height = this.element.clientHeight;

		this.fillWithHtml();

	},

	fillWithHtml : function () {
		var elem = document.getElementById( this.element.id );
		elem.innerHTML +=
			"<div id='manipArea' style='position:absolute; background:gray;width:"+this.width+"px;height:"+this.height+"px'> Inside the full div</div>";
		
		elem.innerHTML +=
			"<div id='redPoint' style='position:absolute; background:red;width:4px;height:4px'></div>";
		
		elem.innerHTML +=
			"<div style='position:absolute; top:100px; left:500px; background:lightgray'> " // + "text</div>";
			+	"<form>"
			+	"<input id='stuffInput' type='text name='fname'>"
			+	"<button id='stuffButton' type='button'>Stuff!</button>"
			+	"</form></div>";
		elem.innerHTML +=
			"<div id='stuffResult' style='position:absolute; top:130px; left:500px; background:lightgray; width: 200px; height:20px'>Stuff Result!</div>";


		elem.innerHTML += 
			"<div id='sq1' style='position:absolute; background:lightgray;width:100px;height:100px;top:100px;left:100px'>click for green</div>";
		elem.innerHTML += 
			"<div id='sq2' style='position:absolute; background:lightgray;width:100px;height:100px;top:100px;left:300px'>press over for blue, release for gray</div>";


		elem.innerHTML += 
			"<div id='sq3' style='position:absolute; background:lightgray;width:200px;height:200px;top:300px;left:100px;border: solid black 1px'>mouseover for green</div>";
		elem.innerHTML += 
			"<div id='sq4' style='position:absolute; background:lightgray;width:100px;height:100px;top:350px;left:50px;border: solid black 1px'>mouseover for red</div>";
		elem.innerHTML += 
			"<div id='sq5' style='position:absolute; background:lightgray;width:100px;height:100px;top:350px;left:250px;border: solid black 1px'>mouseover for blue</div>";


		elem.innerHTML +=
			"<div id='st1' style='position:absolute; background:lightgray;width:360px;height:280px;top:300px;left:400px;border:solid black 1px'>"
			+ "<div id='st2' style='position:absolute; background:lightgray;width:160px;height:160px;top:40px;left:40px;border:solid black 1px'>"
			+ "<div id='st3' style='position:absolute; background:lightgray;width:160px;height:160px;top:40px;left:60px;border:solid black 1px'>"
			+ "<div id='st4' style='position:absolute; background:lightgray;width:160px;height:40px;top:40px;left:-40px;border:solid black 1px'>"
			+ "<div id='st5' style='position:absolute; background:lightgray;width:40px;height:300px;top:-200px;left:100px;border:solid black 1px'>"
			+ "</div>"
			+ "</div>"
			+ "</div>"
			+ "</div>"
			+ "</div>";



		var manipArea = document.getElementById('manipArea');
		manipArea.addEventListener("mousemove", function( event ) {  
			var redPoint = document.getElementById('redPoint');
			redPoint.style.left = event.clientX +"px"; 
			redPoint.style.top = event.clientY +"px";
		});

		var sq1 = document.getElementById('sq1');
		sq1.addEventListener("click", function( event ) { 
			//console.log("switch"); 
			if(this.innerHTML == "click for green"){
				this.style.background = "lightgreen";
				this.innerHTML = "click for gray";
			}
			else {
				this.style.background = "lightgray";
				this.innerHTML = "click for green";
			}
		});

		var sq2 = document.getElementById('sq2');
		sq2.addEventListener("mousedown", function( event ) {  
			this.style.background = "lightblue";
		});
		sq2.addEventListener("mouseup", function( event ) {  
			this.style.background = "lightgray";
		});

		var sq3 = document.getElementById('sq3');
		sq3.addEventListener("mouseover", function( event ) {  
			this.style.background = "green";
		});
		sq3.addEventListener("mouseout", function( event ) {  
			this.style.background = "lightgray";
		});

		var sq4 = document.getElementById('sq4');
		sq4.addEventListener("mouseover", function( event ) {  
			this.style.background = "red";
		});
		sq4.addEventListener("mouseout", function( event ) {  
			this.style.background = "lightgray";
		});

		var sq5 = document.getElementById('sq5');
		sq5.addEventListener("mouseover", function( event ) {  
			this.style.background = "blue";
		});
		sq5.addEventListener("mouseout", function( event ) {  
			this.style.background = "lightgray";
		});

		var stuffButton = document.getElementById('stuffButton');
		stuffButton.addEventListener("click", function( event ) {  
			var stuffResult = document.getElementById('stuffResult');
			stuffResult.innerHTML = stuffResult.innerHTML.substring(stuffResult.innerHTML.length/2);
			stuffResult.innerHTML += document.getElementById('stuffInput').value;
			document.getElementById('stuffInput').value = "";
		});


		var st1 = document.getElementById('st1');
		st1.addEventListener("mouseenter", function( event ) {  
			this.style.background = "lightblue";
		});
		st1.addEventListener("mouseleave", function( event ) {  
			this.style.background = "lightgray";
		});

		var st2 = document.getElementById('st2');
		st2.addEventListener("mouseenter", function( event ) {  
			this.style.background = "lightgreen";
		});
		st2.addEventListener("mouseleave", function( event ) {  
			this.style.background = "lightgray";
		});

		var st3 = document.getElementById('st3');
		st3.addEventListener("mouseenter", function( event ) {  
			this.style.background = "magenta";
		});
		st3.addEventListener("mouseleave", function( event ) {  
			this.style.background = "lightgray";
		});

		var st4 = document.getElementById('st4');
		st4.addEventListener("mouseenter", function( event ) {  
			this.style.background = "orange";
		});
		st4.addEventListener("mouseleave", function( event ) {  
			this.style.background = "lightgray";
		});

		var st5 = document.getElementById('st5');
		st5.addEventListener("mouseenter", function( event ) {  
			this.style.background = "yellow";
		});
		st5.addEventListener("mouseleave", function( event ) {  
			this.style.background = "lightgray";
		});



	},

	load: function(state, date) {
	},

	draw: function(date) {
	},


	resize: function(date) {
	},
	
	event: function(eventType, position, user_id, data, date) {
		//this.refresh(date);
		sagemep.processAndPassEvents( this.element.id, eventType, position, user_id, data, date );
		
	} //end event function

});













