'use strict';

var assert = require('assert');

describe('Running server.js', function(done) {
    this.timeout(7000);
    it('Running sabi...', function(done) {
        setTimeout(done, 7000);
        var sabi = require('../server');
        done();
    });

});

