@rem off

rem This file will assumes that electron will always be 1 display AND top left most monitor has origin coordinate.
rem This file must retain this naming format, due to special check condition in sabi server.

rem Parameters are as followed
rem %1 path to config, doesn't work for custom
rem %2 index_port, NOT https
rem %3 width
rem %4 height
rem %5 hash
rem %6 host in the config file, added here to allow for backwards compatibility

rem The above are necessary so this doesn't need to be edited


rem If you want to make a custom launcher look at sage2_on.bat


start /MIN /D .. sage2.bat -f %1
rem delay about 2 seconds
ping localhost -n 3

rem audio manager
start "Electron" /MIN electron.bat -s http://%6:%2 -a --hash %5
rem delay about 2 seconds
ping localhost -n 2

rem display
start "Electron" /MIN electron.bat -s http://%6:%2 -d 0 -n -x 0 -y 0 --width %3 --height %4 --hash %5
