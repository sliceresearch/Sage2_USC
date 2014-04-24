SAGE2
=======

Browser based implementation of SAGE. A cluster-based html viewer used for displaying elements across multiple browser windows.

##### Dependencies #####
* node.js
* ffmpeg
* poppler
* graphicsmagick

##### Install #####
* [Windows Install](https://github.com/uic-evl/SAGE2/wiki/Install-(Windows))
* [Mac OSX Install](https://github.com/uic-evl/SAGE2/wiki/Install-(Mac-OSX))
* [OpenSUSE Install](https://github.com/uic-evl/SAGE2/wiki/Install-(openSUSE))
* [Ubuntu Install](https://github.com/uic-evl/SAGE2/wiki/Install-(Ubuntu))

##### Configure #####
* Create a [config file](https://github.com/uic-evl/SAGE2/wiki/Configuration) for your display environment
* Save file in &lt;SAGE2_directory&gt;/config
* Select your configuration file
 * Option 1: name your config file ```<host_until_first_dot>-cfg.json``` <br />(eg. host = iridium.evl.uic.edu, config file is ```iridium-cfg.json```)
 * Option 2: create a file ```config.txt``` in your SAGE2_directory. Specify the path to your config file in ```config.txt```.

##### Run #####
* Open Terminal / Cmd
 * ```cd <SAGE2_directory>```
 * ```node server.js```
* Open Google Chrome (point browser to host and port defined in config file)
 * Table of Contents: ```http://<host>:<index_port>```
 * Display Client: ```https://<host>:<port>/?clientID=<ID>```
 * Audio Client: ```https://<host>:<port>/audioManager.html```
 * SAGE UI: ```https://<host>:<port>/sageUI.html```
 * SAGE Pointer: ```https://<host>:<port>/sagePointer.html``` (Allow pop-ups)

##### Notice #####
SAGE and SAGE2 are trademarks of the University of Illinois Board of Trustees. (SAGE2 and SAGE2™)
