@echo off
"%~dp0\node.exe"  "%~dp0\server.js" %*
timeout 1
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --no-default-browser-check --new-window --no-first-run --window-size=400,800 --window-position=0,0 http://localhost:10000 /B
