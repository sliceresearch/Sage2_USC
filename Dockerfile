FROM    ubuntu:14.04
MAINTAINER	Victor Mateevitsi<mvictoras@gmail.com>
RUN     sudo apt-get -y update
RUN     sudo apt-get install -y software-properties-common
RUN     sudo add-apt-repository -y ppa:mc3man/trusty-media
RUN     sudo apt-get -y update
RUN     sudo apt-get -y install libavformat-extra-54 libavformat-dev libavcodec-extra-54 libavcodec-dev ffmpeg libavutil-dev git curl
RUN     curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
RUN     sudo apt-get -y install wget nodejs ghostscript libwebp-dev bzip2 devscripts libx264-dev yasm libnss3-tools libimage-exiftool-perl libgs-dev imagemagick libwebp5 g++ make libgraphviz-dev libmagickcore-dev libmagickwand-dev  libmagick++-dev
RUN     sudo apt-get -y build-dep imagemagick
RUN     mkdir imagemagick;cd imagemagick; apt-get source imagemagick; cd imagemagick-*; debuild -uc -us; sudo dpkg -i ../*magick*.deb

COPY    package.json /tmp/package.json
RUN     cd /tmp; npm install
RUN     mkdir -p /sage2; cp -a /tmp/node_modules /sage2/


COPY    . /sage2
EXPOSE  80
EXPOSE  443
WORKDIR /sage2
CMD ["nodejs", "/sage2/server.js", "-f", "/sage2/config/docker-cfg.json", "-i"]
