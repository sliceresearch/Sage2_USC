Zoom application
================

### Multi-resolution imageviewer based on OpenSeadragon:
* http://openseadragon.github.io/

We use the DZI tile image format, but OpenSeadragon seems to support various formats:

* http://openseadragon.github.io/#examples-and-features
* http://openseadragon.github.io/examples/creating-zooming-images/

### Formats:
* Legacy Image Pyramids
* IIIF (International Image Interoperability Framework)
* DZI (Deep Zoom Images)
* OSM (Open Street Maps)
* TMS (Tiled Map Service)
* Custom Tile Sources
* Pulling from Zoom.it

### VIPS

We use VIPS to process the input images:
* http://www.vips.ecs.soton.ac.uk/index.php?title=VIPS

#### Examples:
* `vips dzsave large.tif ouput --layout dz`
* `vips dzsave poster.tif poster --layout dz --tile-width=512 --tile-height=512 --suffix=.jpg\[compression=85\]`

### SAGE2:
* Put the `dzi` file and the image directory inside the SAGE2 app folder (`public_HTTPS/uploads/apps/zoom`)
* Edit the init function to point to that dzi file:
    * `this.viewer = OpenSeadragon({ id: this.element.id, prefixUrl: this.resrcPath + "/images/", tileSources: this.resrcPath + "large.dzi" });`

### Icon

Icon made by by Freepik (in kid and baby Pack: Kids Elements) from www.flaticon.com 


Luc Renambot - July 2014-2016
