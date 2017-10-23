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
 * @module server
 * @submodule userlist
 */

// require variables to be declared
"use strict";

const path        = require('path');
const fs          = require('fs');
const JsonDB      = require('node-json-db');
const sageutils   = require('../src/node-utils');

const pathname = 'logs';
const filename = 'users.json';

function createUid(name, email) {
	return name.replace(/[;,=]/g, '-') + '-' + Date.now();
}

class UserList {
	constructor() {
		this.currentSession = null;

		// make sure that the path and file exist
		if (!sageutils.folderExists(pathname)) {
			fs.mkdirSync(pathname);
		}
		if (!sageutils.fileExists(this.filePath)) {
			fs.writeFileSync(this.filePath, "{}");
		}

		// create the database
		this.db = new JsonDB(
			this.filePath,
			true, 	// save after each push
			true	// save in human-readable format
		);

		this.roles = [];
	}

	/* reload database if json file was changed externally */
	reload() {
		this.db.reload();
	}

	/* wrapper for JsonDB.getData()
	 * retrieve data from json database or log an error if it fails 
	 * return an object with success flag and the data
	 */
	getData(path) {
		try {
			let data = this.db.getData(path);
			return {
				success: true,
				data: data
			};
		} catch (error) {
			console.error(sageutils.header("Userlist") + error);
			return {
				success: false
			};
		}
	}

	/* wrapper for JsonDB.push()
	 * push data to json database or log an error if it fails
	 * return true/false for success
	 */
	push(path, obj, overwrite = true, checkIfPathExists = false) {
		try {
			if (checkIfPathExists) {
				this.db.getData(path);
			}
			this.db.push(path, obj, overwrite);
			return true;
		} catch (error) {
			console.error(sageutils.header("Userlist") + error);
			return false;
		}
	}

	/* wrapper for JsonDB.delete()
	 * remove data at a path or log an error if it fails
	 * return true/false for success
	 */
	delete(path) {
		try {
			this.db.delete(path);
			return true;
		} catch (error) {
			console.error(sageutils.header("Userlist") + error);
		}
		return false;
	}


	/* store a new session in the database */
	startSession(config) {
		let now = Date.now();
		this.currentSession = config.host + ':' + config.port + ' ' + new Date(now);
		this.push(this.sessionPath, { start: now });
	}

	/* mark the end of the current session */
	endSession() {
		this.push(this.sessionPath, { end: Date.now() }, false, true);
		this.currentSession = null;
	}

	/* store a new user in the database */
	addNewUser(name, email, properties = {}) {
		name = name && name.trim();
		email = email && email.trim();
		if (name && email) {
			let req = this.getUser(name, email);
			if (req.error === null) {
				return {
					error: 'User already exists. Sign in instead.',
					user: req.user,
					uid: req.uid
				};
			} else {
				// create a new uid
				let uid = createUid(name, email);

				// add new user to database
				let newUser = Object.assign({name, email}, properties);
				this.push(this.userPath(uid), newUser);
				return {
					error: null,
					uid: uid,
					user: newUser
				};
			}
		}
		return {
			error: 'User must have a name and an email.'
		};
	}

	/* retrieve uid of user if user exists in database */
	getUser(name, email) {
		let req = this.getData('/user');
		if (req.success) {
			for (let uid in req.data) {
				if (req.data[uid].name === name && req.data[uid].email === email) {
					return {
						uid: uid,
						user: req.data[uid],
						error: null
					};
					// return uid;
				}
			}
		}
		return {
			user: null,
			uid: null,
			error: "Could not find user."
		};
	}

	/* compare uid to existing data in db */
	userExists(uid) {
		return this.getData(this.userPath(uid)).success;
	}

	/* remove user from the database */
	removeUser(uid) {
		this.delete(this.userPath(uid));
	}

	/* update user properties */
	editUser(uid, properties) {
		// name and email keys cannot be empty
		if (!properties.name || !properties.name.trim()) {
			delete properties.name;
		}
		if (!properties.email || !properties.email.trim()) {
			delete properties.email;
		}
		return this.push(this.userPath(uid), properties, false, true);
	}

	/* get properties of a user */
	getProperty(uid) {
		var keys = [].slice.call(arguments, 1);
		let req = this.getData(this.userPath(uid));
		if (req.success) {
			if (keys.length === 0) {
				return null;
			} else if (keys.length === 1) {
				return req.data[keys[0]];
			} else {
				return keys.map(key => req.data[key]);
			}
		}
		return null;
	}

	userPath(uid) {
		return '/user/' + uid;
	}

	get filePath() {
		return path.join(pathname, filename);
	}
	get sessionPath() {
		return '/session/' + this.currentSession;
	}
}

module.exports = new UserList();
