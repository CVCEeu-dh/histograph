/*
  
  Testing helpers (markdown parsing mechanism)
  ===

*/
'use strict';


var helpers = require('../helpers.js'),
    should  = require('should');

describe('geocoding api', function() {
  this.timeout(5000);
  it('should calls geocodingapi service and build a new location entity', function (done) {
    helpers.geocoding('quai d\'Orsay, Paris', function (err, res) {
      should.not.exist(err, err);
      should.exist(res[0].geocode_id, res);
      done();
    });
  });
});

describe('geonames api', function() {
  this.timeout(5000);
  it('should calls geocodingapi service and build a new location entity', function (done) {
    helpers.geonames('Paris', function (err, res) {
      should.not.exist(err, err);
      should.exist(res[0].geonames_id, res);
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
  it('should stranform 90-92 in two years span', function (done) {
    helpers.reconcileHumanDate('90-92', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1990-01-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date,  '1992-12-31T23:59:00+00:00');
      done();
    });
  });
  it('should stranform 1er et 2 juin 1955 in two day span', function (done) {
    helpers.reconcileHumanDate('1er et 2 juin 1955', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1955-06-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1955-06-02T23:59:00+00:00');
      done();
    });
  });
  it('should stranform 17 septembre 1987 in a day span', function (done) {
    helpers.reconcileHumanDate('17 septembre 1987', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1987-09-17T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1987-09-17T23:59:00+00:00');
      done();
    });
  });
  it('should stranform Octobre 1972 in a month span', function (done) {
    helpers.reconcileHumanDate('Octobre 1972', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1972-10-01T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1972-10-31T23:59:00+00:00');
      done();
    });
  });
  it('should stranform 12 et 13 juillet 1976 in a two days span', function (done) {
    helpers.reconcileHumanDate('12 et 13 juillet 1976', 'fr', function (err, res) {
      should.not.exist(err, err);
      should.equal(res.start_date, '1976-07-12T00:00:00+00:00'); // utc format
      should.equal(res.end_date, '1976-07-13T23:59:00+00:00');
      done();
    });
  });
});
