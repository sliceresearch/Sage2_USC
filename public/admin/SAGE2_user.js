(function() {
	let clients = {};
	let rbac = {};
	let rbacList = [];
	let nli = 0;
	let socketOpen = false;
	let wsio = new WebsocketIO();
	let session = getCookie("session");

	// attach handlers on DOM load
	document.addEventListener('DOMContentLoaded', function() {
		// enable navigation between screens via tabs
		document.querySelectorAll('button.tab').forEach(btn => {
			btn.onclick = changeView;
		});

		// manage "new user model" interaction
		document.getElementById('permission--new').onclick = openNewModelForm;
		document.getElementById('permission--add').onclick = addNewModel;
		document.getElementById('permission--cancel').onclick = closeNewModelForm;

		// open socket
		wsio.open(onSocketOpen);

		// Socket close event (ie server crashed)
		wsio.on('close', onSocketClose);
	});

	// ********** DOM UI actions *************
	/**
	 * Open new view in single-page app on button click
	 *
	 * @method changeView
	 */
	function changeView() {
		let id = this.getAttribute('data-tab');

		// toggle 'active' class for header buttons & for sections
		let activeTab = document.querySelector('button.tab.active');
		if (activeTab) {
			activeTab.classList.remove('active');
		}
		this.classList.add('active');

		let section = document.getElementById(id);
		if (section) {
			document.querySelectorAll('section.active').forEach(s => {
				s.classList.remove('active');
			});
			section.classList.add('active');
		}
	}

	/**
	 * Open form to enable user to create a new user model
	 *
	 * @method openNewModelForm
	 */
	function openNewModelForm() {
		document.getElementById('permission--nav').classList.add('adding');
		document.getElementById('permission--input').focus();
	}

	/**
	 * Hide form for creating a new user model
	 *
	 * @method closeNewModelForm
	 */
	function closeNewModelForm(e) {
		e.preventDefault();
		document.getElementById('permission--nav').classList.remove('adding');
		document.getElementById('permission--form').reset();
	}

	/**
	 * Send message to server to create a new user model
	 *
	 * @method addNewModel
	 */
	function addNewModel(e) {
		e.preventDefault();
		let val = document.getElementById('permission--input').value;
		if (val && val.trim()) {
			val = val.trim();
			if (val === 'Default' || rbacList.find(rbac => rbac.name === val)) {
				// FIXME
				alert('Please choose a unique name.');
			} else {
				document.getElementById('permission--nav').classList.remove('adding');
				document.getElementById('permission--form').reset();
				if (socketOpen) {
					wsio.emit('createPermissionsModel', {name: val});
				}
			}
		}
	}

	// ********* Socket listeners ***********
	/**
	 * Connect client to SAGE2 server as a 'userManager' and attach listeners
	 *
	 * @method onSocketOpen
	 */
	function onSocketOpen() {
		wsio.emit('addClient', {
			clientType: 'userManager',
			session: session,
			requests: {
				config:  true,
				version: true,
				time:    false,
				console: true
			}
		});

		// on socket initialization
		wsio.on('initialize', function() {
			socketOpen = true;
			document.getElementById('log').innerHTML = 'Listening...';

			// request client and rbac data
			wsio.emit('getActiveClients');
			wsio.emit('getRbac');
		});

		// attach wsio event listeners
		wsio.on('activeClientsRetrieved', handleClientsRetrieved);
		wsio.on('rbacRetrieved', handleRbacRetrieved);
		wsio.on('userEvent', handleUserEvent);
	}

	/**
	 * Attempt to reconnect to server on disconnect
	 *
	 * @method onSocketClose
	 */
	function onSocketClose() {
		socketOpen = false;
		var refresh = setInterval(function() {
			// make a dummy request to test the server every 2 sec
			var xhr = new XMLHttpRequest();
			xhr.open("GET", "/", true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4 && xhr.status === 200) {
					console.log("server ready");
					// when server ready, clear the interval callback
					clearInterval(refresh);
					// and reload the page
					window.location.reload();
				}
			};
			xhr.send();
		}, 2000);
	}

	/**
	 * If new client (user) data received from server
	 *
	 * @method handleClientsRetrieved
	 */
	function handleClientsRetrieved(data) {
		clients = data.clients;
		rbac = data.rbac;
		redrawUsers();
	}

	/**
	 * If new rbac data received from server
	 *
	 * @method handleRbacRetrieved
	 */
	function handleRbacRetrieved(data) {
		rbac = data.rbac;
		rbacList = data.rbacList;
		redrawPermissions();
	}

	/**
	 * Log event
	 *
	 * @method handleUserEvent
	 */
	function handleUserEvent(data) {
		logEvent(data);
		updateClients(data.type);
	}

	// ******* Utility functions *********

	// transforms string to sentence case
	function sentenceCase(word) {
		return word.toLowerCase().replace(/(.)/, firstLetter => firstLetter.toUpperCase());
	}

	// insert text into a dom node
	function addText(el, text) {
		el.appendChild(document.createTextNode(text));
		return el;
	}

	// ******* Update functions *********
	/**
	 * Check if client has been changed and user section
	 * needs to be redrawn
	 *
	 * @method updateClients
	 * @param eventType {String} the type of the event
	 */
	function updateClients(eventType) {
		switch (eventType) {
			case 'new user':
			case 'user edited':
			case 'login':
			case 'logout':
			case 'connect':
			case 'disconnect':
				wsio.emit('getActiveClients');
				break;
			default:
				break;
		}
	}

	/**
	 * Repopulate table with information on connected clients
	 *
	 * @method redrawUsers
	 */
	function redrawUsers() {
		let head = document.querySelector('#user--table tr');

		let container = head.parentNode;

		// delete children
		for (let i = container.children.length - 1; i >= 0; --i) {
			if (head !== container.children[i]) {
				container.removeChild(container.children[i]);
			}
		}

		for (let ip in clients) {
			let color = clients[ip].user.SAGE2_ptrColor;
			let label = clients[ip].user.SAGE2_ptrName || '';
			let name = clients[ip].user.name || '';
			let role = clients[ip].role[0];

			let tr = document.createElement('tr');
			tr.innerHTML = '<td><span class="cursor" style="background-color:' + color + '"></span></td>';

			[label, name, role, ip].forEach((string, i) => {
				let td = document.createElement('td');

				if (i !== 2 || role === 'guest') {
					addText(td, string);
				} else {
					// create dropdown field
					let select = document.createElement('select');
					let roles = rbac.roles.filter(r => r !== 'guest');
					roles.forEach(role => {
						let option = document.createElement('option');
						addText(option, role);
						if (role === string) {
							option.selected = true;
						}
						select.appendChild(option);
					});
					td.appendChild(select);

					// attach listener to select input
					select.onchange = function() {
						let selectedRole = roles[this.selectedIndex];
						let selectedUser = clients[ip];
						if (selectedRole && selectedUser) {

							// find all ips with the same user
							let ips = Object.keys(clients).filter(ip => {
								let user = clients[ip].user;
								return user.name === selectedUser.user.name && user.email === selectedUser.user.email;
							});

							wsio.emit('editUserRole', {
								ips: ips,
								role: selectedRole
							});
						}
					};
				}

				tr.appendChild(td);
			});

			container.appendChild(tr);
		}
	}

	/**
	 * Repopulate table with information on roles and permissions models
	 *
	 * @method redrawPermissions
	 */
	function redrawPermissions() {
		// populate html
		// table
		let table = document.getElementById('permission--list');
		table.innerHTML = '';

		let tableHead = document.createElement('tr');
		tableHead.appendChild(document.createElement('th'));
		rbac.roles.forEach(role => {
			let th = addText(document.createElement('th'), sentenceCase(role));
			tableHead.appendChild(th);
		});
		table.append(tableHead);

		let html = '';
		rbac.actions.forEach((action, i) => {
			html += '<tr><td>' + sentenceCase(action) + '</td>';

			rbac.roles.forEach(role => {
				let id = 'action--' + role + '_' + i;
				html += '<td><input type="checkbox" id="' + id + '"></td>';
			});
			html += '</tr>';
		});
		table.innerHTML += html;

		// select
		let select = document.getElementById('permission--select');
		select.innerHTML = '';
		rbacList.forEach(_rbac => {
			let name = _rbac.name || 'Default';
			let option = addText(document.createElement('option'), name);
			if (_rbac.name === rbac.name) {
				option.selected = true;
			}
			select.appendChild(option);
		});
		select.disabled = rbacList.length === 1;

		// attach handlers to inputs
		document.querySelectorAll('#permission--list input').forEach(input => {
			let match = input.id.match(/action--(.+)_(\d+)/);
			if (match) {
				let role = match[1];
				let action = rbac.actions[match[2]];

				input.checked = (rbac.permissions[role] & rbac.mask[action]) !== 0;

				input.onchange = function() {
					wsio.emit('editRole', {
						role: role,
						action: action,
						hasRole: this.checked
					});
				};
			}
		});

		// attach handler to select change
		select.onchange = function() {
			let rbac = rbacList[this.selectedIndex];
			if (rbac) {
				wsio.emit('switchPermissionsModel', rbac.name);
			}
		};
	}

	/**
	 * Print event to screen
	 *
	 * @method logEvent
	 */
	function logEvent(event) {
		let log = document.getElementById('log');

		let p = document.createElement('p');
		p.innerHTML = new Date() + '<br>';
		let b = addText(document.createElement('b'), event.type);
		p.appendChild(b);

		if (event.data) {
			let appname = event.data.filename || event.data.application;

			if (appname) {
				if (appname.indexOf('/') > -1) {
					addText(b, ' ' + appname.slice(appname.lastIndexOf('/') + 1));
				} else {
					addText(b, ' ' + appname);
				}
			}

			let name = event.data.label || event.data.SAGE2_ptrName;
			if (name) {
				addText(p, name);
			}
			addText(p, ' [' + event.id + ']');
		}

		log.appendChild(p);
		if (nli < 20) {
			++nli;
		} else {
			log.removeChild(log.querySelector('p'));
		}
	}
}());
