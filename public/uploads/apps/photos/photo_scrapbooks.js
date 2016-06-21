// list of photo albums to view
// albums can be either a set of images or a single webcam image
//
// with a set of photos this will randomly cycle through them
// with a single webcam image it will reload the current image

// list is the location of a text file that contains "name" as the first line,
//      and then a list of image filenames to show, one per line OR a single file
//		name in the case of a webcam image
// location gives the root directory of the images listed in list
// name is what to name the button in the user interface for this album
// longName is the name to show in the WebUI and in the title bar of the window

// as an example the chi album has a single image ColumbiaCam.jpg to reload from the URL
// given in location: http://cdn.abclocal.go.com/three/wls/webcam/"
//
// whereas the photos.txt file for the sage album contains a list of images
// name
// addedsince2011/_LJL0075.jpg
// addedsince2011/_LJL0388.jpg
// addedsince2011/_LJL0408.jpg

// the images can be stored in the same location as the text file with the list of images
// or they can be stored in different URLs

function photoAlbums() {
	var SAGE2_photoAlbums = [];
	SAGE2_photoAlbums[0] = {list: "https://lyra.evl.uic.edu:9000/sagewalls/photos.txt",
		location: "https://lyra.evl.uic.edu:9000/sagewalls/",
		name: "sage",
		longName: "SAGE2 Displays"};
	SAGE2_photoAlbums[1] = {list: "ColumbiaCam.jpg",
		location: "http://cdn.abclocal.go.com/three/wls/webcam/",
		name: "chi",
		longName: "Chicago - Grant Park"};
	SAGE2_photoAlbums[2] = {list: "chi1.jpg",
		location: "http://www.glerl.noaa.gov/metdata/chi/",
		name: "chi2",
		longName: "Chicago - View from the Lake"};
	SAGE2_photoAlbums[3] = {list: "Loopscape.jpg",
		location: "http://cdn.abclocal.go.com/three/wls/webcam/",
		name: "chi3",
		longName: "Chicago - the Loop"};
	SAGE2_photoAlbums[4] = {list: "fullsize.jpg",
		location: "http://72.253.170.172/cgi-bin/",
		name: "hilo",
		longName: "Hilo HI Bay from the Pacific Tsunami Museum"};

	// load timer is how long to show a single image in seconds before loading
	// the next one or refreshing the current one
	var SAGE2_photoAlbumLoadTimer = 20;

	// fade count is how many frames it takes to fade between the old and new image
	var SAGE2_photoAlbumFadeCount = 20;

	// canvas background gives the color of the background of the window
	var SAGE2_photoAlbumCanvasBackground = "black";

	// return an object with all the settings
	return {albums: SAGE2_photoAlbums, loadTimer: SAGE2_photoAlbumLoadTimer,
		fadeCount: SAGE2_photoAlbumFadeCount, background: SAGE2_photoAlbumCanvasBackground};
}

