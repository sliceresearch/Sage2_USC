@rem off


rem clear the chrome folders
rmdir /q /s %APPDATA%\chrome

rem display0
set datadir=%APPDATA%\chrome\display0
mkdir %datadir%
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --no-default-browser-check --new-window --disable-popup-blocking --no-first-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=200,5000 --window-position=-6,-80 --user-data-dir=%datadir% "http://google.com" /B

