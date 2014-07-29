// SAGE2 is available for use under the following license, commonly known
//          as the 3-clause (or "modified") BSD license:
//
// Copyright (c) 2014, Electronic Visualization Laboratory,
//                     University of Illinois at Chicago
// All rights reserved.
//
// http://opensource.org/licenses/BSD-3-Clause
// See included LICENSE.txt file

var tank = SAGE2_App.extend( {
	construct: function() {
		arguments.callee.superClass.construct.call(this);

		this.ctx = null;
		this.resizeEvents = "continuous";
		//not going to touch the above information.

		//tank variables
		this.barrierList = null;
		this.tankList = null;
		this.tankWidth = null;
		this.tankHeight = null;
		this.shotWidth = null;
		this.shotHeight = null;
		//speed vars
		this.tankSpeedTick = null; // *10 for 100px per second.
		this.shotSpeedTick = null; // * 10 for 400px per second.
		this.spawnRefresh = null;
		this.maxFPS = 60.0;
		console.log("Completed construction");
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
		
		// application specific 'init'
		this.ctx = this.element.getContext("2d");

		//tank variables
		this.barrierList = [];
		this.generateBarriers(7);
		this.tankList   = [];
		this.tankWidth  = 100;
		this.tankHeight = 100;
		this.shotWidth  = 50;
		this.shotHeight = 50;
		//
		this.tankSpeedTick = 10; // this is a per frame movement
		this.shotSpeedTick = 40; //
		this.spawnRefresh  = 3;
		console.log("Completed init");
	},
	
	load: function(state, date) {
	},
	
	draw: function(date) {
		// clear canvas	
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
		this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
		this.ctx.fillRect(0,0, this.element.width, this.element.height);

		this.barrierDraw();
		
		this.ctx.fillStyle = "rgba(170, 140, 100, 1.0)";

		for(var i = 0; i < this.tankList.length; i++){
			if(this.tankList[i].spawnDelay <= 3){
				this.tankList[i].spawnDelay += this.dt;
			}
			//if tank alive
			if (this.tankList[i].alive === true) {
				this.tankMoveAndDrawUpdates(i);
			} //end if the tank was alive
			else if(this.tankList[i].x > 0 && this.tankList[i].spawnDelay <= 3){
				this.ctx.fillStyle = "rgba(0,0,0, 1.0)";
				this.ctx.font = '20pt Helvetica';
				// this.ctx.fillText( "Spawn Delay: " + Math.ceil(this.spawnRefresh - this.tankList[i].spawnDelay), this.tankList[i].x +2, this.tankList[i].y +2);
				// this.ctx.fillText( "Spawn Delay: " + Math.ceil(this.spawnRefresh - this.tankList[i].spawnDelay), this.tankList[i].x +2, this.tankList[i].y -2);
				// this.ctx.fillText( "Spawn Delay: " + Math.ceil(this.spawnRefresh - this.tankList[i].spawnDelay), this.tankList[i].x -2, this.tankList[i].y +2);
				// this.ctx.fillText( "Spawn Delay: " + Math.ceil(this.spawnRefresh - this.tankList[i].spawnDelay), this.tankList[i].x -2, this.tankList[i].y -2);
				
				this.ctx.fillStyle = "rgba("+this.tankList[i].color+", 1.0)";
				this.ctx.fillText( "Spawn Delay: " + Math.ceil(this.spawnRefresh - this.tankList[i].spawnDelay), this.tankList[i].x, this.tankList[i].y);
			}
			//shot updates
			for(var j = 0; j < this.tankList[i].shots.length; j++){
				if(this.tankList[i].shots[j].alive){ //only if the shot is alive
					this.shotMoveAndDrawUpdates(i, j);
				}
			}//end for each shot
			
		} //for each tank

	},
	
	resize: function(date) {
		this.refresh(date);
	},

	event: function(eventType, position, userId, data, date) {
		var x = position.x;
		var y = position.y;
		//if got key press / pointer click
		if (eventType == "keyboard" || eventType == "pointerPress") {
			console.log("event", data, userId);
			console.log("Event received from:" + userId.id + ". Event:" + eventType);
			console.log("   added info: " + userId.label + " has color " + userId.color);
			//vars to see if it was a new user
			var newUser = true;
			var userNumber = -1;
			//check to see if the input is from an already known user.
			for(var i = 0; i < this.tankList.length; i++){
				if(userId.id == this.tankList[i].clientID) {
					newUser = false;
					userNumber = i;
					break;
				}
			}
			//check if need to create a new tank for a user
			if( newUser || userNumber == -1){
				this.addTank(userId.id, userId.label, userId.color);
				userNumber = this.tankList.length -1;
			}

			if (eventType == "keyboard") {
				//	client, alive, xpos, ypos,   button array (up/down/left/right, kills, shotsarray
				//	[userName, false, -1000, -1000, [false, false, false, false[]], 0, tempShots ]  );
				//		0		1 		2     3      4 							5    6
				if(data.character == 'w'){	this.tankList[userNumber].buttons[0] = true ;	this.tankList[userNumber].buttons[4][0] = 0;} //up is w
				if(data.character == 's'){	this.tankList[userNumber].buttons[1] = true ;	this.tankList[userNumber].buttons[4][1] = 0;} //down is s
				if(data.character == 'a'){	this.tankList[userNumber].buttons[2] = true;	this.tankList[userNumber].buttons[4][2] = 0;} //left is a
				if(data.character == 'd'){	this.tankList[userNumber].buttons[3] = true ;	this.tankList[userNumber].buttons[4][3] = 0;} //right is d
			} //end if was a keyboard input

			else if (eventType == "pointerPress") {
				if(this.tankList[userNumber].alive == false && this.tankList[userNumber].spawnDelay >= 3){
					this.tankList[userNumber].alive = true;
					this.tankList[userNumber].x = x;
					this.tankList[userNumber].y = y;
					console.log("trying to spawn");
				}
				else if (this.tankList[userNumber].alive) {
					console.log("trying to shoot from tank" + userNumber);
					this.tryShoot(userNumber, x, y);
				}
				else {
					this.tankList[userNumber].x = x;
					this.tankList[userNumber].y = y;
				}
			} //end if was a pointer press
		} //end if a valid event happened.
	}, //end event function

	barrierDraw : function() {
		this.ctx.fillStyle = "rgba(0,0,0, 1.0)";
		for(var b = 0; b < this.barrierList.length; b++) {
			this.ctx.fillRect( this.barrierList[b].x - this.barrierList[b].width/2, this.barrierList[b].y - this.barrierList[b].height/2, this.barrierList[b].width, this.barrierList[b].height);
		}
	}, //end barrierDraw
	
	tankMoveAndDrawUpdates: function(i) {
		//		client, alive, xpos, ypos,   button array (up/down/left/right, kills, shotsarray
		//	[userName, false, -1000, -1000, [false, false, false, false],		 0, tempShots ]  );
		//		0		1 		2     3      4 							5    6
				
		var vertChange = false;
		var horiChange = false;
		var vertValueChange = 0;
		var horiValueChange = 0;
		if(this.tankList[i].buttons[0] || this.tankList[i].buttons[1] ){ vertChange = true; }
		if(this.tankList[i].buttons[2] || this.tankList[i].buttons[3] ){ horiChange = true; }

		if(this.tankList[i].buttons[0]) { //up button
			this.tankList[i].buttons[4][0] += 1; //timer control to turn off movement. has to be done since "up" detection isn't implemented
			if(this.tankList[i].buttons[4][0] >= 10){this.tankList[i].buttons[0] = false; this.tankList[i].buttons[4][0] = 0;}
			if(horiChange){ vertValueChange = -1 * (this.tankSpeedTick) / 2; } 
			else { vertValueChange = -1 * (this.tankSpeedTick); } //change ypos by 
			this.tankList[i].y += vertValueChange;
		}
		else if(this.tankList[i].buttons[1]) { //down button
			this.tankList[i].buttons[4][1] += 1;
			if(this.tankList[i].buttons[4][1] >= 10){this.tankList[i].buttons[1] = false; this.tankList[i].buttons[4][1] = 0;}
			if(horiChange){ vertValueChange = (this.tankSpeedTick) / 2; } 
			else { vertValueChange =  (this.tankSpeedTick); } //change ypos by 
			this.tankList[i].y += vertValueChange;
		}
		if(this.tankList[i].buttons[2]) { //left button
			this.tankList[i].buttons[4][2] += 1;
			if(this.tankList[i].buttons[4][2] >= 10){this.tankList[i].buttons[2] = false; this.tankList[i].buttons[4][2] = 0;}
			if(vertChange){ horiValueChange = -1 * (this.tankSpeedTick) / 2; } 
			else { horiValueChange = -1 * (this.tankSpeedTick); } //change ypos by 
			this.tankList[i].x += horiValueChange;
		}
		else if(this.tankList[i].buttons[3]) { //right button
			this.tankList[i].buttons[4][3] += 1;
			if(this.tankList[i].buttons[4][3] >= 10){this.tankList[i].buttons[3] = false; this.tankList[i].buttons[4][3] = 0;}
			if(vertChange){ horiValueChange = (this.tankSpeedTick) / 2; } 
			else { horiValueChange =  (this.tankSpeedTick); } //change ypos by 
			this.tankList[i].x += horiValueChange;
		}
		
		//prevent movement through barriers		
		for(var b = 0 ; b < this.barrierList.length; b++){
			if( this.didRectanglesCollide( {x: this.tankList[i].x , y: this.tankList[i].y , width: this.tankWidth , height: this.tankHeight} 
				, {x: this.barrierList[b].x , y: this.barrierList[b].y , width: this.barrierList[b].width , height: this.barrierList[b].height } ) ) { 
				this.tankList[i].x -= horiValueChange; //if collided with a barrier, undomovement
				this.tankList[i].y -= vertValueChange;
			}
		}//
		
		//check if tank is out of bounds and draw in bounds.
		if(this.tankList[i].x - this.tankWidth/2 < 0){ this.tankList[i].x = 0 + this.tankWidth/2; }
		if(this.tankList[i].x + this.tankWidth/2 > this.element.width){ this.tankList[i].x = this.element.width - this.tankWidth/2; }
		if(this.tankList[i].y - this.tankHeight/2 < 0){ this.tankList[i].y = 0 + this.tankHeight/2; }
		if(this.tankList[i].y + this.tankHeight/2 > this.element.height){ this.tankList[i].y = this.element.height - this.tankHeight/2; }
		//draw the tank.
		this.ctx.fillStyle = "rgba("+this.tankList[i].color + ", 1.0)";
		//this.ctx.fillStyle = "rgba(170, 140, 100, 1.0)";
		this.ctx.fillRect(this.tankList[i].x - this.tankWidth/2, this.tankList[i].y - this.tankHeight/2 , this.tankWidth, this.tankHeight);
		this.ctx.fillStyle = "rgba(0,0,0, 1.0)";
		this.ctx.font = '20pt Helvetica';
		this.ctx.fillText( this.tankList[i].name, this.tankList[i].x - this.tankWidth/2, this.tankList[i].y - this.tankHeight/2 + 20);
		this.ctx.fillText( "Kills:" + this.tankList[i].kills, this.tankList[i].x - this.tankWidth/2, this.tankList[i].y - this.tankHeight/2 + 50);
					
	}, //end tankMoveAndDrawUpdates
	
	shotMoveAndDrawUpdates : function (i,  j) { //where i is the tank and j is the specific shot
		//					alive	xpos	ypos   xvel, yvel, owner invuln		, feature bounce
		//	tempShots.push( [ false, -1000, -1000, 0,       0, 500 				, 2] );
	
		//if the shot is alive, apply velocity and barrier check
		if(this.tankList[i].shots[j].alive){
			//increase xpos by xvel
			this.tankList[i].shots[j].x += this.tankList[i].shots[j].xvel;
			//inc ypos by yvel
			this.tankList[i].shots[j].y += this.tankList[i].shots[j].yvel;
			
			//for each barrier see if there was a collision and if there was attempt to correctly reflect shot
			for(var b = 0 ; b < this.barrierList.length; b++){

				//if collided with barrier
				if( this.didRectanglesCollide( 
					{x: this.tankList[i].shots[j].x, y: this.tankList[i].shots[j].y, width: this.shotWidth, height: this.shotHeight } ,
					 {x: this.barrierList[b].x, y: this.barrierList[b].y, width: this.barrierList[b].width, height: this.barrierList[b].height } )  ) {

					var dv1, dv2, dh1, dh2;
					dv1 = this.barrierList[b].y - this.barrierList[b].height/2 - this.tankList[i].shots[j].y;
					dv1 = Math.floor( Math.abs( dv1 ) );
					dv2 = this.barrierList[b].y + this.barrierList[b].height/2 - this.tankList[i].shots[j].y;
					dv2 = Math.floor( Math.abs( dv2 ) );

					dh1 = this.barrierList[b].x - this.barrierList[b].width/2 - this.tankList[i].shots[j].x;
					dh1 = Math.floor( Math.abs( dh1 ) );

					dh2 = this.barrierList[b].x + this.barrierList[b].width/2 - this.tankList[i].shots[j].x;
					dh2 = Math.floor( Math.abs( dh2 ) );

					var smallestChange;
					smallestChange = Math.min(dv1,dv2,dh1,dh2);

					if(smallestChange == dv1 || smallestChange == dv2){ this.tankList[i].shots[j].yvel *= -1; }
					else if(smallestChange == dh1 || smallestChange == dh2){ this.tankList[i].shots[j].xvel *= -1; }

					if(this.tankList[i].shots[j].featureBounce > 0){ 
						this.tankList[i].shots[j].featureBounce--; 
						if(this.tankList[i].shots[j].featureBounce == 0){ this.tankList[i].shots[j].ownerInvuln = 0; }
					}
					else { this.tankList[i].shots[j].alive = false;}


				} //end if collided with barrier

			} //end all barrier checks
			
		} //end the checks to reposition and barrier check
		if(this.tankList[i].shots[j].alive){
			//if the shot is going off screen reposition.
			if(this.tankList[i].shots[j].x <= 0 || this.tankList[i].shots[j].x >= this.element.width)
			{ 
				if(this.tankList[i].shots[j].featureBounce > 0){ this.tankList[i].shots[j].featureBounce--; this.tankList[i].shots[j].xvel *= -1; }
				else { this.tankList[i].shots[j].alive = false;}
			}
			if(this.tankList[i].shots[j].y <= 0 || this.tankList[i].shots[j].y >= this.element.height)
			{ 
				if(this.tankList[i].shots[j].featureBounce > 0){ this.tankList[i].shots[j].featureBounce--; this.tankList[i].shots[j].yvel *= -1; }
				else { this.tankList[i].shots[j].alive = false;}
			}
			if(this.tankList[i].shots[j].ownerInvuln >0) {
				this.tankList[i].shots[j].ownerInvuln -= this.dt;
			}
		}//end if alive do the out of bounds checks and owner invuln reduction
		
		//if bullet is still alive at this point.
		if(this.tankList[i].shots[j].alive){
			//collision check against all tanks
			for(var k = 0; k < this.tankList.length; k++){
				//if this tank is alive and ( the current tank's shot isn't equal to the tank being examined, or the current shot is out of invuln)
				if(this.tankList[k].alive && (  i!=k || this.tankList[i].shots[j].ownerInvuln <= 0 )  ){ 
					var dx = this.tankList[i].shots[j].x - this.tankList[k].x;
					var dy = this.tankList[i].shots[j].y - this.tankList[k].y;
					dx = Math.sqrt( (dx * dx) + ( dy * dy ) );
					dy = this.tankWidth/2 + this.shotWidth/2;
					if(dx < dy){
						console.log("shot hit with distance values:" + dx + " vs " + dy);
						this.tankList[i].shots[j].alive = false;
						this.tankList[i].kills++;
						this.tankList[k].alive = false;
						this.tankList[k].x = -100;
						this.tankList[k].y = -100;
						this.tankList[k].spawnDelay = 0;
						this.tankList[k].kills = 0;
						break;
					}
				}//end if tank is alive
				for(var m = 0; m < this.tankList[i].shots.length; m++) {
					if(this.tankList[i].shots[m].alive && (i!=k || j!=m ) ){ 
						var dx = this.tankList[i].shots[j].x - this.tankList[k].shots[m].x;
						var dy = this.tankList[i].shots[j].y - this.tankList[k].shots[m].y;
						dx = Math.sqrt( (dx * dx) + ( dy * dy ) );
						dy = this.shotWidth;
						if(dx < dy){
							console.log("shot hit with distance values:" + dx + " vs " + dy);
							this.tankList[i].shots[j].alive = false;
							this.tankList[k].shots[m].alive = false;
							break;
						}
					}
				} //end for each shot of that tank
			} //end each tank check
		}//end if bullet is alive
		
		if(this.tankList[i].shots[j].alive) {
			this.ctx.fillStyle = "rgba(220, 50, 50, 1.0)";
			this.ctx.fillStyle = "rgba("+this.tankList[i].color + ", 1.0)";
			this.ctx.fillRect(this.tankList[i].shots[j].x - this.shotWidth/2, this.tankList[i].shots[j].y - this.shotHeight/2, this.shotWidth, this.shotHeight);
		}
	}, //end shotMoveAndDrawUpdates
	
	tryShoot: function(userNum, x, y){
		if(x != this.tankList[userNum].x || y != this.tankList[userNum].y ){
			for(var i = 0; i < this.tankList[userNum].shots.length; i++){
				if(this.tankList[userNum].shots[i].alive == false){
					this.tankList[userNum].shots[i].alive = true;
					this.tankList[userNum].shots[i].x = this.tankList[userNum].x;
					this.tankList[userNum].shots[i].y = this.tankList[userNum].y;
					
					var dx = x - this.tankList[userNum].x;
					var dy = y - this.tankList[userNum].y;
					var angle = Math.atan2(dy,dx) ;
					
					//xvel yvel
					this.tankList[userNum].shots[i].xvel =  Math.cos(angle) * this.shotSpeedTick;
					this.tankList[userNum].shots[i].yvel =  Math.sin(angle) * this.shotSpeedTick;
					this.tankList[userNum].shots[i].ownerInvuln =  .2; //set the owner invuln
					this.tankList[userNum].shots[i].featureBounce =  2;   //set the feature bounce limit
					//this.tankList[userNum][6][i][3] =  0;
					//this.tankList[userNum][6][i][4] =  0;
					console.log("found a shot to activate with velocities:" + this.tankList[userNum].shots[i].xvel + "," + this.tankList[userNum].shots[i].yvel);
					break; //only activate one shot
				}//end shot check
			}//end for each shot, try shoot.
		}//end if shot location doesn't match tank location.
	}, //end tryShoot
	
	addTank: function(userName, name, rgb) {
		var tempShots = [];
		//                alive         xpos      ypos      xvel     yvel     owner invuln      feature bounce
		tempShots.push( { alive: false, x: -1000, y: -1000, xvel: 0, yvel: 0, ownerInvuln: 500, featureBounce: 2} );
		tempShots.push( { alive: false, x: -1000, y: -1000, xvel: 0, yvel: 0, ownerInvuln: 500, featureBounce: 2} );
		tempShots.push( { alive: false, x: -1000, y: -1000, xvel: 0, yvel: 0, ownerInvuln: 500, featureBounce: 2} ); //3 shots per tank
		
		//                   client              alive         xpos      ypos      button array (up/down/left/right [])             kills     shotsarray        pointer name(7)  rgb vals(8)  spawn delay
		this.tankList.push( {clientID: userName, alive: false, x: -1000, y: -1000, buttons: [false, false, false, false,[0,0,0,0]], kills: 0, shots: tempShots, name: name,      color: rgb[0]+','+rgb[1]+','+rgb[2],  spawnDelay: 0} );

		console.log("Done with tank creation");
	}, //end addTank
	
	didRectanglesCollide: function( rect1, rect2) {
		if(rect1.x - rect1.width/2 <= rect2.x + rect2.width/2 &&
			rect1.x + rect1.width/2 >= rect2.x - rect2.width/2 &&
			rect1.y - rect1.height/2 <= rect2.y + rect2.height/2 &&
			rect1.y + rect1.height/2 >= rect2.y - rect2.height/2 ){
			return true;
		}
		return false;
	}, // end didRectanglesCollide
	
	generateBarriers: function(bLimit) {
		var rx, ry, rw, rh;
		
		for(var i = 0; i < bLimit; i++){
			rw = this.randomInt(100, 100 + (this.element.width  / 10));
			rh = this.randomInt(100, 100 + (this.element.height / 10));
			
			rx = this.randomInt(200, this.element.width  - rw - 200);
			ry = this.randomInt(200, this.element.height - rh - 200);
			
			this.barrierList.push( {x: rx, y: ry, width: rw, height: rh} );
		}
	}, //end generateBarriers
	
	randomInt: function(min, max) {
		return Math.round(Math.random() * (max-min) + min);
	} // end randomInt
});









