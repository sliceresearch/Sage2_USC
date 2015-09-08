



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
	wsio.on('passwordCheckResult', 			wsPasswordCheckResult );

}



function wsGiveClientConfiguration(data) {
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
		workingDiv = document.getElementById('cfgRS' + (i+1) + 'secure');
		workingDiv.value = data.remote_sites[i].secure; 
	}


	workingDiv = document.getElementById('cfgDependencyIM');
	workingDiv.value = data.dependencies.ImageMagick;

	workingDiv = document.getElementById('cfgDependencyFFM');
	workingDiv.value = data.dependencies.FFMpeg;

} //end wsGiveClientConfiguration



function wsPasswordCheckResult(data) {	
	var workingDiv;
	workingDiv = document.getElementById('checkPasswordResult');
	if(data.result === true) {
		workingDiv.innerHTML = "Result: True";
	}
	else {
		workingDiv.innerHTML = "Result: False";
	}
} //end wsPasswordCheckResult










function addAlternativeHostEntry() {
    var workingDiv;
    for(var i = 2; i < 10; i++) {
        workingDiv = document.getElementById('cfgAH' + i);
        if(workingDiv == null) {
            workingDiv = document.getElementById('cfgAH');
            workingDiv.innerHTML += " <br> <input type='text' id='cfgAH" + i + "'>";
            break;
        }
    }
} //end addAlternativeHostEntry

function removeAlternativeHostEntry() {
    var workingDiv;
    for(var i = 2; i < 10; i++) {
        workingDiv = document.getElementById('cfgAH' + i);
        if(workingDiv == null) {

            //if null on 2 then, there was only 1. the alternative host should by default be 127.0.0.1
            //basically min of 1 alternative host.
            if( i > 2) {
                workingDiv = document.getElementById('cfgAH');

                workingDiv.innerHTML = workingDiv.innerHTML.substring( 
                    0, workingDiv.innerHTML.lastIndexOf('<br>')   ); 
            }
            break;
        }
    }
} //end addAlternativeHostEntry


function addRemoteSiteEntry() {
    var workingDiv = document.getElementById('cfgRS');
    for(var i = 2; i < 10; i++) {
        if( workingDiv.innerHTML.indexOf('Site ' + i + ':<br>') < 0 ) {
            workingDiv.innerHTML += 'Site ' + i + ':<br>';
            workingDiv.innerHTML += "Name:<input type='text' id='cfgRS"+i+"name'><br>";
            workingDiv.innerHTML += "Host:<input type='text' id='cfgRS"+i+"host'><br>";
            workingDiv.innerHTML += "Port:<input type='text' id='cfgRS"+i+"port'><br>";
            workingDiv.innerHTML += "Secure:<input type='text' id='cfgRS"+i+"secure'><br>";
            break;
        }
    }
} //end addRemoteSiteEntry

function removeRemoteSiteEntry() {
    var workingDiv;
    for(var i = 2; i < 10; i++) {
        workingDiv = document.getElementById('cfgRS' + i + 'name');
        if(workingDiv == null) {
            if( i > 2 ) {
                workingDiv = document.getElementById('cfgRS');
                workingDiv.innerHTML = workingDiv.innerHTML.substring(0, workingDiv.innerHTML.indexOf('Site ' + (i-1) + ':<br>') );
            }
            break;
        }
    }
} //end addRemoteSiteEntry



function sendNewMeetingId() {
	var workingDiv = document.getElementById('meetingIdInput');
	if(debug) {
		alert( 'Md5 of ' + workingDiv.value + ' is:' +  md5(workingDiv.value) );
	}
	console.log('Sending request for new meeting ID as: ' + md5(workingDiv.value) );

	alert('incomplete');
} //sendNewMeetingId

function sendNewWebControllerPwd() {
	var workingDiv = document.getElementById('webControllerPwdInput');
	if(debug) {
		alert( 'Md5 of ' + workingDiv.value + ' is:' +  md5(workingDiv.value) );
	}
	console.log('Sending request for new webcontroller pwd as: ' + md5(workingDiv.value) );

	alert('incomplete');
} //

function sendNewConfigurationPagePwd() {
	var workingDiv = document.getElementById('configurationPagePwdInput');
	if(debug) {
		alert( 'Md5 of ' + workingDiv.value + ' is:' +  md5(workingDiv.value) );
	}
	console.log('Sending request for new configuration page pwd as: ' + md5(workingDiv.value) );

	alert('incomplete');
} // sendNewConfigurationPagePwd



//used to mark places in code that need to be filled out
function blank() {
	alert("This hasn't been filled out yet.");
}






