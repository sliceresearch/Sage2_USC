// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015-2016

// Dylan Kobayashi
//   "dylank@hawaii.edu"
//
// Greate a global that will act as a namespace

var SAGE2MEP = {

	/* debug on(true) or off(false)
	if(this.debug) {
		console.log("");
	}
	*/
	debug: false,

	/*
	Create an array to track the different apps if they are using it.
	This may not be necessary if sage segregates the app memory, but doubt this is true.
	*/
	appList: [],

	/*
	Create a 2d array to track the points in each app.
	[App with index corresponding to location in appList][ pointers being tracked in that app ]
	*/
	pointerList: [], // Have to start with [] but it will be a [][]

	/*
	If true, this will use the last clicked element as the focus point to send information to.
	Otherwise, it will check for the current activeElement on the document.
	*/
	keyInputToFocusOfLastClick: true,

	/*
		Can be used from outside to set the value of keyInputToFocusOfLastClick.
	*/
	setKeyInputTFocusOfLastClick: function(bool) {
		this.keyInputToFocusOfLastClick = bool;
	},

	/*
	Calls made to this should be placed within the event method, all params are necessary in addition to the app id.
	Correct appId is necessary to differentiate between pointers over different apps.
	*/
	processAndPassEvents: function(appId, type, position, user, data, date) {

		var indexOfApp = this.getIndexOfApp(appId);
		var indexOfPointer = this.getIndexOfPointer(indexOfApp, user.id);
		var point = this.pointerList[indexOfApp][indexOfPointer];



		point.xPrevious = point.xCurrent;
		point.yPrevious = point.yCurrent;
		point.xCurrent = position.x;
		point.yCurrent = position.y;
		point.previousElement = point.currentElement;

		// gets the pointer element that triggered this call
		var pointerDiv = document.getElementById(user.id);

		// Returns the value of x and y based on world space, not display space.
		var xLocationOfPointerOnScreen = this.getXOfWebkitTranslate(pointerDiv.style.WebkitTransform);
		var yLocationOfPointerOnScreen = this.getYOfWebkitTranslate(pointerDiv.style.WebkitTransform);

		// gets the element under the pointer coordinate. Some assumptions are made.
		point.currentElement = this.getElementUnderPointer(xLocationOfPointerOnScreen, yLocationOfPointerOnScreen, appId);



		/* The type of SAGE action will determine the event generated.
		pointerMove:
			-Will pass: mousemove
			-Might pass: mouseover, mouseout, mouseenter, mouseleave
		pointerPress:
			-Will pass: mouse down
		pointerRelease:
			-Will pass: mouse up
			-Might pass: click
		*/


		var mouseEventToPass;

		switch (type) {

			case "pointerMove":
				// if the current and previous element match, then only need to worry about sending mouse move event
				if (point.currentElement == point.previousElement) {
					mouseEventToPass = new MouseEvent("mousemove", {
						bubbles: true,
						clientX: point.xCurrent,
						clientY: point.yCurrent,
						screenX: point.xCurrent,
						screenY: point.yCurrent,
						target: point.currentElement
					});
					if (point && point.currentElement) {
						point.currentElement.dispatchEvent(mouseEventToPass);
					}
					// end if the current and previous element match
				} else {
					// since the current is different from previous, need to create and dispatch mouse over, enter, out, leave

					// event order is : (first) over, enter, out, leave (last)
					mouseEventToPass = new MouseEvent("mouseover", {
						bubbles: true,
						clientX: point.xCurrent,
						clientY: point.yCurrent,
						screenX: point.xCurrent,
						screenY: point.yCurrent,
						target: point.currentElement,
						relatedTarget: point.previousElement // for: focus, mouse enter leave out over, drag
					});
					point.currentElement.dispatchEvent(mouseEventToPass);


					this.determineAndSendEnterEvents(point);

					// depending on timing, previous element may be null.
					if (point.previousElement != null) {
						mouseEventToPass = new MouseEvent("mouseout", {
							bubbles: true,
							clientX: point.xCurrent,
							clientY: point.yCurrent,
							screenX: point.xCurrent,
							screenY: point.yCurrent,
							target: point.previousElement,
							relatedTarget: point.currentElement  // for: focus, mouse enter leave out over, drag
						});
						point.previousElement.dispatchEvent(mouseEventToPass);
					} // end passing mouse out if there was a previous element.


					this.determineAndSendLeaveEvents(point);

				} // end else the current element is different from the previous

				break;
			case "pointerPress":
				if (this.debug) {
					console.log("Focused element:" + point.currentElement);
					console.log("Dom thinks focus element is:" + document.activeElement);
					console.log("pointer press at:" + position.x + "," + position.y);
					console.log("webkit pointer location: " + xLocationOfPointerOnScreen + "," + yLocationOfPointerOnScreen);
				}

				// 0 is left, 1 middle, 2 right
				var buttonValue = 0;
				if (data.button == "middle") {
					buttonValue = 1;
				} else if (data.button == "right") {
					buttonValue = 2;
				}

				mouseEventToPass = new MouseEvent("mousedown", {
					bubbles: true,
					clientX: point.xCurrent,
					clientY: point.yCurrent,
					screenX: point.xCurrent,
					screenY: point.yCurrent,
					button: buttonValue,
					// relatedTarget: point.previousElement,
					// for: focus, mouse enter leave out over, drag
					target: point.currentElement
				});
				point.currentElement.dispatchEvent(mouseEventToPass);

				// There are some fringe cases where this can cause improper click events.
				point.elementPressed = point.currentElement;

				// focus happens on mousedown
				point.currentElement.focus();

				break;
			case "pointerRelease":
				mouseEventToPass = new MouseEvent("mouseup", {
					bubbles: true,
					clientX: point.xCurrent,
					clientY: point.yCurrent,
					screenX: point.xCurrent,
					screenY: point.yCurrent,
					// relatedTarget: point.previousElement
					//for: focus, mouse enter leave out over, drag
					target: point.currentElement
				});
				point.currentElement.dispatchEvent(mouseEventToPass);

				// if there was a press and release, then fire a click event
				if (point.elementPressed == point.currentElement) {
					mouseEventToPass = new MouseEvent("click", {
						bubbles: true,
						clientX: point.xCurrent,
						clientY: point.yCurrent,
						screenX: point.xCurrent,
						screenY: point.yCurrent,
						// relatedTarget: point.previousElement
						//for: focus, mouse enter leave out over, drag
						target: point.currentElement
					});
					point.currentElement.dispatchEvent(mouseEventToPass);
					point.elementPressed = null; // finally cancell out the pressed value.
					point.lastClickedElement = point.currentElement;
				} // end if a click needs to be made

				break;
			case "pointerScroll":
				mouseEventToPass = new WheelEvent("wheel", {
					deltaY: data.wheelDelta,
					deltaMode: 0
				});
				point.currentElement.dispatchEvent(mouseEventToPass);

				break;
			case "pointerDoubleClick":

				if (this.debug) {
					console.log("SAGE2MEP> double click"); //does sage send double clicks?
				}

				break;
			case "keyboard":
				// Currently not implemented.

				if (this.debug) {
					console.log("SAGE2MEP> Keystroke:" + data.character + "(" + data.code + ")");
				}

				var elemToSendKeyValuesTo;
				if (this.keyInputToFocusOfLastClick && point.lastClickedElement != null) {
					elemToSendKeyValuesTo = point.lastClickedElement;
				} else {
					elemToSendKeyValuesTo = document.activeElement;
				}

				if (elemToSendKeyValuesTo != null && elemToSendKeyValuesTo.value != null) {
					elemToSendKeyValuesTo.value += data.character;
				}


				break;
			case "specialKey":
				// Currently not implemented.

				if (this.debug) {
					console.log("SAGE2MEP> specialkey:" + data.character + "(" + data.code + ")");
				}

				break;

			default:
				if (this.debug) {
					console.log("SAGE2MEP> ERROR Unknown SAGE2 type:" + type);
				}
				break;
		} // end switch of sage event type

		// don't forget to put the app back where it came from
		// this.moveAppWhereItWasIfNecessary(appId);
		// maybe no longer needed with the new getElementUnderPointer

	}, // end processAndPassEvents


	/*
	This will return the index the app is being tracked at.
	If the app is not being tracked, creates an entry and returns the index.
	*/
	getIndexOfApp: function(appId)  {
		var i;
		for (i = 0; i < this.appList.length; i++) { // go through list and break on match.
			if (this.appList[i] == appId) {
				break;
			}
		}
		if (i == this.appList.length) { // if there was no match, create an entry
			this.appList.push(appId);
			this.pointerList.push([]); // pointer list is a 2d array needs an entry for this app.
		}
		return i; // i holds the index of the appId
	}, // end getIndexOfApp



	/*
	Will find the index of the pointer as specified by the app it is interacting with and the id.
	*/
	getIndexOfPointer: function(appIndex, userId) {
		var i;

		// look through all pointers associated with that app, break on match.
		for (i = 0; i < this.pointerList[appIndex].length; i++) {
			if (this.pointerList[appIndex][i].id == userId) {
				break;
			}
		}

		// if there was no match, create a pointer and add it.
		if (i == this.pointerList[appIndex].length) {
			var np = this.generateNewPointer(userId);
			this.pointerList[appIndex].push(np);
		}

		// holds the index of the pointer for specified app.
		return i;
	}, // end getIndexOfPointer


	/*
		This will travel up the div tree and get the first element above an svg.
		If there is no svg, then it will just get the topmost element.
		This is necessary because technically all SAGE pointer locations will be on top of the rendered SVG.
	*/
	getNonSvgAtPoint: function(px, py) {
		var allDivs = [];
		var allDisplay = [];
		var div = document.elementFromPoint(px, py);
		while (div && div.tagName != "svg" && div.tagName != "HTML" && div.tagName != "html") {
			allDivs.push(div);
			allDisplay.push(div.style.display);
			div.style.display = "none";
			div = document.elementFromPoint(px, py);
		}
		// also hide the svg
		if (div) {
			if (div.tagName == "svg") {
				//console.log(div);
				allDivs.push(div);
				allDisplay.push(div.style.display);
				div.style.display = "none";
				div = document.elementFromPoint(px, py);
			} else {
				div = allDivs[0];
			}
			for (var i = 0; i < allDivs.length; i++) {
				allDivs[i].style.display = allDisplay[i];
			}
			return div;
		} else {
			// end if the current and previous element match
			console.log("ERROR: somehow this point(" + px + "," + py +
				") traversed up the entire html tag structure and didn't stop at html.");
		}
		return null;
	}, // end get nonsvgatpoint


	/*
		Used to find the x value of the webkit translate property.
		Must be given the string which should contain the translate property.

		returns -1 on failure
	*/
	getXOfWebkitTranslate: function(translateString) {
		var retval;
		retval = -1;
		if (translateString.search("translate") > -1) {
			translateString = translateString.substring(translateString.search("translate") + 10);
			retval = Math.round(translateString.substring(0, translateString.search("px")).valueOf());
		}
		return retval;
	},


	/*
		Used to find the y value of the webkit translate property.
		Must be given the string which should contain the translate property.

		returns -1 on failure
	*/
	getYOfWebkitTranslate: function(translateString) {
		var retval;
		retval = -1;
		if (translateString.search("translate") > -1) {
			translateString = translateString.substring(translateString.search("translate") + 10);
			translateString = translateString.substring(translateString.search("px") + 4);
			translateString = translateString.substring(0, translateString.search("px"));
			retval = Math.round(translateString.valueOf());
		}
		return retval;
	},


	/*
		This will generate and send all Enter events as necessary with the assumption that
			the current and previous elements are correct.
		1. Check if previous element is an ancestor.
		2. If it is, find the new divs starting with the current and send Enter events.
		3. If NOT, first find the common ancestor.
		4. Once the common ancestor has been found, send enter events from the top until it reaches the common ancestor.
	*/
	determineAndSendEnterEvents: function(point) {
		if (point.previousElement == point.currentElement) {
			// just in case
			return;
		}
		var isPreviousElementAncestor = false;
		var cElem = point.currentElement.parentNode;
		var pElem = point.previousElement;
		var mouseEventToPass;
		point.mouseLeaveEventsToSend = []; // clear out the mouse leave events.

		// 1. check if the previous element is an ancestor
		while (cElem.nodeName != "HTML") {
			if (pElem == cElem) {
				isPreviousElementAncestor = true;
				break;
			}
			cElem = cElem.parentNode;
		}

		// 2. Start from the current and send enter events for the new divs.
		if (isPreviousElementAncestor) {
			cElem = point.currentElement;

			while (cElem != pElem) {
				mouseEventToPass = new MouseEvent("mouseenter", {
					bubbles: false,
					clientX: point.xCurrent,
					clientY: point.yCurrent,
					screenX: point.xCurrent,
					screenY: point.yCurrent,
					target: cElem,
					relatedTarget: point.previousElement // for: focus, mouse enter leave out over, drag
				});
				cElem.dispatchEvent(mouseEventToPass);
				cElem = cElem.parentNode;
			}
			// end sending only the new div Enter events.
		} else {
			// 3. finding the common ancestor
			var foundCommonAncestor = false;
			pElem = point.previousElement;

			var failSafeOnInf; //unsure if this is needed.

			// keep looping until the pElem and cElem match. NOTE: not checking for html because this is within sage.
			while (!foundCommonAncestor) {
				failSafeOnInf++;
				if (this.debug && failSafeOnInf > 500) {
					console.log("SAGE2MEP> ERROR: failsafe break out of finding a common ancestor for event triggers.");
					break;
				}
				point.mouseLeaveEventsToSend.push(pElem); // this element wasn't it, so it needs a leave event.
				// TODO fix the first time usage error because there was no previous element.
				pElem = pElem.parentNode; // move the check.
				cElem = point.currentElement; // reset since it is possible that went from a child to ancestor.
				while (cElem.nodeName != "HTML") {
					if (pElem == cElem) {
						foundCommonAncestor = true;
						break;
					}
					cElem = cElem.parentNode;
				}
			} // end while finding the common ancestor

			if (!foundCommonAncestor) {
				if (this.debug) {
					console.log("SAGE2MEP> ERROR: unable to find common ancestor.");
				}
				return;
			}

			// 4. Now that common ancestor has been found, send appropriate enter events.
			// Common ancestor should be in pElem.
			cElem = point.currentElement;
			while (cElem != pElem) {
				mouseEventToPass = new MouseEvent("mouseenter", {
					bubbles: false,
					clientX: point.xCurrent,
					clientY: point.yCurrent,
					screenX: point.xCurrent,
					screenY: point.yCurrent,
					target: cElem,
					relatedTarget: point.previousElement // for: focus, mouse enter leave out over, drag
				});
				cElem.dispatchEvent(mouseEventToPass);
				cElem = cElem.parentNode;
			}


		} // end else need to send enter and leave events.


	}, // end determineAndSendEnterEvents

	/*
		This will generate and send all Leave events.
		Events generated will be based off of the stored values from the checks in determineAndSendEnterEvents.
		Note, this doesn't care if a common ancestor was found, only if there are elements in the mouseLeaveEventsToSend property.
	*/
	determineAndSendLeaveEvents: function(point) {
		var mouseEventToPass;
		for (var i = 0; i < point.mouseLeaveEventsToSend.length; i++) {
			mouseEventToPass = new MouseEvent("mouseleave", {
				bubbles: false,
				clientX: point.xCurrent,
				clientY: point.yCurrent,
				screenX: point.xCurrent,
				screenY: point.yCurrent,
				target: point.mouseLeaveEventsToSend[i],
				relatedTarget: point.previousElement // for: focus, mouse enter leave out over, drag
			});
			point.mouseLeaveEventsToSend[i].dispatchEvent(mouseEventToPass);
		}

	}, // end determineAndSendLeaveEvents


	/*
	TODO check on the substring issues. May be able to remove them.
	Need to confirm whether or not the appElemZone moves with the appElem. Necessary due to the positioning.
	To divs within a div take on the properties of the containing div, specific to z index.

	Basically be prepaired to add output and alerts for checking.

	*/
	getElementUnderPointer: function(px, py, appDivId) {
		this.matvin = false;
		this.matvinZ  = -1;
		this.matvinWebkit = "";

		// the point of substring(3) is because it probably has div
		// TODO check if it could be canvas.
		var appname = null;
		var idx = appDivId.indexOf('app_');
		if (idx >= 0) {
			// extract the app_ part of the string
			appname = appDivId.slice(idx);
		}

		// TODO double check this
		var appElem = document.getElementById(appname);
		// var appElemZone = document.getElementById(appDivId);
		// var appWidth  = parseInt(appElemZone.style.width, 10);
		// var appHeight = parseInt(appElemZone.style.height, 10);

		/*
		This section will find the offset for the app based on tiles.
		appElem.style.left will always be a multiple of screen resolution based on tile position in world space.

		style represents "origin", so it will never change.
		translate represents postion adjustment from "origin", this will change as the app is moved.
		*/
		var appLeftOffset = 0;
		if (appElem && appElem.style.left != null) {
			appLeftOffset = parseInt(appElem.style.left, 10);
		}
		// Same applies to the appElem.style.top
		var appTopOffset = 0;
		if (appElem && appElem.style.top != null) {
			appTopOffset = parseInt(appElem.style.top, 10);
		}

		// For some reason the title bar height is applied to appElem.style.top. So much cut it out before doing position check.
		var titleBarDiv = document.getElementById(appname + "_title");
		appTopOffset -= parseInt(titleBarDiv.style.height);

		// world space of app x and y.
		var appX = this.getXOfWebkitTranslate(appElem.style.WebkitTransform);
		var appY = this.getYOfWebkitTranslate(appElem.style.WebkitTransform);
		// Save original values.
		var appOriginalWebkit =  appElem.style.WebkitTransform; // webkit of the application not the zone
		var appOriginalZ = appElem.style.zIndex;
		// detect display, which is actually server specified tile size.
		var displayWidth = parseInt(ui.bg.style.width, 10);   // TODO get the width of the current display
		var displayHeight = parseInt(ui.bg.style.height, 10); // TODO get the width of the current display

		/*
		These values will always turn into 0 or some positive multiple of the server specified resolution.
		*/
		var displayLeft =  -appLeftOffset;
		var displayTop =  -appTopOffset;
		var displayRight = displayLeft + displayWidth;
		var displayBottom = displayTop + displayHeight;

		/*
		Adjust pointer values so it is on the display.
		Necessary for the app position adjustment.
		*/
		var horiCounter = 0; // setup counters for placing the value on display.
		var vertCounter = 0;
		while (px < displayLeft) {
			px += displayWidth;
			horiCounter++;
		}
		while (px > displayRight) {
			px -= displayWidth;
			horiCounter--;
		}
		while (py < displayTop) {
			py += displayHeight;
			vertCounter++;
		}
		while (py > displayBottom) {
			py -= displayHeight;
			vertCounter--;
		}

		// modify the app webkit coordinates so that it should show up on the display.
		appX += horiCounter * displayWidth;
		appY += vertCounter * displayHeight;
		var translateString =  "translate(" + appX + "px, " + appY + "px)";
		appElem.style.WebkitTransform =  translateString;
		appElem.style.mozTransform = translateString;
		appElem.style.transform = translateString;
		// windowTitle.style.webkitTransform = translate;
		// windowTitle.style.mozTransform    = translate;
		// windowTitle.style.transform       = translate;
		appElem.style.zIndex = 99999; // Naturally existing elements shouldn't have this much z value. but I could be wrong. TODO
		// does this alter the correct element's z index?

		// While the webkit value is correct to appear on screen. to get an on screen coordinate is needed.
		px += appLeftOffset;
		py += appTopOffset;

		// get the element at point
		var theElementAtThePointer = document.elementFromPoint(px, py);
		// alert("halt  appoffset at:" + appLeftOffset + "," + appTopOffset +
		// " pointer at:" + px + "," + py + " also look for the location of the appElem:" + translateString);

		// put everything back
		appElem.style.WebkitTransform =  appOriginalWebkit;
		appElem.style.mozTransform =  appOriginalWebkit;
		appElem.style.transform =  appOriginalWebkit;
		appElem.style.zIndex = appOriginalZ; // does this alter the correct element's z index?

		return theElementAtThePointer;
	}, // end moveAppToViewIfNecessary


	/*
	If the app had to be moved, put it back.
	*/
	moveAppWhereItWasIfNecessary: function(appDivId) {

		if (this.matvin) {
			this.matvin = false; // dunno how necessary this is.
			var appname = null;
			var idx = appDivId.indexOf('app_');
			if (idx >= 0) {
				// extract the app_ part of the string
				appname = appDivId.slice(idx);
				var appElem = document.getElementById(appname);
				appElem.style.WebkitTransform = this.matvinWebkit;
				appElem.style.zIndex = this.matvinZ;
			}
		}


	}, // end moveAppWhereItWasIfNecessary

	/*
		This will generate an object with the properties necessary to track one SAGE pointer.
			id = should be the id of the pointer from user.id; all user.id are unique. This includes reconnects.
			x y current and previous = used for some calculations.
			previousElement = the topmost element the pointer was last over
			currentElement = the topmost element the pointer is currently over


	*/
	generateNewPointer: function(pid) {
		var p = {};

		p.id = pid;

		p.xCurrent = 0;
		p.yCurrent = 0;
		p.xPrevious = 0;
		p.yPrevious = 0;

		p.previousElement = null;
		p.currentElement = null;

		p.elementPressed = null;

		p.lastClickedElement = null;

		p.mouseLeaveEventsToSend = [];

		return p;
	} // end generateNewPointer

};

/**

	//removed initalize code. start up checks done in proces and pass events.
	initialize : function (  appId  ) {
		//TODO evaluate if this is necessary.

	}, //end initialize

*/

