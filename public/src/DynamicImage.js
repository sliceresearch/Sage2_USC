var DynamicImage = function(img) {
	this.img = null;
	if (img === undefined || img === null)
		this.img = new Image();
	else 
		this.img = img;
	this.src = "";
	this.width = 0;
	this.height = 0;
	this.objectURL = null;

	Object.observe(this, this.propertyChanged.bind(this), ['update']);
}

DynamicImage.prototype.propertyChanged = function(changes) {
	var i;
	for (i=0; i<changes.length; i++) {
		switch (changes[i].name) {
			case "src":
				this.srcChanged(changes[i].oldValue, changes[i].object[changes[i].name]);
				break;
			case "width":
				this.withChanged(changes[i].oldValue, changes[i].object[changes[i].name]);
				break;
			case "height":
				this.heightChanged(changes[i].oldValue, changes[i].object[changes[i].name]);
				break;
			default:
				break;
		}
	}
};

DynamicImage.prototype.srcChanged = function(oldval, newval) {
	if (newval.length > 11 && newval.substring(0, 11) === "data:image/")
		this.updateSrcFromBase64String(newval);
	else
		this.updateSrcFromURL(newval);
};

DynamicImage.prototype.updateSrcFromBase64String = function(base64Img) {
	var i;
	var imgData = base64Img.split(",");
	var type = imgData[0].substring(5, imgData[0].indexOf(";"));
	var data = atob(imgData[1]);

	var buf  = new ArrayBuffer(data.length);
	var view = new Uint8Array(buf);
	for (i=0; i<view.length; i++) {
		view[i] = data.charCodeAt(i);
	}

	this.updateImageSrc(type, buf);
}

DynamicImage.prototype.updateSrcFromURL = function(url) {
	var _this = this;
	var xhr = new XMLHttpRequest();
    xhr.open( "GET", url, true );
    xhr.responseType = "arraybuffer";
    xhr.onload = function(e) {
    	var type = this.getResponseHeader('content-type');
    	_this.updateImageSrc(type, this.response);
    };
    xhr.send();
}

DynamicImage.prototype.updateImageSrc = function(type, binaryData) {
	var blob = new Blob([binaryData], {type: type});
	var source = window.URL.createObjectURL(blob);

	if (this.objectURL !== null) window.URL.revokeObjectURL(this.objectURL);

	this.objectURL = source;
	this.img.src = this.objectURL;
};

DynamicImage.prototype.widthChanged = function(oldval, newval) {
	this.img.width = newval;
};

DynamicImage.prototype.heightChanged = function(oldval, newval) {
	this.img.height = newval;
};