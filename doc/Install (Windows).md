Install for Windows (7 or 8)
=======

**Last revision:** 01 May 2014

## Download

* Download [Node.js](http://nodejs.org/) and install (follow installer instructions)
* Download [7-Zip](http://www.7-zip.org/) and install (follow installer instructions)
* Download [ImageMagick](http://www.imagemagick.org/script/binary-releases.php#windows) and install (follow installer instructions)
* Download [FFMpeg](http://ffmpeg.zeranoe.com/builds/)
* Download [Poppler-utils](http://manifestwebdesign.com/2013/01/09/xpdf-and-poppler-utils-on-windows/)
* Download [TortoiseGit](https://code.google.com/p/tortoisegit/wiki/Download) and install (follow installer instructions)
* Download [Git for Windows](https://msysgit.github.io) (follow installer instructions)

## Install FFMpeg

* Move downloaded FFMpeg 7z file to 'C:'
* Right-click on downloaded FFMpeg 7z file
    * 7-Zip > Extract Here
* Rename extracted directory 'FFMpeg'

## Install Poppler

* Create directory 'C:\Poppler'
* Move downloaded Poppler-utils zip file to 'C:\Poppler'
* Right click on downloaded Poppler-utils zip file
    * 7-Zip > Extract Here

## Set Environment

* Add 'C:\FFMpeg\bin;C:\Poppler' to you PATH variable
* You may have to log out and log back in for the environment variables to apply

![Edit Windows PATH](https://googledrive.com/host/0BwqgaaHTZg2ySnNsZ0Zmd2llRkk/Windows%20PATH.jpg)

## Clone SAGE2
In directory where you want to install SAGE2, right-click and select 'Git Clone'

* Set URL to 'https://bitbucket.org/sage2/sage2.git'
* Set directory to where you want to install SAGE2

## Generate HTTPS Keys

* Edit '<SAGE2_directory>\keys\GO-windows.bat'
    * Add lines with list of hostnames for your server
    * Save file
* Double click 'GO-windows.bat'

## Install Node.js Modules
* Launch command prompt (`cmd.exe`)
    * `cd <SAGE2_directory>`
    * `npm install`
