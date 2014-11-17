### Install for Mac OS X (10.7 - 10.10)

**Last revision:** 14 November 2014

##### Download

* Download [Node.js](http://nodejs.org/) and install (follow installer instructions)
* Download [homebrew](http://brew.sh/) and install (Terminal command creates full install)
    * run `brew doctor` once install finishes

##### Install Dependencies

* Open Terminal
    * `brew install ffmpeg --with-libvpx --with-libvorbis`
    * `brew install imagemagick --with-ghostscript --with-webp`
    * `brew install exiftool`

##### Clone SAGE2

* Open Terminal
    * `cd <directory_to_install_SAGE2>`
    * `git clone https://bitbucket.org/sage2/sage2.git`

##### Generate HTTPS Keys

* Open the file 'GO-mac' inside the '<SAGE2_directory>/keys/' folder
    * Add additional host names for your server in the variable `servers`  (optional)
    * Save file
* Open Terminal
    * `cd <SAGE2_directory>/keys`
    * `./GO-mac`
        * enter your password when asked (the keys are added into the system)

##### Install Node.js Modules

* Open Terminal
     * `cd <SAGE2_directory>`
     * `npm install`

