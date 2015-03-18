cd C:\SAGE2
start GO-server.bat
timeout 5

mkdir "C:\Users\%USERNAME%\AppData\Local\Google\Chrome\User Data\display1"
mkdir "C:\Users\%USERNAME%\AppData\Local\Google\Chrome\User Data\audio"

start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --disable-popup-blocking --nfirst-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=500,500 --window-position=0,0 --user-data-dir="C:\Users\%USERNAME%\AppData\Local\Google\Chrome\User Data\audio" http://localhost:9292/audioManager.html /B
timeout 1
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --disable-popup-blocking --nfirst-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=800,500 --window-position=500,0 https://localhost:9090/ /B
timeout 1
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --new-window --disable-popup-blocking --nfirst-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=1280,720 --window-position=0,0 --user-data-dir="C:\Users\%USERNAME%\AppData\Local\Google\Chrome\User Data\display1" http://localhost:9292/display.html?clientID=0 /B

exit