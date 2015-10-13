
;-----------------------------------------------------------clear the screen
Send {LWin Down}
Send d
Send {LWin Up}



; firefox binary
IXE="C:\Program Files (x86)\Mozilla Firefox\firefox.exe"


;-----------------------------------------------------------detect root of sage web address
; URL for SAGE2 display
S2root=http://localhost
; need to detect port
configFilePath=%A_MyDocuments%\webconGenerated-cfg.json




;-----------------------------------------------------------detect root of sage web address
; URL for SAGE2 display
S2root=http://localhost
; need to detect port
configFilePath=%A_MyDocuments%\SAGE2_Media\webconGenerated-cfg.json


IfExist, %configFilePath%
{
	;need to find the port number if exists.
	Loop
	{
		FileReadLine, line, %configFilePath%, %A_Index%
		if ErrorLevel
			break
		;look for line with port
		StringGetPos, pos, line, index_port
		if pos >= 0
		{
			;take everything from after port
			line:=SubStr(line,pos)
			line:=Trim(line)
			comma:=","
			StringGetPos, pos, line, %comma%
			if pos >= 0
			{
				;remove after the comma
				line:=SubStr(line, 1, pos)
				StringGetPos, pos, line, :
				line:=SubStr(line, pos + 2)
				line:=Trim(line)
				break
			}
			else
			{
				MsgBox, Improper formatting on cfg file. Exiting...
				ExitApp
			}
		}
	}
}
else
{
	MsgBox, A configuration file doesn't exist at %configFilePath%. A config file needs to be present to use the webstarter. One can be generated through the Admin Panel or customization of the cfg file.

	ExitApp
}


; at this point line should contain the port number
S2root=%S2root%:%line%/


S2=%S2root%display.html?clientID=0

;Detect if a hash value is needed
passwd=%A_MyDocuments%\SAGE2_Media\passwd.json

hash = blank

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

if hash != blank
{
	S2=%S2root%session.html?hash=%hash%?page=display.html?clientID=0
}

S2am = %S2root%audioManager.html
if hash != blank
{
	S2am = %S2root%session.html?hash=%hash%?page=audioManager.html
}

; Window title to search
S2WIN=SAGE2: Display

; Launch firefox
; audio manager first
;Run,%ixe% -P display1 %S2am%

;Sleep 100

; then the display since it will be full screen

Run,%ixe% -P "SageDisplay" -profile "C:\SageFFDisplayProfile" %s2% %S2am%

; Wait for the window to open
WinWait, %S2WIN%

; Get Window ID from title
ffWin := WinExist("SAGE2: Display")

; Show error
if ErrorLevel
{
    MsgBox, Cant find SAGE2 window
    return
}
else {
	WinSet, Top, , SAGE2: Display
	ffFullscreen := isWindowFullScreen(ffWin)
	; if not already, send F11 - fullscreen 
	if ffFullscreen <= 0
	{
		send {f11}
	}

	; Wait for the window to open
	Sleep, 1000
	
	; get desktop coordinates (all the monitors)
	SysGet, X1, 76
	SysGet, Y1, 77
	SysGet, Width, 78
	SysGet, Height, 79

	; debug
	; MsgBox, desktop %X1% %Y1% %Width% %Height%
	
	;attempt shift up
	offset = 0
	Y1 := Y1 - offset
	Height := Height + offset
	
	
	; send the move/resize command
	WinMove, %S2WIN%,, X1, Y1, Width, Height
}

Return


isWindowFullScreen(WinID)
{
    ;checks if the specified window is full screen
    ;use WinExist of another means to get the Unique ID (HWND) of the desired window

    if ( !WinID )
        Return 0

    WinGet, style, Style, ahk_id %WinID%
    ; 0x800000 is WS_BORDER.
    ; 0x20000000 is WS_MINIMIZE.
    ; no border and not minimized
    retVal := (style & 0x20800000) ? 0 : 1
    Return retVal
}