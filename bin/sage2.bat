@echo off
set PATH=bin;%PATH%;
start /D "%~dp0" node "%~dp0\server.js" %*
