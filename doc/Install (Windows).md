### Install for Windows (7 or 8.1)

**Last revision:** 14 November 2014

##### Download

* Download [7-Zip](http://www.7-zip.org/) and install (follow installer instructions)
* Download [Node.js](http://nodejs.org/) and install (follow installer instructions)
* Download [ImageMagick](http://www.imagemagick.org/script/binary-releases.php#windows) and install (follow installer instructions)
* Download [Ghostscript](http://www.ghostscript.com/download/gsdnld.html) and install (follow installer instructions)
* Download [Git for Windows](https://msysgit.github.io) and install (follow installer instructions)
* Download [TortoiseGit](https://code.google.com/p/tortoisegit/wiki/Download) and install (follow installer instructions)
* Download [FFMpeg](http://ffmpeg.zeranoe.com/builds/)
* Download [ExifTool](http://www.sno.phy.queensu.ca/~phil/exiftool/)

##### Install FFMpeg

* Create folder 'C:\local'
* Right-click on downloaded FFMpeg 7z file
    * 7-Zip > Extract Here
* Copy all files from extracted directory to 'C:\local'

##### Install ExifTool

* Right-click on downloaded Exiftool file
    * 7-Zip > Extract Here
* Rename binary to 'exiftool.exe' and move to 'C:\local\bin'

##### Set Environment

* For Windows 7
    * Right-click 'Computer'
    * Click 'Properties'
    * Click 'Advanced system settings'
* For Windows 8.1
    * Click Windows Logo and type 'e'
    * Click 'Edit the system environment variables'
* Click 'Environment Variables'
* Add 'C:\local\bin;C:\Program Files (x86)\Git\bin' to your system PATH variable
* You may have to log out and log back in for the environment variables to apply

![Edit Windows PATH](https://googledrive.com/host/0BwqgaaHTZg2ySnNsZ0Zmd2llRkk/Windows%20PATH.jpg)

##### Clone SAGE2
In directory where you want to install SAGE2, right-click and select 'Git Clone'

* Set URL to 'https://bitbucket.org/sage2/sage2.git'
* Set directory to where you want to install SAGE2

##### Generate HTTPS Keys

* Edit '<SAGE2_directory>\keys\GO-windows.bat'
    * Add lines with list of hostnames for your server
    * Save file
* Double click 'GO-windows.bat'
    * On Windows 8.1 you will need right click and select 'Run as Administrator'

##### Install Node.js Modules
* Launch command prompt (`cmd.exe`)
    * `cd <SAGE2_directory>`
    * `npm install`
    * 'Error: ENOENT, stat 'C:\Users\{User Name}\AppData\Roaming\npm'
        * You will need to manually create that folder

