@rem off

rem This file will be passed:
rem %1 path to config, doesn't work for chrome, its leftover from electron
rem %2 index_port, NOT https
rem %3 width
rem %4 height
rem %5 hash
rem %6 row count
rem %7 col count

rem If you want to make a custom launch file
rem   use this as a template
rem   DO NOT put electron in the file name
rem   to specify config file add after "start ... sage2.bat" without double quotes: " -f fullPathToConfigIn\SAGE2_Media\config\namehere.cfg"
rem      for example      /MIN /D .. sage2.bat -f C:\Users\sageUser\Documents\SAGE2_Media\config\custom-cfg.json
rem   if you are using custom tile layout, you must write your own browser launcher(port, position, resolution, id) since sabi doesn't know what is in your config file.
rem      BUT, you still need to accept the above param format so sabi can pass you the hash.


start /MIN /D .. sage2.bat

rem clear the chrome folders
rmdir /q /s %APPDATA%\chrome

rem audio client
set datadir=%APPDATA%\chrome\audio
mkdir %datadir%
start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --no-default-browser-check --new-window --disable-popup-blocking --no-first-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=600,300 --window-position=0,0 --user-data-dir=%datadir% "http://localhost:%2/audioManager.html?hash=%5" /B

rem delay about 2 seconds
ping localhost -n 2

set xloc=10
set yloc=10
set dnum=0

rem after trial and error it seems that parameter values are not kept within call actions
set pPort=%2
set pWidth=%3
set pHeight=%4
set pHash=%5
set pRow=%6
set pCol=%7




for /L %%r in (1,1,%6) DO (
	call :xReset
	for /L %%c in (1,1,%7) DO (
		call :chromeLaunch
	)
	call :ylocIncrease
)


goto :end

rem -- after this is functions -----------------------------------------------------------------------------------------
rem -- after this is functions -----------------------------------------------------------------------------------------
rem -- after this is functions -----------------------------------------------------------------------------------------

:xReset
	set xloc=10
	goto :end


:chromeLaunch
	set datadir=%APPDATA%\chrome\display%dnum%
	mkdir %datadir%
	start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --no-default-browser-check --new-window --disable-popup-blocking --no-first-run --enable-accelerated-compositing --allow-file-access-from-files --disable-session-crashed-bubble --allow-running-insecure-content --window-size=%pWidth%,%pHeight% --window-position=%xloc%,%yloc%  --start-fullscreen --user-data-dir=%datadir% "http://localhost:%pPort%/display.html?clientID=%dnum%&hash=%pHash%" /B

	set /a dnum=%dnum%+1
	set /a xloc=%xloc%+%pWidth%

	goto:end


:ylocIncrease
	set /a yloc=%yloc%+%pHeight%
	goto :end



:end


