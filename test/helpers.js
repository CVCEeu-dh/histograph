/*
  
  Testing helpers (markdown parsing mechanism)
  ===

*/
'use strict';


var helpers = require('../helpers.js'),
    should  = require('should');


// describe('alchemyapi entity extraction service', function() {
//   it('should merge by wikipedia link', function (done) {
//     // body...
//     helpers.alchemyapi(
//         'Portugal\'s application for accession to the European Economic Community '
//       + '(Lisbon, 28 March 1977). On 28 March 1977, Mário Soares, Prime Minister of Portugal, '
//       + 'formally submits his country’s application for accession to the European '
//       + 'Communities to David Owen, currently President-in-Office of the Council.', 'TextGetRankedNamedEntities', function (err, entities) {
//       console.log('entities', entities);
      
//       done();
//     })
    
//   });
// });


// describe('textrazor api', function() {
//   this.timeout(5000);
//   it('should calls textrazor service and build a new entities from the text', function (done) {
//     helpers.textrazor(
//         'Portugal\'s application for accession to the European Economic Community '
//       + '(Lisbon, 28 March 1977). On 28 March 1977, Mário Soares, Prime Minister of Portugal, '
//       + 'formally submits his country’s application for accession to the European '
//       + 'Communities to David Owen, currently President-in-Office of the Council.',
//       function (err, entities) {
//         console.log('entities', entities);
//         done();
//     });
//   });
// });


describe('geocoding api', function() {
  this.timeout(5000);
  it('should call geocodingapi service and build a new location entity', function (done) {
    helpers.geocoding('ruel Lepic, Paris', function (err, res) {
      should.not.exist(err, err);
      // console.log(res)
      should.exist(res[0].geocode_id, res);
      done();
    });
  });
  it('should call geocodingapi service and build a new location entity starting from a COuntry', function (done) {
    helpers.geocoding('Italia', function (err, res) {
      should.not.exist(err, err);
      // console.log(res)
      should.exist(res[0].geocode_id, res);
      should.equal(res[0].name, 'Italy');
      should.equal(res[0].name_search, 'italy');
      done();
    });
  });
});


describe('geonames api', function() {
  this.timeout(5000);
  it('should calls geocodingapi service and build a new location entity', function (done) {
    helpers.geonames('Paris', function (err, res) {
      console.log(res)
      should.not.exist(err, err);
      should.exist(res[0].geonames_id, res);
      should.exist(res[0].name_search);
      should.exist(res[0].name);
      done();
    });
  });
});


describe('viaf api', function() {
  this.timeout(5000);
  it('should calls viafapi service and build a new person entity', function (done) {
    helpers.viaf('Hans von der Groeben', function (err, res) {
      //should.not.exist(err, err);
      done();
    });
  });
});


describe('human date service', function() {
  this.timeout(5000);
  it('should transform 90-92 in two years span', function (done) {
    helpers.reconcileHumanDate('90-92', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1990-01-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date,  '1992-12-31T23:59:00+00:00');
      done();
    });
  });
  it('should transform 1er et 2 juin 1955 in two day span', function (done) {
    helpers.reconcileHumanDate('1er et 2 juin 1955', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1955-06-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1955-06-02T23:59:00+00:00');
      done();
    });
  });
  it('should transform 17 septembre 1987 in a day span', function (done) {
    helpers.reconcileHumanDate('17 septembre 1987', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1987-09-17T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1987-09-17T23:59:00+00:00');
      done();
    });
  });
  it('should transform Octobre 1972 in a month span', function (done) {
    helpers.reconcileHumanDate('Octobre 1972', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1972-10-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1972-10-31T23:59:00+00:00');
      done();
    });
  });
  it('should transform 12 et 13 juillet 1976 in a two days span', function (done) {
    helpers.reconcileHumanDate('12 et 13 juillet 1976', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1976-07-12T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1976-07-13T23:59:00+00:00');
      done();
    });
  });
  it('should transform 1er octobre 1945 in a one day span', function (done) {
    helpers.reconcileHumanDate('1er octobre 1945', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1945-10-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1945-10-01T23:59:00+00:00');
      done();
    });
  });

  it('should transform vers 1969 in a one day span', function (done) {
    helpers.reconcileHumanDate('vers 1969', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1969-01-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1969-12-31T23:59:00+00:00');
      done();
    });
  });

  it('should transform Années 1960 in a TEN YEARS span', function (done) {
    helpers.reconcileHumanDate('Années 1960', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1960-01-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1969-12-31T23:59:00+00:00');
      done();
    });
  });

  it('should transform (Bonn, 9 juin 1970) in a one day span', function (done) {
    helpers.reconcileHumanDate('Note interne de la chancellerie allemande sur le traité avec la Pologne (Bonn, 9 juin 1970)', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1970-06-09T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1970-06-09T23:59:00+00:00');
      done();
    });
  });

  it('should transform  e (July 1950 in a one month span', function (done) {
    helpers.reconcileHumanDate('e (July 1950', 'en', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date,  '1950-07-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1950-07-31T23:59:00+00:00');
      done();
    });
  });


});
