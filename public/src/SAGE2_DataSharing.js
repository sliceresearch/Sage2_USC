var DataSharing = function(data) {
	this.id = data.id;
	this.name = data.name;
	this.host = data.host;
	this.port = data.port;
	this.naturalWidth = data.natural_width;
	this.naturalHeight = data.natural_height;
	this.scaleX = data.width / data.natural_width;
	this.scaleY = data.height / data.natural_height;
	this.titleBarHeight = data.titleBarHeight;
	this.titleTextSize = 0.6 * this.titleBarHeight;

	console.log(data.width, data.height, data.natural_width, data.natural_height);

	var sharingTitle = document.createElement('div');
	sharingTitle.id = this.id + "_title";
	sharingTitle.className = "dataSharingTitle";
	sharingTitle.style.left = (-ui.offsetX).toString() + "px";
	sharingTitle.style.top = (-ui.offsetY).toString() + "px";
	sharingTitle.style.width = data.width + "px";
	sharingTitle.style.height = ui.titleBarHeight + "px";
	sharingTitle.style.webkitTransform = "translate(" + data.left + "px," + data.top + "px)";
	sharingTitle.style.mozTransform    = "translate(" + data.left + "px," + data.top + "px)";
	sharingTitle.style.transform       = "translate(" + data.left + "px," + data.top + "px)";
	sharingTitle.style.zIndex = data.zIndex;

	var sharingArea = document.createElement('div');
	sharingArea.id = this.id;
	sharingArea.className = "dataSharingArea";
	sharingArea.style.left = (-ui.offsetX).toString() + "px";
	sharingArea.style.top = (-ui.offsetY).toString() + "px";
	sharingArea.style.width = data.natural_width + "px";
	sharingArea.style.height = data.natural_height + "px";
	//sharingArea.style.borderWidth = (4 / this.scaleX) + "px";
	sharingArea.style.webkitTransform = "translate(" + data.left + "px," + (data.top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";
	sharingArea.style.mozTransform    = "translate(" + data.left + "px," + (data.top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";
	sharingArea.style.transform       = "translate(" + data.left + "px," + (data.top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";
	sharingArea.style.zIndex = data.zIndex;

	var sharingOverlay = document.createElement('div');
	sharingOverlay.id = this.id + "_overlay";
	sharingOverlay.className = "dataSharingOverlay";
	sharingOverlay.style.left = (-ui.offsetX).toString() + "px";
	sharingOverlay.style.top = (-ui.offsetY).toString() + "px";
	sharingOverlay.style.width = data.width + "px";
	sharingOverlay.style.height = data.height + "px";
	sharingOverlay.style.webkitTransform = "translate(" + data.left + "px," + (data.top+ui.titleBarHeight) + "px)";
	sharingOverlay.style.mozTransform    = "translate(" + data.left + "px," + (data.top+ui.titleBarHeight) + "px)";
	sharingOverlay.style.transform       = "translate(" + data.left + "px," + (data.top+ui.titleBarHeight) + "px)";
	sharingOverlay.style.zIndex = data.zIndex;

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

	sharingTitle.style.backgroundColor = connectedColor;
	sharingTitle.style.borderColor = borderColor;
	sharingArea.style.borderColor = borderColor;

	var sharingTitleIcons = document.createElement("img");
	sharingTitleIcons.src = "images/layout3.webp";
	sharingTitleIcons.height = Math.round(ui.titleBarHeight-4);
	sharingTitleIcons.style.position = "absolute";
	sharingTitleIcons.style.right    = "0px";

	var sharingTitleText = document.createElement('p');
	sharingTitleText.id = this.id + "_titleText";
	sharingTitleText.style.color = "#FFFFFF";
	sharingTitleText.style.fontSize = Math.round(ui.titleTextSize) + "px";
	sharingTitleText.style.marginLeft = Math.round(0.5*ui.titleTextSize) + "px";
	var dispPort = (this.port === 80 || this.port === 443) ? "" : ":" + this.port;
	sharingTitleText.textContent = this.name + " (" + this.host + dispPort + ")";

	var cornerSize = 0.2 * Math.min(data.natural_width, data.natural_height);
    var dragCorner = document.createElement('div');
    dragCorner.className      = "dragCorner";
    dragCorner.style.position = "absolute";
    dragCorner.style.width    = cornerSize.toString() + "px";
    dragCorner.style.height   = cornerSize.toString() + "px";
    dragCorner.style.top      = (data.natural_height-cornerSize).toString() + "px";
    dragCorner.style.left     = (data.natural_width-cornerSize).toString() + "px";
	dragCorner.style.backgroundColor = "rgba(255,255,255,0.0)";
    dragCorner.style.border   = "none";
    dragCorner.style.zIndex   = "1000";

	sharingTitle.appendChild(sharingTitleIcons);
	sharingTitle.appendChild(sharingTitleText);
	sharingArea.appendChild(dragCorner);

	ui.main.appendChild(sharingTitle);
	ui.main.appendChild(sharingArea);
	ui.main.appendChild(sharingOverlay);
};

DataSharing.prototype.setPosition = function(left, top) {
	var sharingTitle = document.getElementById(this.id + "_title");
	sharingTitle.style.webkitTransform = "translate(" + left + "px," + top + "px)";
	sharingTitle.style.mozTransform    = "translate(" + left + "px," + top + "px)";
	sharingTitle.style.transform       = "translate(" + left + "px," + top + "px)";

	var sharingArea = document.getElementById(this.id);
	sharingArea.style.webkitTransform = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";
	sharingArea.style.mozTransform    = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";
	sharingArea.style.transform       = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";

	var sharingOverlay = document.getElementById(this.id + "_overlay");
	sharingOverlay.style.webkitTransform = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px)";
	sharingOverlay.style.mozTransform    = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px)";
	sharingOverlay.style.transform       = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px)";
};

DataSharing.prototype.setPositionAndSize = function(left, top, width, height) {
	this.scaleX = width / this.naturalWidth;
	this.scaleY = height / this.naturalHeight;

	var sharingTitle = document.getElementById(this.id + "_title");
	sharingTitle.style.width = width + "px";
	sharingTitle.style.webkitTransform = "translate(" + left + "px," + top + "px)";
	sharingTitle.style.mozTransform    = "translate(" + left + "px," + top + "px)";
	sharingTitle.style.transform       = "translate(" + left + "px," + top + "px)";

	var sharingArea = document.getElementById(this.id);
	//sharingArea.style.borderWidth = (4 / this.scaleX) + "px";
	sharingArea.style.webkitTransform = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";
	sharingArea.style.mozTransform    = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";
	sharingArea.style.transform       = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px) scale(" + this.scaleX + "," + this.scaleY + ")";

	var sharingOverlay = document.getElementById(this.id + "_overlay");
	sharingOverlay.style.width = width + "px";
	sharingOverlay.style.height = height + "px";
	sharingOverlay.style.webkitTransform = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px)";
	sharingOverlay.style.mozTransform    = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px)";
	sharingOverlay.style.transform       = "translate(" + left + "px," + (top+ui.titleBarHeight) + "px)";
};
