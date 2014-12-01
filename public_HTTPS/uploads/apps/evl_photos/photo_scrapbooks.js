// list of photo albums to view
// albums can be either a set of photos or a single webcam image
//
// with a set of photos this will randomly cycle through them
// with a single webcam image it will reload the current image

// list contains "name" as the first line, then a list of images to show, one per line
// location gives the root directory of the images listed in list

    SAGE2_photoAlbums = [];
    SAGE2_photoAlbums[0] = {list:"https://sage.evl.uic.edu/evl_Pictures/photos.txt",
            location:"https://sage.evl.uic.edu/evl_Pictures/",
        	name:"evl"};
    SAGE2_photoAlbums[1] = {list:"http://lyra.evl.uic.edu:9000/webcam2.txt",
            location:"ftp://ftp.evl.uic.edu/pub/INcoming/spiff/",
        	name:"pond"};
    SAGE2_photoAlbums[2] = {list:"http://lyra.evl.uic.edu:9000/webcam3.txt",
            location:"http://cdn.abclocal.go.com/three/wls/webcam/",
        	name:"chi"};
    SAGE2_photoAlbums[3] = {list:"http://lyra.evl.uic.edu:9000/posters/photos.txt",
            location:"http://lyra.evl.uic.edu:9000/posters/",
        	name:"movie"};
