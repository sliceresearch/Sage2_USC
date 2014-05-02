SAGE2
=======

Browser based implementation of SAGE. A cluster-based html viewer used for displaying elements across multiple browser windows.

##### Dependencies #####
* node.js
* ffmpeg
* poppler
* graphicsmagick

##### Install #####
* [Windows Install](https://bitbucket.org/sage2/sage2/wiki/Install%20(Windows))
* [Mac OSX Install](https://bitbucket.org/sage2/sage2/wiki/Install%20(Mac%20OSX))
* [OpenSUSE Install](https://bitbucket.org/sage2/sage2/wiki/Install%20(openSUSE))
* [Ubuntu Install](https://bitbucket.org/sage2/sage2/wiki/Install%20(Ubuntu))

##### Configure #####
* Create a [configuration file](https://bitbucket.org/sage2/sage2/wiki/Configuration) for your display environment
* Save file in <SAGE2_directory>/config
* Select your configuration file
    * Option 1: name your configuration file '<host_until_first_dot>-cfg.json'  
 (eg. host = thor.evl.uic.edu, config file is 'thor-cfg.json')
    * Option 2: create a file 'config.txt' in <SAGE2_directory>. Specify the path to your configuration file in 'config.txt'

##### Run #####
* Open Terminal / Cmd
    * `cd <SAGE2_directory>`
    * `node server.js`
* Open Google Chrome (point browser to host and port defined in config file)
    * Table of Contents: `http://<host>:<index_port>`
    * Display Client: `https://<host>:<port>/?clientID=<ID>`
    * Audio Client: `https://<host>:<port>/audioManager.html`
    * SAGE UI: `https://<host>:<port>/sageUI.html`
    * SAGE Pointer: `https://<host>:<port>/sagePointer.html` (Allow pop-ups)

##### Notice #####
SAGE and SAGE2 are trademarks of the University of Illinois Board of Trustees (SAGE™ and SAGE2™).
