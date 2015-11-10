sabi.js

	sabi.js: control your devices through a HTML5/Node/Javascript framework
	
	Luc Renambot - November 2012 - renambot@gmail.com
	University of Illinois at Chicago


Sabi.js

  * Run commands locally
  
  * Run scripts locally
  
  * Run scripts on a remote server
  
  * Send OSC messages to a network device


Software dependencies
   * node.js

      * package: http-auth

      * package: mime

      * package: socket.io

      * package: sprint

      * package: serialport

      * package: forever

      * package: optimist

      * package: exec-sync

      * package: async

      * package: socket.io-client

   * Web packages
      * socket.io.js
      * jquery.mobile.js
      * jquery.js
      * socket.io.js
      * underscore.js
      * backbone.js

Installation
   * Install node.js and its package manager

      * Binaries, through a package manager (for Window, Mac, Linux),
      * From sources, see node.js wiki (for Window, Mac, Linux).
   * Check the installation

      * node.js: type node -v You should get something like v0.12.xx
      * npm: type npm -v You should get something like v2.x.xx
   * Install dependencies

      * npm install : install all dependencies
      * npm install http-auth (http authorization)
      * npm install htdigest (password generation)
      * npm install mime (mime type file detection)
      * npm install serialport (serial port communication)
      * npm install socket.io (websockets)
      * npm install sprint (C-like printf)
      * npm install forever (optional but useful)
      * npm install optimist (argument processing)
      * npm install socket.io-client (server to server communication)
      * npm install exec-sync (synchronous execution of commands)
      * npm install async (high-level taks management)
   * Settings

      * On Linux: the user running the serial port commands should be in the ‘dial out’ group
   * Get sabi.js source package

      * sabijs.tar.gz
   * Open the sabi.js folder

      * Edit the file text sabi.json (JSON file format). Syntax is defined in the section below.

         * In the “global” section: server_port specifies the port the web server is listening to (port 9000 by default). Check your firewall, as needed.
         * In the “global” section: security set to true will require an account name and password to access the pages. Set to false, anyone can access the site.
      * Generate user passwords: if “security” is set to “true” in sabi.json, you need to generate a password file (called users.htpasswd) containing one or more accounts (in the realm ‘sabi’): users will need to enter a username and password to access the commands

         * Syntax: htdigest [-c] passwordfile realm username
         * Create a new file with a new user: ./node_modules/htdigest/lib/htdigest-bin.js -c users.htpasswd sabi user1
         * Add a new user: ./node_modules/htdigest/lib/htdigest-bin.js users.htpasswd sabi user2
   * Run

      * While editing your sabi.json file, it is convenient to check the messages of the server. For this, just run node server.js from the prompt,
      * Open any web browser to the http://server:port address. Fill out the password if need and start controlling your devices,
      * Once your configuration if finalized, your can use the forever command or the provided GO script:

         * ./node_modules/forever/bin/forever start server.js starts the server in the background, and will monitor its execution (and restart if it crashes)
         * ./node_modules/forever/bin/forever stopall stops all the instances of the server
         * in production mode, the GO script should be placed in the startup script of the machine or the user.
