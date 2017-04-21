#!/bin/sh

./node_modules/.bin/electron-packager ./ --platform=win32 --arch=x64 --icon=sage2.ico --overwrite

cp README.win     SAGE2_client-win32-x64/README
cp View.win       SAGE2_client-win32-x64/Display0.bat
cp Fullscreen.win SAGE2_client-win32-x64/Fullscreen.bat

