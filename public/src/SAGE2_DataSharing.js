function DataSharing(data) {
	this.name = data.name;
	this.host = data.host;
	this.port = data.port;
	this.left = data.left;
	this.top = data.top;
	this.scale = data.scale;
	this.id = "DataSharing_" + this.host + ":" + this.port;


	var sharingTitle = document.createElement('div');
	sharingTitle.id = this.id + "_title";
	sharingTitle.className = "dataSharingTitle";
	sharingTitle.style.width = (data.width * this.scale) + "px";
	sharingTitle.style.height = ui.titleBarHeight + "px";
	sharingTitle.style.webkitTransform = "translate(" + (this.left+ui.offsetX) + "px," + (this.top+ui.offsetY) + "px)";
	sharingTitle.style.mozTransform    = "translate(" + (this.left+ui.offsetX) + "px," + (this.top+ui.offsetY) + "px)";
	sharingTitle.style.transform       = "translate(" + (this.left+ui.offsetX) + "px," + (this.top+ui.offsetY) + "px)";
	//sharingArea.style.zIndex = ;

	var sharingArea = document.createElement('div');
	sharingArea.id = this.id;
	sharingArea.className = "dataSharingArea";
	sharingArea.style.width = data.width + "px";
	sharingArea.style.height = data.height + "px";
	sharingArea.style.borderWidth = (4 / this.scale) + "px";
	sharingArea.style.webkitTransform = "translate(" + (this.left+ui.offsetX) + "px," + (this.top+ui.titleBarHeight+ui.offsetY) + "px) scale(" + this.scale + "," + this.scale + ")";
	sharingArea.style.mozTransform    = "translate(" + (this.left+ui.offsetX) + "px," + (this.top+ui.titleBarHeight+ui.offsetY) + "px) scale(" + this.scale + "," + this.scale + ")";
	sharingArea.style.transform       = "translate(" + (this.left+ui.offsetX) + "px," + (this.top+ui.titleBarHeight+ui.offsetY) + "px) scale(" + this.scale + "," + this.scale + ")";
	//sharingArea.style.zIndex = ;

	var connectedColor = "rgba(55, 153, 130, 1.0)";
	if (ui.json_cfg.ui.menubar !== undefined && ui.json_cfg.ui.menubar.remoteConnectedColor !== undefined)
		connectedColor = ui.json_cfg.ui.menubar.remoteConnectedColor;
	var borderRGB = new Array(3);
	if(connectedColor.indexOf("rgb") === 0) {
		var rgbStr = connectedColor.substring(connectedColor.indexOf("(")+1, connectedColor.length-1).split(",");
		borderRGB[0] = parseInt(rgbStr[0], 10);
		borderRGB[1] = parseInt(rgbStr[1], 10);
		borderRGB[2] = parseInt(rgbStr[2], 10);
	}
	else if(onnectedColor.indexOf("#") === 0) {
		borderRGB[0] = parseInt(connectedColor.substring(1, 3), 16);
		borderRGB[1] = parseInt(connectedColor.substring(3, 5), 16);
		borderRGB[2] = parseInt(connectedColor.substring(5, 7), 16);
	}
	var borderColor = "rgba(" + parseInt(0.6*borderRGB[0], 10) + ", " + parseInt(0.6*borderRGB[1], 10) + ", " + parseInt(0.6*borderRGB[2], 10) + ", 1.0)"; 
	console.log(borderColor);

	sharingTitle.style.backgroundColor = connectedColor;
	sharingTitle.style.borderColor = borderColor;
	sharingArea.style.borderColor = borderColor;

	var sharingTitleText = document.createElement('p');
	sharingTitleText.id = this.id + "_titleText";
	sharingTitleText.style.color = "#FFFFFF";
	sharingTitleText.style.fontSize = Math.round(ui.titleTextSize) + "px";
	sharingTitleText.style.marginLeft = Math.round(0.5*ui.titleTextSize) + "px";
	var dispPort = (this.port === 80 || this.port === 443) ? "" : ":" + this.port;
	sharingTitleText.textContent = this.name + " (" + this.host + dispPort + ")";

	sharingTitle.appendChild(sharingTitleText);

	ui.main.appendChild(sharingTitle);
	ui.main.appendChild(sharingArea);
}