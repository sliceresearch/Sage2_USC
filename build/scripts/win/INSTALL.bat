REM Run me as administrator
pushd %~dp0
cd packages
start /wait ChromeSetup.exe /silent /install
start /wait ImageMagick-6.8.9-8-Q16-x64-dll.exe /silent 
start /wait Git-1.9.4-preview20140929.exe /silent
start /wait gs915w64.exe /S
start /wait AutoHotkey104805_Install.exe /S
cd ..
xcopy local c:\local\ /s /e /y
xcopy SAGE2 c:\SAGE2\ /s /e /y
C:
setx Path "%Path%;c:\local\bin;c:\Program Files (x86)\Git\bin"
cd C:\SAGE2\keys
start GO-windows.bat
exit