// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014
//
// Facebook Plugin written by Todd Margolis
// https://131.193.76.169:9090/uploads/apps/facebook/facebook.js


var facebook = SAGE2_App.extend( {

    construct: function() {
        // call the constructor of the base class
        arguments.callee.superClass.construct.call(this);

        // initialize your variables
        this.myvalue = 5.0;

        this.resizeEvents = "continuous";//see below for other options
    },

    init: function(id, width, height, resrc, date) {    
        // call super-class 'init'
        arguments.callee.superClass.init.call(this, id, "div", width, height, resrc, date);

        // application specific 'init'
        this.log("Init");


		// may need a global handler for callbacks (i.e. scope pollution)
		Facebook_self = this;

		// create a new div element and give it some content
		var newDiv = document.createElement("div");
		var btn=document.createElement("BUTTON");
		var btnText=document.createTextNode("facebook");
		btn.appendChild(btnText);
		btn.addEventListener("click", hello('facebook'));
		// btn.addEventListener("click", console.log('windows'));

		newDiv.appendChild(btn); //add the text node to the newly created div. 

		// add the newly created element and its content into the DOM
		// document.getElementById(id).appendChild(newDiv);
		this.element.appendChild(newDiv);
		// my_div = document.getElementById("org_div1");
		// document.body.insertBefore(newDiv, my_div);



		hello.on('auth.login', function(auth){
			
			// // call user information, for the given network
			// hello( auth.network ).api( '/me' ).success(function(r){
			// 	var $target = $("#profile_"+ auth.network );
			// 	if($target.length==0){
			// 		$target = $("<div id='profile_"+auth.network+"'></div>").appendTo("#profile");
			// 	}
			// 	$target.html('<img src="'+ r.thumbnail +'" /> Hey '+r.name).attr('title', r.name + " on "+ auth.network);
			// });

			// hello( "facebook" ).api("508535142/albums").success(function(json){
			hello( "facebook" ).api("me/albums").success(function(json){
				console.log(json);
				for(a=0; a<json.data.length; a++){
					if(json.data[a].thumbnail){
						console.log(json.data[a].thumbnail);
						var i = document.createElement("IMG");
						i.src = json.data[a].thumbnail;
						i.width = 125;
						i.height = 125;
						Facebook_self.element.appendChild(i);
					}
				}
			}).error(function(){
				alert("Whoops!");
			});


		});

		hello.init({ 
			facebook : 802427029778044
			},{
			scope:'user_photos'
			}
		);

		hello( "facebook", {display:'page'} ).login( function(){
			console.log("You are signed in to Facebook");
			// alert("You are signed in to Facebook");
		});

    },

    //load function allows application to begin with a particular state.  Needed for remote site collaboration. 
    load: function(state, date) {
        //your load code here- state should define the initial/current state of the application
    },

    draw: function(date) {
        // application specific 'draw'
        this.log("Draw");

        //may need to update state here
    },

    resize: function(date) {
        // to do:  may be a super class resize
        // or your resize code here
        this.refresh(date); //redraw after resize
    },

    event: function(eventType, userId, x, y, data, date) {
        // see event handling description below

        // may need to update state here

        // may need to redraw 
        this.refresh(date);
    },

    quit: function() {
           // It's the end
           this.log("Done");
    }

});
