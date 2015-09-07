'use strict';

var settings = require('../settings'),
    request = require('supertest'),
    should  = require('should');

var app = require('../server').app;



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
});