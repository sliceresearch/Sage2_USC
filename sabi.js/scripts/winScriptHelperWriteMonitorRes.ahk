

;----------------------------------------------------------------Vars that will be used
monitorAmount		:= 0
monitorArray 		:= []
temp1 				:= 0
temp2 				:= 0
leftMostValue 		:= 0
topMostValue 		:= 0
output 				:= 0
tileWidth 			:= 0
tileHeight 			:= 0
twArray 			:= []
thArray 			:= []

;----------------------------------------------------------------Get the number of monitors
SysGet, monitorAmount, MonitorCount


;----------------------------------------------------------------Grab the monitors, store their data
Loop
{
	if(A_Index > monitorAmount)
	{
		break
		; only perform the loop if on a valid index
	}

	SysGet, temp1, Monitor, %A_Index%
	;MsgBox, Left: %temp1Left% -- Top: %temp1Top% -- Right: %temp1Right% -- Bottom: %temp1Bottom%
	temp2 		:= {}
	temp2.left 	:= temp1Left
	temp2.top 	:= temp1Top
	temp2.right := temp1Right
	temp2.bottom := temp1Bottom
	;MsgBox % "Left: " temp2.left " -- Top: " temp2.top " -- Right: " temp2.right " -- Bottom: " temp2.bottom

	if(A_Index == 1)
	{
		leftMostValue 	:= temp2.left
		topMostValue	:= temp2.top
	}
	else
	{
		if(temp2.left <  leftMostValue)
		{
			leftMostValue := temp2.left
		}
		if(temp2.top < topMostValue)
		{
			topMostValue := temp2.top
		}
	}

	monitorArray.Insert(temp2)
}
;end of looping for monitor data



;----------------------------------------------------------------Determine layout
output 		:= "Detected Monitors:" monitorAmount

;put the first two values into the arrays
twArray.Insert( monitorArray[1].left )
thArray.Insert( monitorArray[1].top )

;for each monitor 
Loop
{
	if(A_Index > monitorAmount)
	{
		break
		; only perform the loop if on a valid index
	}

	;leftside values
	if( isInArray( twArray, monitorArray[A_Index].left ) )
	{	}
	else
	{
		twArray.Insert( monitorArray[A_Index].left )
	}

	;topside values
	if( isInArray( thArray, monitorArray[A_Index].top ) )
	{	}
	else
	{
		thArray.Insert( monitorArray[A_Index].top )
	}
	output := output "`nM" A_Index ": " monitorArray[A_Index].left "," monitorArray[A_Index].top

}
tileWidth 	:= twArray.length()
tileHeight 	:= thArray.length()
output 		:= output "`n Tile width x height:" tileWidth "," tileHeight
;debug printout monitor top lefts
;MsgBox, %output%


/*
;testing array sorting
		Loop, 10
		{
			Random, rand, 1, 10
			if( !(isInArray(twArray, rand))  )
			{
			twArray.Insert(rand)
			}
			Random, rand, 1, 10
			if( !(isInArray(thArray, rand))  )
			{
			thArray.Insert(rand)
			}
		}
		twArray := arrayToString( twArray )
		thArray := arrayToString( thArray )
		output := "tw original:" twArray "`n sorted:"
		Sort twArray, N D,
		output := output twArray "`nth original:" thArray "`n sorted:"
		Sort thArray, N D,
		output := output thArray
		MsgBox, %output%
		twArray := StrSplit( twArray, ",")
		thArray := StrSplit( thArray, ",")
		MsgBox % "Length of tw:" twArray.length() "`n   th:" thArray.length()
*/


/*
	To recap, at this point twArray and thArray contain all unique values of left and top.
	Need to know how many unique values there are to create a double array?
*/

;step1 get the values sorted, need to conver to string, sort, then back to array to get length
twArray := arrayToString( twArray )
thArray := arrayToString( thArray )
Sort twArray, N D,
Sort thArray, N D,
twArray := StrSplit( twArray, "," )
thArray := StrSplit( thArray, "," )
temp1	:= twArray.length() * thArray.length()

/*
Removing this message, it has been causing unnecessary confusion.
if ( temp1 != monitorArray.length() )
{
	MsgBox % "Error: Detected " monitorArray.length() " monitors, but there are " temp1 " unique top left positions. This probably means that your monitors have varying resolutions.`n`nYour display setup must be done manually."	
}
*/

output := "{`ntileWidth:" twArray.length() ",`ntileHeight:" thArray.length() ", `ntileCoordinates:`n" A_Tab "["

;loop over height
temp1 := thArray.length()
;temp1 := 2
Loop, %temp1%
{
	ypos := A_Index
	;loop over width
	temp2 := twArray.length()
	;temp2 := 3
	Loop, %temp2%
	{
		xpos := A_Index
		if ( (xpos == 1) && (ypos == 1) )
		{
			output := output "`n" A_Tab A_Tab "{`n" A_Tab A_Tab A_Tab "col: " twArray[xpos] ",`n" A_Tab A_Tab A_Tab "row: " thArray[ypos] "`n" A_Tab A_Tab "}"
		}
		else
		{
			output := output ",`n" A_Tab A_Tab "{`n" A_Tab A_Tab A_Tab "col: " twArray[xpos] ",`n" A_Tab A_Tab A_Tab "row: " thArray[ypos] "`n" A_Tab A_Tab "}"
		}
		;MsgBox % "x,y:" xpos "," ypos
	}
}
output := output "`n" A_Tab "]`n}"
;MsgBox % output

file := FileOpen("scripts\MonitorInfo.json", "w")
file.Write(output)
file.Close()







;----------------------------------------------------------------functions
isInArray(arrToCheck, valToCheck) {
	Loop
	{
		if ( A_Index > arrToCheck.length() )
		{
			return false
		}
		if( arrToCheck[A_Index] == valToCheck )
		{
			return true
		}
	}
}
;end isInArray



;----------------------------------------------------------------arrayToString
arrayToString(arrToConvert) {
	temp := "error"
	Loop
	{
		if(A_Index > arrToConvert.length())
		{
			break
		}
		else if(A_Index == 1)
		{
			temp := arrToConvert[A_Index]
		}
		else 
		{
			temp := temp "," arrToConvert[A_Index]
		}
	}
	return temp
}
;end arrayToString