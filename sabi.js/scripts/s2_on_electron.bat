@rem off

rem This file will assume config states only 1 display.

start /MIN /D .. sage2.bat -f %1
rem delay about 2 seconds
ping localhost -n 2

rem audio manager
start "Electron" /MIN electron.bat -s http://localhost:%2 -a
rem delay about 2 seconds
ping localhost -n 2

rem display
start "Electron" /MIN electron.bat -s http://localhost:%3 -d 0 -n -x 0 -y 0 --width %4 --height %5 --hash %6