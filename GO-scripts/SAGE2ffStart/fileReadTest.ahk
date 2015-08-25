

sageDirectory = C:\0SageRecent\sage2
passwd = %sageDirectory%\keys\passwd.json
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
	MsgBox, hash is %hash%
}
IfNotExist, %passwd%
	MsgBox, does not exist

