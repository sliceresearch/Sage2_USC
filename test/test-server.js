'use strict';

var assert = require('assert');

describe('Running server.js', function(done) {
    this.timeout(15000);
    it('Running sage2...', function(done) {
        setTimeout(done, 15000);
        var sage2 = require('../server');
        done();
    });

});

