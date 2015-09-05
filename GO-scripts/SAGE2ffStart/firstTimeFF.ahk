
;clear the screen
Send {LWin Down}
Send d
Send {LWin Up}

; firefox binary
IXE="C:\Program Files (x86)\Mozilla Firefox\firefox.exe"

; URL for 1st time config
S2root=http://localhost:9001/
S2ap = %S2root%wcAdminPanel.html

Run,%IXE% %S2ap%

