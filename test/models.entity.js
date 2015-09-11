/*
  
  Test Collection model
  ===
  commandline usage:
  
  mocha -g 'model:entity'

*/
'use strict';

var settings = require('../settings'),
    should   = require('should'),
    
    generator = require('../generator')({
      suffix: 'entity'
    }),
    
    User      = require('../models/user'),
    Entity    = require('../models/entity'),
    Resource  = require('../models/resource');

var __user,
    __resource,
    __entity;

describe('model:entity init', function() {
  
  it('should delete the user', function (done) {
    User.remove(generator.user.guest(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  
  it('should create the dummy test user', function (done){
    User.create(generator.user.guest(), function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __user = user;
      done();
    });
  });
  
  
  it('should create a new resource A', function (done){
    Resource.create(generator.resource.multilanguage({
      user: __user,
    }), function (err, resource) {
      if(err)
        throw err;
      __resource = resource;
      done();
    });
  });
});



describe('model:entity ', function() {
  
  it('should create a brand new entity, by using links_wiki', function (done) {
    Entity.create({
      links_wiki: 'Yalta_Conference',
      type: 'social_group',
      name: 'Yalta_Conference',
      resource: __resource
    }, function (err, entity) {
      should.not.exist(err, err);
      should.equal(entity.rel.type, 'appears_in');
      should.exist(entity.props.name)
      __entity = entity;
      done();
    })
  });
  
  
  it('should create a relationship with the user (curator)', function (done) {
    Entity.createRelatedUser(__entity, __user, function (err, entity) {
      if(err)
        console.log(err.neo4jError.message)
      should.not.exist(err);
      should.equal(entity.rel.end, __entity.id);
      should.equal(entity.rel.start, __user.id);
      should.equal(entity.rel.type, 'curates');
      should.exist(entity.props.name);
      done()
    })
  })
  
  it('should create a brand new entity for a specific document', function (done) {
    Entity.get(__entity.id, function (err, res){
      should.not.exist(err, err);
      should.equal(res.id, __entity.id);
      done();
    })
  });
  
  
  it('should return a signle entity', function (done) {
    Entity.get(__entity.id, function (err, res){
      should.not.exist(err, err);
      should.equal(res.id, __entity.id);
      done();
    })
  });
  
  it('should return the list of persons related to the entity', function (done) {
    Entity.getRelatedEntities({
      id: __entity.id,
      entity: 'person'
    }, function (err, items, info) {
      should.not.exist(err, err);
      should.exist(info.total_items);
      should.exist(items.length);
      done();
    })
  });
  
  it('should return 404', function (done) {
    Entity.get(1715100000000000, function (err, res) {
      should.equal(err, 'is_empty');
      should.not.exist(res);
      done();
    })
  });
  
  
  it('should return some related resources', function (done) {
    Entity.getRelatedResources({
      id: __entity.id,
      limit: 12,
      offset: 0
    }, function (err, res){
      should.not.exist(err, err);
      should.exist(res.length)
      done();
    })
  });
  
  it('should inspect an entity', function (done) {
    Entity.inspect(__entity.id, {}, function (err, res){
      
      done();
    })
  });
  
  it('should return some related persons', function (done) {
    Entity.getRelatedResources({
      id: __entity.id,
      limit: 12,
      offset: 0
    }, function (err, res){
      should.not.exist(err, err);
      should.exist(res.length)
      done();
    })
  });
});



describe('model:entity cleaning', function() {
  it('should delete the resource', function (done) {
    Resource.remove(__resource, function (err) {
      if(err)
        throw err;
      done();
    });
  });
  it('should delete the user', function (done) {
    User.remove(generator.user.guest(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  
  // it('should delete the entity', function (done) {
  //   User.remove(generator.user.guest(), function (err) {
  //     if(err)
  //       throw err;
  //     done();
  //   });
  // });
});