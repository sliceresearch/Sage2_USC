@rem off

rem close the server
Taskkill /FI "WindowTitle eq npm" /F

rem close chrome
Taskkill /FI "WindowTitle eq SAGE2: Display - Google Chrome" /F
Taskkill /FI "WindowTitle eq SAGE2: Audio Manager - Google Chrome" /F
Taskkill /FI "WindowTitle eq Electron*" /F
Taskkill /IM Electron* /F
