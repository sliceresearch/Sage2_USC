If you have SAGE2 installed in a production environment, you may want to add it to your startup scripts so it starts with every reboot.

**Note**: This only starts the node sage2 server, not the display clients!

### Prerequisites
You OS distribution needs to be using systemd to startup items.

### Installation
Edit GO-scripts/sage2Server.service and set the WorkingDirectory to your SAGE2 directory.

`sudo cp sage2Server.service /usr/lib/systemd/system/`
`sudo systemctl daemon-reload`

### Enabling sage2Server to start on boot
`sudo systemctl daemon-reload`

### Start sage2Server
`sudo systemctl start sage2Server`

### Stop sage2Server
`sudo systemctl stop sage2Server`

### Restart sage2Server
`sudo systemctl restart sage2Server`

### Reload the script
Reminder: Every time you modify the sage2Server.service file, you also need to run:

`sudo systemctl daemon-reload`

