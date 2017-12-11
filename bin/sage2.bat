@echo off
set PATH=%CD%\bin;%PATH%;
set GIT_SSL_CAINFO=%CD%\bin\ca-bundle.crt
node "%~dp0\server.js" -l %*
