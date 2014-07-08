// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2014

/**
 @module pdfinfo
 */

var exec = require('child_process').exec;

module.exports.pdfinfo = function(pdf_url, callback) {
	var cmd = "pdfinfo \"" + pdf_url + "\"";
	exec(cmd, function(err, stdout, stderr){
		if(err) callback(err, null);
		
		stdout = stdout.replace(/ +/g, " ");
		var output = stdout.substring(0, stdout.length-1).split("\n");
		
		var pdfinfo = {};
		for(var i=0; i<output.length; i++){
			var delim = output[i].indexOf(": ");
			var key = output[i].toLowerCase().substring(0, delim).replace(/ +/g, "_");
			var value = output[i].substring(delim+2);
			if(key == "pages"){
				pdfinfo[key] = parseInt(value);
			}
			else if(key == "page_rot"){
				pdfinfo[key] = parseFloat(value);
			}
			else if(key == "page_size"){
				var arr = value.split(" ");
				
				pdfinfo.page_width  = parseFloat(arr[0]);
				pdfinfo.page_height = parseFloat(arr[2]);
			}
			else{
				pdfinfo[key] = value;
			}
		} 
		
		callback(null, pdfinfo);
	});
};
