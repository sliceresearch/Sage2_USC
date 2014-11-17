SAGE2 config
=======

A JSON file to configure the display environment

### Fields:
```
{
    host:                            // hostname or ip address of the web server
    port:                            // HTTPS port that all clients are served on (default: 443)
    index_port:                      // HTTP port, provides a reroute to HTTPS (default: 80)
    rproxy_port:                     // OPTIONAL: port of the HTTPS reverse proxy (only required for reverse proxy setups)
    rproxy_index_port:               // OPTIONAL: port of the HTTP reverse proxy (only required for reverse proxy setups)
    background: {
        color:                       // CSS color for the background (hex, rgba(), etc.)
        image: {                     // OPTIONAL: 
            url:                     // relative path from the publicHTTPS directory to an image used for the background
            style:                   // either "fit", "stretch", or "tile"
        }
        watermark: {                 // OPTIONAL: 
            svg:                     // relative path from the publicHTTPS directory to a monochrome SVG image used for the watermark
            color:                   // CSS color for the watermark (rgba() recommended)
        }
        clip:                        // OPTIONAL: boolean, whether or not to clip the display at the exact resolution (default: false)
    }
    ui: {
        clock:                       // 12 or 24 (specifies whether to use a 12 or 24 hour clock)
        show_url:                    // boolean, whether or not to show the host url on the display clients
        show_version:                // boolean, whether or not to show the SAGE2 version number on the display clients
        menubar: {                   // OPTIONAL: 
            backgroundColor:         // OPTIONAL: CSS color for the background of the menubar (default: "rgba(0, 0, 0, 0.5)")
            textColor:               // OPTIONAL: CSS color for the text of the menubar (default: "rgba(255, 255, 255, 1.0)")
            remoteConnectedColor:    // OPTIONAL: CSS color for remote sites that are connected (default: "rgba(55, 153, 130, 1.0)")
            remoteDisconnectedColor: // OPTIONAL: CSS color for remote sites that are not connected (default: "rgba(173, 42, 42, 1.0)")
        }
        auto_hide_ui:                // OPTIONAL: boolean, whether or not to autohide wall UI decoration (default: false)
        auto_hide_delay:             // OPTIONAL: integer, number of seconds after which to hide the wall UI (default: 30)
        titleBarHeight:              // OPTIONAL: integer, specify window titlebar height in pixels (default: 2.5% of minimum dimension of total wall)
        titleTextSize:               // OPTIONAL: integer, specify text size of ui titles in pixels (default: 1.5% of minimum dimension of total wall)
        pointerSize:                 // OPTIONAL: integer, specify pointer size in pixels (default: 8% of minimum dimension of total wall)
        noDropShadow:                // OPTIONAL: boolean, whether or not to disable drop shadows on wall UI decoration (default: false)
        minWindowWidth:              // OPTIONAL: integer, minimum width for application windows in pixels (default: 8% of minimum dimension of total wall)
        minWindowHeight:             // OPTIONAL: integer, maximum width for application windows in pixels (default: 120% of maximum dimension of total wall)
        maxWindowWidth:              // OPTIONAL: integer, minimum height for application windows in pixels (default: 8% of minimum dimension of total wall)
        maxWindowHeight:             // OPTIONAL: integer, maximum height for application windows in pixels (default: 120% of maximum dimension of total wall)
    }
    resolution: {
        width:                       // width in pixels of a display client (browser window width)
        height:                      // height in pixels of a display client (browser window height)
    }
    layout: {
        rows:                        // number of rows of display clients (browser windows) that make up the display wall
        columns:                     // number of columns of display clients (browser windows) that make up the display wall
    }
    displays: [                      // array of displays
        {
            row:                     // the row where this display tiles in the display wall (row origin starts with zero at left)
            column:                  // the column where this display tiles in the display wall (column origin starts with zero at the top)
        },
        ...                          // list length should equal rows*columns
    ]
    alternate_hosts: [               // array of alternate hostnames for machine (i.e. private network IP, localhost, etc.)
        ...
    ]
    remote_sites: [                  // array of remote SAGE2 sites to be able to share content with
        {
            name:                    // name to be displayed on display wall
            host:                    // specify the remote machine to connect with (in conjunction with port)
            port:                    // specify the remote machine to connect with (in conjunction with host)
        },
        ...                          // list as many remote sites as desired
    ]
    dependencies: {
        ImageMagick:                 // full path to ImageMagick (use "/" as path delimiter, required for Windows only)
        FFMpeg:                      // full path to FFMpeg (use "/" as path delimiter, required for Windows only)
    }
    apis: {                          // OPTIONAL: 
        twitter: {                   // OPTIONAL: required only for Twitter enabled Apps
            consumerKey:             // Twitter API 'Consumer Key'
            consumerSecret:          // Twitter API 'Consumer Secret'
            accessToken:             // Twitter API 'Access Token'
            accessSecret:            // Twitter API 'Access Token Secret'
        }
    }
}
```

### Minimal Sample:
```
{
    host: "hostname.com",
    port: 443,
    index_port: 80,
    background: {
        color: "#333333"
    },
    ui: {
        clock: 12,
        show_version: true,
        show_url: true
    },
    resolution: {
        width: 1920,
        height: 1080
    },
    layout: {
        rows: 1,
        columns: 1
    },
    displays: [
        {
            row: 0,
            column: 0
        }
    ],
    alternate_hosts: [
        "127.0.0.1"
    ],
    remote_sites: [
    ]
}
```

### Expanded Sample
```
{
    host: "hostname.com",
    port: 443,
    index_port: 80,
    background: {
        color: "#333333",
        image: {
            url: "images/background/dbgrid.png",
            style: "tile"
        },
        watermark: {
            svg: "images/EVL-LAVA.svg",
            color: "rgba(255, 255, 255, 0.5)"
        },
        clip: true
    },
    ui: {
        clock: 12,
        show_version: true,
        show_url: true,
        menubar: { 
            backgroundColor: "rgba(24, 30, 79, 0.5)",
            textColor: "rgba(235, 230, 175, 1.0)",
            remoteConnectedColor: "rgba(96, 171, 224, 1.0)",
            remoteDisconnectedColor: "rgba(100, 100, 100, 1.0)"
        },
        auto_hide_ui: true,
        auto_hide_delay: 15,
        titleBarHeight: 30,
        titleTextSize: 18,
        pointerSize: 90,
        noDropShadow: true,
        minWindowWidth: 35,
        minWindowHeight: 35,
        maxWindowWidth: 1920,
        maxWindowHeight: 1920
    },
    resolution: {
        width: 1920,
        height: 1080
    },
    layout: {
        rows: 1,
        columns: 1
    },
    displays: [
        {
            row: 0,
            column: 0
        }
    ],
    alternate_hosts: [
        "host.private.com",
        "localhost",
        "127.0.0.1"
    ],
    remote_sites: [
        {
            name: "Remote1"
            host: "other.com"
            port: 443
        },
        {
            name: "Remote2"
            host: "another.com"
            port: 9090
        },
    ],
    dependencies: {
        ImageMagick: "C:/Program Files/ImageMagick-6.8.9-Q16/",
        FFMpeg: "C:/local/bin/"
    },
    apis: {
        twitter: {
            consumerKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            consumerSecret: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            accessToken: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            accessSecret: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        }
    }
}
```

##### Note:
Default ports `80` and `443` are convenient when visiting SAGE2 clients because the port does not have to be explicitly entered (eg. in this sample config a user could simply visit `https://hostname.com/sagePointer.html` instead of `https://hostname.com:443/sagePointer.html`).

However, these ports require privileged access. If you do not have the necessary permissions, please choose port numbers larger than `1024` and explicitly specify the chosen port numbers when typing a URL.
