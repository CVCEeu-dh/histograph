/*
  
  Test Collection model
  ===
  commandline usage:
  
  mocha -g 'model:entity'

*/
'use strict';

var settings = require('../settings'),
    entity   = require('../models/entity'),
    should   = require('should');
    
// todo: create a new resource, discover its content, then retrieve its representation
describe('model:entity ', function() {
  it('should return a signle entity', function (done) {
    entity.get(20381, function (err, res){
      should.not.exist(err, err);
      should.equal(res.id, 20381);
      done();
    })
  });
  it('should return 404', function (done) {
    entity.get(17151, function (err, res){
      console.log(err)
      should.not.exist(res);
      done();
    })
  });
  
  
  it('should return some related resources', function (done) {
    entity.getRelatedResources(26706, {}, function (err, res){
      should.not.exist(err, err);
      should.exist(res.length)
      done();
    })
  });
  
  it('should inspect an entity', function (done) {
    entity.inspect(17628, {}, function (err, res){
      
      done();
    })
  });
  
  it('should return some related persons', function (done) {
    entity.getRelatedResources(26706, {}, function (err, res){
      should.not.exist(err, err);
      should.exist(res.length)
      done();
    })
  });
});