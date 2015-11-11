@rem off

start /D ..\.. sage2.bat

timeout 2

start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --disable-popup-blocking --no-first-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=800,300 --window-position=0,0 http://localhost/audioManager.html /B

timeout 1

start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --disable-popup-blocking --no-first-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=800,450 --window-position=0,800 http://localhost/display.html?clientID=0 /B


