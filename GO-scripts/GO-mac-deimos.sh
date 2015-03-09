#!/bin/sh
# deimos is a mac mini running two independent single screen HD sage sessions
# one in landscape more and one in portrait
#
# +--------+
# |        |
# |        |
# |        |----------------+
# |        |                |
# |  Left  |      Right     |
# |        |                |
# +--------+----------------+

sleep 1

# try to kill any existing sessions
pkill Chrome
pkill node

# start server for left screen and load in the saved left state

osascript -e 'tell app "Terminal"
    do script "cd /Users/aej/PROJECTS/sage2; node server.js -f config/deimos-left-cfg.json -s left; exit"
end tell'

# start server for right screen and load in the saved right state

osascript -e 'tell app "Terminal"
    do script "cd /Users/aej/PROJECTS/sage2; node server.js -f config/deimos-right-cfg.json -s right; exit"
end tell'
 
sleep 5

# start up left and right audio managers

global_param="--args --new-window  --disable-popup-blocking --no-first-run --use-gl --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content"

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome $global_param --window-size=950,200 --window-position=50,100 --app=https://localhost:1442/audioManager.html  &

sleep 2

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome $global_param --window-size=950,200 --window-position=50,100 --app=https://localhost:1443/audioManager.html  &

sleep 5

# start left display

UDD=$HOME/.config/chrome-nfs/mac0
mkdir -p $UDD/Default
param="$global_param --window-position=0,0 --window-size=1080,1920 --user-data-dir=$UDD --app=https://localhost:1442/display.html?clientID=0"
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome $param &

sleep 5

osascript -e "tell application \"Google Chrome\"" \
-e "tell application \"System Events\"" \
-e "keystroke \"f\" using {control down, command down}" \
-e "end tell" \
-e "end tell"

# start right display

UDD=$HOME/.config/chrome-nfs/mac1
mkdir -p $UDD/Default
param="$global_param --window-position=1080,840 --window-size=1920,1080 --user-data-dir=$UDD --app=https://localhost:1443/display.html?clientID=0"
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome $param &

sleep 5

osascript -e "tell application \"Google Chrome\"" \
-e "tell application \"System Events\"" \
-e "keystroke \"f\" using {control down, command down}" \
-e "end tell" \
-e "end tell"

# go fullscreen on right display


#ideally I should do something like this but
# only go after windows that are named 'SAGE Display'
osascript -e "tell application \"System Events\"" \
            -e "set chromeProcesses to processes whose name contains \"Google Chrome\"" \
            -e "repeat with oneChromeProcess in chromeProcesses" \
                -e "tell oneChromeProcess" \
                  -e "try" \
                    -e "reopen" \
                    -e "activate" \
                    -e "set visible to true" \
                  -e "end try" \
                -e "end tell" \
             -e "end repeat" \
          -e "end tell"

#for now just force a command-tab to get my left full screen back
osascript -e "tell application \"System Events\"" \
 -e "delay 0.5" \
-e "key down command" \
-e "keystroke tab" \
-e "delay 2" \
-e "key up command" \
-e "end tell"



