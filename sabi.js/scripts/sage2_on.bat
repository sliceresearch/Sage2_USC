@rem off

rem This file will be regenerated throughout sabi usage.
rem Changing lines will affect regeneration.

start /MIN /D .. sage2.bat

timeout 3

rem clear the chrome folders
rmdir /q /s %APPDATA%\chrome

rem audio client
set datadir=%APPDATA%\chrome\audio
mkdir %datadir%
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --no-default-browser-check --new-window --disable-popup-blocking --no-first-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=600,300 --window-position=0,0 --user-data-dir=%datadir% http://localhost:9292/audioManager.html /B

timeout 1

rem display 0
set datadir=%APPDATA%\chrome\display0
mkdir %datadir%
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --no-default-browser-check --new-window --disable-popup-blocking --no-first-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=1280,720 --window-position=600,0  --start-fullscreen --user-data-dir=%datadir% "http://localhost:9292/display.html?clientID=0" /B


