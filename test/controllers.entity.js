/*
  
  Test entity ctrl via REST API
  ===
 

*/
'use strict';
/*global it*/
/*global describe*/
/*global before*/
/*global after*/
var should    = require('should'),
    app       = require('../server').app,
    _         = require('lodash'),
    
    Entity    = require('../models/entity'),
    Resource  = require('../models/resource'),
    Action    = require('../models/action'),
    User      = require('../models/user'),
    Issue     = require('../models/issue'),

    Session   = require('supertest-session')({
                  app: app
                }),
    
    generator = require('../generator')({
                  suffix: 'entity'
                });
    
var session,
    __MARVIN,
    __user,
    __resource,
    __resourceB,
    __entity,
    __entityB,
    __issue;

before(function () {
  session = new Session();
});

after(function () {
  session.destroy();
});

describe('controller:entity before', function() {
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
      __resource = resource;
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
      done();
    });
  });
  
  it('should create a new entity, by using links_wiki', function (done) {
    Entity.create({
      links_wiki: 'TESTESTTESTYalta_Conference',
      type: 'social_group',
      name: 'TESTESTTESTYalta_Conference',
      resource: __resource
    }, function (err, entity) {
      should.not.exist(err, err);
      should.equal(entity.rel.type, 'appears_in');
      should.exist(entity.props.name);
      __entity = entity;
      done();
    });
  });

   it('should create a secondary new entity, by using links_wiki, in the other resource', function (done) {
    Entity.create({
      links_wiki: 'Test_Test_TestTest_Test_Test',
      type: 'person',
      name: 'Test_Test_TestTest_Test_Test',
      resource: __resourceB
    }, function (err, entity) {
      should.not.exist(err, err);
      should.equal(entity.rel.type, 'appears_in');
      should.exist(entity.props.name);
      __entityB = entity;
      done();
    });
  });

  it('should authenticate the user', function (done) {
    session
      .post('/login')
      .send({
        username   : __user.username,
        password   : generator.user.researcher().password
      })
      .expect(302)
      .end(function (err, res) {
        should.equal(res.headers.location, '/api');
        done();
      });
  });
});
  

describe('controller:entity basics', function() {
  it('should get a specific entity', function (done) {
    session
      .get('/api/entity/' + __entity.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.equal(res.body.result.item.id, __entity.id);
        done();
      });
  });
});

describe('controller:entity related items', function() {
  it('should get ONE COMPLETE related item' , function (done) {
    session
      .get('/api/entity/' + __entity.id +'/related/resource?limit=1')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.exist(res.body.result.items[0].lovers);
        done();
      });
  });

  it('should get the timeline with the related item' , function (done) {
    session
      .get('/api/entity/' + __entity.id +'/related/resource/timeline')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.exist(res.body.result.timeline);
        done();
      });
  });

  it('should upvote the relationship' , function (done) {
    session
      .post('/api/entity/' + __entity.id +'/related/resource/'+ __resource.id + '/upvote')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.equal(res.body.result.item.id, __entity.id);
        should.exist(res.body.result.item.rel);
        should.exist(res.body.result.item.related.action.id);

        Action.remove(res.body.result.item.related.action, function (err){
          should.not.exist(err);
          done();
        });
      });
  });

  it('should not upvote a NOT CONNECTED resource B', function(done) {
    session
      .post('/api/entity/' + __entity.id +'/related/resource/'+ __resourceB.id + '/upvote')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.equal(res.body.status, 'empty');
        done();
      });
  });

  it('should create a manual connection, with frequence = 1 resource B', function(done) {
    session
      .post('/api/entity/' + __entity.id +'/related/resource/'+ __resourceB.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.exist(res.body.result.item.rel);
        should.exist(res.body.result.item.related.action.props);
        should.exist(res.body.result.item.rel.created_by);
        should.not.exists(err);

        // should remove the action
        Action.remove(res.body.result.item.related.action, function(){
          should.not.exist(err);
          done();
        });

      });
  });

  
  
  it('should delete the manual connection', function(done) {
    session
      .delete('/api/entity/' + __entity.id +'/related/resource/'+ __resourceB.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.equal(res.body.result.item.id, __entity.id);
        should.equal(res.body.result.item.related.resource.id, __resourceB.id);
        // console.log('DELETE', res.body)
        should.not.exists(err);
        done();
      });
  });



  it('should fail creating a manual connection', function(done) {
    session
      .post('/api/entity/' + __entity.id +'/related/resource/'+ __resourceB.id)
      .send({
        annotation: JSON.stringify({
          context: 'caption', 
          text: 'A note I wrote',                  // content of annotation
          quote: 'the text that was annotated',    // the annotated text (added by frontend)
          ranges: [{
            end: '/blockquote[1]/p[1]',
            endOffset: 222,
            start: '/blockquote[1]/p[1]',
            startOffset: 208
          }]
        })
      })
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (err, res) {
        should.not.exists(err);
        should.equal(res.body.status, 'error');
        should.equal(res.body.error.form[0].field, 'annotation');
        done();

      });
  });
  it('should create a manual connection with ANNOTATION!, with frequence = 1 resource B', function(done) {
    session
      .post('/api/entity/' + __entity.id +'/related/resource/'+ __resourceB.id)
      .send({
        annotation: JSON.stringify({
          language: 'en',
          context: 'caption', 
          text: 'A note I wrote',                  // content of annotation
          quote: 'the text that was annotated',    // the annotated text (added by frontend)
          ranges: [
            {
              end: '/blockquote[1]/p[1]',
              endOffset: 222,
              start: '/blockquote[1]/p[1]',
              startOffset: 208
            }
          ]
        })
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.exist(res.body.result.item.rel);
        should.exist(res.body.result.item.related.action.props);
        should.exist(res.body.result.item.rel.created_by);
        should.equal(res.body.result.item.related.action.type, Action.ANNOTATE);
        Action.remove(res.body.result.item.related.action, function(err) {
          should.not.exist(err);
          done();
        });

      });
  });



  it('should verify the manual connection with ANNOTATION!, with frequence = 1 resource B', function(done) {
    session
      .get('/api/resource/' + __resourceB.id + '/related/annotate')
      
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        should.exist(res);
        // console.log(res.body.result.items[0]
        //   );
        done();

      });
  });

  it('should delete the manual connection', function(done) {
    session
      .delete('/api/entity/' + __entity.id +'/related/resource/'+ __resourceB.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.equal(res.body.result.item.id, __entity.id);
        should.equal(res.body.result.item.related.resource.id, __resourceB.id);
        // console.log('DELETE', res.body)
        should.not.exists(err);
        done();
      });
  });
});

describe('controller:entity related issues', function() {
  it('should create an issue on entity type, without a solution of course...' , function (done) {
    session
      .post('/api/entity/' + __entity.id +'/related/issue')
      .send({
        kind: Issue.TYPE
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        err && console.log(res.body);
        should.not.exists(err);
        should.equal(res.body.result.item.id, __entity.id);
        should.equal(res.body.result.item.related.action.mentioning.length, 1);
        should.equal(res.body.result.item.related.action.type, Action.RAISE_ISSUE);
        should.equal(res.body.result.item.props.issues.join(''), Issue.TYPE)
        should.equal(res.body.result.item.props.issue_type_upvote.join(''), __user.username)
        // delete the action ;)
        Action.remove(res.body.result.item.related.action, function(err) {
          should.not.exist(err);
          done();
        });
      });
  });



  it('should NOT create a issue on entity type, wrong issue kind' , function (done) {
    session
      .post('/api/entity/' + __entity.id +'/related/issue')
      .send({
        kind: 'etype'
      })
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (err, res) {
        should.not.exists(err); // it should throw a 400 statusCode
        should.equal(res.body.error.form[0].field, 'kind');
        done();
      });
  });



  it('should UPDATE the issue on entity type, by adding mentioning ', function (done) {
    session
      .post('/api/entity/' + __entity.id +'/related/issue')
      .send({
        kind: Issue.TYPE,
        mentioning: [__resourceB.id, __resource.id].join(',')
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.equal(res.body.result.item.id, __entity.id);
        
        should.equal(res.body.result.item.related.action.mentioning.length, 3);
        should.equal(_.map(res.body.result.item.related.action.mentioning,'id').indexOf(__resourceB.id) !== -1, true);
        should.equal(res.body.result.item.id,__entity.id);
        should.equal(res.body.result.item.props.issue_type_upvote.join(''), __user.username);
        should.exist(res.body.result.item.props.issues);
        Action.remove(res.body.result.item.related.action, function(err) {
          should.not.exist(err);
          done();
        });
      });
  });


  it('should get the entity WITH THE issue', function (done) {
    session
      .get('/api/entity/' + __entity.id)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.exist(res.body.result.item.props.issues);
        should.equal(res.body.result.item.props.score, 1);
        done();
      });
  });

  it('should downvote the issue WRONG TYPE', function (done) {
    session
      .delete('/api/entity/' + __entity.id + '/related/issue')
      .send({
        kind: Issue.TYPE
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        err && console.log(res.body)
        should.not.exists(err);
        // console.log('REMOVE', res.body.result.item.related.action)
        Action.remove(res.body.result.item.related.action, function(err) {
          should.not.exist(err);
          done();
        });
        // should.exist(res.body.result.item.props.issues);
        
      });
  });

  it('should create an issue on entity of type WRONG' , function (done) {
    session
      .post('/api/entity/' + __entity.id +'/related/issue')
      .send({
        kind: Issue.WRONG
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err); // it should throw a 400 statusCode
        should.equal(res.body.result.item.id, __entity.id);
        should.equal(res.body.result.item.props.issues.length, 1);
        // console.log(res.body.result.item.props)
        // reduce score, singe it is of type WRONG
        // console.log('REMOVE', res.body.result.item.related.action)
        
        Action.remove(res.body.result.item.related.action, function(err) {
          should.not.exist(err);
          done();
        });
        should.equal(res.body.result.item.props.score, -1);
        
      });
  });

  it('should merge the two entities (with param)', function(done) {
    session
      .post('/api/entity/' + __entity.id +'/related/issue')
      .send({
        'kind': 'mergeable',
        'solution': __entityB.id
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        should.not.exists(err);
        should.equal(res.body.result.item.issues[0].props.focus, __entity.id )
        should.equal(res.body.result.item.issues[0].props.solution, __entityB.id)
        // should.equal(res.body.status, 'empty');
        // delete action
        Action.remove(res.body.result.item.related.action, function(err) {
          should.not.exist(err);
          done();
        });
      });
  });
});


describe('controller:entity after', function() {
  it('should delete the resource A', function (done) {
    Resource.remove(__resource, function (err) {
      if(err)
        throw err;
      done();
    });
  });
  it('should delete the resource B', function (done) {
    Resource.remove(__resourceB, function (err) {
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
  it('should delete the entity B', function (done) {
    Entity.remove(__entityB, function (err) {
      if(err)
        throw err;
      done();
    });
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