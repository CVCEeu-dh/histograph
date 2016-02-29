'use strict';

var settings = require('../settings'),
    request  = require('supertest'),
    should   = require('should'),
    
    helpers  = require('../helpers');

var app = require('../server').app;


describe('core:neo4j connectivity', function() {
  it('should check that neo4j is correctly set and running', function (done) {
    should.exist(settings.neo4j)
    var neo4j     = require('seraph')(settings.neo4j.host);
    neo4j.query('MATCH (n) RETURN n LIMIT 1', function(err, nodes) {
      should.not.exist(err);
      should.exist(nodes.length);
      done();
    })
  });
});

describe('core:settings', function() {
  it('should check that settings sections are correctly set :D', function (done) {
    should.exist(settings.paths)
    should.exist(settings.paths.cache)
    should.exist(settings.disambiguation)
    should.exist(settings.disambiguation.fields)
    should.exist(settings.disambiguation.services)
    done()
  });
});

describe('core:cache discover', function() {
  it('should save then remove a test file to check that cache folder is writeable', function (done) {
    var fs   = require('fs'),
        path = require('path');
    if(settings.paths.cache.disambiguation) {
      fs.writeFile(path.join(settings.paths.cache.disambiguation, 'test.json'), '', function (err) {
        should.not.exist(err);
        fs.unlink(path.join(settings.paths.cache.disambiguation, 'test.json'), function (err) {
          should.not.exist(err);
          done();
        })
      })
    } else {
      done();
    }
  });
  
  it('should save a test file to check that cache SERVICES folder is writeable', function (done) {
    if(settings.paths.cache.services)
      helpers.cache.write(JSON.stringify({a:'b'}),{
        namespace: 'services',
        ref: 'test'
      }, function (err) {
        should.not.exist(err);
        done();
      });
    else
      done();
  });
  
  it('should read a test file to check that the previous cache file has been written', function (done) {
    if(settings.paths.cache.services)
      helpers.cache.read({
        namespace: 'services',
        ref: 'test'
      }, function (err, contents) {
        should.not.exist(err);
        should.equal(contents.a, 'b')
        done();
      })
    else
      done();
  })    
        
  it('should unlink a test file', function (done) {
    if(settings.paths.cache.services)
      helpers.cache.unlink({
        namespace: 'services',
        ref: 'test'
      }, function (err) {
        should.not.exist(err);
        done();
      })
    else
      done();
  })
});