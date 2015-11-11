@echo off
set PATH=%CD%\bin;%PATH%;
start /D "%~dp0\sabi.js" node server.js -f config/sage2.json %*
timeout 1
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --no-first-run --window-size=400,800 --window-position=0,0 http://localhost:10000 /B
