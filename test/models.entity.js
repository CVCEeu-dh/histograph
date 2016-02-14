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
    __resourceB,
    __entity,
    __entityB;

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

  it('should create a new resource B', function (done){
    Resource.create(generator.resource.multilanguageB({
      user: __user,
    }), function (err, resource) {
      if(err)
        throw err;
      __resourceB = resource;
      done();
    });
  });
});



describe('model:entity ', function() {
  

  it('should create a brand new entity, by using links_wiki', function (done) {
    Entity.create({
      links_wiki: 'TESTESTTESTYalta_Conference',
      type: 'social_group',
      name: 'TESTESTTESTYalta_Conference',
      resource: __resource
    }, function (err, entity) {
      should.not.exist(err, err);
      should.equal(entity.rel.type, 'appears_in');
      should.exist(entity.props.name)
      __entity = entity;
      done();
    })
  });

  it('should create a brand new entity, by using links_wiki', function (done) {
    Entity.create({
      links_wiki: 'R2',
      type: 'person',
      name: 'R2',
      resource: __resourceB
    }, function (err, entity) {
      should.not.exist(err, err);
      should.equal(entity.rel.type, 'appears_in');
      should.exist(entity.props.name)
      __entityB = entity;
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
      entity: 'person',
      limit: 10,
      offset: 0
    }, function (err, items, info) {
      should.not.exist(err, err);
      should.exist(info.total_items);
      should.exist(items.length);
      done();
    })
  });
  
  it('should return the network of persons related to the entity', function (done) {
    Entity.getRelatedEntitiesGraph({
      id: __entity.id,
      entity: 'person',
      limit: 100
    }, function (err, graph) {
      should.not.exist(err, err);
      should.exist(graph);
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
  
  // it('should inspect an entity', function (done) {
  //   Entity.inspect(__entity.id, {}, function (err, res){
      
  //     done();
  //   })
  // });
  
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

describe('model:entity upvote downvote the entity', function() {
  it('should upvote the entity correctly', function (done) {
    Entity.update(__entity, {
      upvoted_by: __user.username
    },function (err, entity) {
      should.not.exist(err);
      should.equal(entity.props.upvote.join(), __user.username);
      should.equal(entity.props.celebrity, 1);
      should.equal(entity.props.score, 1);
      done();
    }) // we provide the same id for the entity and for the user. Will the neo4j labels work properly?
  });
  it('should downvote the entity we just upvoted (UNDO)', function (done) {
    Entity.update(__entity, {
      downvoted_by: __user.username
    },function (err, entity) {
      should.not.exist(err);
      should.equal(entity.props.upvote.length, 0);
      should.equal(entity.props.celebrity, 0);
      should.equal(entity.props.score, 0);
      done();
    }) // we provide the same id for the entity and for the user. Will the neo4j labels work properly?
  });
  it('should not downvote the entity (no reason, ISSUE should be used instead)', function (done) {
    Entity.update(__entity, {
      downvoted_by: __user.username
    },function (err, entity) {
      should.not.exist(err);
      should.equal(entity.props.upvote.length, 0);
      should.not.exist(entity.props.downvote);
      should.equal(entity.props.celebrity, 0);
      should.equal(entity.props.score, 0);
      done();
    }) // we provide the same id for the entity and for the user. Will the neo4j labels work properly?
  });
});

describe('model:entity upvote downvote and create relationship', function() {
  it('should return an error since the USER does not exist', function (done) {
    Entity.updateRelatedResource(__entity, __resource, __entity, {
      action: 'upvote'
    },function (err, results) {
      should.exist(err);
      should.equal(err, 'is_empty');
      done();
    }) // we provide the same id for the entity and for the user. Will the neo4j labels work properly?
  });

  it('should upvote a relationship', function (done) {
    Entity.updateRelatedResource(__entity, __resource, __user, {
      action: 'upvote'
    }, function (err, result) {
      should.not.exist(err);
      should.equal(result.rel.score, 1);
      done();
    }) // we provide the same id for the entity and for the user. Will the neo4j labels work properly?
  });

  it('should downvote a relationship', function (done) {
    Entity.updateRelatedResource(__entity, __resource, __user, {
      action: 'downvote'
    }, function (err, result) {
      should.not.exist(err);
      should.equal(result.rel.score, -1);
      done();
    }) // we provide the same id for the entity and for the user. Will the neo4j labels work properly?
  });

  it('should create a relationship between the entity B and the reosurce A', function (done) {
    Entity.createRelatedResource(__entityB, __resource, __user, {}, function (err, result) {
      should.not.exist(err);
      should.equal(result.related.resource.id, __resource.id)
      should.equal(result.rel.created_by, __user.username);
      done();
    })
  });

  it('should remove a relationship between the entity B and the reosurce A', function (done) {
    Entity.removeRelatedResource(__entityB, __resource, __user, {}, function (err, result) {
      console.log(err)
      should.not.exist(err);
      done();
    })
  });

  it('should return an error since the relationship does not exist, no more', function (done) {
    Entity.updateRelatedResource(__entityB, __resource, __entity, {
      action: 'upvote'
    },function (err, results) {
      should.exist(err);
      should.equal(err, 'is_empty');
      done();
    }) // we provide the same id for the entity and for the user. Will the neo4j labels work properly?
  });
});


describe('model:entity after', function() {
  it('should delete the resource', function (done) {
    Resource.remove(__resource, function (err) {
      if(err)
        throw err;
      done();
    });
  });
  it('should delete the resourceB', function (done) {
    Resource.remove(__resourceB, function (err) {
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
  
  
  it('should delete the entity', function (done) {
    Entity.remove(__entity, function (err) {
      if(err)
        throw err;
      done();
    });
  });
   it('should delete the entityB', function (done) {
    Entity.remove(__entityB, function (err) {
      if(err)
        throw err;
      done();
    });
  });
});