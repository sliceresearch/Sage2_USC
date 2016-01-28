function sendReadRequest(ws, sendData) {
	var Json = JSON.stringify(sendData);
	console.log(Json);
	ws.send(Json);
}

function render(data, outImg) {
	var imgUrl = URL.createObjectURL(data);
	console.log(outImg);
	outImg.src = imgUrl;
	//outImg.width = 1440;
	outImg.onload = function(e) {
		URL.revokeObjectURL(e.srcElement.src);
	}
}


