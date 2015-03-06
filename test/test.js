'use strict';

var request = require('supertest'),
    should  = require('should');

var app = require('../server').app;


describe('api index', function() {
  it('should return a welcome message given the url /api', function (done) {
    request(app)
      .get('/api')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        should.not.exist(err);
        console.log(res.text);
        done();
      });
  });
});
