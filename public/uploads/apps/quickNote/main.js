




var colorBtns = document.getElementsByTagName("button");

for (var i = 0; i < colorBtns.length; i++) {
	colorBtns[i].addEventListener("click", sendColor);
}

uiNoteMakerInputField.addEventListener("keyup", function() {
	var data = {};
	data.app = appId;
	data.func = "setMessage";
	data.parameters = {
		clientName: pointerName,
		clientInput: uiNoteMakerInputField.value
	};
	data.parameters.clientId = uniqueID,
	wsio.emit('utdCallFunctionOnApp', data);
});




setTimeout(function() {
	var dataForApp = {};
	dataForApp.app = appId;
	dataForApp.func = "requestCurrentContent";
	dataForApp.parameters = {
		clientName: pointerName,
		color: pointerColor,
		uniqueID: uniqueID
	};

	wsio.emit('utdCallFunctionOnApp', dataForApp);
	
},1000);



function sendColor() {
	console.log("Button color value " + this.style.backgroundColor);

	var dataForApp = {};
	dataForApp.app = appId;
	dataForApp.func = "setColor";
	dataForApp.parameters = {
		clientName: pointerName,
		color: this.style.backgroundColor
	};

	wsio.emit('utdCallFunctionOnApp', dataForApp);
}

function currentQuickNoteContent(data) {
	uiNoteMakerInputField.value = data.content;
}


