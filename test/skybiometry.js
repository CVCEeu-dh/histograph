'use strict';

var request = require('supertest'),
    should  = require('should');

var app = require('../server').app;

// uncomment these lines to abilitate alchemy api test
describe('skybiometry face recognition', function() {
  this.timeout(15000);
  return;
  it('should calls skybiometry service for *face detection*', function (done) {
    request(app)
      .post('/api/skybiometry/face-detect')
      .attach('picture','./test/test.jpg')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        console.log(res.body.item)
        done();
      });
  });
});
