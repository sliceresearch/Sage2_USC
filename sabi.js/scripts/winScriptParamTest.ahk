

;----------------------------------------------------------------Vars that will be used


;----------------------------------------------------------------Vars that will be used

paramCount = %0%
output := "There are " paramCount " arguments given as cmd params."

if( %0% > 0)
{
	output := output "`nDetected cmd params:"
	output =%output%%1%,%2%,%3%,%4%,%5%,%6%,
}

MsgBox % output
