// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2017

/**
 * @module server
 * @submodule userlist
 */

// require variables to be declared
"use strict";

const pathModule  = require('path');
const fs          = require('fs');
const JsonDB      = require('node-json-db');
const sageutils   = require('../src/node-utils');

// folder to store the user DB
const pathname = 'logs';
// Name of the file storing the user DB
const filename = 'users.json';

let nAnonClients = 0;
const strNames = "Aardvark Albatross Alligator Alpaca Ant Anteater Antelope Armadillo " +
	"Badger Barracuda Bat Beaver Bee Bison Boar Buffalo Butterfly Camel Caribou Cassowary Cat "    +
	"Caterpillar Cheetah Chicken Chinchilla Cobra Cormorant Coyote Crab Crane Crocodile "         +
	"Crow Deer Dinosaur Dog Dolphin Dove Dragonfly Duck Eagle Echidna Eel Elephant "       +
	"Emu Falcon Ferret Finch Flamingo Fox Frog Gazelle Giraffe Goat Goldfish Goose Gorilla "        +
	"Grasshopper Grizzly Hamster Hawk Hedgehog Heron Hippo Horse Hummingbird Hyena Ibex Jackal "   +
	"Jaguar Jellyfish Kangaroo Koala Lark Lemur Leopard Lion Llama Lobster Manatee "      +
	"Mink Mole Mongoose Monkey Mouse Narwhal Newt Nightingale Octopus Okapi Opossum Ostrich "      +
	"Otter Owl Oyster Panther Parrot Panda Partridge Pelican Penguin Pheasant Pigeon Porcupine "   +
	"Porpoise Quail Rabbit Raccoon Raven Rhinoceros Salamander Seahorse Seal Shark Sheep "   +
	"Sloth Snail Squid Squirrel Starling Swan Tapir Tiger T-rex Turtle Walrus Weasel Whale "       +
	"Wolf Wombat Yak Zebra";
const tempNames = strNames.split(' ');

/**
 * Creates an uid.
 *
 * @method     createUid
 * @param      {String}  name    The name
 * @param      {<type>}  email   The email
 * @return     {String}  the uid string
 */
function createUid(name, email) {
	return name.replace(/[;,=]/g, '-') + '-' + Date.now();
}

/**
 * shuffle randomly and array
 *
 * @method     shuffle
 * @param      {<type>}  array   The array
 */
function shuffle(array) {
	let l = array.length, t, i;

	while (l) {
		i = Math.floor(Math.random() * l--);

		// swap random element to end of unshuffled segment
		t = array[l];
		array[l] = array[i];
		array[i] = t;
	}
}

/**
 * Handles users and storage to database
 * as well as user roles and permissions
 *
 * @class UserList
 */
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

		// per session
		shuffle(tempNames);
		this.clients = {};
		this.rbac = null;
		this.rbacList = [];

		// get roles/permissions
		let getRbac = this.getData('/rbac');
		if (getRbac.success) {
			this.rbacList = getRbac.data || [];
			this.rbac = this.rbacList[0];
		}
		if (!this.rbac) {
			this.initRolesAndPermissions({
				roles: ['admin', 'user', 'guest'],
				actions: [
					'upload files',
					'use apps',
					'share screen',
					'share pointer',
					'move/resize windows'
				],
				permissions: {
					admin: 0b11111,
					user:  0b11111,
					guest: 0b11111
				}
			});
		}
	}

	/**
	* Track user locally by ip
	*
	* @method track
	* @param ip {String} ip address
	* @param user {Object} user
	* @return {String} name of the user
	*/
	track(ip, user) {
		this.clients[ip] = {
			user: user,
			role: []
		};

		// assign guest role to non-logged in users
		if (!user.name && !user.email) {
			this.assignRole(ip, 'guest');
			if (!user.SAGE2_ptrName) {
				user.SAGE2_ptrName = 'Anon ' + tempNames[nAnonClients];
				nAnonClients = (nAnonClients + 1) % tempNames.length; // FIXME
			}
		} else {
			// assign user role to logged in users by default
			this.assignRole(ip, 'user');

			// find if user already has an active client
			for (let i in this.clients) {
				if (i !== ip && this.clients[i].user.name === user.name && this.clients[i].user.email === user.email) {
					this.clients[ip].role = this.clients[i].role;
				}
				break;
			}
		}

		return user.SAGE2_ptrName;
	}

	/**
	* Stop tracking this ip
	*
	* @method disconnect
	* @param ip {String} ip address
	*/
	disconnect(ip) {
		delete this.clients[ip];
	}

	// ***********  Role Management Functions *************

	/**
	* Initialize role access system
	*
	* @method initRolesAndPermissions
	* @param rbac {Object} object containing the three parameters:
	*  - roles:       an array of strings of role names
	*  - actions:     an array of strings of action names
	*  - permissions: an object of role-bitfield pairs
	*/
	initRolesAndPermissions(rbac) {
		rbac.mask = {};

		let l = rbac.actions.length - 1;
		rbac.actions.forEach((action, i) => {
			rbac.mask[action] = (1 << (l - i));
		});
		rbac.maskAll = (1 << rbac.actions.length) - 1;

		this.rbacList.push(rbac);
		this.rbac = rbac;
	}

	/**
	* Set permissions for this role
	*
	* @method defineRolePermissions
	* @param role {String}
	* @param permissions {Object} list of permission names and values
	* as String-Boolean pairs
	*/
	defineRolePermissions(role, permissions) {
		if (this.rbac.roles.indexOf(role) < 0) {
			this.rbac.roles.push(role);
		}

		// generate permission bit string
		let pBits = 0;
		for (let action in permissions) {
			if (permissions[action] && this.rbac.mask[action]) {
				pBits |= this.rbac.mask[action];
			}
		}

		this.rbac.permissions[role] = pBits;
	}

	/**
	* Add permission for this action to the role
	*
	* @method grantPermission
	* @param role {String}
	* @param action {String}
	*/
	grantPermission(role, action) {
		if (this.rbac.roles.indexOf(role) > -1) {
			this.rbac.permissions[role] |= this.rbac.mask[action];
		}
	}

	/**
	* Remove permission for this action from the role
	*
	* @method revokePermission
	* @param role {String}
	* @param action {String}
	*/
	revokePermission(role, action) {
		if (this.rbac.roles.indexOf(role) > -1) {
			this.rbac.permissions[role] &= (this.rbac.maskAll ^ this.rbac.mask[action]);
		}
	}


	/**
	* Set the user to have only this role
	*
	* @method assignRole
	* @param ip {String}
	* @param role {String}
	*/
	assignRole(ip, role) {
		if (this.clients[ip]) {
			this.clients[ip].role = [role];
		}
	}

	/**
	* Add this role to the list of user's roles
	*
	* @method addRole
	* @param ip {String}
	* @param role {String}
	*/
	addRole(ip, role) {
		if (this.clients[ip] && this.clients[ip].role.indexOf(role) < 0) {
			this.clients[ip].role.push(role);
		}
	}

	/**
	* Remove this role from the list of user's roles
	*
	* @method removeRole
	* @param ip {String}
	* @param role {String}
	*/
	removeRole(ip, role) {
		if (this.clients[ip]) {
			let i = this.clients[ip].role.indexOf(role);
			if (i > -1) {
				this.clients[ip].role.splice(i, 1);
			}
		}
	}

	/**
	* Check if user has permission to do an action
	*
	* @method isAllowed
	* @param ip {String} client ip requesting permission
	* @param action {String} name of the action
	* @return {Boolean} true if user is permitted to perform this action
	*/
	isAllowed(ip, action) {
		// Skip authorization for now
		return true;

		// server's special case
		// if (ip === "127.0.0.1:42") {
		// 	return true;
		// }
		// if (!this.clients[ip]) {
		// 	return false;
		// }
		// let roles = this.clients[ip].role;
		// for (let i in roles) {
		// 	if (this.rbac.mask[action] & this.rbac.permissions[roles[i]]) {
		// 		return true;
		// 	}
		// }
		// return false;
	}

	/**
	* save permissions models to database
	*
	* @method save
	*/
	save() {
		this.push('/rbac', this.rbacList);
	}

	// **************  Database Functions *****************

	/**
	* Reload database if json file was changed externally
	*
	* @method reload
	*/
	reload() {
		this.db.reload();
	}

	/**
	 * Wrapper for JsonDB.getData()
	 * Retrieve data from json database or log an error if it fails
	 *
	 * @method getData
	 * @param path {String}
	 * @return {Object} object with the success flag and the retrieved data
	 */
	getData(path) {
		try {
			let data = this.db.getData(path);
			return {
				success: true,
				data: data
			};
		} catch (error) {
			// sageutils.log("Userlist", "Error", error.message);
			return {
				success: false
			};
		}
	}

	/**
	 * Wrapper for JsonDB.push()
	 * Push data to json database or log an error if it fails
	 *
	 * @method push
	 * @param path {String}
	 * @param data {Object} new data to be pushed
	 * @param checkIfPathExists {Boolean} check if path exists before pushing * the data; default is false
	 * @return {Boolean} true if push succeeds
	 */
	push(path, data, overwrite = true, checkIfPathExists = false) {
		try {
			if (checkIfPathExists) {
				this.db.getData(path);
			}
			this.db.push(path, data, overwrite);
			return true;
		} catch (error) {
			// sageutils.log("Userlist", "Error", error.message);
			return false;
		}
	}

	/**
	 * Wrapper for JsonDB.delete()
	 * Remove data at a path or log an error if it fails
	 *
	 * @method delete
	 * @param path {String}
	 * @return {Boolean} true if delete succeeds
	 */
	delete(path) {
		try {
			this.db.delete(path);
			return true;
		} catch (error) {
			sageutils.log("Userlist", "Error", error.message);
		}
		return false;
	}

	/**
	 * Store a new user in the database
	 *
	 * @method addNewUser
	 * @param name {String}
	 * @param email {String}
	 * @param properties {Object}
	 * @return {Object} object with the user token, user object, and an error
	 * message if the user could not be added
	 */
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

	/**
	 * Retrieve a user in the database by name and email
	 *
	 * @method getUser
	 * @param name {String}
	 * @param email {String}
	 * @return {Object} object with the user token, user object, and an error
	 * message if the user could not be added
	 */
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

	/**
	 * Retrieve a user in the database by user id
	 *
	 * @method getUserById
	 * @param uid {String}
	 * @return {Object} object with the user token, user object, and an error
	 * message if the user could not be added
	 */
	getUserById(uid) {
		let req = this.getData(this.userPath(uid));
		if (req.success) {
			return {
				uid: uid,
				user: req.data,
				error: null
			};
		}

		return {
			user: null,
			uid: null,
			error: "Could not find user."
		};
	}

	/**
	 * Remove user from the database
	 *
	 * @method removeUser
	 * @param uid {String}
	 * @return {Boolean} true if delete succeeds
	 */
	removeUser(uid) {
		return this.delete(this.userPath(uid));
	}


	/**
	 * Edit user properties
	 *
	 * @method editUser
	 * @param uid {String}
	 * @param properties {Object}
	 * @return {Boolean} true if edit succeeds
	 */
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

	/**
	 * Get properties of a user
	 *
	 * @method getProperty
	 * @param uid {String}
	 * @param arguments {String} property key(s)
	 * @return the property or an array of properties
	 */
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
		return pathModule.join(pathname, filename);
	}
}

module.exports = new UserList();
