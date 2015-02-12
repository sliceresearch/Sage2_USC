FROM    ubuntu
RUN     sudo apt-add-repository ppa:jon-severinsson/ffmpeg
RUN     sudo apt-get -y update
RUN     sudo apt-get -y install nodejs npm libnss3-tools libavformat53 libavformat-dev libavcodec53 libavcodec-dev ffmpeg libavutil-dev

COPY    . /sage2
RUN     cd sage2/keys; ./GO-linux
RUN     cd ..
RUN     npm -d install
EXPOSE  80
EXPOSE  443
CMD ["node", "/sage2/server.js"]
