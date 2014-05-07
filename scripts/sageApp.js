function sageApp (){};

sageApp.prototype.appInit = function(id, date, resrc){
	//console.log(id);
	this.element = document.getElementById(id);
	//console.log(this.element);
	this.ctx = this.element.getContext("2d");
	this.resrcPath = resrc;
	this.minDim = null;
	this.controls = new widgetSpec(id);
	this.controls.id = id;
	this.enableControls = false;
	this.writeEnableRequest = false;
	this.writeRequest = false;
	this.writeFile = null;
	this.writeData = null;
}

sageApp.prototype.load = function(fName){
	
}