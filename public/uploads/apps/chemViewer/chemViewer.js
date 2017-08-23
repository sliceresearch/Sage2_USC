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

var chemViewer = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);

		// Set the background to black
		this.element.style.backgroundColor = 'black';
		// Keep a copy of the title (app name)
		this.title = data.title;

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

		// move and resize callbacks
		this.resizeEvents = "onfinish";

		// SAGE2 Application
		this.repaint  = false;
		this.dragging = false;
		this.lastPosition = null;

		// setup component
		this.cartoonTransformer = new ChemDoodle.ViewerCanvas3D(data.id + "_canvas",
			data.width, data.height);
		// set the ligand atom/bond representation to 'Ball and Stick'
		this.cartoonTransformer.specs.set3DRepresentation('Ball and Stick');
		// set the background color to black
		this.cartoonTransformer.specs.backgroundColor = '#000000';
		// display shapely colors for the residues
		this.cartoonTransformer.specs.nucleics_residueColor = 'shapely';
		// display the atoms and bonds for the nucleic acid...
		this.cartoonTransformer.specs.macro_displayAtoms = true;
		this.cartoonTransformer.specs.macro_displayBonds = true;
		// ... but only show nucleic acid atoms within 5 Angstroms of a ligand atom
		this.cartoonTransformer.specs.macro_atomToLigandDistance = 5;

		this.cartoonTransformer.specs.atoms_resolution_3D = 20;
		this.cartoonTransformer.specs.compass_display = true;
		this.cartoonTransformer.specs.proteins_ribbonCartoonize = true;

		// Is it loaded from an asset or as an application
		if (data.state.file && data.state.file.length > 0) {
			// asset to load
			var toLoad = data.state.file;
			// get last element
			var name = toLoad.split('/').slice(-1)[0];
			this.loadMolecule(toLoad, name);
		} else {
			// loaded as an app, default molecule
			this.loadMolecule(this.resrcPath + "data/aspirin.pdb", "aspirin.pdb");
		}

		// Control the frame rate for an animation application
		this.maxFPS = 30.0;
	},

	/**
	 * Loads a molecule from a URL
	 *
	 * @method     loadMolecule
	 * @param      {String}  filename  The filename
	 * @param      {String}  title     The title
	 */
	loadMolecule: function (filename, title) {
		this.ready = false;
		var _this = this;
		if (filename.endsWith('.pdb')) {
			readFile(filename, function(err, data) {
				var mol = ChemDoodle.readPDB(data);
				// set the residue specs to control the atoms and bonds for the nucleic acid
				mol.residueSpecs = new ChemDoodle.structures.VisualSpecifications();
				// set representation of nucleic acid atoms and bonds to 'Wireframe'
				mol.residueSpecs.set3DRepresentation('Wireframe');
				_this.cartoonTransformer.loadMolecule(mol);

				_this.ready = true;
				// Update the title bar
				var newTitle;
				newTitle = _this.title + " - " + title;
				_this.updateTitle(newTitle);
			}, 'TEXT');
		} else if (filename.endsWith('.cif')) {
			readFile(filename, function(err, data) {
				var mol = ChemDoodle.readCIF(data, 1, 1, 1);
				mol.residueSpecs = new ChemDoodle.structures.VisualSpecifications();
				mol.residueSpecs.set3DRepresentation('Wireframe');
				_this.cartoonTransformer.loadContent([mol.molecule]);

				_this.ready = true;
				// Update the title bar
				var newTitle;
				newTitle = _this.title + " - " + title;
				_this.updateTitle(newTitle);
			}, 'TEXT');
		} else if (filename.endsWith('.mol')) {
			readFile(filename, function(err, data) {
				var mol = ChemDoodle.readMOL(data, 1);
				_this.cartoonTransformer.specs.set3DRepresentation('Ball and Stick');
				_this.cartoonTransformer.loadMolecule(mol);

				_this.ready = true;
				// Update the title bar
				var newTitle;
				newTitle = _this.title + " - " + title;
				_this.updateTitle(newTitle);
			}, 'TEXT');
		}
	},

	/**
	 * Loads a molecule from a data string
	 *
	 * @method     loadMoleculeFromString
	 * @param      {String}  data      The data
	 * @param      {String}  title     The title
	 */
	loadMoleculeFromString: function (response) {
		if (response.err) {
			console.log('Problem:', response.err);
		} else {
			var data  = response.data;
			var title = response.name + '.pdb';
			console.log('Got back', title);

			var mol = ChemDoodle.readPDB(data);
			// set the residue specs to control the atoms and bonds for the nucleic acid
			mol.residueSpecs = new ChemDoodle.structures.VisualSpecifications();
			// set representation of nucleic acid atoms and bonds to 'Wireframe'
			mol.residueSpecs.set3DRepresentation('Wireframe');
			this.cartoonTransformer.loadMolecule(mol);
			this.ready = true;
			// Update the title bar
			var newTitle;
			newTitle = this.title + " - " + title;
			this.updateTitle(newTitle);
		}
	},

	/**
	 * Loads a molecule formatted as a mol file from a data string
	 *
	 * @method     loadMolFromString
	 * @param      {String}  data      The data
	 * @param      {String}  title     The title
	 */
	loadMolFromString: function (response) {
		if (response.err) {
			console.log('Problem:', response.err);
		} else {
			var data  = response.data;
			var title = response.name + '.mol';
			console.log('Got back', title);

			var mol = ChemDoodle.readMOL(data, 1);

			this.cartoonTransformer.specs.set3DRepresentation('Ball and Stick');

			this.cartoonTransformer.loadMolecule(mol);
			this.ready = true;
			// Update the title bar
			var newTitle;
			newTitle = this.title + " - " + title;
			this.updateTitle(newTitle);
		}
	},

	/**
	 * Draws a molecule.
	 *
	 * @method     drawMolecule
	 */
	drawMolecule: function () {
		var matrix = [];
		// var xAxis = [1, 0, 0];
		var yAxis = [0, 1, 0];
		var zAxis = [0, 0, 1];
		// identity matrix
		ChemDoodle.lib.mat4.identity(matrix);
		// increase the rotation angle
		if (this.state.ismoving) {
			this.state.rotationx += this.xIncrement * this.dt;
			this.state.rotationy += this.yIncrement * this.dt;
		}
		// build the rotation matrix
		ChemDoodle.lib.mat4.rotate(matrix, this.state.rotationx, zAxis);
		ChemDoodle.lib.mat4.rotate(matrix, this.state.rotationy, yAxis);
		// ChemDoodle.lib.mat4.rotate(matrix, this.state.rotation, zAxis);
		// build the scaling vector
		var scaling = [this.state.scale, this.state.scale, this.state.scale];
		ChemDoodle.lib.mat4.scale(matrix, scaling);
		// apply the new matrix
		ChemDoodle.lib.mat4.set(matrix, this.cartoonTransformer.rotationMatrix);
		// redraw
		this.cartoonTransformer.repaint();
	},

	/**
	 * SAGE2 draw callback
	 *
	 * @method     draw
	 * @param      {<type>}  date    The date
	 */
	draw: function(date) {
		if (this.ready && (this.state.ismoving || this.dragging || this.repaint)) {
			this.drawMolecule();
		}
		this.repaint = false;
	},

	/**
	 * SAGE2 resize callback
	 *
	 * @method     resize
	 * @param      {<type>}  date    The date
	 */
	resize: function(date) {
		if (this.ready) {
			this.cartoonTransformer.resize(this.sage2_width, this.sage2_height);
			this.cartoonTransformer.center();
			this.refresh(date);
		}
	},


	/**
	 * Gets the context entries, to enable right click context menu
	 *
	 * @method     getContextEntries
	 * @return     {Array}  The context entries.
	 */
	getContextEntries: function() {
		var entries = [];

		// Various functions
		entries.push({
			description: "Reset the view",
			callback: "resetView",
			parameters: {
			}
		});

		entries.push({
			description: "Toggle auto-rotate",
			callback: "autoRotate",
			parameters: {
			}
		});

		entries.push({
			description: "Toggle labels",
			callback: "updateStyle",
			parameters: {
				style: "Labels"
			}
		});

		// Special entry for separator, a horizontal line
		entries.push({
			description: "separator"
		});

		// Drawing modes
		entries.push({
			description: "Draw lines",
			callback: "updateStyle",
			parameters: {
				style: "Line"
			}
		});
		entries.push({
			description: "Draw van der Waals Spheres",
			callback: "updateStyle",
			parameters: {
				style: "van der Waals Spheres"
			}
		});
		entries.push({
			description: "Draw wireframe",
			callback: "updateStyle",
			parameters: {
				style: "Wireframe"
			}
		});
		entries.push({
			description: "Draw ball and stick",
			callback: "updateStyle",
			parameters: {
				style: "Ball and Stick"
			}
		});
		entries.push({
			description: "Draw stick",
			callback: "updateStyle",
			parameters: {
				style: "Stick"
			}
		});

		// Special entry for separator, a horizontal line
		entries.push({
			description: "separator"
		});

		entries.push({
			description: "Enter PDB ID:",
			callback: "searchPDB",
			parameters: {},
			inputField: true,
			inputFieldSize: 20
		});

		entries.push({
			description: "Enter MOL ID:",
			callback: "searchMOL",
			parameters: {},
			inputField: true,
			inputFieldSize: 20
		});

		// Special entry for separator, a horizontal line
		entries.push({
			description: "separator"
		});

		// Select various molecules
		entries.push({
			description: "aspirin",
			callback: "changeMolecule",
			parameters: {
				name: "aspirin.pdb"
			}
		});

		entries.push({
			description: "hemoglobin",
			callback: "changeMolecule",
			parameters: {
				name: "hemoglobin.pdb"
			}
		});

		entries.push({
			description: "C14 H18 Mo2 S4",
			callback: "changeMolecule",
			parameters: {
				name: "11224c1.cif"
			}
		});
		entries.push({
			description: "Caffeine",
			callback: "changeMolecule",
			parameters: {
				name: "caffeine_3D.mol"
			}
		});

		entries.push({
			description: "DNA",
			callback: "changeMolecule",
			parameters: {
				name: "DNA.pdb"
			}
		});

		entries.push({
			description: "3MJ9",
			callback: "changeMolecule",
			parameters: {
				name: "3MJ9.pdb"
			}
		});

		entries.push({
			description: "alcohol dehydrogenase",
			callback: "changeMolecule",
			parameters: {
				name: "alcohol_dehydrogenase.pdb"
			}
		});

		entries.push({
			description: "Nanotube",
			callback: "changeMolecule",
			parameters: {
				name: "Nanotube.pdb"
			}
		});

		// All done
		return entries;
	},

	/**
	 * search online for a PDB file
	 *
	 * @method     searchPDB
	 * @param      {Object}  responseObject  The response object
	 */
	searchPDB: function(responseObject) {
		var molName = responseObject.clientInput;
		console.log('Search for', molName);
		if (isMaster && molName) {
			var baseURL  = "http://www.pdb.org/pdb/download/downloadFile.do?fileFormat=pdb&compression=NO";
			var queryURL = baseURL + "&structureId=" + molName;
			this.applicationRPC({url: queryURL, name: molName}, "loadMoleculeFromString", true);
		}
	},

	/**
	 * search online for a MOL file
	 *
	 * @method     searchMOL
	 * @param      {Object}  responseObject  The response object
	 */
	searchMOL: function(responseObject) {
		var molName = responseObject.clientInput;
		console.log('Search for', molName);
		if (isMaster && molName) {
			var baseURL  = "http://www.ebi.ac.uk/chebi/saveStructure.do";
			var queryURL = baseURL + "?defaultImage=true&chebiId=" + molName;
			this.applicationRPC({url: queryURL, name: molName}, "loadMolFromString", true);
		}
	},

	/**
	 * Change the drawing style
	 *
	 * @method     updateStyle
	 * @param      {Object}  responseObject  The response object
	 */
	updateStyle: function(responseObject) {
		var style = responseObject.style;
		if (style === "Labels") {
			// Flip the labels value
			var current = this.cartoonTransformer.specs.atoms_displayLabels_3D;
			this.cartoonTransformer.specs.atoms_displayLabels_3D = !current;
		} else {
			this.cartoonTransformer.specs.set3DRepresentation(style);
		}
		this.drawMolecule();
	},

	/**
	 * reset view, mainly the angle of rotation
	 *
	 * @method     resetView
	 * @param      {Object}  responseObject  The response object
	 */
	resetView: function(responseObject) {
		this.state.rotationx = 0;
		this.state.rotationy = 0;
		this.state.scale     = 1;
		this.drawMolecule();
	},

	/**
	 * Support function to change molecule through right mouse context menu
	 *
	 * @method     changeMolecule
	 * @param      {Object}  responseObject  The response object
	 */
	changeMolecule: function(responseObject) {
		var mol = responseObject.name;
		this.state.rotationx = 0;
		this.state.rotationy = 0;
		this.state.scale     = 1;
		this.loadMolecule(this.resrcPath + "data/" + mol, mol);
	},

	/**
	 * Switch on/off auto-rotation
	 *
	 * @method     autoRotate
	 * @param      {Object}  responseObject  The response object
	 */
	autoRotate: function(responseObject) {
		this.state.ismoving = !this.state.ismoving;
	},

	/**
	 * Event handler
	 *
	 * @method     event
	 * @param      {String}  eventType  The event type
	 * @param      {Object}  position   The position .x .y
	 * @param      {String}  user_id    The user identifier
	 * @param      {Object}  data       The data for buttons
	 * @param      {Date}  date       The date
	 */
	event: function(eventType, position, user_id, data, date) {
		if (!this.ready) {
			return;
		}
		if (eventType === "pointerPress" && (data.button === "left")) {
			this.dragging = true;
			this.lastPosition = position;
		} else if (eventType === "pointerMove" && this.dragging) {
			this.state.rotationx += (position.x - this.lastPosition.x) * 0.01;
			this.state.rotationy -= (position.y - this.lastPosition.y) * 0.01;
			this.lastPosition = position;
			this.repaint = true;
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			this.dragging = false;
		} else if (eventType === "pointerScroll") {
			// update the scale amount
			this.state.scale += data.wheelDelta / 1000.0;
			// put some limits to scale [0-4]
			if (this.state.scale <= 0.01) {
				this.state.scale = 0.01;
			} else if (this.state.scale > 4.0) {
				this.state.scale = 4.0;
			}
			this.repaint = true;
		} else if (eventType === "widgetEvent") {
			// comment
		} else if (eventType === "keyboard") {
			if (data.character === " ") {
				this.autoRotate();
				this.repaint = true;
			}
			if (data.character === "r") {
				this.resetView();
				this.repaint = true;
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
