/*
  
  Test Collection model
  ===
  commandline usage:
  
  mocha -g 'model:collection'

*/
'use strict';

var settings   = require('../settings'),
    User       = require('../models/user'),
    resource   = require('../models/resource'),
    collection = require('../models/collection'),
    async      = require('async'),
    _          = require('lodash'),
    
    generator = require('../generator')({
      suffix: 'collection'
    }),
    
    should     = require('should');

 var __collection, // the local collection object created for fun
      __resourceX, // the local resource object that can be inquiried
      __resourceY,
      __resourceZ,
      __user;
      
// todo: create a new resource, discover its content, then retrieve its representation
describe('model:collection init', function() {
  this.timeout(5000);
 
  
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
  
  it('should create three new resources', function (done){
    async.parallel([
      function (callback) {
        resource.create({
          name: 'X',
          doi: 'X DOI',
          mimetype: 'text',
          title_en: 'A nice title',
          title_fr: 'Un beau titre',
          caption_en: 'Something useful',
          caption_fr: 'Quelque chose d\'utile',
          languages: ['en', 'fr'],
          user: __user,
        }, function (err, resource) {
          if(err)
            throw err;
          __resourceX = resource;
          callback();
        });
      },
      function (callback) {
        resource.create({
          name: 'Y',
          doi: 'Y DOI',
          mimetype: 'text',
          title_en: 'A nice title',
          title_fr: 'Un beau titre',
          caption_en: 'Something useful',
          caption_fr: 'Quelque chose d\'utile',
          languages: ['en', 'fr'],
          user: __user,
        }, function (err, resource) {
          if(err)
            throw err;
          __resourceY = resource;
          callback();
        });
      },
      function (callback) {
        resource.create({
          name: 'Z',
          doi: 'Z DOI',
          mimetype: 'text',
          title_en: 'A nice title',
          title_fr: 'Un beau titre',
          caption_en: 'Something useful',
          caption_fr: 'Quelque chose d\'utile',
          languages: ['en', 'fr'],
          user: __user,
        }, function (err, resource) {
          if(err)
            throw err;
          __resourceZ = resource;
          done();
        });
      }
    ], function() {
      done()
    });
  });

});

describe('model:collection', function() {
  it('should create a brand new collection', function (done) {
    collection.create({
      name: 'test collection',
      description: 'test description',
      user: __user
    }, function (err, collection) {
      if(err)
        throw err;
      __collection = collection;
      done();
    })
  });
    
  it('should add the resources to the brand new collection respecting the sorting order ZXY', function (done) {
    var resources = [__resourceZ, __resourceX, __resourceY];
    collection.addRelatedItems({
      ids: _.map(resources, 'id'),
      slug: __collection.props.slug,
      user: __user
    }, function (err, result) {
      if(err)
        throw err;
      should.equal(result.id, __collection.id);
      // check the order
      
      done();
    });
    
  });
    
    
  it('should return a list of collection items, with limit and offset', function (done) {
    collection.getItems({
      offset: 0,
      limit: 5
    }, function (err, res) {
      if(err)
        throw err;
      done()
    })
  });
  
  it('should return a single collection item', function (done) {
    collection.get(__collection.id, function(err, res){
      if(err)
        throw err;
      should.equal(res.id, __collection.id)
      should.equal(res.props.slug, __collection.props.slug)
      done()
    });
  });
  
  it('should return a  list of items related to collection, ordered as ZXY', function (done) {
    collection.getRelatedItems(__collection.id, {
      limit: 5,
      offset: 0
    }, function(err, items){
      if(err)
        throw err;
      should.equal(_.map(items, 'id').join(), _.map([__resourceZ, __resourceX, __resourceY], 'id').join());
      done()
    });
  });
  
  it('should return a NOT FOUND', function (done) {
    collection.get(120130909999, function(err, res){
      should.equal(err, 'is_empty');
      done()
    });
  })
  it('should return a list of resource items', function (done) {
    collection.getRelatedResources(__collection.id, {}, function(err, res){
      // console.log(err)
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
  
  
  
  it('should delete the collection', function (done) {
    // console.log(__collection)
    collection.remove(__collection.id, function (err) {
      // should.not.exist(err);
      done();
    })
  });
  
  it('should delete the resources just created', function (done) {
    var q = async.queue(function (res, nextResource) {
      resource.remove({
        id: res.id
      }, function (err) {
        should.not.exist(err);
        nextResource();
      });
    }, 1); // this has to be put to 1, dunno why.
    q.push([__resourceX, __resourceY, __resourceZ]);
    q.drain = done;
  });
  
  it('should delete the user', function (done) {
    User.remove(generator.user.guest(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
});