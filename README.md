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
