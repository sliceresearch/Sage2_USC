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
//name
//Loopscape.jpg
//
// whereas the photos.txt file for the sage album contains a list of images
//name
//addedsince2011/_LJL0075.jpg
//addedsince2011/_LJL0388.jpg
//addedsince2011/_LJL0408.jpg

// the images can be stored in the same location as the text file with the list of images
// or they can be stored in different URLs


 var   SAGE2_photoAlbums = [];
    SAGE2_photoAlbums[0] = {list:"http://lyra.evl.uic.edu:9000/sagewalls/photos.txt",
            location:"http://lyra.evl.uic.edu:9000/sagewalls/",
            name:"sage"};
    SAGE2_photoAlbums[1] = {list:"http://lyra.evl.uic.edu:9000/webcam2.txt",
            location:"ftp://ftp.evl.uic.edu/pub/INcoming/spiff/",
        	name:"pond"};
    SAGE2_photoAlbums[2] = {list:"http://lyra.evl.uic.edu:9000/webcam3.txt",
            location:"http://cdn.abclocal.go.com/three/wls/webcam/",
        	name:"chi"};
    SAGE2_photoAlbums[3] = {list:"http://lyra.evl.uic.edu:9000/posters/photos.txt",
            location:"http://lyra.evl.uic.edu:9000/posters/",
        	name:"movie"};
    SAGE2_photoAlbums[4] = {list:"https://sage.evl.uic.edu/evl_Pictures/photos.txt",
            location:"https://sage.evl.uic.edu/evl_Pictures/",
            name:"evl"};

// load timer is how long to show a single image in seconds before loading 
// the next one or refreshing the current one

var    SAGE2_photoAlbumLoadTimer = 20;

// fade count is how many frames it takes to fade between the old and new image
var    SAGE2_photoAlbumFadeCount = 20;

// canvas background gives the color of the background of the window
var    SAGE2_photoAlbumCanvasBackground = "black";
