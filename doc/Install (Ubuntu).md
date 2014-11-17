### Install for Ubuntu (14.04)

**Last revision:** 01 May 2014

##### Download

* Download [Node.js](http://nodejs.org/)
* Download [FFMpeg](http://www.ffmpeg.org/download.html) (2.2.1 "Muybridge" gzip tarball)

##### Install Dependencies

* Open Terminal
    * `sudo apt-get install g++`
    * `sudo apt-get install libx264-dev`
    * `sudo apt-get install yasm`
    * `sudo apt-get install imagemagick`
    * `sudo apt-get install libnss3-tools`
    * `sudo apt-get install git`
    * `sudo apt-get install libimage-exiftool-perl`

##### Install Node.js
* Open Terminal
    * `cd <Downloads_directory>`
    * `tar xzvf <downloaded_nodejs_tar.gz>`
    * `cd <extracted_nodejs_directory>`
    * `./configure`
    * `make`
    * `sudo make install`

##### Install FFMpeg
* Open Terminal
    * `cd <Downloads_directory>`
    * `tar xzvf <downloaded_ffmpeg_tar.gz>`
    * `cd <extracted_ffmpeg_directory>`
    * `./configure --enable-gpl --enable-libx264`
    * `make`
    * `sudo make install`

##### Clone SAGE2

* Open Terminal
    * `cd <directory_to_install_SAGE2>`
    * `git clone https://bitbucket.org/sage2/sage2.git`

##### Generate HTTPS Keys

* Open the file 'GO-linux' inside the '<SAGE2_directory>/keys/' folder
    * Add additional host names for your server in the variable `servers`  (optional)
    * Save file
* Open Terminal
    * `cd <SAGE2_directory>/keys`
    * `./GO-linux`

##### Install Node.js Modules

* Open Terminal
     * `cd <SAGE2_directory>`
     * `npm install`

