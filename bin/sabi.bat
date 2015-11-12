@echo off


set PATH=%CD%\bin;%PATH%;
start /MIN /D "%~dp0\sabi.js" node server.js -f config/sage2.json %*

timeout 1

rem Chrome profile
set datadir=%APPDATA%\chrome\sabi
rmdir /q /s %datadir%
mkdir %datadir%

start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --no-default-browser-check --user-data-dir=%datadir% --new-window --no-first-run --window-size=400,800 --window-position=0,0 http://localhost:10000/#SAGE2 /B
