@echo off

call .\node_modules\.bin\electron-packager . --platform=win32 --arch=x64 --icon=sage2.ico --overwrite

copy /Y README.win    SAGE2_client-win32-x64\README
copy /Y View.win         SAGE2_client-win32-x64\Display0.bat
copy /Y Fullscreen.win  SAGE2_client-win32-x64\Fullscreen.bat

