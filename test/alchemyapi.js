'use strict';

var request = require('supertest'),
    should  = require('should');

var app = require('../server').app;

// uncomment these lines to abilitate alchemy api test
// describe('alchemyapi face recognition', function() {
//   this.timeout(15000);

//   it('should calls alchemyapi service - face tags', function (done) {
//     request(app)
//       .post('/api/alchemyapi/image-face-tags')
//       .attach('picture','./test/test.jpg')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res) {
//         console.log(res.body.item.imageFaces)
//         done();
//       });
//   });
// });
