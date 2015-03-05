var request = require('supertest')
  , express = require('express');

var app = express();


request(app)
  .get('/api')
  .expect('Content-Type', /json/)
  .expect('Content-Length', '20')
  .expect(200)
  .end(function(err, res){
    if (err) throw err;
  });