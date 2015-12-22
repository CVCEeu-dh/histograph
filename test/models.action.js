/*
  
  Test action model
  ===
  commandline usage:
  
  mocha -g 'model:action'
  
  Test the interaction between three users on the same resoruce

*/
'use-strict';

var settings  = require('../settings'),
    should    = require('should'),
    generator = require('../generator')({
      suffix: 'issue'
    }),

    Action    = require('../models/action'),
    User      = require('../models/user'),
    Resource  = require('../models/resource'),
    Entity    = require('../models/entity');

var __actionA,
    __actionB,
    __resourceA,
    __resourceB,
    __userA,
    __userB,
    __entity;


describe('model:action before', function() {
  it('should delete the user A (guest)', function (done) {
    User.remove(generator.user.guest(), function (err) {
      should.not.exist(err);
      done();
    });
  });
  
  it('should delete the user B (researcher)', function (done) {
    User.remove(generator.user.researcher(), function (err) {
      should.not.exist(err);
      done();
    });
  });

  it('should create user A', function (done){
    User.create(generator.user.guest(), function (err, user) {
      should.not.exist(err);
      should.exist(user.username);
      __userA = user;
      done();
    });
  });
  
  it('should create user B', function (done){
    User.create(generator.user.researcher(), function (err, user) {
      should.not.exist(err);
      should.exist(user.username);
      __userB = user;
      done();
    });
  });

  it('should create a new resource A', function (done){
    Resource.create(generator.resource.multilanguage({
      user: __userB,
    }), function (err, resource) {
      should.not.exist(err);
      __resourceA = resource;
      done();
    });
  });

  it('should create a new resource B', function (done){
    Resource.create(generator.resource.multilanguageB({
      user: __userB,
    }), function (err, resource) {
      if(err)
        throw err;
      __resourceB = resource;
      done();
    });
  });

  it('should create a brand new entity, by using links_wiki', function (done) {
    Entity.create({
      links_wiki: 'TESTESTTESTTTYalta_Conference',
      type: 'social_group',
      name: 'TESTESTTESTYalta_Conference',
      resource: __resourceA
    }, function (err, entity) {
      should.not.exist(err, err);
      should.equal(entity.rel.type, 'appears_in');
      should.exist(entity.props.name)
      __entity = entity;
      done();
    })
  });
});


describe('model:action voteup relationship', function() {
  it('should voteup resource A and entity relationship', function (done) {
    Action.create({
      kind: Action.UPVOTE,
      target: Action.APPEARS_IN_RELATIONSHIP,
      mentions: [__resourceA.id, __entity.id],
      username: __userA.username
    }, function (err, node) {
      should.not.exist(err);
      should.equal(node.performed_by.id, __userA.id);
      should.equal(node.props.target, Action.APPEARS_IN_RELATIONSHIP);
      should.equal(node.mentioning.length, 2);
      // console.log(node)
      __actionA = node;
      done();
    })
  });
});

describe('model:action after', function() {  
  it('should delete the user A', function (done) {
    User.remove({email: __userA.email}, function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  it('should delete the user B', function (done) {
    User.remove({email: __userB.email}, function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  it('should delete the actionA', function (done) {
    Action.remove(__actionA, function (err) {
      should.not.exist(err);
      done();
    })
  });
  
  it('should delete the entity', function (done) {
    Entity.remove(__entity, function (err) {
      if(err)
        throw err;
      done();
    });
  });

  it('should delete the resource A', function (done) {
    Resource.remove({
      id: __resourceA.id
    }, function (err) {
      should.not.exist(err);
      done();
    })
  });

  it('should delete the resource B', function (done) {
    Resource.remove({
      id: __resourceB.id
    }, function (err) {
      should.not.exist(err);
      done();
    })
  });
})