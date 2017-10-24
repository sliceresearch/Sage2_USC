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
    constructor(id, params){
        super(id);
        this.params = params;
    }
    start(label, color, sourceType, urlParameters) {
        this.label = label;
        this.color = color;
        this.sourceType = sourceType;
        if (urlParameters.left){
            this.left    = urlParameters.left;
        } else {
            this.left    = 50;
        }
        if (urlParameters.top){
            this.top    = urlParameters.top;
        } else {
            this.top    = 50;
        }
        this.visible = true;
    }
    updatePointerPosition(data, maxW, maxH) {
        if (data.pointerX !== undefined) {
            this.left = data.pointerX;
        }
        if (data.pointerY !== undefined) {
            this.top = data.pointerY;
        }
        if (data.dx !== undefined) {
            this.left += data.dx;
        }
        if (data.dy !== undefined) {
            this.top  += data.dy;
        }
    
        if (this.left < 0) {
            this.left = 0;
        }
        if (this.left > maxW) {
            this.left = maxW;
        }
        if (this.top < 0) {
            this.top = 0;
        }
        if (this.top > maxH) {
            this.top = maxH;
        }
    }
}

module.exports = SlicePointer;