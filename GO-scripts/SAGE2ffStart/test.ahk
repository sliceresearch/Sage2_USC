

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
		StringGetPos, pos, line, port
		;look for line with index_port
		StringGetPos, pos2, line, index_port
		
		;if the line contains index_port, need to remove it
		if pos2 >=0
		{
			if pos2 > pos1
			{
				line:=SubStr(line,0,pos2)
			}
		}

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
