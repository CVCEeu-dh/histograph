'use strict';

var request = require('supertest'),
    should  = require('should');

var app = require('../server').app;


describe('api index and api login', function() {
  it('should return a 403 forbidden because the user it is not authenticated', function (done) {
    request(app)
      .get('/api')
      .expect('Content-Type', /json/)
      .expect(403)
      .end(function(err, res) {
        should.exist(res.body.status, 'error');
        done();
      });
  });
});
