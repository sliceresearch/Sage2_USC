
;clear the screen
Send {LWin Down}
Send d
Send {LWin Up}

; firefox binary
IXE="C:\Program Files (x86)\Mozilla Firefox\firefox.exe"

; URL for SAGE2 display
S2=http://canoe-lava-2.manoa.hawaii.edu/display.html?clientID=0

;Detect if a hash value is needed
passwd = C:\0SageRecent\redo\sage2\keys\passwd.json
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
	S2=http://canoe-lava-2.manoa.hawaii.edu/session.html?hash=%hash%?page=display.html?clientID=0
}

S2am = http://canoe-lava-2.manoa.hawaii.edu/audioManager.html
if hash != blank
{
	S2am = http://canoe-lava-2.manoa.hawaii.edu/session.html?hash=%hash%?page=audioManager.html
}

; Window title to search
S2WIN=SAGE2: Display

; Launch firefox
; audio manager first
;Run,%ixe% -P display1 %S2am%

;Sleep 100

; then the display since it will be full screen

Run,%ixe% -P display1 %s2% %S2am%

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