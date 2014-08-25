var rgba      = null;
var imgWidth  = null;
var imgHeight = null;

var C565_5_MASK = 0xF8;   // 0xFF minus last three bits
var C565_6_MASK = 0xFC;   // 0xFF minus last two bits


// pre allocate block arrays
var block = new Uint8Array(64);
var colorMin = new Uint8Array(3);
var colorMax = new Uint8Array(3);
var inset = new Uint8Array(3);
var colors = new Uint8Array(16);
var indices = new Uint8Array(16);


self.addEventListener('message', function(e) {
	if(e.data instanceof ArrayBuffer){
		rgba = new Uint8Array(e.data);
	}
	else{
		if(e.data.cmd === "setParams"){
			imgWidth  = e.data.width;
			imgHeight = e.data.height;
		}
		else if(e.data.cmd === "start"){
			compressRGBAtoDXT1();
		}
	}
}, false);

function compressRGBAtoDXT1() {
	var dxt1 = new Uint8Array(imgWidth*imgHeight*0.5);
	var currentPos = 0;
	
	for(var j=imgHeight-4; j>=0; j-=4) {
		for(var i=0; i<imgWidth; i+=4) {
			var offset = imgWidth*4*j + i*4;
			
			extractBlock(offset, block);
			getMinMaxColors(block, colorMin, colorMax, inset);
			
			writeUint16(dxt1, currentPos,   colorTo565(colorMax));
			writeUint16(dxt1, currentPos+2, colorTo565(colorMin));
			writeUint32(dxt1, currentPos+4, colorIndices(block, colorMin, colorMax, colors, indices));
			
			currentPos += 8;
		}
	}
	
	self.postMessage(dxt1.buffer, [dxt1.buffer]);
}

function extractBlock(offset, outBlock) {
	var start = offset;
	for(var i=3; i>=0; i--) {
		for(var j=0; j<16; j++){
			outBlock[i*16+j] = rgba[start+j]
		}
		start += imgWidth*4;
	}
}

function getMinMaxColors(colorBlock, colorMin, colorMax, inset) {
	var i;
	
	colorMin[0] = 255;
	colorMin[1] = 255;
	colorMin[2] = 255;
	colorMax[0] =   0;
	colorMax[1] =   0;
	colorMax[2] =   0;
	
	for(i=0; i<16; i++) {
		if(colorBlock[i*4]   < colorMin[0]) colorMin[0] = colorBlock[i*4];
		if(colorBlock[i*4+1] < colorMin[1]) colorMin[1] = colorBlock[i*4+1];
		if(colorBlock[i*4+2] < colorMin[2]) colorMin[2] = colorBlock[i*4+2];
		if(colorBlock[i*4]   > colorMax[0]) colorMax[0] = colorBlock[i*4];
		if(colorBlock[i*4+1] > colorMax[1]) colorMax[1] = colorBlock[i*4+1];
		if(colorBlock[i*4+2] > colorMax[2]) colorMax[2] = colorBlock[i*4+2];
	}
	
	inset[0] = (colorMax[0] - colorMin[0]) >> 4;
	inset[1] = (colorMax[1] - colorMin[1]) >> 4;
	inset[2] = (colorMax[2] - colorMin[2]) >> 4;
	
	colorMin[0] = Math.min(colorMin[0] + inset[0], 255);
	colorMin[1] = Math.min(colorMin[1] + inset[1], 255);
	colorMin[2] = Math.min(colorMin[2] + inset[2], 255);
	colorMax[0] = Math.max(colorMax[0] - inset[0],   0);
	colorMax[1] = Math.max(colorMax[1] - inset[1],   0);
	colorMax[2] = Math.max(colorMax[2] - inset[2],   0);
}

function colorDistance(colorBlock1, c1offset, colorBlock2, c2offset) {
	var dx = colorBlock1[c1offset]  -colorBlock2[c2offset];
	var dy = colorBlock1[c1offset+1]-colorBlock2[c2offset+1];
	var dz = colorBlock1[c1offset+2]-colorBlock2[c2offset+2];
	
	return (dx*dx) + (dy*dy) + (dz*dz);
}

function colorTo565(rgb) {
	return ((rgb[0]>>3) << 11) | ((rgb[1]>>2) << 5) | (rgb[2]>>3);
}

function colorIndices(colorBlock, colorMin, colorMax, colors, indices) {
	var i;
	
	colors[0]  = (colorMax[0] & C565_5_MASK) | (colorMax[0] >> 5);
	colors[1]  = (colorMax[1] & C565_6_MASK) | (colorMax[1] >> 6);
	colors[2]  = (colorMax[2] & C565_5_MASK) | (colorMax[2] >> 5);
	colors[4]  = (colorMin[0] & C565_5_MASK) | (colorMin[0] >> 5);
	colors[5]  = (colorMin[1] & C565_6_MASK) | (colorMin[1] >> 6);
	colors[6]  = (colorMin[2] & C565_5_MASK) | (colorMin[2] >> 5);
	colors[8]  = (2*colors[0] +   colors[4]) / 3;
	colors[9]  = (2*colors[1] +   colors[5]) / 3;
	colors[10] = (2*colors[2] +   colors[6]) / 3;
	colors[12] = (  colors[0] + 2*colors[4]) / 3;
	colors[13] = (  colors[1] + 2*colors[5]) / 3;
	colors[14] = (  colors[2] + 2*colors[6]) / 3;
	
	for(i=0; i<16; i++) {
		var minDistance = 195076; // (255 * 255 * 255) + 1
		for(var j=0; j<4; j++) {
			var dist = colorDistance(colorBlock, i*4, colors, j*4);
			if(dist < minDistance) {
				minDistance = dist;
				indices[i] = j;
			}
		}
	}
	
	var result = 0;
	for(i=0; i<16; i++) {
		result |= (indices[i] << (i<<1));
	}
	
	return result;
}

function writeUint16(buffer, offset, value) {
	buffer[offset]   = value         & 0xFF;
	buffer[offset+1] = (value >>  8) & 0xFF;
}

function writeUint32(buffer, offset, value) {
	buffer[offset]   = value         & 0xFF;
	buffer[offset+1] = (value >>  8) & 0xFF;
	buffer[offset+2] = (value >> 16) & 0xFF;
	buffer[offset+3] = (value >> 24) & 0xFF;
}