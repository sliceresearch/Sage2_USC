'use strict';

var assert = require('assert');

describe('Running server.js', function() {
    this.timeout(15000);
    it('Running sage2...', function(done) {
        setTimeout(15000);
        var sage2 = require('../server');
        done();
    });

});

