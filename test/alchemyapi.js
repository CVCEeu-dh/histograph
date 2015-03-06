'use strict';

var request = require('supertest'),
    should  = require('should');

var app = require('../server').app;


describe('alchemyapi face recognition', function() {
  it('should calls alchemyapi service - face tags', function (done) {
    request(app)
      .post('/api/alchemyapi/image-face-tags')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        done();
      });
  });
});
