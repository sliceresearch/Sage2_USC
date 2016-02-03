;
; AutoHotkey Version: 1.0.48.05
; Language:       English
; Platform:       Windows 8
; Author:         Eric Wu
;
; Stops any existing SAGE2 session and starts SAGE2 up on the Samoa server.

; Checks for any existing command prompts and sends the "exit" command
Process, Exist, cmd.exe
if !ErrorLevel = 0 {
	SetTitleMatchMode 2
	loop {
		IfWinExist, cmd.exe 
		{
			WinActivate, cmd.exe
			Send ^c
			Sleep 50
			Send exit{ENTER}
		}
		else
			break
	}
	loop {
		IfWinExist, Command Prompt
		{
			WinActivate, Command Prompt
			Send ^c
			Sleep 50
			Send exit{ENTER}
		}
		else
			break
	}
}

; Checks for any existing chrome.exe processes and sends the "ALT+F4" command to them.
Process, Exist, chrome.exe
if !ErrorLevel = 0 {
	SetTitleMatchMode 2
	loop {
		IfWinExist, Chrome
			WinClose Chrome
		else
			break
	}
}

; Starts up the SAGE2 server and runs Chrome in Fullscreen mode.
; Performs the necessary steps to get the display and audioManager running on Samoa.
Run cmd.exe
Sleep 50
;Send cd C:\Sage2{ENTER}
Send cd C:\0SageRecent\redo\sage2{ENTER}
Sleep 50
Send node server.js{ENTER}
Sleep 50

; Gets the number of primary monitor
SysGet, counter, MonitorPrimary
;MsgBox, Count is %counter%


;x location to place the screen clients
screenXVar0 := 0
screenXVar1 := 3940
screenXVar2 := 7780



chromeDisp0 = chrome.exe --new-window http://canoe-lava-2.manoa.hawaii.edu/display.html?clientID=0 http://canoe-lava-2.manoa.hawaii.edu/audioManager.html 
chromeDisp1 = chrome.exe --new-window http://canoe-lava-2.manoa.hawaii.edu/display.html?clientID=1
chromeDisp2 = chrome.exe --new-window http://canoe-lava-2.manoa.hawaii.edu/display.html?clientID=2

hash = blank
passwd = C:\0SageRecent\sage2\keys\passwd.json


;see if the file exists
IfExist, %passwd%
{
	Loop
	{
		FileReadLine, line, %passwd%, %A_Index%
		if ErrorLevel
			break
		StringGetPos, pos, line, pwd
		if pos >= 0
		{
			;add 5 to clear pos(3) closing " and :
			pos := pos + 5
			hash := SubStr(line, pos)
			StringGetPos, pos, hash, "
			if pos >= 0
			{
				pos:= pos + 2
				hash := SubStr(hash, pos)
				StringGetPos, pos, hash, "
				if pos >= 0
				{
					hash := SubStr(hash, 1, pos)
				}
			}
		}
	}
}

if has != blank
{
	chromeDisp0 = chrome.exe --new-window http://canoe-lava-2.manoa.hawaii.edu/session.html?hash=%hash%?page=display.html?clientID=0 http://canoe-lava-2.manoa.hawaii.edu/session.html?hash=%hash%?page=audioManager.html
	chromeDisp1 = chrome.exe --new-window http://canoe-lava-2.manoa.hawaii.edu/session.html?hash=%hash%?page=display.html?clientID=1
	chromeDisp2 = chrome.exe --new-window http://canoe-lava-2.manoa.hawaii.edu/session.html?hash=%hash%?page=display.html?clientID=2
}




;----------------------------- Client 0 ------------------------------------------------------------------------------------------------------------------------ Client 0
run %chromeDisp0%
SetTitleMatchMode, 2
WinWait, Google Chrome
WinMove, screenXVar0, 100
WinGetPos, origX, origY,,,Chrome
;MsgBox, Chrome is at %origX%, %origY%
;Sleep 2500
Send {TAB}{TAB}{ENTER}{TAB}{ENTER}
Sleep 100
Send ^{TAB}
Sleep 100
Send {TAB}{TAB}{ENTER}{TAB}{ENTER}
Sleep 100
Send {F11}
Sleep 200
Send ^{TAB}

;----------------------------- Client 1 ------------------------------------------------------------------------------------------------------------------------ Client 1
;MsgBox, Counter is %origY%
Run %chromeDisp1%
SetTitleMatchMode, 2
WinWait, Google Chrome
WinMove, A,, screenXVar1, origY
WinGetPos, X, Y,,,Chrome
;MsgBox, Chrome is at %X%, %Y%
Send {F11}
Sleep 200
Send ^{TAB}

;----------------------------- Client 2 ------------------------------------------------------------------------------------------------------------------------ Client 2
;MsgBox, Counter is %origY%
Run %chromeDisp2%
SetTitleMatchMode, 2
WinWait, Google Chrome
WinMove, A,, screenXVar2, origY
WinGetPos, X, Y,,,Chrome
;MsgBox, Chrome is at %X%, %Y%
Send {F11}

ExitApp