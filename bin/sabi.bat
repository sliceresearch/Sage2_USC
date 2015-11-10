@echo off
set PATH=%CD%\bin;%PATH%;
start /D "%~dp0\sabi.js" node "%~dp0\server.js" -l -f config\sage2.json %*
