// list of photo albums to view
// albums can be either a set of images or a single webcam image
//
// with a set of photos this will randomly cycle through them
// with a single webcam image it will reload the current image

// list is the location of a text file that contains "name" as the first line,
//       and then a list of image filenames to show, one per line
// location gives the root directory of the images listed in list
// name is what to name the button in the user interface for this album

// as an example the chi album reads the webcam3.txt file which has the name of a
//       single image to reload from the URL given in location: http://cdn.abclocal.go.com/three/wls/webcam/"
// name
// Loopscape.jpg
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
		name: "sage"};
	SAGE2_photoAlbums[1] = {list: "https://lyra.evl.uic.edu:9000/webcam3.txt",
		location: "http://cdn.abclocal.go.com/three/wls/webcam/",
		name: "chi"};
	SAGE2_photoAlbums[2] = {list: "https://lyra.evl.uic.edu:9000/webcam_lake.txt",
		location: "http://www.glerl.noaa.gov/metdata/chi/",
		name: "chi2"};
	SAGE2_photoAlbums[3] = {list: "https://lyra.evl.uic.edu:9000/webcam_loop.txt",
		location: "http://cdn.abclocal.go.com/three/wls/webcam/",
		name: "chi3"};

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

