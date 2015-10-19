

set "PATH=%CD%\bin;%PATH%;"
rem set GIT_SSL_CAINFO=%CD%\bin\ca-bundle.crt


rem ////////////////////////////////////////////////////////////////////////variables to track required Files

SET missingProgram=no
SET programMessage="pm: "


rem ////////////////////////////////////////////////////////////////////////first check if chrome exists

if not exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
	SET missingProgram=yes
	SET "programMessage=%programMessage% Chrome needs to be installed."
) else (
	rem ////////////////////////////////////////////////////////////////////////SET "programMessage=%programMessage% Chrome needs to be installed."
)
if not exist "C:\Program Files (x86)\Mozilla Firefox\firefox.exe" (
	SET missingProgram=yes
	SET "programMessage=%programMessage% Firefox needs to be installed."
) else (
	rem ////////////////////////////////////////////////////////////////////////SET "programMessage=%programMessage% Firefox needs to be installed."
)
if not exist "C:\Program Files\AutoHotkey\AutoHotkey.exe" (
	SET missingProgram=yes
	SET "programMessage=%programMessage% AutoHotkey needs to be installed."
) else (
	rem ////////////////////////////////////////////////////////////////////////SET "programMessage=%programMessage% AutoHotkey needs to be installed."
)

if "%missingProgram%"=="yes" (
	msg %username% %programMessage%
	goto END
)

rem ////////////////////////////////////////////////////////////////////////Everything is installed check for param

if "%1" == "displayLaunch" (
cd GO-scripts
cd SAGE2ffStart
start firefox.ahk	

goto END
)
IF not "%1" == "" (
	start "sage2server" /D "%~dp0" node "%~dp0\server.js" -f %1
	goto END
)



rem ////////////////////////////////////////////////////////////////////////check if the window title "webStarter" exists, then see if it was a process of node.exe

tasklist /fi "WindowTitle eq webStarter" | find /I /N "node.exe" >NUL
if "%ERRORLEVEL%" == "0" (    
    rem ////////////////////////////////////////////////////////////////////////the process was found

    goto LAUNCHCHROMETOWEBCON
) else (
	rem ////////////////////////////////////////////////////////////////////////the process was not found

    goto WSNOTRUNNINGCHECKMEDIA
)


:LAUNCHCHROMETOWEBCON

rem if there is a config file, will launch to webcon, otherwise will attempt to admin panel

if EXIST %UserProfile%\Documents\SAGE2_Media\webconGenerated-cfg.json (
"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" http://localhost:9001
) else (
"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" http://localhost:9001/wcAdminPanel.html
)

goto END


:WSNOTRUNNINGCHECKMEDIA

IF EXIST %UserProfile%\Documents\SAGE2_Media (
    goto :launchWebStarter
) else (
	mkdir %UserProfile%\Documents\SAGE2_Media\justMade%1
	goto launchWebStarter
)

:launchWebStarter
start "webStarter" /D "%~dp0" node "%~dp0\webconStartServer.js"


:END