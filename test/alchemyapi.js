'use strict';

var request = require('supertest'),
    helpers = require('../helpers')
    should  = require('should');

var app = require('../server').app;


describe('alchemyapi entity extraction service', function() {
  it('should merge by wikipedia link', function (done) {
    // body...
    helpers.alchemyapi(
        'Portugal\'s application for accession to the European Economic Community '
      + '(Lisbon, 28 March 1977). On 28 March 1977, Mário Soares, Prime Minister of Portugal, '
      + 'formally submits his country’s application for accession to the European '
      + 'Communities to David Owen, currently President-in-Office of the Council.', 'TextGetRankedNamedEntities', function (err, entities) {
      console.log('entities', entities);
      
      done();
    })
    
  });
});


// uncomment these lines to abilitate alchemy api test via REST api
// now deprecated.
// describe('alchemyapi face recognition', function() {
//   this.timeout(15000);
//   return;
//   it('should calls alchemyapi service - face tags', function (done) {
//     request(app)
//       .post('/api/alchemyapi/image-face-tags')
//       .attach('picture','./test/test.jpg')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res) {
//         console.log(res.body.item)
//         done();
//       });
//   });
// });
