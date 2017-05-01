FROM    ubuntu
MAINTAINER	EVL avatar <evl.avatar@gmail.com>
RUN     add-apt-repository -y ppa:mc3man/xerus-media
RUN     curl -sL https://deb.nodesource.com/setup_7.x | bash -
RUN     apt-get update && apt-get install -y \
		apt-utils \
		git \
		curl \
		bzip2 \
		ffmpeg \
		ghostscript \
		libnss3-tools \
		libimage-exiftool-perl \
		imagemagick \
		nodejs \
	&& rm -rf /var/lib/apt/lists/*

COPY    package.json /tmp/package.json
COPY    install_dependencies.js /tmp/install_dependencies.js
RUN     cd /tmp; npm run in
RUN     mkdir -p /sage2; cp -a /tmp/node_modules /sage2/

COPY    . /sage2
EXPOSE  80
EXPOSE  443
WORKDIR /sage2
CMD ["nodejs", "/sage2/server.js", "-f", "/sage2/config/docker-cfg.json", "-i"]
