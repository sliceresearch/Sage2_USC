@echo off

copy /Y ..\electron.js  electron.js
md /s public\uploads\apps\Webview
copy /Y ..\public\uploads\apps\Webview\SAGE2_script_supplement.js public\uploads\apps\Webview\SAGE2_script_supplement.js

call .\node_modules\.bin\electron-packager . --platform=win32 --arch=x64 --icon=sage2.ico --overwrite

copy /Y README.win      SAGE2_client-win32-x64\README
copy /Y View.win        SAGE2_client-win32-x64\Display0.bat
copy /Y Fullscreen.win  SAGE2_client-win32-x64\Fullscreen.bat
