function httpGetAsync(theUrl, callback)
{
    if (callback===undefined || callback===null) {
      callback = function(){};
    }
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
}

function VXclipboard(){
  var reqUrl = document.getElementById("req_url").value;
  console.log("VXclipboard "+reqUrl);
}

function loadWebURL(){
  var reqUrl = document.getElementById("req_url").value;
  var sjdurl =  "https://10.234.2.30:8086/sage-browser-url?"+reqUrl;
  httpGetAsync(sjdurl);
  //window.location=sjdurl;
}

function vncURL(){
  var display_value = document.getElementById("req_url").value;
  var port_value = 0;
  var n = display_value.indexOf(":");
  console.log("d "+display_value);
  if (n>-1) {
    port_value = display_value.substr(n+1,display_value.length);
    display_value = display_value.substr(0,n);
  }
  console.log("d "+display_value);
  console.log("p "+port_value);
  var sjdurl =  "https://10.234.2.30:8086/sage-vnc-ipaddr?"+display_value+ "?" + port_value;
  //popup = window.open(sjdurl,"popup"," menubar =0,toolbar =0,location=0, height=900, width=1000");
  //popup.window.moveTo(950,150);
  httpGetAsync(sjdurl);
  //window.location=sjdurl;
}

