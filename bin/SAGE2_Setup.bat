

set "PATH=%CD%\sysfiles\bin;%PATH%;"
rem set GIT_SSL_CAINFO=%CD%\sysfiles\bin\ca-bundle.crt


rem ////////////////////////////////////////////////////////////////////////variables to track required Files

SET missingProgram=no
SET programMessage="pm: "
SET hasChrome=no


rem ////////////////////////////////////////////////////////////////////////first check if chrome exists

if not exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
	SET missingProgram=yes
	SET "programMessage=%programMessage% Chrome needs to be installed."
) else (
	rem ////////////////////////////////////////////////////////////////////////SET "programMessage=%programMessage% Chrome needs to be installed."
	SET hasChrome=yes
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

	if "%hasChrome%"=="yes" (
		"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" https://bitbucket.org/sage2/sage2/wiki/Install%20(Windows%20Binary)
	)
	SET "programMessage=%programMessage% For more information visit the binary support page at https://bitbucket.org/sage2/sage2/wiki/Install%20(Windows%20Binary)"
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
	start "sage2server" /D "%~dp0\" node "%~dp0\server.js" -f %1
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
start "webStarter" /D "%~dp0\sysfiles" node "%~dp0\sysfiles\webconStartServer.js"


:END