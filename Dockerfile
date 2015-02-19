FROM    ubuntu
RUN     apt-get -y update
RUN     apt-get install -y software-properties-common
RUN     sudo add-apt-repository -y ppa:jon-severinsson/ffmpeg
RUN     sudo apt-get -y update
#RUN     sudo apt-get -y install nodejs npm libnss3-tools libavformat-extra-54 libavformat-dev libavcodec-extra-54 libavcodec-dev ffmpeg libavutil-dev ghostscript libwebp-dev devscripts graphicsmagick-imagemagick-compat libx264-dev yasm libnss3-tools libimage-exiftool-perl libgs-dev
RUN     sudo apt-get -y install libavformat-extra-54 libavformat-dev libavcodec-extra-54 libavcodec-dev ffmpeg libavutil-dev 
RUN     sudo apt-get -y install wget nodejs npm ghostscript libwebp-dev bzip2 devscripts libx264-dev yasm libnss3-tools libimage-exiftool-perl libgs-dev imagemagick libwebp5 g++ make libgraphviz-dev libmagickcore-dev libmagickwand-dev  libmagick++-dev
# removes just imagemagick
#RUN     sudo apt-get --purge remove -y imagemagick imagemagick-common libmagickcore5 libmagickcore5-extra libmagickwand5 
RUN     sudo apt-get -y build-dep imagemagick
RUN     mkdir imagemagick;cd imagemagick; apt-get source imagemagick; cd imagemagick-*; debuild -uc -us; sudo dpkg -i ../*magick*.deb
#RUN     wget http://www.ffmpeg.org/releases/ffmpeg-2.2.12.tar.bz2; tar xvjf ffmpeg-2.2.12.tar.bz2; cd ffmpeg*; ./configure --enable-gpl --enable-libx264 --enable-libwebp --enable-shared; make; sudo make install
#RUN     wget http://www.imagemagick.org/download/ImageMagick.tar.gz; tar xzvf ImageMagick.tar.gz; cd ImageMagick*; ./configure --with-gslib; make; sudo make install

COPY    package.json /tmp/package.json
RUN     cd /tmp; npm install
RUN     mkdir -p /sage2; cp -a /tmp/node_modules /sage2/

COPY    . /sage2
RUN     cd /sage2/keys; ./GO-docker
EXPOSE  9090
EXPOSE  9292
WORKDIR /sage2
CMD ["nodejs", "/sage2/server.js", "-f", "/config/docker-cfg.json"]
