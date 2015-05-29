/*
  
  Test resource MODEL
  ===
  commandline usage:
  
  mocha -g 'model:resource'

*/
'use strict';

var settings = require('../settings'),
    resource = require('../models/resource'),
    should  = require('should');
    
// todo: create a new resource, discover its content, then retrieve its representation
describe('model:resource ', function() {
  
  it('should get a correct representation of a resource', function (done) {
    resource.get(11160, function(err, res){
      if(err)
        throw err;
      should.equal(res.id, 11160)
      
      should.equal(res.persons.length, 3)
      should.exist(res.props)
      done()
    })
  })
  it('should get a correct representation of a resource', function (done) {
    resource.get(1, function(err, res){
      if(err)
        throw err;
      should.equal(res.id, 1)
      
      should.exist(res.persons.length)
      should.exist(res.props)
      done()
    })
  })
  it('should get a NOT found error', function (done) {
    resource.get(111600000000, function(err, res){
      should.exist(err)
      done()
    })
  })
 
});