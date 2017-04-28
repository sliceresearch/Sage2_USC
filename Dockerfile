FROM    ubuntu
MAINTAINER	EVL avatar <evl.avatar@gmail.com>
RUN     apt-get -y update
RUN     apt-get install -y software-properties-common
RUN     add-apt-repository -y ppa:mc3man/xerus-media
RUN     apt-get -y update
RUN     apt-get -y install g++ make wget git curl yasm bzip2 devscripts
RUN     apt-get -y install ffmpeg libavformat-dev libavcodec-dev libavutil-dev libswscale-dev libx264-dev
RUN     curl -sL https://deb.nodesource.com/setup_7.x | bash -
RUN     apt-get -y install nodejs ghostscript libnss3-tools libimage-exiftool-perl libgs-dev
RUN     apt-get -y install imagemagick libmagickcore-dev libmagickwand-dev libmagick++-dev libgraphviz-dev

COPY    package.json /tmp/package.json
RUN     cd /tmp; npm install
RUN     mkdir -p /sage2; cp -a /tmp/node_modules /sage2/

COPY    . /sage2
EXPOSE  80
EXPOSE  443
WORKDIR /sage2
CMD ["nodejs", "/sage2/server.js", "-f", "/sage2/config/docker-cfg.json", "-i"]
