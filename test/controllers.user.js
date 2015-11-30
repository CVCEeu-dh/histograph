/*
  
  Test user ctrl via REST API
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
                  suffix: 'user'
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



describe('controller:user before', function() {
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


describe('controller:user (related users)', function() {
  it('should create a LIKES relationship between the resource and the user', function (done) {
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
  });
  
  it('should get the list of curators by date, 2 in this case (the owner and the curator)', function (done) {
    session
      .get('/api/resource/'+ __resourceA.id +'/related/user')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        done();
      });
  });

  it('should get the list of curated resources', function (done) {
    session
      .get('/api/user/'+ __user.id +'/related/resource')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.equal(res.body.result.items.length, 1);
        should.exist(res.body.info.total_items);
        should.exist(res.body.info.limit);
        should.exist(res.body.info.offset);
        should.exist(res.body.info.id);
        should.not.exists(err);
        done();
      });
  });

  it('should get the graph of user curated resources', function (done) {
    session
      .get('/api/user/'+ __user.id +'/related/resource/graph')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.exist(res.body.result.graph.nodes.length);
        should.exist(res.body.result.graph.edges.length);
        should.exist(res.body.info.id);
        should.not.exist(err);
        done();
      });
  });
})

/*
  Scenario: user A likes a resource; userB likes the same resource
  user A can view the new "like"
*/
describe('controller:user (activity)', function() {
  it('should get the initial activity list for the SESSION AUTHENTIFIED user activity', function (done) {
    session
      .get('/api/user/pulse')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        // console.log('pulse', res)
        should.not.exists(err);
        should.exists(res.body.result.items);
        done();
      });
  });
});


// describe('controller:user (related resources)', function() {
//   it('should show a list of 10 related resources', function (done) {
//     session
//       .get('/api/resource/3553/related/resource?limit=10')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function (err, res) {
//         if(err)
//           console.log(err)
//         should.not.exists(err);
//         console.log(res.body.result)
//         should.exist(res.body.result.items);
//         done();
//       });
//   });
// })



describe('controller:user (after)', function() {
  
  it('should delete the researcher', function (done) {
    User.remove(generator.user.researcher(), function (err) {
      if(err)
        throw err;
      should.not.exist(err);
      done();
    });
  });
  it('should delete MARVIN', function (done) {
    User.remove(generator.user.marvin(), function (err) {
      if(err)
        throw err;
      should.not.exist(err);
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
  
  
});