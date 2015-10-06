



//---------------------------------------------------------------------------Variable setup
var wsio	= null;

var debug 	= true;
//---------------------------------------------------------------------------Code start



//---------------------------------------------------------------------------functions


/**
Setup of websockets.
 */
function initialize() {
	if(debug){console.log("Initializing client");}

	//fix the image size since it requires pixels.
	setSageLogoSize();

	// Create a connection to server
	wsio = new WebsocketIO();
	if(debug){console.log("Websocket status:" + wsio);}
	wsio.open(function() {
		console.log("Connection to server established, waiting for accept");
		
		setupListeners();

		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config: true,
				version: false,
				time: false,
				console: false
			}
		};
		wsio.emit('addClient', clientDescription);
	});

	wsio.on('close', function (evt) { }); //currently do nothing on connection lost/close
} //end initialize


function setSageLogoSize() {
	var workingDiv = document.getElementById('sageLogo');
	var logoWidth = 800;
	var logoHeight = 257;
	var width = window.innerWidth;
	var height = window.innerHeight;
	width = width/2; //50%
	height = height * .1; //10%

	var ratio = width / logoWidth;
	if( (ratio * logoHeight) <= height) {
		height = ratio * logoHeight;
	}
	else {
		ratio = height / logoHeight;
		width = ratio * logoWidth;
	}

	workingDiv.style.marginLeft = ( window.innerWidth/2 - width/2) + 'px';
	workingDiv.style.marginTop = window.innerHeight * .05 + 'px';
	workingDiv.width = width;
	workingDiv.height = height;
} //end setSageLogoSize




function setupListeners() {
	wsio.on('serverAccepted', function(data) {
		console.log('---Has been accepted by server, requesting config---');
		wsio.emit('giveClientConfiguration', {});
	});

	wsio.on('giveClientConfiguration', 		wsGiveClientConfiguration );
	wsio.on('passwordSet', 					function(data) { console.log('The password has been confirmed to be set by server'); });
	wsio.on('configurationSet', 			function(data) { console.log('The configuration file has been confirmed to be updated by server'); });

	wsio.on('noWebId', 						function(data) { document.getElementById('warnMid').style.visibility='visible'; });
	wsio.on('noWebconPwd', 					function(data) { document.getElementById('warnWebcon').style.visibility='visible'; });
	wsio.on('noConfigPwd', 					function(data) {
												var workingDiv = document.getElementById('alertClientText');
												workingDiv.innerHTML = data.message;
												workingDiv.style.visibility = 'visible';
												document.getElementById('warnConfig').style.visibility='visible';
											 }); //temp messaging for server > client


	wsio.on('alertClient', 					function(data) {
												var workingDiv = document.getElementById('alertClientText');
												workingDiv.innerHTML = data.message;
												workingDiv.style.visibility = 'visible';
											 }); //temp messaging for server > client
}



function wsGiveClientConfiguration(data) {
	if(debug) {
		console.log('Received configuration settings from server. Will insert values into form.');
		console.dir(data);
	}
	var workingDiv;

	workingDiv = document.getElementById('cfgHost');
	workingDiv.value = data.host;

	workingDiv = document.getElementById('cfgPortDefault');
	workingDiv.value = data.index_port;

	workingDiv = document.getElementById('cfgPortSecure');
	workingDiv.value = data.port;

	workingDiv = document.getElementById('cfgRwidth');
	workingDiv.value = data.resolution.width;

	workingDiv = document.getElementById('cfgRheight');
	workingDiv.value = data.resolution.height;

	workingDiv = document.getElementById('cfgLrows');
	workingDiv.value = data.layout.rows;

	workingDiv = document.getElementById('cfgLcolumns');
	workingDiv.value = data.layout.columns;


	for(var i = 0; i < data.alternate_hosts.length; i++) {
		workingDiv = document.getElementById('cfgAH' + (i+1) );
		if(workingDiv == null) { addAlternativeHostEntry(); }
	}
	for(var i = 0; i < data.alternate_hosts.length; i++) {
		workingDiv = document.getElementById('cfgAH' + (i+1) );
		if(workingDiv == null) { console.log('error adding alternate_hosts'); }
		else { workingDiv.value = data.alternate_hosts[i]; }
	}


	for(var i = 0; i < data.remote_sites.length; i++) {
		workingDiv = document.getElementById('cfgRS' + (i+1) + 'name');
		if(workingDiv == null) { addRemoteSiteEntry(); }
	}
	for(var i = 0; i < data.remote_sites.length; i++) {
		workingDiv = document.getElementById('cfgRS' + (i+1) + 'name');
		if(workingDiv == null) { console.log('error adding alternate_hosts'); }
		else { workingDiv.value = data.remote_sites[i].name; }
		workingDiv = document.getElementById('cfgRS' + (i+1) + 'host');
		workingDiv.value = data.remote_sites[i].host; 
		workingDiv = document.getElementById('cfgRS' + (i+1) + 'port');
		workingDiv.value = data.remote_sites[i].port; 
		//workingDiv = document.getElementById('cfgRS' + (i+1) + 'secure');
		//workingDiv.value = data.remote_sites[i].secure; 
	}


	workingDiv = document.getElementById('cfgDependencyIM');
	workingDiv.value = data.dependencies.ImageMagick;

	workingDiv = document.getElementById('cfgDependencyFFM');
	workingDiv.value = data.dependencies.FFMpeg;

} //end wsGiveClientConfiguration











function addAlternativeHostEntry() {
    var workingDiv;
    var tempStorage = [];
    tempStorage.push( document.getElementById('cfgAH1').value );
    for(var i = 2; i < 10; i++) {
        workingDiv = document.getElementById('cfgAH' + i);
        if(workingDiv == null) {
            workingDiv = document.getElementById('cfgAH');
            workingDiv.innerHTML += " <br> <input type='text' id='cfgAH" + i + "'>";
            for(var a = 1; a <= tempStorage.length; a++){
            	workingDiv = document.getElementById('cfgAH' + a);
            	workingDiv.value = tempStorage[a-1];
            }
            break;
        }
        else{
        	tempStorage.push(workingDiv.value);
        }
    }
} //end addAlternativeHostEntry

function removeAlternativeHostEntry() {
    var workingDiv;
    var tempStorage = [];
    tempStorage.push( document.getElementById('cfgAH1').value );
    for(var i = 2; i < 15; i++) {
        workingDiv = document.getElementById('cfgAH' + i);
        if(workingDiv == null) {

            //if null on 2 then, there was only 1. the alternative host should by default be 127.0.0.1
            //basically min of 1 alternative host.
            if( i > 2) {
                workingDiv = document.getElementById('cfgAH');

                workingDiv.innerHTML = workingDiv.innerHTML.substring( 
                    0, workingDiv.innerHTML.lastIndexOf('<br>')   ); 
	            
	            for(var a = 1; a <= tempStorage.length; a++){
	            	workingDiv = document.getElementById('cfgAH' + a);
	            	workingDiv.value = tempStorage[a-1];
	            }
            }
            break;
        }
        else{
        	tempStorage.push(workingDiv.value);
        }
    }
} //end addAlternativeHostEntry


function addRemoteSiteEntry() {
    var workingDiv = document.getElementById('cfgRS');
    var tempStorage = [[],[],[]];
    tempStorage[0].push(document.getElementById('cfgRS'+1+'name').value);
    tempStorage[1].push(document.getElementById('cfgRS'+1+'host').value);
    tempStorage[2].push(document.getElementById('cfgRS'+1+'port').value);

    for(var i = 2; i < 10; i++) {
        if( workingDiv.innerHTML.indexOf('Site ' + i + ':<br>') < 0 ) {
            workingDiv.innerHTML += 'Site ' + i + ':<br>';
            workingDiv.innerHTML += "<input type='text' id='cfgRS"+i+"name'> Label<br>";
            workingDiv.innerHTML += "<input type='text' id='cfgRS"+i+"host'> Hostname / IP address<br>";
            workingDiv.innerHTML += "<input type='text' id='cfgRS"+i+"port'> Port Number <br>";
            //workingDiv.innerHTML += "<input type='text' id='cfgRS"+i+"secure'> Secure Port Number <br>";

            for(var a = 1; a < i; a++) {
            	document.getElementById('cfgRS'+a+'name').value = tempStorage[0][a-1];
		    	document.getElementById('cfgRS'+a+'host').value = tempStorage[1][a-1];
		    	document.getElementById('cfgRS'+a+'port').value = tempStorage[2][a-1];
            }

            break;
        }
        else {
		    tempStorage[0].push(document.getElementById('cfgRS'+i+'name').value);
		    tempStorage[1].push(document.getElementById('cfgRS'+i+'host').value);
		    tempStorage[2].push(document.getElementById('cfgRS'+i+'port').value);
        }
    }
} //end addRemoteSiteEntry

function removeRemoteSiteEntry() {
    var workingDiv;
    var tempStorage = [[],[],[]];
    tempStorage[0].push(document.getElementById('cfgRS'+1+'name').value);
    tempStorage[1].push(document.getElementById('cfgRS'+1+'host').value);
    tempStorage[2].push(document.getElementById('cfgRS'+1+'port').value);

    for(var i = 2; i < 15; i++) {
        workingDiv = document.getElementById('cfgRS' + i + 'name');
        if(workingDiv == null) {
            if( i > 2 ) {
                workingDiv = document.getElementById('cfgRS');
                workingDiv.innerHTML = workingDiv.innerHTML.substring(0, workingDiv.innerHTML.indexOf('Site ' + (i-1) + ':<br>') );
            }
            for(var a = 1; a < i; a++) {
            	document.getElementById('cfgRS'+a+'name').value = tempStorage[0][a-1];
		    	document.getElementById('cfgRS'+a+'host').value = tempStorage[1][a-1];
		    	document.getElementById('cfgRS'+a+'port').value = tempStorage[2][a-1];
            }
            break;
        }
        else {
		    tempStorage[0].push(document.getElementById('cfgRS'+i+'name').value);
		    tempStorage[1].push(document.getElementById('cfgRS'+i+'host').value);
		    tempStorage[2].push(document.getElementById('cfgRS'+i+'port').value);
        }
    }
} //end addRemoteSiteEntry





















function sendConfigFileData() {

	//1st double check password validity
	var passwordMismatch = false;
	var data;

	//checks if the values do not match, if show show error, then only if there is a value, send it as the new password
	var workingDiv = document.getElementById('meetingIdInput');
	var workingDiv2 = document.getElementById('meetingIdInputConfirm');
	if(workingDiv.value !== workingDiv2.value){ document.getElementById('warnMidConfirm').style.visibility = 'visible'; passwordMismatch = true;}
	else if( workingDiv.value.length > 0 ) {
		data = {};
		data.password = md5(workingDiv.value);
		wsio.emit( 'setMeetingId', data );
		document.getElementById('warnMidConfirm').style.visibility = 'hidden';
	} else {  document.getElementById('warnMidConfirm').style.visibility = 'hidden'; }

	workingDiv = document.getElementById('webControllerPwdInput');
	workingDiv2 = document.getElementById('webControllerPwdInputConfirm');
	if(workingDiv.value !== workingDiv2.value){ document.getElementById('warnWebconConfirm').style.visibility = 'visible'; passwordMismatch = true;}
	else if( workingDiv.value.length > 0 ) {
		data = {};
		data.password = md5(workingDiv.value);
		wsio.emit( 'setWebControllerPwd', data );
		document.getElementById('warnWebconConfirm').style.visibility = 'hidden';
	} else {  document.getElementById('warnWebconConfirm').style.visibility = 'hidden'; }

	workingDiv = document.getElementById('configurationPagePwdInput');
	workingDiv2 = document.getElementById('configurationPagePwdInputConfirm');
	if(workingDiv.value !== workingDiv2.value){ document.getElementById('warnConfigConfirm').style.visibility = 'visible'; passwordMismatch = true;}
	else if( workingDiv.value.length > 0 ) {
		data = {};
		data.password = md5(workingDiv.value);
		wsio.emit( 'setConfigurationPagePwd', data );
		document.getElementById('warnConfigConfirm').style.visibility = 'hidden';
	} else {  document.getElementById('warnConfigConfirm').style.visibility = 'hidden';  }

	if(passwordMismatch) { document.getElementById('warnPasswordMismatch').style.visibility = 'visible';  return; }
	else { document.getElementById('warnPasswordMismatch').style.visibility = 'hidden';  }

	//at this point the password checking has been passed.


	data 		= {};
	data.host 		= document.getElementById('cfgHost').value;
	data.port 		= document.getElementById('cfgPortDefault').value;//secure port
	data.index_port = document.getElementById('cfgPortSecure').value; //non-secure

	data.resolution 		= {};
	data.resolution.width 	= document.getElementById('cfgRwidth').value
	data.resolution.height 	= document.getElementById('cfgRheight').value

	data.layout 			= {};
	data.layout.rows 		= document.getElementById('cfgLrows').value;
	data.layout.columns 	= document.getElementById('cfgLcolumns').value;


	//alternate hosts is an array of strings  [ 'string', 'string', string ]
	data.alternate_hosts = [];
	var ahi = 1;
	workingDiv = document.getElementById('cfgAH'+ahi);
	while(workingDiv !== null) {
		//only take if non-blankspace
		if(workingDiv.value.trim().length > 0) { data.alternate_hosts.push( workingDiv.value ); }
		ahi++;
		workingDiv = document.getElementById('cfgAH'+ahi);
	}

	data.remote_sites = [];
	var rsi = 1;
	workingDiv = document.getElementById('cfgRS'+rsi+'name');
	var rsobj;
	while(workingDiv !== null) {
		rsobj 		= {};
		rsobj.name 	= workingDiv.value.trim();
		rsobj.host 	= document.getElementById('cfgRS'+rsi+'host').value.trim();
		rsobj.port 	= document.getElementById('cfgRS'+rsi+'port').value.trim();
		rsobj.secure = true;
		rsi++;
		workingDiv = document.getElementById('cfgRS'+rsi+'name');
		data.remote_sites.push( rsobj );
	}


	data.dependencies = {};
	workingDiv = document.getElementById('cfgDependencyIM');
	if( workingDiv.value.trim().length > 0 ) { data.dependencies.ImageMagick = workingDiv.value.trim(); }
	workingDiv = document.getElementById('cfgDependencyFFM');
	if( workingDiv.value.trim().length > 0 ) { data.dependencies.FFMpeg = workingDiv.value.trim(); }


	data.background = {};
	data.background.used = false;
	workingDiv = document.getElementById('bgColor');
	if(workingDiv.value.trim().length > 0) {
		data.background.color = workingDiv.value.trim();

		data.background.used = true;
	}
	workingDiv = document.getElementById('bgClip');
	data.background.clip = workingDiv.checked;
	workingDiv = document.getElementById('bgImage');
	if(workingDiv.value.trim().length > 0) {
		data.background.image = {};
		data.background.image.url = workingDiv.value.trim();
		workingDiv2 = document.getElementById('bgImageDisplayType');
		data.background.image.style = workingDiv2.options[workingDiv2.selectedIndex].value;

		data.background.used = true;
	}
	workingDiv = document.getElementById('bgWatermark');
	if(workingDiv.value.trim().length > 0) {
		data.background.watermark = {};
		data.background.watermark.svg = workingDiv.value.trim();
		data.background.watermark.color =
			"rgba("
			+ document.getElementById('bgWmR').value
			+ " , "
			+ document.getElementById('bgWmG').value
			+ " , "
			+ document.getElementById('bgWmB').value
			+ " , "
			+ document.getElementById('bgWmA').value
			+ " )";

		data.background.used = true;
	}


	console.dir(data);

	wsio.emit('giveServerConfiguration', data);

} //end sendConfigFileData















//used to mark places in code that need to be filled out
function blank() {
	alert("This hasn't been filled out yet.");
}






