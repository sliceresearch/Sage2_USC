@echo off
set PATH=%CD%\bin;%PATH%;
start /D "%~dp0\sabi.js" node server.js -f config/sage2.json %*
