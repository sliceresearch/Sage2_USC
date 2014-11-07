#!/bin/sh
sleep 1

osascript -e 'tell app "Terminal"
    do script "cd /Users/aej/PROJECTS/sage2; node server.js -i -f config/deimos-left-cfg.json -s left"
end tell'

osascript -e 'tell app "Terminal"
    do script "cd /Users/aej/PROJECTS/sage2; node server.js -i -f config/deimos-right-cfg.json -s right"
end tell'
 
sleep 5

global_param="--new-window  --disable-popup-blocking --nfirst-run --use-gl --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content"

UDD=$HOME/.config/chrome-nfs/mac0
mkdir -p $UDD/Default
param="$global_param --window-position=0,0 --window-size=1080,1920 --user-data-dir=$UDD --app=https://localhost:1442/display.html?clientID="
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome $param &

UDD=$HOME/.config/chrome-nfs/mac1
mkdir -p $UDD/Default
param="$global_param --window-position=800,1200 --window-size=1920,1080 --user-data-dir=$UDD --app=https://localhost:1443/display.html?clientID=0"
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome $param &
