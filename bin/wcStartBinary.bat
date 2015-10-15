set PATH=%CD%\bin;%PATH%;

IF "%1" == "" GOTO NOPARAM
start /D "%~dp0" node "%~dp0\server.js" -f %1
GOTO END

:NOPARAM
start /D "%~dp0" node "%~dp0\server.js"

:END
echo done