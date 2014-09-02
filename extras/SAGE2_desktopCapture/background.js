// this background script is used to invoke desktopCapture API
// to capture screen-MediaStream.

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(portOnMessageHanlder);
    
    // this one is called for each message from "content-script.js"
    function portOnMessageHanlder(message) {
        if(message === "capture_desktop") {
            chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], port.sender.tab, onAccessApproved);
        }
    }

    // on getting sourceId
    // "sourceId" will be empty if permission is denied.
    function onAccessApproved(sourceId) {
        // if "cancel" button is clicked
        if(!sourceId || !sourceId.length) {
            return port.postMessage({cmd: "permission_denied"});
        }
        
        // "ok" button is clicked; share "sourceId" with the
        // content-script which will forward it to the webpage
        port.postMessage({cmd: "window_selected", mediaSourceId: sourceId});
    }
});