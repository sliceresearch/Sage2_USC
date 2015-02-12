FROM    ubuntu
RUN     apt-get -y update
RUN     apt-get install -y software-properties-common
RUN     sudo add-apt-repository -y ppa:jon-severinsson/ffmpeg
RUN     sudo apt-get -y update
RUN     sudo apt-get -y install nodejs npm libnss3-tools libavformat-extra-54 libavformat-dev libavcodec-extra-54 libavcodec-dev ffmpeg libavutil-dev

COPY    . /sage2
RUN     cd /sage2/keys; ./GO-linux
RUN     cd /sage2; npm install
EXPOSE  80
EXPOSE  443
CMD ["node", "/sage2/server.js"]
