/*
  
  Test resource MODEL
  ===
  commandline usage:
  
  mocha -g 'model:resource'

*/
'use strict';

var settings = require('../settings'),
    Resource = require('../models/resource'),
    should  = require('should');
    
// todo: create a new resource, discover its content, then retrieve its representation
describe('model:resource ', function() {
  
  it('should get a correct representation of a resource', function (done) {
    Resource.get(11160, function (err, res) {
      if(err)
        throw err;
      should.equal(res.id, 11160)
      
      should.equal(res.persons.length, 3)
      should.exist(res.props)
      done()
    })
  })
  it('should get a list of available resources', function (done) {
    Resource.getMany({
      limit: 3,
      offset: 0
    }, function (err, items, info) {
      if(err)
        throw err;
      should.exist(items.length)
      should.exist(info.total_items)
      done()
    })
  })
  it('should get a correct representation of a resource', function (done) {
    Resource.get(1, function (err, res) {
      if(err)
        throw err;
      should.equal(res.id, 1)
      
      should.exist(res.persons.length)
      should.exist(res.props)
      done()
    })
  })
  it('should return the timeline of resources', function (done) {
    Resource.getTimeline({}, function (err, res) {
      should.not.exist(err);
      done()
    })
  })
  it('should get a NOT found error', function (done) {
    Resource.get(111600000000, function (err, res) {
      should.exist(err)
      done()
    })
  })
 
});