'use strict';

var request = require('supertest'),
    should  = require('should');

var app = require('../server').app;


// describe('rekognition face detect', function() {
//   this.timeout(15000);

//   it('should calls rekognition api service - face_search', function (done) {
//     request(app)
//       .post('/api/rekognition/face-detect')
//       .attach('picture','./test/test.jpg')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res) {
        
//         console.log(res.body.item)
//         should.exist(res.body.item.face_detection)
//         done();
//       });
//   });
// });

describe('rekognition face detect', function() {
  this.timeout(15000);
  return;
  it('should calls rekognition api service - face_recognize', function (done) {
    request(app)
      .post('/api/rekognition/face-search')
      .attach('picture','./test/test.jpg')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        
        console.log(res.body.item)
        should.exist(res.body.item.face_detection)
        done();
      });
  });
});