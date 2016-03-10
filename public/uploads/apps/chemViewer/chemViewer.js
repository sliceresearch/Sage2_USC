// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2016

//
// SAGE2 application: ChemViewer
// by: Luc Renambot <renambot@gmail.com>
//

/* global ChemDoodle */
"use strict";

function addCSS(url, callback) {
	var fileref = document.createElement("link");

	if (callback) {
		fileref.onload = callback;
	}

	fileref.setAttribute("rel", "stylesheet");
	fileref.setAttribute("type", "text/css");
	fileref.setAttribute("href", url);
	document.head.appendChild(fileref);
}


var chemViewer = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);

		// Set the background to black
		this.element.style.backgroundColor = 'black';

		// Add a canvas into the div, instead of asking for a canvas
		//   offers better control since ChemDoodle modifies the DOM
		this.mycanvas = document.createElement("canvas");
		this.mycanvas.width  = data.width;
		this.mycanvas.height = data.height;
		this.mycanvas.id = data.id + "_canvas";
		this.element.appendChild(this.mycanvas);

		var increment = Math.PI / 15;
		this.xIncrement = increment;
		this.yIncrement = increment;
		this.zIncrement = increment;

		// move and resize callbacks
		this.resizeEvents = "onfinish";

		// SAGE2 Application Settings
		//
		var _this = this;
		this.ready = false;
		addCSS(this.resrcPath + "lib/ChemDoodleWeb.css", function() {
			// setup component
			_this.cartoonTransformer = new ChemDoodle.ViewerCanvas3D(data.id + "_canvas",
				data.width, data.height);
			// set the ligand atom/bond representation to 'van der Waals Spheres'
			_this.cartoonTransformer.specs.set3DRepresentation('van der Waals Spheres');
			// set the background color to black
			_this.cartoonTransformer.specs.backgroundColor = '#000000';
			// display shapely colors for the residues
			_this.cartoonTransformer.specs.nucleics_residueColor = 'shapely';
			// display the atoms and bonds for the nucleic acid...
			_this.cartoonTransformer.specs.macro_displayAtoms = true;
			_this.cartoonTransformer.specs.macro_displayBonds = true;
			// ... but only show nucleic acid atoms within 5 Angstroms of a ligand atom
			_this.cartoonTransformer.specs.macro_atomToLigandDistance = 5;

			// data (pdb_2OEY) is already loaded by the script tag in the header, loading file 2OEY.js
			// this file is a digested and optimized PDB file created by ChemDoodle desktop,
			// it will load much faster than the corresponding PDB file
			var mol;
			// mol = pdb_2OEY;
			// var molFile = '9570133\n  CHEMDOOD06280922273D\n\n 68 73  0     0  0  0  0  0  0999 V2000\n   -2.7594    4.7937    4.9660 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    0.1713   12.3898    1.1610 Cl  0  0  0  0  0  0  0  0  0  0  0  0\n    3.9321    2.3762    5.3236 O   0  0  0  0  0  0  0  0  0  0  0  0\n   -5.6821   12.1494   -3.0690 O   0  0  0  0  0  0  0  0  0  0  0  0\n    3.3046    2.3031    7.6295 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -4.0418   13.5130   -4.1490 N   0  0  0  0  0  0  0  0  0  0  0  0\n    0.2397    4.4446    5.3491 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.4255   12.0044   -0.3787 N   0  0  0  0  0  0  0  0  0  0  0  0\n    2.2198    2.7741    8.3844 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.7320   13.9210   -3.8549 N   0  0  0  0  0  0  0  0  0  0  0  0\n    1.4187    3.8201    5.1425 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -3.5588   11.9239   -1.0942 N   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.9049    7.6732    2.9143 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.2872    8.7871    2.0739 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.1634    5.5180    4.5392 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.0253   10.9339    0.4523 C   0  0  0  0  0  0  0  0  0  0  0  0\n    1.9373    3.3330    6.2089 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -3.5108   12.5947   -2.1937 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.8843    6.8557    3.4783 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.4837    9.9258    2.0156 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.4440    7.4167    3.1601 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.4599    8.7219    1.3215 C   0  0  0  0  0  0  0  0  0  0  0  0\n    1.4021    3.3818    7.5816 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.3923   13.4003   -2.7165 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.2218    2.5988    6.2757 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -4.6082   12.6920   -3.1835 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.5149    5.7816    4.2879 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8526   10.9991    1.2047 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.8133    6.3428    3.9700 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.8290    9.7954    0.5108 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.3645    1.6047    8.1858 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -4.7107   13.8957   -5.3008 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.1208    4.0381    7.9279 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.1027   13.5525   -2.0051 C   0  0  0  0  0  0  0  0  0  0  0  0\n    5.4188    1.1603    7.3797 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -6.0179   13.4556   -5.5382 C   0  0  0  0  0  0  0  0  0  0  0  0\n    4.3912    1.3364    9.5591 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -4.0857   14.7258   -6.2385 C   0  0  0  0  0  0  0  0  0  0  0  0\n    6.4854    0.4571    7.9395 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -6.6910   13.8405   -6.6977 C   0  0  0  0  0  0  0  0  0  0  0  0\n    5.4580    0.6334   10.1190 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -4.7590   15.1109   -7.3978 C   0  0  0  0  0  0  0  0  0  0  0  0\n    6.5052    0.1938    9.3092 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -6.0616   14.6683   -7.6275 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.9440    7.0496    3.3306 H   0  0  0  0  0  0  0  0  0  0  0  0\n    0.4191   10.0186    2.6146 H   0  0  0  0  0  0  0  0  0  0  0  0\n    1.2426    8.0068    2.7190 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -3.1003    7.8442    1.3098 H   0  0  0  0  0  0  0  0  0  0  0  0\n    1.8722    6.1688    4.1457 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -3.7458    9.7027   -0.0652 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.5336    3.8483    5.6286 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.1470   12.9124   -0.0240 H   0  0  0  0  0  0  0  0  0  0  0  0\n    0.1083    5.0923    7.6446 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.7326    3.4808    7.5372 H   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0189    4.0183    9.0198 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.4226   14.1022   -2.6678 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.2066   14.1725   -1.1131 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.6200   12.5914   -1.8221 H   0  0  0  0  0  0  0  0  0  0  0  0\n    5.4926    1.3152    6.3135 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -6.5862   12.8152   -4.8801 H   0  0  0  0  0  0  0  0  0  0  0  0\n    3.5914    1.6647   10.2178 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -3.0717   15.0881   -6.0901 H   0  0  0  0  0  0  0  0  0  0  0  0\n    7.3017    0.1139    7.3104 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -7.7055   13.4967   -6.8783 H   0  0  0  0  0  0  0  0  0  0  0  0\n    5.4736    0.4281   11.1854 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -4.2692   15.7553   -8.1220 H   0  0  0  0  0  0  0  0  0  0  0  0\n    7.3358   -0.3536    9.7450 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -6.5858   14.9681   -8.5302 H   0  0  0  0  0  0  0  0  0  0  0  0\n  1 27  1  0  0  0  0\n  2 28  1  0  0  0  0\n  3 25  2  0  0  0  0\n  4 26  2  0  0  0  0\n  5  9  1  0  0  0  0\n  5 25  1  0  0  0  0\n  5 31  1  0  0  0  0\n  6 10  1  0  0  0  0\n  6 26  1  0  0  0  0\n  6 32  1  0  0  0  0\n  7 11  1  0  0  0  0\n  7 15  1  0  0  0  0\n  7 51  1  0  0  0  0\n  8 12  1  0  0  0  0\n  8 16  1  0  0  0  0\n  8 52  1  0  0  0  0\n  9 23  2  0  0  0  0\n 10 24  2  0  0  0  0\n 11 17  2  0  0  0  0\n 12 18  2  0  0  0  0\n 13 14  1  0  0  0  0\n 13 19  2  0  0  0  0\n 13 21  1  0  0  0  0\n 14 20  2  0  0  0  0\n 14 22  1  0  0  0  0\n 15 27  2  0  0  0  0\n 15 29  1  0  0  0  0\n 16 28  2  0  0  0  0\n 16 30  1  0  0  0  0\n 17 23  1  0  0  0  0\n 17 25  1  0  0  0  0\n 18 24  1  0  0  0  0\n 18 26  1  0  0  0  0\n 19 27  1  0  0  0  0\n 19 45  1  0  0  0  0\n 20 28  1  0  0  0  0\n 20 46  1  0  0  0  0\n 21 29  2  0  0  0  0\n 21 47  1  0  0  0  0\n 22 30  2  0  0  0  0\n 22 48  1  0  0  0  0\n 23 33  1  0  0  0  0\n 24 34  1  0  0  0  0\n 29 49  1  0  0  0  0\n 30 50  1  0  0  0  0\n 31 35  2  0  0  0  0\n 31 37  1  0  0  0  0\n 32 36  2  0  0  0  0\n 32 38  1  0  0  0  0\n 33 53  1  0  0  0  0\n 33 54  1  0  0  0  0\n 33 55  1  0  0  0  0\n 34 56  1  0  0  0  0\n 34 57  1  0  0  0  0\n 34 58  1  0  0  0  0\n 35 39  1  0  0  0  0\n 35 59  1  0  0  0  0\n 36 40  1  0  0  0  0\n 36 60  1  0  0  0  0\n 37 41  2  0  0  0  0\n 37 61  1  0  0  0  0\n 38 42  2  0  0  0  0\n 38 62  1  0  0  0  0\n 39 43  2  0  0  0  0\n 39 63  1  0  0  0  0\n 40 44  2  0  0  0  0\n 40 64  1  0  0  0  0\n 41 43  1  0  0  0  0\n 41 65  1  0  0  0  0\n 42 44  1  0  0  0  0\n 42 66  1  0  0  0  0\n 43 67  1  0  0  0  0\n 44 68  1  0  0  0  0\nM  END\n\n';
			// mol = ChemDoodle.readMOL(molFile, 1);
			readFile(_this.resrcPath + "data/3MJ9.pdb", function(err, data) {
				mol = ChemDoodle.readPDB(data);
				// set the residue specs to control the atoms and bonds for the nucleic acid
				mol.residueSpecs = new ChemDoodle.structures.VisualSpecifications();
				// set representation of nucleic acid atoms and bonds to 'Wireframe'
				mol.residueSpecs.set3DRepresentation('Wireframe');
				_this.cartoonTransformer.loadMolecule(mol);
				_this.ready = true;
			}, 'TEXT');
		});

		// Control the frame rate for an animation application
		this.maxFPS = 20.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},

	draw: function(date) {
		if (this.ready && this.state.ismoving) {
			var matrix = [];
			var xAxis = [1, 0, 0];
			var yAxis = [0, 1, 0];
			var zAxis = [0, 0, 1];
			ChemDoodle.lib.mat4.identity(matrix);
			this.state.rotation += this.xIncrement * this.dt;
			ChemDoodle.lib.mat4.rotate(matrix, this.state.rotation, xAxis);
			ChemDoodle.lib.mat4.rotate(matrix, this.state.rotation, yAxis);
			ChemDoodle.lib.mat4.rotate(matrix, this.state.rotation, zAxis);
			ChemDoodle.lib.mat4.set(matrix, this.cartoonTransformer.rotationMatrix);
			this.cartoonTransformer.repaint();
		}
	},

	resize: function(date) {
		if (this.ready) {
			this.cartoonTransformer.resize(this.sage2_width, this.sage2_height);
			this.cartoonTransformer.center();
			this.refresh(date);
		}
	},

	event: function(eventType, position, user_id, data, date) {
		if (eventType === "pointerPress" && (data.button === "left")) {
			// comment
		} else if (eventType === "pointerMove" && this.dragging) {
			// comment
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			// comment
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
		} else if (eventType === "widgetEvent") {
			// comment
		} else if (eventType === "keyboard") {
			if (data.character === " ") {
				this.state.ismoving = !this.state.ismoving;
				this.refresh(date);
			}
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") { // left
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") { // up
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") { // right
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") { // down
				this.refresh(date);
			}
		}
	}
});