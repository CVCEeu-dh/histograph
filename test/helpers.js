/*
  
  Testing helpers (markdown parsing mechanism)
  ===

*/
'use strict';


var helpers = require('../helpers.js'),
    should  = require('should');

describe('helpers: text & geo filters', function() {
  it('should transform wiki url into underscored ones', function (done) {
    should.equal(helpers.text.wikify('Pierre%20Werner'), 'Pierre_Werner');
    done();
  });
  
  it('should computate the distance between two geo point', function (done) {
    var distanceFromParisToLuxembourg = helpers.geo.distance({
          lat: 48.85341,
          lng: 2.3488,
        }, {
          lat: 49.61167,
          lng: 6.13,
        }),
    
        distanceFromRomeToLuxembourg = helpers.geo.distance({
          lat: 41.89193,
          lng: 12.51133,
        }, {
          lat: 49.61167,
          lng: 6.13,
        });;
    should.equal(distanceFromParisToLuxembourg/1000, 287.168);
    should.equal(distanceFromRomeToLuxembourg/1000, 990.105);
    done();
  });
});

describe('helpers: socialtags', function() {
  it('should return the expected hashtags as entities for a given tweet', function (done) {
    var parser = require('../parser.js');
    var tweet = 'Siamo pronti per metterci in cammino sulla #Francigena, verso il #Giubileo da #Siena a #Roma! @radiofrancigena  #ciccio';
    helpers.socialtags({
      text: tweet
    }, function (err, entities) {
      var annotated = parser.annotate(tweet, entities);
      console.log(annotated)
      should.equal(annotated, 'Siamo pronti per metterci in cammino sulla [#Francigena](), verso il [#Giubileo]() da [#Siena]() a [#Roma]()! [@radiofrancigena]()  [#ciccio]()')
      done();
    });
  });

});
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


describe('helpers: geocoding api', function() {
  this.timeout(5000);
  it('should call geocodingapi service and return basic (node:location) properties', function (done) {
    helpers.geocoding({
      text: 'Rome, Italy'
    }, function (err, res) {
      should.not.exist(err);
      should.exist(res[0].geocoding_id);
      should.equal(res[0].country, 'IT');
      should.exist(res[0].lat);
      should.exist(res[0].lng);
      done();
    });
  });
});


// describe('helpers: geonames api', function() {
//   this.timeout(5000);
//   it('should calls GEONAMES service with current settings', function (done) {
//     helpers.geonames({
//       text: 'United Kingdom'
//     }, function (err, results) {
//       should.not.exist(err, err);
//       should.exist(results.length)
//       done();
//     });
//   });
//   it('should calls GEONAMES service with current settings', function (done) {
//     helpers.geonames({
//       text: 'France'
//     }, function (err, results) {
//       console.log(results)
//       should.not.exist(err, err);
//       should.exist(results.length)
//       done();
//     });
//   });
// });


// describe('helpers: geocluster!', function() {
//   this.timeout(5000);
//   var entitiesToCluster = [];
  
//   it('should calls GEONAMES service with current settings for FRANCE', function (done) {
//     helpers.geonames({
//       text: 'France'
//     }, function (err, results) {
//       should.not.exist(err, err);
//       should.exist(results.length);
//       entitiesToCluster = entitiesToCluster.concat(results)
//       done();
      
//     });
//   });
//   it('should calls GEOCODING service with current settings for FRANCE', function (done) {
//     helpers.geocoding({
//       text: 'France'
//     }, function (err, results) {
//       should.not.exist(err, err);
//       should.exist(results.length)
//       entitiesToCluster = entitiesToCluster.concat(results)
//       done();
//     });
//   });
//   it('should ccluster France from two different services.', function (done) {
//     helpers.geocluster(entitiesToCluster, function (err, result) {
//       should.not.exist(err, err);
//       should.equal(result.name, 'Republic of France, France')
//       should.equal(result.country, 'FR')
//       done();
//     });
//   });
// });

// describe('helpers: geocluster for common mistakes!', function() {
//   this.timeout(5000);
//   var entitiesToCluster = [];
  
//   it('should calls GEONAMES service with current settings for EU', function (done) {
//     helpers.geonames({
//       text: 'European Union'
//     }, function (err, results) {
//       should.not.exist(err, err);
//       should.exist(results.length);
//       entitiesToCluster = entitiesToCluster.concat(results)
//       done();
      
//     });
//   });
//   it('should calls GEOCODING service with current settings for EU', function (done) {
//     helpers.geocoding({
//       text: 'European Union'
//     }, function (err, results) {
//       should.not.exist(err, err);
//       should.exist(results.length)
//       entitiesToCluster = entitiesToCluster.concat(results)
//       done();
//     });
//   });
//   it('should cluster European Union from two different services.', function (done) {
//     helpers.geocluster(entitiesToCluster, function (err, result) {
//       should.exist(err);
//       should.not.exist(result)
//       done();
//     });
//   });
// });


// describe('viaf api', function() {
//   this.timeout(5000);
//   it('should calls viafapi service and build a new person entity', function (done) {
//     helpers.viaf('Hans von der Groeben', function (err, res) {
//       //should.not.exist(err, err);
//       done();
//     });
//   });
// });

describe('helpers: human date service', function() {
  it('should test reconcileInterval', function (done) {
    var d = helpers.reconcileIntervals({
      start_date: '2015-06-07',
      format: 'YYYY-MM-DD'
    });
    
    should.equal(d.start_date, '2015-06-07T00:00:00+00:00')
    should.equal(d.end_date, '2015-06-07T23:59:00+00:00')
    
    var d_END = helpers.reconcileIntervals({
      start_date: '2015-06-07',
      end_date: '2015-06-10',
      format: 'YYYY-MM-DD'
    });
    
    should.equal(d_END.start_date, '2015-06-07T00:00:00+00:00')
    should.equal(d_END.end_date, '2015-06-10T23:59:59+00:00')
    
    var d_STRICT = helpers.reconcileIntervals({
      start_date: '2015-06-07',
      end_date: '2015-06-10',
      format: 'YYYY-MM-DD',
      strict: true
    });
    
    should.equal(d_STRICT.start_date, '2015-06-07T00:00:00+00:00')
    should.equal(d_STRICT.end_date, '2015-06-10T00:00:00+00:00')
    
    done()
  });
  
  this.timeout(5000);
  it('should transform 90-92 in two years span', function (done) {
    helpers.reconcileHumanDate('90-92', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1990-01-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date,  '1992-12-31T23:59:00+00:00');
      done();
    });
  });
  // it('should transform from 1933 to 1951 in a looot of years span', function (done) {
  //   helpers.reconcileHumanDate('from 1933 to 1951', 'fr', function (err, res) {
  //     should.not.exist(err, err);
  //     should.equal(res.start_date, '1990-01-01T00:00:00+00:00'); // utc format
  //     should.equal(res.end_date,  '1992-12-31T23:59:00+00:00');
  //     done();
  //   });
  // });
  it('should find 21 DEc 1954 in german text', function (done) {
    helpers.reconcileHumanDate('Brief von Duncan Sandys an Jean Monnet (London, 21. Dezember 1954)', 'de', function (err, res) {
      should.not.exist(err, err);
      
      should.equal(res.start_date, '1954-12-21T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1954-12-21T23:59:00+00:00');
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
