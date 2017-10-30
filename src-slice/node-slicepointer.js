// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization
// and Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014-2015

/**
 * SAGE SLICE Pointer
 *
 * @module server
 * @submodule slicepointer
 * @extends sagepointer
 */

// require variables to be declared
"use strict";

var SagePointer         = require('../src/node-sagepointer'); 

/**
 * SlicePointer class
 *
 * @class SlicePointer
 */
class SlicePointer extends SagePointer {
    constructor(id, urlParams){
        super(id);
        this.urlParams = urlParams;
        this.titleBar = 18;
        if (urlParams.pointerApp){
		    this.visibleLeft = urlParams.pointerApp.left;
            this.visibleTop = urlParams.pointerApp.top+this.titleBar;
        }
    }
    updatePointerPosition(data, maxW, maxH) {
        super.updatePointerPosition(data, maxW, maxH);
        if (this.urlParams.pointerApp) {
            if (this.left < this.urlParams.pointerApp.left) {
                this.left = this.urlParams.pointerApp.left;
            }
            if (this.left > this.urlParams.pointerApp.left+this.urlParams.pointerApp.width) {
                this.left = this.urlParams.pointerApp.left+this.urlParams.pointerApp.width;
            }
            if (this.top < this.urlParams.pointerApp.top+this.titleBar) {
                this.top = this.urlParams.pointerApp.top+this.titleBar;
            }
            if (this.top > this.urlParams.pointerApp.top+this.urlParams.pointerApp.height+this.titleBar) {
                this.top = this.urlParams.pointerApp.top+this.urlParams.pointerApp.height+this.titleBar;
            }
        }
    }
}

module.exports = SlicePointer;