/**
 * SLICE
 * Use Node cmd to run mocha.
 */
'use strict';

// mocha.setup('bdd');

var assert = require('assert');
var sage2;

describe('Running server.js', function(done) {
    this.timeout(20000);
    it('Running sage2...', function(done) {
        sage2 = require('../server');
        var wsioServer  = new WebsocketIO.Server({server: sage2Server});
        wsioServer.onconnection(openWebSocketClient);
        setTimeout(done, 20000);
        this.interval = setInterval(function () {
			sage2.wsio.on('loadApplication', {application: "D:\\Sage2_USC\\public\\uploads\\apps\\chronicles_of_spaceman_spiff", user: "127.0.0.1:62031"});
            done();
		}, 10000);
        
    });
});

