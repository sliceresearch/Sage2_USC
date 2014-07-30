// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014


var notepad = SAGE2_App.extend( {
	construct: function() {

		this.element = null;
		this.ctx = null;
		this.resrcPath = null;
		this.lines = null;
		this.linesVisble = null;
		this.columns = null;

		this.fontSize = 12;
		this.font = "Arial";
		this.bold = false;
		this.fontHeight = null;
		this.height = null;
		this.space = null;
		this.lMargin = 40;

		this.minDim = null;
		this.text = "";
		this.textArr = [];
		this.blinkerArr = [];
		this.specialKeyFlag = false;
		this.range=[];

		
		this.timer = null;
		this.redraw = null;
		this.enableControls = null;
		this.controls = null;
		
		this.resizeEvents = "continuous";
	},
	
	load: function(state, date) {
		
	},

	computeMetrics: function(){
		this.height = this.element.height;
		this.fontHeight = this.getHeightOfText(this.bold,this.font,this.fontSize);
		this.linesVisible = Math.floor(this.element.height/this.fontHeight);
		this.space = this.ctx.measureText(" ").width;
		this.columns = Math.floor(this.element.width/this.space);
		//console.log(this.fontHeight);
		//console.log(this.element.height);
		//console.log(this.linesVisible);
		//console.log(this.columns);
		console.log(this.space);
	},

	findRange: function(){
		this.range[0] = [1,this.linesVisible];
	},
	getHeightOfText: function (bold, font, size)
	{
		var div = document.createElement('DIV');
		div.innerHTML = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
		div.style.position = 'absolute';
		div.style.top = '-100px';
		div.style.left = '-100px';
		div.style.fontFamily = font;
		div.style.fontWeight = bold ? 'bold' : 'normal';
		div.style.fontSize = size + 'pt';
		document.body.appendChild(div);
		var size = div.offsetHeight;
		document.body.removeChild(div);
		return size;
	},

	blinker: function (id,ctx, date, color){
		this.id = id;
		this.visible = true;
		this.color = color;
		this.blinkerX = null;
		this.blinkerY = null;
		this.textIdx = null;
		this.blinkerL = null;
		this.blinkerC = null;
		//this.size = this.font
		this.draw = function(text,fH){ // This function assumes that offSet function is always called prior to this function
			this.blinkerY += this.blinkerL * fH ;
			if (this.blinkerC > 0 && this.blinkerL in text){
				this.blinkerX += ctx.measureText(text[this.blinkerL].substring(0,this.blinkerC)).width;
			}
			
			var col = ctx.strokeStyle;
			var offset = fH * 0.25;
			var offY = this.blinkerY + offset;
			ctx.strokeStyle = "rgba("+this.color[0]+","+this.color[1]+","+this.color[2]+",1.0)";
			ctx.beginPath();
			ctx.moveTo(this.blinkerX, offY);
			ctx.lineTo(this.blinkerX, offY - fH);
			ctx.moveTo(this.blinkerX, offY);
			ctx.closePath();
			ctx.stroke();
			ctx.strokeStyle = col; 
		};

		this.moveLC = function(l,c){
			
			this.blinkerL = l;
			this.blinkerC = c;
		}
		this.offSet = function(x,y){
			this.blinkerX = x;
			this.blinkerY = y;
		};

		
	},
	
	init: function(id, width, height, resrc, date) {
		// call super-class 'init'
		arguments.callee.superClass.init.call(this, id, "canvas", width, height, resrc, date);
	
		this.ctx = this.element.getContext("2d");
		this.resrcPath = resrc;
		//this.fs = require('fs');
		this.minDim = Math.min(this.element.width, this.element.height);
		this.computeMetrics() ;
		/*if (file){
			var strText = fs.readFileSync(file,'utf8');
			this.textArr = strText.split("\n");
		}*/
		
	},
	
	
	displayText: function(){
		var lno = 1;
		var cno = 1;
		
		//this.textArr = this.text.split("\n");
		///var lineLim = Math.min(this.textArr.length,this.linesVisible);
		var count = 1;
		for (var parts = 0;parts < this.range.length;parts++){
			var start = this.range[parts][0];
			var end = this.range[parts][1];
			for (var i=start;i<=end;i++){
				
				this.ctx.font= "16px " + this.font;
				this.ctx.fillText(('000' + i).slice(-3),5,count*this.fontHeight);
				this.ctx.font= this.fontSize + "px " + this.font;	
				if (i in this.textArr){
					var wrSpc = this.element.width - (2*this.space+this.lMargin);
					if (this.ctx.measureText(this.textArr[i]).width > wrSpc){
						var cut = Math.floor(wrSpc/this.ctx.measureText(this.textArr[i]).width * this.textArr[i].length); 
						var re = new RegExp(".{1," + cut + "}","g");
						console.log(re);
						var mLines = this.textArr[i].match(re);
						for(var ml=0;ml<mLines.length;ml++){
							this.ctx.fillText(mLines[ml],this.space + this.lMargin,count*this.fontHeight);
							count ++;
						}
						
					}
					else
						this.ctx.fillText(this.textArr[i],this.space + this.lMargin,count*this.fontHeight);
				}
				count ++ ;
			}
		}
	},

	
	draw: function(date) {
		arguments.callee.superClass.preDraw.call(this, date);
		// clear canvas		
		this.ctx.clearRect(0,0, this.element.width, this.element.height);
		
        this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)" ;
		this.ctx.fillRect(0,0, this.element.width, this.element.height);
		this.ctx.fillStyle = "rgba(150, 150, 150, 1.0)" ;
		this.ctx.fillRect(0,0, this.lMargin, this.element.height);
		this.ctx.fillStyle = "rgba(200, 200, 200, 1.0)" ;
		this.ctx.fillRect(this.element.width-30,0, 30, this.element.height);
		
		this.ctx.strokeStyle = 	"rgba(0,0,0, 1.0)"; 
		
		
		
		this.ctx.fillStyle = "rgba(0,0,0,1.0)";
		this.space = this.ctx.measureText(" ").width;
		this.findRange();
		this.displayText();
		if (date.getMilliseconds() < 500){
			for (bkr in this.blinkerArr){
				this.blinkerArr[bkr].offSet(this.space + this.lMargin,0);
				this.blinkerArr[bkr].draw(this.textArr,this.fontHeight);
			}
		}
	},
	
	resize: function(date) {
		this.fontSize = Math.max(Math.floor(0.02 * this.element.height),14);
		this.computeMetrics();
		this.draw(date);
	},
	

	enterKey: function(curL, curC, userId){
		if (curL in this.textArr){
			var nl = this.textArr[curL].substring(curC,this.textArr[curL].length)
			this.textArr[curL] = this.textArr[curL].substring(0,curC);
			if (curL+1 in this.textArr){
				this.textArr.splice(curL+1,0,nl);
			}
			else{
				this.textArr[curL+1] = nl;
			}
		}
		else{
			this.textArr[curL] = "";
		}
		this.blinkerArr[userId].moveLC(curL+1,0);
	},

	
	//event: function( type, userId, x, y, data , date, user_color){
	event: function(type, position, userId, data, date) {
		var x = position.x;
		var y = position.y;
        var user_color = userId.color || [255,0,0];
	    if( type == "pointerPress" ){
	       if( data.button == "left" ){
				if ((userId.id in this.blinkerArr)===false){
					console.log(user_color);
					var bkr = new this.blinker(userId.id,this.ctx,date,user_color);					
					this.blinkerArr[userId.id] = bkr;
					
				}
				else{
					this.blinkerArr[userId.id].color = user_color;
				}
				var lno = Math.ceil(y/this.fontHeight);
				var tArIdx = lno;
				if(tArIdx in this.textArr){
					var len = this.ctx.measureText(this.textArr[tArIdx]).width;
					if(x >= len){	
						this.blinkerArr[userId.id].moveLC(lno,this.textArr[tArIdx].length);
					}
					else{
						var c;
						for(c=0;c<this.textArr[tArIdx].length;c++){
							if(this.ctx.measureText(this.textArr[tArIdx].substring(0,c)).width > x)
								break;
						}
						this.blinkerArr[userId.id].moveLC(lno,c-1);
					}
				}
				else{
					this.blinkerArr[userId.id].moveLC(lno,0);
				}
				
	       } 
	       
	       else if( data.button == "right" ){

	       }
	    }
	    else if( type == "pointerRelease" ){
	       if( data.button == "left" ){

	       } 
	       
	       else if( data.button == "right" ){ //not implemented yet

	       }
	    }
	    else if( type == "pointerMove" ){ //x and y hold current pointer positions

	    }
        else if( type == "pointerDoubleClick" ){
	        
	    }
	    else if( type == "keyboard" ) {
                //the key character is stored in ascii in data.code 
                //all other keys will come in as typed:  'a', 'A', '1', '!' etc
                //tabs and new lines ought to be coming in too
                var theAsciiCode = data.code; 
				var ch;
				if ((userId.id in this.blinkerArr) == false) return; // Bad code. need to remove once the event handler has been modified.
				var curL = this.blinkerArr[userId.id].blinkerL;
				var curC = this.blinkerArr[userId.id].blinkerC;
				console.log(curC);
				//alert(theAsciiCode);
				if (theAsciiCode == 13){
					this.enterKey(curL, curC, userId.id);		
				
				}
                else{
					if (curL in this.textArr){
						this.textArr[curL] = this.textArr[curL].substring(0,curC) +  String.fromCharCode(theAsciiCode) + this.textArr[curL].substring(curC,this.textArr[curL].length) ;
						
					}
					else{
						this.textArr[curL] = String.fromCharCode(theAsciiCode) ;
					}
					this.blinkerArr[userId.id].moveLC(curL,curC+1);
			
				}
	        
	    }
	    else if( type == "specialKey" && data.state=="down") { 
		
            //anything not printed
	        // alt, command, up arrow
            //comes in as javascript key code
            var theJavascriptCode = data.code;
			var curL = userId.id && this.blinkerArr[userId.id].blinkerL;
			var curC = this.blinkerArr[userId.id].blinkerC;
			console.log(curC);
			if (theJavascriptCode == 8){
				if (curL in this.textArr ){
					
					var pre = this.textArr[curL].substring(0,curC-1);
					var post = this.textArr[curL].substring(curC,this.textArr[curL].length);
					if (curC > 0 ){
						
						this.textArr[curL] = pre + post;
						this.blinkerArr[userId.id].moveLC(curL,curC-1);

					}
					else if (curL > 1){
						var t = "";
						if (curL-1 in this.textArr){						
							t =  this.textArr[curL-1];
						}
						this.textArr[curL-1] = t + post;
						this.textArr.splice(curL,1);
						this.blinkerArr[userId.id].moveLC(curL-1,t.length);

					}
					
				}
				else if (curL-1 in this.textArr){
					
					this.blinkerArr[userId.id].moveLC(curL-1,this.textArr[curL-1].length);	
				}
				else if (curL > 1){
					this.blinkerArr[userId.id].moveLC(curL-1,0);	
				}
				
		
			}
			else if (theJavascriptCode == 46){
				var pre = this.textArr[curL].substring(0,curC);
				var post = this.textArr[curL].substring(curC+1,this.textArr[curL].length);

				if ((curL in this.textArr)==false) return;

				if (curC < this.textArr[curL].length){
					this.textArr[curL] = pre + post;
				}
				else{
					var t = "";
					if (curL+1 in this.textArr){
						t = this.textArr[curL+1];
						this.textArr.splice(curL+1,1);
					}
					this.textArr[curL] = this.textArr[curL]  + t ;
				}
				
			}
			else if(theJavascriptCode == 37){
				if (curC > 0)
					curC-- ;
				else{
					curL = curL-1 || curL ;
					curC = (curL in this.textArr)? this.textArr[curL].length : 0;
				}
				this.blinkerArr[userId.id].moveLC(curL,curC);

			}
			else if(theJavascriptCode == 39){
				if (curL in this.textArr && curC < this.textArr[curL].length)
					curC++ ;
				else{
					curL++ ;
					curC = 0 ;
				}
				this.blinkerArr[userId.id].moveLC(curL,curC);
				//this.save();

			}
			else if(theJavascriptCode == 38){
				
				if (curL-1 in this.textArr){
					curC = Math.min(curC,this.textArr[curL-1].length);
					curL--;
				}		
				else if (curL-1 > 0){
					curL-- ;
					curC = 0 ;
				}
				this.blinkerArr[userId.id].moveLC(curL,curC);
				

			}
			else if(theJavascriptCode == 40){
				
				if (curL+1 in this.textArr){
					curC = Math.min(curC,this.textArr[curL+1].length);
					curL++;
				}		
				else{
					curL++ ;
					curC = 0 ;
				}
				this.blinkerArr[userId.id].moveLC(curL,curC);

			}
			//alert(theJavascriptCode);

	    }
	    else if( type == "pointerScroll" ) {  //not implemented yet
	    
	    }

        this.refresh( date ); //redraw    
	}
	 
});    
