REM Run me as administrator
pushd %~dp0
cd packages
start /wait ChromeStandaloneSetup64.exe /silent /install
start /wait ImageMagick-6.9.0-10-Q16-x64-dll.exe /VERYSILENT /SUPPRESSMSGBOXES
start /wait msiexec /i node-v0.12.0-x64.msi /qn
start /wait Git-1.9.5-preview20141217.exe /VERYSILENT /SUPPRESSMSGBOXES
start /wait gs915w64.exe /S
cd ..
xcopy local c:\local\ /s /e /y
xcopy SAGE2 c:\SAGE2\ /s /e /y
C:
setx Path "%Path%;c:\local\bin;c:\Program Files (x86)\Git\bin;c:\Program Files\nodejs"
cd C:\SAGE2\keys
start GO-windows.bat
exit