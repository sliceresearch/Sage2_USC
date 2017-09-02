FROM    ubuntu:16.04
MAINTAINER	EVL avatar <evl.avatar@gmail.com>
RUN     apt-get update && apt-get install -y \
		software-properties-common \
		git \
		curl \
		bzip2
RUN     add-apt-repository -y ppa:jonathonf/ffmpeg-3
RUN     curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN     apt-get update && apt-get install -y \
		ffmpeg \
		ghostscript \
		libnss3-tools \
		libimage-exiftool-perl \
		imagemagick \
		nodejs \
	&& rm -rf /var/lib/apt/lists/*

COPY    package.json /tmp/package.json
RUN     cd /tmp; npm install --production
RUN     mkdir -p /sage2; cp -a /tmp/node_modules /sage2/

COPY    . /sage2
EXPOSE  80
EXPOSE  443
WORKDIR /sage2
CMD ["nodejs", "/sage2/server.js", "-f", "/sage2/config/docker-cfg.json", "-i"]
