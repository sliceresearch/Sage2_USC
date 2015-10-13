set PATH=%CD%\bin;%PATH%;
start /D "%~dp0" node "%~dp0\server.js" -f %1
