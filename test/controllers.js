/*
  
  Test user ctrl via REST API
  ===

*/
'use strict';

var settings = require('../settings'),
    should  = require('should'),
    neo4j   = require('seraph')(settings.neo4j.host),
    
    app = require('../server').app,

    Session = require('supertest-session')({
      app: app
    }),

    session,
    
    _ = require('lodash');

before(function () {
  session = new Session();
});

after(function () {
  session.destroy();
});

var __user,
    __resourceA,
    __resourceB,
    __entity,
    __inquiry,
    __comment;

describe('controllers: create a new user', function() {
  it('should remove the user with email world@globetrotter.it', function (done) {
    neo4j.query('MATCH (n:user {username:{username}}) OPTIONAL MATCH (n)-[r]-() DELETE n, r', {
      username: 'hello-world'
    }, function(err, res) {
      if(err)
        console.log(err)
      //console.log('result', res)
      done();
    })
    
  });
  
  it('should create a new user into the database', function (done) {
    session
      .post('/signup')
      .send({
        username   : 'hello-world',
        password   : 'WorldHello',
        email      : 'world@globetrotter.it',
        firstname  : 'Milky',
        lastame    : 'Way',
        strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
        about      : '' // further info about the user, in markdown
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log('create user', err)
        should.equal(res.body.status, 'ok', res.body)
        done();
      })
  });
})


describe('controllers: authenticate the user, but failing', function() {
  it('should fail on password length', function (done) {
    session
      .post('/signup')
      .send({
        username   : 'hello-world',
        password   : 'World',
        email      : 'world@globetrotter.it',
        firstname  : 'Milky',
        lastame    : 'Way',
        strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
        about      : '' // further info about the user, in markdown
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end(function(err, res) {
        should.equal(res.body.status, 'error');
        should.equal(res.body.error.form[0].field, 'password');
        should.equal(res.body.error.form[0].check, 'isLength');
        done();
      })
  });
  

  it('should fail because user exists already', function (done) {
    session
      .post('/signup')
      .send({
        username   : 'hello-world',
        password   : 'WorldHello',
        email      : 'world@globetrotter.it',
        firstname  : 'Milky',
        lastame    : 'Way',
        strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
        about      : '' // further info about the user, in markdown
      })
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (err, res) {
        should.equal(res.body.status, 'error');
        should.equal(res.body.error.exception, 'ConstraintViolationException');
        done();
      })
  });


  it('should NOT authenticate the user because of wrong credentials', function (done) {
    session
      .post('/login')
      .send({
        username   : 'hello-world',
        password   : 'World  Hello',
      })
      .expect('Content-Type', /json/)
      .expect(403)
      .end(function (err, res) {
        should.equal(res.body.status, 'error');
        done();
      })
  })


  it('should NOT authenticate the user because it is not enabled', function (done) {
    session
      .post('/login')
      .send({
        username   : 'hello-world',
        password   : 'WorldHello',
      })
      .expect('Content-Type', /json/)
      .expect(403)
      .end(function (err, res) {
        should.equal(res.body.status, 'error');
        done();
      })
  })


  it('should NOT activate the user, malformed request!', function (done) {
    session
      .get('/activate?k=AAABBBCCCdddEEEFFF&e=world@globetrotter.it')
      .expect('Content-Type', /json/)
      .expect(403)
      .end(function (err, res) {
        should.equal(res.body.error.form[0].field, 'email');
        should.equal(res.body.status, 'error');
        done();
      })
  })
})


describe('controllers: authenticate the user, succeed', function() {
  it('should change the activation key, via cypher', function (done) {
    neo4j.query('MATCH(n:user {email:{email}}) SET n.activation = {key} RETURN n', {
      email: 'world@globetrotter.it',
      key: 'AAABBBCCCddd'
    }, function(err, res) {
      if(err)
        console.log(err);
      should.equal(res[0].activation, 'AAABBBCCCddd');
      done();
    })
  })


  it('should activate the user!', function (done) {
    session
      .get('/activate?k=AAABBBCCCddd&email=world@globetrotter.it')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.equal(res.body.status, 'ok');
        done();
      })
  })


  it('should authenticate the user and should REDIRECT to api index', function (done) {
    session
      .post('/login')
      .send({
        username   : 'world@globetrotter.it',
        password   : 'WorldHello',
      })
      .expect(302)
      .end(function (err, res) {
        should.equal(res.headers.location, '/api')
        done();
      })
  })


  it('should show user properties', function (done) {
    session
      .get('/api')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) { //
        __user = res.body.user;
        should.equal(res.body.status, 'ok');
        should.equal(res.body.user.email, 'world@globetrotter.it');
        done();
      });
  })
});



describe('controllers: get resource items available to the user', function() {
  var generator = require('../generator')({
                  suffix: 'controllers'
                }),
      Resource  = require('../models/resource');
      
  
  it('should create a new resource A', function (done){
    Resource.create(generator.resource.multilanguage({
      user: __user
    }), function (err, resource) {
      if(err)
        throw err;
      __resourceA = resource;
      done();
    });
  });
  
  it('should create a new resource B', function (done){
    Resource.create(generator.resource.multilanguageB({
      user: __user
    }), function (err, resource) {
      if(err)
        throw err;
      __resourceB = resource;
      done();
    });
  });
  
  it('should show a list of 50 resources', function (done) {
    session
      .get('/api/resource')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        //console.log(' resoucre ', res.body)
        done();
      });
  });
  
  it('should show a list of 20 resources from a specific date', function (done) {
    session
      .get('/api/resource?from=1988-01-01&to=1988-01-02&limit=20')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.equal(res.body.info.params.start_date, '1988-01-01T00:00:00.000Z');
        should.equal(res.body.info.params.end_date, '1988-01-02T00:00:00.000Z');
        should.equal(res.body.info.params.start_time, 567993600);
        done();
      });
  });
  
  it('should show a list of 20 resources from a specific date', function (done) {
    session
      .get('/api/resource?from=1988-01-01&to=1989-01-03')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        //console.log(_.map(res.body.result.items, function(d){return d.props.start_date}))
        should.equal(res.body.info.params.start_date, '1988-01-01T00:00:00.000Z');
        should.equal(res.body.info.params.end_date, '1989-01-03T00:00:00.000Z');
        should.equal(res.body.info.params.start_time, 567993600);
        
        done();
      });
  });
  
  
  it('should throw a FORM error - Bad request', function (done) {
    session
      .get('/api/resource?from=nonsisa')
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (err, res) {
        should.not.exists(err);
        should.exists(res.body.error)
        done();
      });
  });

  it('should return a NOT FOUND error via API', function (done) {
    session
      .get('/api/resource/512000000')
      .expect('Content-Type', /json/)
      .expect(404)
      .end(function (err, res) {
        should.equal(res.body.status, 'error');
        should.equal(res.statusCode, 404)
        done();
      });
  });

  it('should return the specified resource', function (done) {
    session
      .get('/api/resource/'+__resourceA.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        // console.log(err, res.body.result.item)
        should.not.exists(err);

        should.exists(res.body.result.item);
        should.equal(res.body.result.item.props.title_en,__resourceA.props.title_en);
        should.equal(res.body.status, 'ok', res.body);
        done();
      });
  });
  
  it('should return the specified resources by ids', function (done) {
    session
      .get('/api/resource/'+[__resourceA.id, __resourceB.id].join(','))
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);

        should.exists(res.body.result.items);
        should.equal(res.body.status, 'ok', res.body);
        done();
      });
  });
  
  it('should show a list of 100 related resources', function (done) {
    session
      .get('/api/resource/'+__resourceA.id+'/related/resource?limit=100')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)
        should.not.exists(err);
        should.exist(res.body.result.items);
        done();
      });
  });
  
  it('should create a comment and attach it to the required resource', function (done) {
    session
      .post('/api/resource/'+__resourceA.id+'/related/comment')
      .send({
        content : 'A content with some #taa and #location tag',
        resource_id: 512,
        tags: ['#taa', '#location']
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.exist(res.body.result.items.length)
        should.exist(res.body.result.items[0].id)
        should.equal(res.body.result.items[0].user.username, 'hello-world')
        
        done();
      });
  });
  
  it('should return the timeline of resources, filtered', function (done) {
    session
      .get('/api/resource/timeline?from=1988-01-01&to=1998-01-02')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)
        should.not.exists(err);
        should.exist(res.body.result.timeline)
        done();
      });
  });
  
  it('should return the graph of cooccurrences, filtered', function (done) {
    session
      .get('/api/cooccurrences?from=1988-01-01&to=1988-01-02')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)
        should.not.exists(err);
        //console.log(' resoucre ', res.body)
        done();
      });
  });
  
  it('should get a single resource MONOPARTITE graph object', function (done) {
    session
      .get('/api/resource/'+__resourceA.id+'/graph?type=monopartite-entity')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log('ERROR', err);
        should.not.exist(err);
        // console.log(res.body)
        should.exist(res.body.result.graph);
        done()
      });
  });
  
});

describe('controllers: inquiries', function() {

  
  it('should get some inquiries', function (done) {
    session
      .get('/api/inquiry?limit=10')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        // if(err)
        //   console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.items.length);
        done()
      });
  })
  
  it('should create a new inquiry', function (done) {
    session
      .post('/api/resource/'+__resourceA.id+'/related/inquiry')
      .send({
        name: 'this is a test inquiry',
        description: 'please provide the resource with something important'
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        
        should.equal(res.body.user.username, 'hello-world')
        should.equal(res.body.result.item.proposed_by, 'hello-world')
        if(err)
          console.log(err)   
        __inquiry = res.body.result.item;
        
        done();
      });
  })
  
  it('should create a new comment', function (done) {
    session
      .post('/api/inquiry/' + __inquiry.id + '/related/comment')
      .send({
        content: 'this is a test comment'
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        
        if(err)
          console.log(err)   
        __comment = res.body.result.item;
        done();
      });
  })
  
  it('should downvote the new comment', function (done) {
    session
      .post('/api/comment/' + __comment.id + '/downvote')
      .send({
        upvoted_by: __inquiry.proposed_by
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err)   
        should.not.exist(err);
        should.equal(res.body.result.item.props.score, -1)
        should.equal(res.body.result.item.props.celebrity, 1)
        done();
      });
  })
  
  it('should upvote the new comment', function (done) {
    session
      .post('/api/comment/' + __comment.id + '/upvote')
      .send({
        upvoted_by: __inquiry.proposed_by
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        should.equal(res.body.result.item.props.score, 0)
        should.equal(res.body.result.item.props.celebrity, 1)
        done();
      });
  })
  
  it('should get the list of comments related to an inquiry', function (done) {
    session
      .get('/api/inquiry/' + __inquiry.id + '/related/comment?limit=12')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.items.length);
        should.equal(res.body.info.params.limit, 12);
        done()
      });
  })
  
  it('should get the inquiry just created', function (done) {
    session
      .get('/api/inquiry/' + __inquiry.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        
        should.exist(res.body.result.item);
        done()
      });
  })
  
  it('should get a list of inquiries related to a resource', function (done) {
    session
      .get('/api/resource/'+__resourceA.id +'/related/inquiry?limit=10')
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
  
});

describe('controllers: issues', function() {
  var __issue = {},
      __comment = {};
  
  it('should create an issue on date', function (done) {
    session
      .post('/api/resource/'+__resourceA.id + '/related/issue')
      .send({
        type: 'date',
        title: 'Date not found, or is not correct',
        solution: ['2000-12-31','2001-01-01'],
        description: 'the date cannot be read properly'
      })
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.exist(res.body.result.item);
        done()
      });
  });
  
  it('should get some inquiries', function (done) {
    session
      .get('/api/issue?limit=10')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        // if(err)
        //   console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.items.length);
        done()
      });
  })
  
  // it('should create a new inquiry', function (done) {
  //   session
  //     .post('/api/resource/11160/related/inquiry')
  //     .send({
  //       name: 'this is a test inquiry',
  //       description: 'please provide the resource with something important'
  //     })
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(function (err, res) {
  //       should.not.exist(err);
        
  //       should.equal(res.body.user.username, 'hello-world')
  //       should.equal(res.body.result.item.proposed_by, 'hello-world')
  //       if(err)
  //         console.log(err)   
  //       __issue = res.body.result.item;
        
  //       done();
  //     });
  // })
  
  
  // it('should downvote the new comment', function (done) {
  //   session
  //     .post('/api/issue/' + __issue.id + '/downvote')
  //     .send({
  //       upvoted_by: __issue.proposed_by
  //     })
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(function (err, res) {
  //       if(err)
  //         console.log(err)   
  //       should.not.exist(err);
  //       should.equal(res.body.result.item.props.score, -1)
  //       should.equal(res.body.result.item.props.celebrity, 1)
  //       done();
  //     });
  // })
  
  // it('should upvote the new comment', function (done) {
  //   session
  //     .post('/api/comment/' + __comment.id + '/upvote')
  //     .send({
  //       upvoted_by: __issue.proposed_by
  //     })
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(function (err, res) {
  //       if(err)
  //         console.log(err);
  //       should.not.exist(err);
  //       should.equal(res.body.result.item.props.score, 0)
  //       should.equal(res.body.result.item.props.celebrity, 1)
  //       done();
  //     });
  // })
  
  // it('should get the list of comments related to an inquiry', function (done) {
  //   session
  //     .get('/api/inquiry/' + __issue.id + '/related/comment?limit=12')
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(function (err, res) {
  //       if(err)
  //         console.log(err);
  //       should.not.exist(err);
  //       should.exist(res.body.result.items.length);
  //       should.equal(res.body.info.params.limit, 12);
  //       done()
  //     });
  // })
  
  // it('should get the inquiry just created', function (done) {
  //   session
  //     .get('/api/inquiry/' + __issue.id)
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(function (err, res) {
  //       if(err)
  //         console.log(err);
  //       should.not.exist(err);
        
  //       should.exist(res.body.result.item);
  //       done()
  //     });
  // })
  
  it('should get a list of inquiries related to a resource', function (done) {
    session
      .get('/api/resource/11160/related/inquiry?limit=10')
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
  
});


describe('controllers: suggest queries', function() {
  this.timeout(5000)
  it('should get some suggestions for Yalta', function (done) {
    session
      .get('/api/suggest?query=Yalta')
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
      .get('/api/suggest/resources?query=helmut kohl mitterrand')
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
      .get('/api/suggest/entities?query=helmut kohl')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        //console.log(res.body.result.items)
        should.exist(res.body.result.items.length);
        done()
      });
  });
  
  it('should get a nice graph describing matching for helmut kohl', function (done) {
    session
      .get('/api/suggest/graph?query=helmut kohl')
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
  
   
  it('should get the full path between four nodes', function (done) {
    session
      .get('/api/suggest/all-in-between/26441,27631,11173?limit=33')
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
  
  it('should get an unknown node based on id', function (done) {
    session
      .get('/api/suggest/unknown-node/'+__resourceA.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
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
        if(err)
          console.log(err);
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
        if(err)
          console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.items.length);
        done()
      });
  });
});

describe('controllers: collections', function() {
  var __collection;
  
  it('should create a collection', function (done) {
    session
      .post('/api/collection')
      .send({
        ids: '26441,27631,11173',
        name: 'Hello, world! test collection',
        description: 'Hello, world! test collection. A long description.',
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.item);
        __collection = res.body.result.item;
        done()
      });
  });
  
  it('should get a single collection item', function (done) {
    session
      .get('/api/collection/' + __collection.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.item);
        done()
      });
  });
  
  it('should get a single collection related resources', function (done) {
    session
      .get('/api/collection/' + __collection.id + '/related/resources')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log('ERROR', err);
        should.not.exist(err);
        should.exist(res.body.result.items);
        done()
      });
  });
  
  it('should get a single collection graph object', function (done) {
    session
      .get('/api/collection/11137/graph')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log('ERROR', err);
        should.not.exist(err);
        should.exist(res.body.result.graph);
        done()
      });
  });
});

describe('controllers: play with entities', function() {
  var Entity = require('../models/entity')
  it('should create a brand new entity, by using links_wiki', function (done) {
    Entity.create({
      links_wiki: 'European_Parliament',
      type: 'social_group',
      name: 'European Parliament',
      resource: __resourceA,
      trustworthiness: 0.8
    }, function (err, entity) {
      should.not.exist(err, err);
      should.equal(entity.rel.type, 'appears_in');
      should.exist(entity.props.name)
      __entity = entity;
      done();
    })
  });
  
  
  it('should get a single entity item', function (done) {
    session
      .get('/api/entity/'+__entity.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        should.exist(res.body.result.item);
        should.equal(res.body.result.item.id, __entity.id);
        done()
      });
  });
  it('should downvote a single entity item', function (done) {
    session
      .post('/api/entity/'+__entity.id+'/downvote')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log(err);
        should.not.exist(err);
        // console.log(res.body.result.item)
        should.exist(res.body.result.item);
        should.equal(res.body.result.item.id, __entity.id);
        done()
      });
  });
  it('should get some entities by id', function (done) {
    session
      .get('/api/entity/' + __entity.id + ','+__entity.id)
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
  it('should get a single entity related resources', function (done) {
    session
      .get('/api/entity/'+__entity.id+'/related/resources')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log('ERROR', err);
        should.not.exist(err);
        should.exist(res.body.result.items);
        done()
      });
  });
  
  it('should get a single entity related persons', function (done) {
    session
      .get('/api/entity/20381/related/persons')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log('ERROR', err);
        should.not.exist(err);
        should.exist(res.body.result.items);
        done()
      });
  });
  
  it('should get a single entity graph object', function (done) {
    session
      .get('/api/entity/20381/graph')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log('ERROR', err);
        should.not.exist(err);
        should.exist(res.body.result.graph);
        done()
      });
  });
  it('should get a single entity MONOPARTITE graph object', function (done) {
    session
      .get('/api/entity/20381/graph?type=monopartite-entity')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if(err)
          console.log('ERROR', err);
        should.not.exist(err);
        
        should.exist(res.body.result.graph);
        done()
      });
  });
})


describe('controllers: delete the user and their relationships', function() {
  it('should remove the comments created by the hello-world user', function (done) {
    neo4j.query('MATCH (n:user {username:{username}})-[r]-(com:comment)-[r2:mentions]-() DELETE com, r2, r', {
      username: 'hello-world'
    }, function(err, res) {
      if(err)
        console.log(err)
      //console.log('result', res)
      done();
    })
    
  });
  
  it('should remove the inquiries created by the hello-world user', function (done) {
    neo4j.query('MATCH (n:user {username:{username}})-[r]-(inq:inquiry)-[r2:questions]-()' +
      ' OPTIONAL MATCH (inq)-[r3]-(com:comment)-[r4]-() DELETE inq, r2, r, com, r3, r4', {
      username: 'hello-world'
    }, function(err, res) {
      if(err)
        console.log(err)
      //console.log('result', res)
      done();
    })
    
  });

  it('should remove the user with email world@globetrotter.it', function (done) {
    neo4j.query('MATCH (n:user {username:{username}}) OPTIONAL MATCH (n)-[r]-() DELETE n, r', {
      username: 'hello-world'
    }, function(err, res) {
      if(err)
        console.log(err)
      //console.log('result', res)
      done();
    })
    
  });

});