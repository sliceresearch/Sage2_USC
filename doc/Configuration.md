SAGE2 config
=======

A JSON file to configure the display environment

## Fields
| Field                                    | Value                                                             |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `host`                                   | hostname or ip address of the web server                   |
| `public_host`                            | public hostname of the web server (used in index page) [optional]                  |
| `port`                                   | HTTPS port that all clients are served on (default is `443`)      |
| `index_port`                             | HTTP port where a Table of Contents is served on (default is `80`) |
| `clock`                                  | `12` or `24` (specifies whether to use a 12 or 24 hour clock)     |
| `background {color, image, style, clip}` | `color` is a hex color for the background, `image` is a relative path from the publicHTTPS directory to an image used for the background, `style` is either `fit`, `stretch`, or `tile`, `clip` is a boolean telling to clip the display at the exact resolution |
| `show_url`                               | boolean (whether or not to show the host url on the display clients) |
| `resolution {width, height}`             | width and height in pixels of a display client (browser window size) |
| `layout {rows, columns}`                 | number of rows and columns of display clients that make up the display environment |
| `displays [{ID, row, column}]`           | array of displays with a unique ID (index in array), and the row and column where it tiles in the display environment |
| `alternate_hosts []`                     | array of alternate hostnames or ip addresses of the web server    |
| `remote_sites [{name, host, port}]`      | array of remote sites to be able to share content with - `name` to be displayed, `host` and `port` specify the remote machine to connect with |
| `advanced {ImageMagick}`                 | advanced options not required by all systems: Windows requires full Path to `ImageMagick` (use `/` as path delimiter) |

## Sample
```
{
	"host": "hostname.com",
	"public_host": "public.hostname.com",
	"port": 443,
	"index_port": 80,
	"clock": 12,
	"background": {
		"color": "#FFFFFF",
		"image": "images/background/bgImg.png",
		"style": "fit",
		"clip": false
	},
	"show_url": true,
	"resolution": {
		"width": 1920,
		"height": 1080
	},
	"layout": {
		"rows": 1,
		"columns": 2
	},
	"displays": [
		{
			"ID": 0,
			"row": 0,
			"column": 0
		},
		{
			"ID": 1,
			"row": 0,
			"column": 1
		}
	],
	"alternate_hosts": [
		"localhost",
		"127.0.0.1"
	],
	"remote_sites": [
		{
			"name": "Remote1",
			"host": "other.com",
			"port": 443
		},
		{
			"name": "Remote2",
			"host": "another.com",
			"port": 9090
		}
	],
	"advanced": {
		"ImageMagick": "C:/Program Files/ImageMagick-6.8.9-Q16/"
	}
}
```

## Note
Default ports `80` and `443` are convenient when visiting SAGE2 clients because the port does not have to be explicitly entered (eg. in this sample config a user could simply visit `https://hostname.com/sagePointer.html` instead of `https://hostname.com:443/sagePointer.html`).

However, these ports require privileged access. If you do not have the necessary permissions, please choose port numbers larger than `1024` and explicitly specify the chosen port numbers when typing a URL.

If a public hostname is specified, it is used on the index page. That host should be listed in alternate_hosts.