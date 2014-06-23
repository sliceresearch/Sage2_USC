Install for Linux openSUSE (13.1)
=======

For older versions of openSUSE (and future versions), the name of the packages might change slightly, but the instructions remain mostly valid.

## Install Dependencies ##
* In a Terminal window as 'root' user (or using a sudo command) 
 * `zypper install nodejs` : JavaScript environement
   * if you prefer a most recent version of NodeJS, you can download the sources from http://nodejs.org/download/ and compile your own:
     * `tar xzvf <downloaded_nodejs_tar.gz>`
     * `cd <extracted_nodejs_directory>`
     * `./configure`
     * `make -j 5`
     * `sudo make install`
   * after install, test:
     * `node -v` will tell you which version is installed
 * `zypper install git` : distributed revision control system
 * `zypper install openssl`: Secure Sockets and Transport Layer Security 
 * `zipper install mozilla-nss-tools` : NSS Security Tool
 * `zypper install ImageMagick` : Viewer and Converter for Images
 * `zypper install poppler-tools` : PDF Rendering Library Tools
 * some packages that we use might require the compiler and development packages to be installed
     * `zypper install -t pattern devel_C_C++`
 * if you want to use privileged network ports (port 80 for HTTP and 443 for HTTPS), you need to add capabilities to the `node` binary:
     * `zypper install libcap-progs`
     * `sudo setcap 'cap_net_bind_service=+ep' /usr/bin/node`
          * this allows a regular user to use node with privileged ports
 * Packages provided by other repositories
     * add repositories:
         * `zypper ar http://packman.inode.at/suse/13.1 Packman_13.1`
         * `zypper ar http://dl.google.com/linux/chrome/rpm/stable/x86_64 Google_chrome`
         * `zypper refresh`
     * `zypper install ffmpeg` : Viewer and Converter for Images
     * `zypper install google-chrome-stable`: Google Chrome browser

## Clone SAGE2 ##

* Open Terminal
    * `cd <directory_to_install_SAGE2>`
    * `env GIT_SSL_NO_VERIFY=true git clone https://bitbucket.org/sage2/sage2.git`
         * enter bitbucket login information when asked

## Generate HTTPS Keys ##
* Open the file 'GO-linux' inside the '<SAGE2_directory>/keys/' folder
 * Add additional host names for your server in the variable `servers` (optional)
    * for instance add the short name and the fully qualified domain name of your server
 * Save file
* In a Terminal
 * `cd <SAGE2_directory>/keys`
 * `./GO-linux`

## Install Node.js Modules ##
* Open Terminal
 * `cd <SAGE2_directory>`
 * `npm install`

