/*
  
  Test Collection model
  ===
  commandline usage:
  
  mocha -g 'model:collection'

*/
'use strict';

var settings   = require('../settings'),
    collection = require('../models/collection'),
    should     = require('should');
    
// todo: create a new resource, discover its content, then retrieve its representation
describe('model:collection ', function() {
  this.timeout(5000)
  it('should return a list of collections, with limit and offset', function (done) {
    collection.getItems({}, function(err, res){
      if(err)
        throw err;
      done()
    })
  });
  it('should return a single collection item', function (done) {
    collection.get(12013, function(err, res){
      if(err)
        throw err;
      done()
    });
  })
  it('should return a NOT FOUND', function (done) {
    collection.get(120130909999, function(err, res){
      should.exist(err.message);
      should.equal(err.neo4jException, 'EntityNotFoundException');
      done()
    });
  })
  it('should return a list of resource items', function (done) {
    collection.getRelatedResources(12275, {}, function(err, res){
      console.log(err)
      done()
    });
  })
  it('should return the graph object of resource items', function (done) {
    
    collection.getGraph(12275, {}, function(err, res){
      should.not.exist(err)
      should.exist(res.edges.length)
      should.exist(res.nodes.length)
      done()
    });
  })
  
});