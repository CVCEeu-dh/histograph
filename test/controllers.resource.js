/*
  
  Test resource ctrl via REST API
  ===

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
    __resourceA;

before(function () {
  session = new Session();
});

after(function () {
  session.destroy();
});



describe('controller:resource before', function() {
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
  })
});


describe('controller:resource', function() {
  it('should get a specific resource', function (done) {
    session
      .get('/api/resource/51690')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)
        should.not.exists(err);
        done();
      });
  });
  
  it('should sort the list of resource', function (done) {
    session
      .get('/api/resource/')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)
        should.not.exists(err);
        should.exist(res.body.info.total_items)
        should.equal(res.body.info.offset, 0)
        done();
      });
  });
  
  it('should show a list of 20 resources from a specific date', function (done) {
    session
      .get('/api/resource?limit=20&from=1988-01-01&to=1989-01-03')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        // console.log(res.body.info)
        //console.log(_.map(res.body.result.items, function(d){return d.props.start_date}))
        should.equal(res.body.info.limit, 20)
        should.equal(res.body.info.start_date, '1988-01-01T00:00:00.000Z');
        should.equal(res.body.info.end_date, '1989-01-03T00:00:00.000Z');
        should.equal(res.body.info.start_time, 567993600);
        
        done();
      });
  });
})

describe('controller:resource (related users)', function() {
  it('should create a curates relationship between the resource and the user', function (done) {
    session
      .post('/api/resource/'+ __resourceA.id +'/related/user')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.exist(res.body.result.item);
        should.equal(res.body.result.item.rel.start, __user.id);
        should.equal(res.body.result.item.rel.end, __resourceA.id);
        should.equal(res.body.result.item.rel.type, 'likes');
        
        done();
      });
  })
  
  it('should get the list of curators by date, 2 in this case (the owner and the curator)', function (done) {
    session
      .get('/api/resource/'+ __resourceA.id +'/related/user')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.exist(res.body.info.total_items);
        should.exist(res.body.result.items);
        done();
      });
  })
});


describe('controller:resource (related entities)', function() {
  
  it('should get the list of curators by date, 2 in this case (the owner and the curator)', function (done) {
    session
      .get('/api/resource/'+ __resourceA.id +'/related/person')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.exist(res.body.result.items);
        done();
      });
  })
})



describe('controller:resource (related resources)', function() {
  it('should show a list of 10 related letters, if any', function (done) {
    session
      .get('/api/resource/'+ __resourceA.id +'/related/resource?limit=13&type=letter')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.exist(res.body.result.items);
        should.equal(res.body.info.limit, 13);
        should.exist(res.body.info.type);
        should.equal(res.body.info.id, __resourceA.id);
        should.equal(res.body.info.orderby, 'relevance');
        done();
      });
  });
  
  it('should show a list of 10 related letters, if any, sorted by date', function (done) {
    session
      .get('/api/resource/'+__resourceA.id+'/related/resource?limit=10&type=picture&orderby=date')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        // console.log(res.body)
        should.exist(res.body.result.items);
        should.equal(res.body.info.limit, 10);
        should.exist(res.body.info.type);
        should.equal(res.body.info.id, __resourceA.id);
        should.equal(res.body.info.orderby, 'date');
        done();
      });
  });
  
  it('should show a list of 10 related resources containing a specific entity, if any', function (done) {
    session
      .get('/api/resource/177/related/resource?limit=1&with=17379')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        
        should.exist(res.body.result.items);
        should.equal(res.body.info.limit, 1);
        should.exist(res.body.info.with);
        should.equal(res.body.info.id, 177)// __resourceA.id);
        should.equal(res.body.info.orderby, 'relevance');
        done();
      });
  });
  
  it('should show the graph of 10 related resources', function (done) {
    session
      .get('/api/resource/'+ __resourceA.id +'/related/resource/graph')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)
        should.not.exists(err);
        // console.log(res.body.result)
        
        should.exist(res.body.result.graph);
        should.exist(res.body.result.graph.nodes.length);
        should.exist(res.body.result.graph.edges.length);
        done();
      });
  });
  
  it('should get the timeline of related resources', function (done) {
    session
      .get('/api/resource/'+ __resourceA.id +'/related/resource/timeline')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)
        should.not.exists(err);
        should.exist(res.body.result.timeline)
        // console.log(res.body.result)
        
        done();
      });
  });
  
  it('should show the graph of 10 related people', function (done) {
    session
      .get('/api/resource/'+ __resourceA.id +'/related/person/graph')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)
        should.not.exists(err);
        
        should.exist(res.body.result.graph);
        should.exist(res.body.result.graph.nodes.length);
        should.exist(res.body.result.graph.edges.length);
        done();
      });
  });
  
})



describe('controller:resource after', function() {
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