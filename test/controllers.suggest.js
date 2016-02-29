/*
  
  Test suggest ctrl via REST API
  ===
  Cfr. controllers/suggest.js
  test with mocha
  mocha -g 'controller:suggest' 
  
*/
'use strict';

var settings  = require('../settings'),
    should    = require('should'),
    neo4j     = require('seraph')(settings.neo4j.host),
    app       = require('../server').app,
    _         = require('lodash'),
    
    Resource  = require('../models/resource'),
    User      = require('../models/user'),

    Session   = require('supertest-session')({
                  app: app
                }),
    
    generator = require('../generator')({
                  suffix: 'resource'
                });
    
var session,
    __user,
    __MARVIN, // our special user
    __resourceA,
    __resourceB;

before(function () {
  session = new Session();
});

after(function () {
  session.destroy();
});


describe('controller:suggest  before', function() {
  it('should delete MARVIN, if any', function (done) {
    User.remove(generator.user.marvin(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  it('should create MARVIN', function (done) {
    User.create(generator.user.marvin(), function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __MARVIN = user;
      done();
    });
  });
  
  it('should delete the researcher, if any', function (done) {
    User.remove(generator.user.researcher(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  it('should create the researcher', function (done){
    User.create(generator.user.researcher(), function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __user = user;
      done();
    });
  });
  
  it('should create a new resource A', function (done){
    Resource.create(generator.resource.multilanguage({
      user: __MARVIN
    }), function (err, resource) {
      if(err)
        throw err;
      __resourceA = resource;
      should.not.exist(err)
      // console.log(__resourceA.props.full_search)
      done();
    });
  });
  
  it('should create a new resource B', function (done){
    Resource.create(generator.resource.multilanguageB({
      user: __MARVIN
    }), function (err, resource) {
      if(err)
        throw err;
      __resourceB = resource;
      should.not.exist(err)
      // console.log(__resourceA.props.full_search)
      done();
    });
  });
  
  it('should authenticate the user', function (done) {
    session
      .post('/login')
      .send({
        username   : __user.username,
        password   : generator.user.researcher().password,
      })
      .expect(302)
      .end(function (err, res) {
        should.equal(res.headers.location, '/api')
        done();
      })
  });
  
});



describe('controller:suggest check lucene query', function() {
  it('should get a FORM ERROR because query has not been defined', function (done) {
    session
      .get('/api/suggest/person/graph')
      .expect(400)
      .end(function (err, res) {
        // console.log(res.body)
        should.exist(res.body.error)
        should.not.exist(err) // err on statusCode, 400
        
        done();
      })
  });
  it('should get the resource A because of "IMPROBABLE QUERY EVER" query', function (done) {
    session
      .get('/api/suggest?query=improbable query ever')
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err) // err on statusCode
        done();
      })
  });
  it('should get the resource A because of "IMPROBABLE QUERY EVER" query', function (done) {
    session
      .get('/api/suggest/resource?query=improbable query ever')
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err) // err on statusCode
        should.equal(_.map(res.body.result.items, 'id').indexOf(__resourceA.id) != -1, true);
        done();
      })
  });
  
});

describe('controller:suggest viaf', function() {
  it('should return the viaf api results for spaak', function (done) {
    session
      .get('/api/suggest/viaf?query=spaak')
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err) // err on statusCode
        should.exist(res.body.result.items)
        done();
      })
  })
});

describe('controller:suggest dbpedia', function() {
  it('should return the dbpedia api results for Winston_Churchill', function (done) {
    session
      .get('/api/suggest/dbpedia?link=Winston_Churchill')
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err) // err on statusCode
        should.exist(res.body.result.item)
        done();
      })
  })
});

describe('controller:suggest ', function() {
  it('should get the entity that match "konr"', function (done) {
    session
      .get('/api/suggest/entity?query=konr')
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err) // err on statusCode
        should.exist(res.body.result.items)
        done();
      })
  });

  it('should get the person that match "konr"', function (done) {
    session
      .get('/api/suggest/person?query=konr')
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err) // err on statusCode
        should.exist(res.body.result.items)
        done();
      })
  });
  
});

describe('controller:suggest get shared resources', function() {
  it('should get a bunch of resources between a couple of entity ids', function (done) {
    session
      .get('/api/suggest/shared/994be8f0-dbc4-11e5-ae0f-d53111cbd39f,98d1fe00-dbc4-11e5-ae0f-d53111cbd39f/resource?limit=10&offset=0&center=9b9d2bf0-dbc4-11e5-ae0f-d53111cbd39f')
      .expect(200)
      .end(function (err, res) {
        console.log(res.body)
        should.not.exist(err) // err on statusCode
        should.exist(res.body.info.total_items);
        should.exist(res.body.info.limit)
        should.exist(res.body.info.offset)
        done();
      })
  });
  
});

describe('controller:suggest perform some queries', function() {
  this.timeout(5000)
  it('should get some suggestions for Yalta', function (done) {
    session
      .get('/api/suggest/resource?query=Yalta')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.items.length);
        done()
      });
  });
  
  it('should get matches for helmut kohl and mitterrand', function (done) {
    session
      .get('/api/suggest/resource?query=helmut kohl mitterrand')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        // console.log(res.body)
        should.not.exist(err);
        should.exist(res.body.result.items.length);
        done()
      });
  });
  
  it('should get entities matching for helmut kohl', function (done) {
    session
      .get('/api/suggest/entity?query=paris')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        
        if(err)
          console.log(err);
        should.not.exist(err);
        //citems)
        should.exist(res.body.info.total_items);
        should.exist(res.body.result.items.length);
        done()
      });
  });
  
  it('should get a nice graph describing matching for helmut kohl', function (done) {
    session
      .get('/api/suggest/resource/graph?query=helmut kohl')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.graph);
        done()
      });
  });
  
  it('should get the SHORTEST path connecting all four nodes', function (done) {
    session
      .get('/api/suggest/all-shortest-paths/26441,27631,11173?limit=33')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.items.length);
        done()
      });
  });
  
   
  it('should get the resources between four nodes', function (done) {
    session
      .get('/api/suggest/all-in-between/26859,26858,17366,39404,26400/resource?limit=33')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        // console.log(res.body)
        should.exist(res.body.result.items);
        should.exist(res.body.info.total_items);
        done()
      });
  });
  
  it('should get an unknown node based on id', function (done) {
    session
      .get('/api/suggest/unknown-node/'+__resourceA.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        // console.log('SUGGEST',__resourceA.id)
        // console.log(err)
        !!err && !!res && console.log(res.body);
        should.not.exist(err);
        should.equal(res.body.result.item.id, __resourceA.id)
        should.exist(res.body.result.item);
        done()
      });
  });
  
  it('should get an unknown node based on ids', function (done) {
    session
      .get('/api/suggest/unknown-nodes/'+ __resourceA.id +','+ __resourceB.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        !!err && !!res && console.log(res.body);
        should.not.exist(err);
        should.equal(_.map(res.body.result.items, 'id').sort().join(), [__resourceA.id,  __resourceB.id].sort().join());
        done()
      });
  });
  
  it('should get the neighbors at distance 1 of four nodes', function (done) {
    session
      .get('/api/suggest/neighbors/26441,27631,11173')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        !!err && !!res && console.log(res.body);
        should.not.exist(err);
        should.exist(res.body.result.items.length);
        done()
      });
  });
});

describe('controller:suggest timeline', function() {
  it('should get the all in between timeline', function (done) {
    session
      .get('/api/suggest/all-in-between/'+ __resourceA.id +','+ __resourceB.id + '/resource/timeline')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        !!err && !!res && console.log(res.body);
        should.not.exist(err);
        done()
      });
  });
});





describe('controller:suggest after', function() {
  it('should delete the resource A', function (done) {
    Resource.remove({
      id: __resourceA.id
    }, function (err) {
      should.not.exist(err);
      done();
    })
  });
  it('should delete the researcher', function (done) {
    User.remove(generator.user.researcher(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  it('should delete MARVIN', function (done) {
    User.remove(generator.user.marvin(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
});