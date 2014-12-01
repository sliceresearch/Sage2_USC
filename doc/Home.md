SAGE2
=======

Browser based implementation of SAGE. A cluster-based html viewer used for displaying elements across multiple browser windows. Based on Node.js, ffmpeg, poplar, image magic, and other JS libraries.

### Install SAGE2
* [Install (Windows)](https://bitbucket.org/sage2/sage2/wiki/Install%20(Windows))
* [Install (Mac OS X)](https://bitbucket.org/sage2/sage2/wiki/Install%20(Mac%20OS%20X))
* [Install (openSUSE)](https://bitbucket.org/sage2/sage2/wiki/Install%20(openSUSE))
* [Install (Ubuntu)](https://bitbucket.org/sage2/sage2/wiki/Install%20(Ubuntu))


#### Configure
* Create a [configuration file](https://bitbucket.org/sage2/sage2/wiki/Configuration) for your display environment
* Save file in <SAGE2_directory>/config
* Select your configuration file
    * Option 1: name your configuration file '<host_until_first_dot>-cfg.json'  
(eg. host = thor.evl.uic.edu, config file is 'thor-cfg.json')
    * Option 2: create a file 'config.txt' in <SAGE2_directory>  
Specify the path to your configuration file in 'config.txt'

#### Run
* Open Terminal / Cmd
    * `cd <SAGE2_directory>`
    * `node server.js` (options: `-i` interactive prompt, `-f <file>` specify a configuration file)
* Open Web Browser
    * Google Chrome
        * First time use - install [SAGE2 Chrome Extension](https://chrome.google.com/webstore/detail/sage2-screen-capture/mbkfcmpjbkmmdcfocaclghbobhnjfpkk)
    * Firefox
        * First time use - go to `about:config` and set `media.getusermedia.screensharing.enabled` to true and add domain(s) for SAGE2 server(s) to `media.getusermedia.screensharing.allowed_domains`
    * SAGE2 pages
        * Table of Contents: `http://<host>:<index_port>`
        * Display Client: `https://<host>:<port>/?clientID=<ID>`
        * Audio Client: `https://<host>:<port>/audioManager.html`
        * SAGE UI: `https://<host>:<port>/sageUI.html`
        * SAGE Pointer: `https://<host>:<port>/sagePointer.html` (Allow pop-ups)
* Create a [one button SAGE2 launcher](https://bitbucket.org/sage2/sage2/wiki/Launch%20(Server%20%26%20Displays)) for the server and displays

#### Supported File Types
* Images
    * JPEG
    * PNG
    * TIFF
    * BMP
    * PSD
* Videos
    * MP4
    * M4V
    * WEBM
* PDFs

### Configure SAGE2
* [Configuration Specification](https://bitbucket.org/sage2/sage2/wiki/Configuration)

### Launch SAGE2
* [Launch (Server & Displays)](https://bitbucket.org/sage2/sage2/wiki/Launch%20(Server%20%26%20Displays))

### Develop for SAGE2
* [SAGE2 Application API](https://bitbucket.org/sage2/sage2/wiki/SAGE2%20Application%20API)

### Startup Scripts
* [Using systemd to launch SAGE2](https://bitbucket.org/sage2/sage2/wiki/systemd%20startup) (Tested on OpenSuse 13.1)

##### Notice
SAGE and SAGE2 are trademarks of the University of Illinois Board of Trustees (SAGE™ and SAGE2™).
