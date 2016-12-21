#!/bin/sh

DIRNAME=`dirname "$0"`
cd $DIRNAME

CLIENT=0
SERVER=http://localhost:9292

if [ "$#" -eq 0 ]; then
	./SAGE2_client.app/Contents/MacOS/SAGE2_client electron.js -s $SERVER -d $CLIENT
else
	# pass all the arguments
	./SAGE2_client.app/Contents/MacOS/SAGE2_client electron.js $*
fi




# Electron SAGE2 arguments
# -h, --help           output usage information
# -V, --version        output the version number
# -s, --server <s>     Server URL (string)
# -d, --display <n>    Display client ID number (int)
# -u, --ui             Open the user interface (instead of display)
# -a, --audio          Open the audio manager (instead of display)
# -f, --fullscreen     Fullscreen (boolean)
# -p, --plugins        Enables plugins and flash (boolean)
# -n, --no_decoration  Remove window decoration (boolean)
# -x, --xorigin <n>    Window position x (int)
# -y, --yorigin <n>    Window position y (int)
# --width <n>          Window width (int)
# --height <n>         Window height (int)
# --password <s>       Server password (string)
# --hash <s>           Server password hash (string)
# --cache              Clear the cache
# --console            Open the devtools console

