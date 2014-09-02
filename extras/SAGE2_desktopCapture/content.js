// this object is used to make sure our extension isn't conflicted with irrelevant messages!
var desktopCaptureMessages = ["SAGE2_desktop_capture_enabled", "capture_desktop"];

// this port connects with background script
var port = chrome.runtime.connect();

// if background script sent a message
port.onMessage.addListener(function (message) {
    // get message from background script and forward to the webpage
    window.postMessage(message, '*');
});

// this event handler watches for messages sent from the webpage
// it receives those messages and forwards to background script
window.addEventListener('message', function (event) {
    // if invalid source
    if(event.source !== window) return;
        
    // it is 3rd party message
    if(desktopCaptureMessages.indexOf(event.data) < 0) return;
        
    // if browser is asking whether extension is available
    if(event.data === "SAGE2_desktop_capture_enabled") {
        window.postMessage({cmd: "SAGE2_desktop_capture-Loaded"}, '*');
        return;
    }

    // if it is something that need to be shared with background script
    if(event.data === "capture_desktop") {
        // forward message to background script
        port.postMessage(event.data);
    }
});

// inform browser that you're available!
window.postMessage({cmd: "SAGE2_desktop_capture-Loaded"}, '*');