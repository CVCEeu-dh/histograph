/*
  
  Test issue MODEL
  ===
  commandline usage:
  
  mocha -g 'model:issue'
  
  Test the interaction between three users on the same resoruce

*/
'use strict';

var settings  = require('../settings'),
    should    = require('should'),
    
    generator = require('../generator')({
      suffix: 'issue'
    }),
     
    Issue     = require('../models/issue'),
    Comment   = require('../models/comment'),
    Resource  = require('../models/resource'),
    Entity    = require('../models/entity'),
    User      = require('../models/user');
    
    
var __issue, // the local issue object created for fun
    __issueB,
    __resource, // the local resource object that can be inquiried
    __userA,
    __userB,
    __userC,
    __comment,
    __entity;
    
    
describe('model:issue init', function() {
  it('should delete the user A (guest)', function (done) {
    
    User.remove(generator.user.guest(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  it('should delete the user B (researcher)', function (done) {
    User.remove(generator.user.researcher(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  it('should delete the user C (staff)', function (done) {
    User.remove(generator.user.admin(), function (err) {
      if(err)
        throw err;
      done();
    });
  });

  it('should create user A', function (done){
    User.create(generator.user.guest(), function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __userA = user;
      done();
    });
  });
  
  it('should create user B', function (done){
    User.create(generator.user.researcher(), function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __userB = user;
      done();
    });
  });
  
  it('should create user C', function (done){
    User.create(generator.user.admin(), function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __userC = user;
      done();
    });
  });
  
  it('should create a new resource', function (done){
    Resource.create(generator.resource.multilanguage({
      user: __userB,
    }), function (err, resource) {
      if(err)
        throw err;
      __resource = resource;
      done();
    });
  });

  it('should create a brand new entity, by using links_wiki', function (done) {
    Entity.create({
      links_wiki: 'TESTESTTESTTTYalta_Conference',
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
});



describe('model:issue', function() {
  it('should create a new issue on date field (specific resource)', function (done) {
    Issue.create({
      kind: Issue.DATE,
      solution: ['2011-06-04','2011-06-04'],
      user: __userA,
      questioning: __resource.id
    }, function (err, iss) {
      should.not.exist(err);
      should.equal(iss.created_by, __userA.username);
      should.equal(iss.questioning.id, __resource.id);
      should.exist(iss.answers[0].id);
      should.equal(iss.followers, 1);
      
      __issue = iss;
      done();
    });
  });
  

  it('should return the issue just created', function (done) {
    Issue.get(__issue, function (err, iss) {
      should.not.exist(err);
      should.equal(iss.created_by, __userA.username);
      should.equal(iss.questioning.id, __resource.id);
      should.equal(iss.followers, 1)
      should.exist(iss.answers[0].id);
      done()
    })
  });

   it('should create the issue on entity TYPE mentioning a specific resource', function (done) {
    Issue.create({
      kind: Issue.TYPE,
      solution: 'location',
      user: __userA,
      questioning: __entity.id,
      mentioning: [__resource.id]
    }, function (err, iss) {
      should.not.exist(err);
      // console.log(iss.answers[0].props.solution)
      should.equal(iss.created_by, __userA.username);
      should.equal(iss.questioning.id, __entity.id);
      should.equal(iss.mentioning[0].id, __resource.id);
      should.equal(iss.answers[0].props.solution, 'location');
      should.exist(iss.answers[0].id);
      should.equal(iss.followers, 1);
      
      __issueB = iss;
      done();
    });
  });
  
  it('should return the list of issue just created', function (done) {
    Issue.getMany({
      limit: 10,
      offset: 0
    }, function (err, issues) {
      should.not.exist(err);
      // console.log(issues)
      should.exist(issues.length);
      done();
    })
  });
  

  // it('should return the list of issue just created filtered by type', function (done) {
  //   Issue.getMany({
  //     limit: 50,
  //     offset: 0,
  //     type: Issue.DATE
  //   }, function (err, iss) {
  //     if(err)
  //       throw err;
  //     done()
  //   })
  // });
  
  // it('should return the list of issue just created related to resource', function (done) {
  //   Issue.getMany({
  //     limit: 50,
  //     offset: 0,
  //     type: Issue.DATE,
  //     target_id: __resource.id
  //   }, function (err, issues) {
  //     if(err)
  //       throw err;
  //     should.equal(issues.length, 1)
  //     done()
  //   })
  // });
  
  
  // it('should create a comment for the new issue', function (done) {
  //   Issue.createRelatedComment(__issue, {
  //     content: 'This is a comment for test inquiry',
  //     user: __userA
  //   }, function (err, com) {
  //     if(err)
  //       throw err;
  //     should.equal(com.props.content, 'This is a comment for test inquiry');
  //     __comment = com;
  //     done()
  //   })
  // });
  
  // it('__userB should upvote the solution proposed by __userA for the new issue', function (done) {
  //   Issue.update(__issue, {
  //     upvoted_by: __userB.username
  //   }, function (err, iss) {
  //     if(err)
  //       throw err;
  //     //should.equal(iss.props.content, 'This is a issment for test inquiry');
  //     should.exist(iss.proposed_by)
  //     should.equal(iss.props.score, 1)
  //     done()
  //   })
  // });
  // it('__userC should upvote the solution proposed by __userA for the new issue', function (done) {
  //   Issue.update(__issue, {
  //     upvoted_by: __userC.username
  //   }, function (err, iss) {
  //     if(err)
  //       throw err;
  //     //should.equal(iss.props.content, 'This is a issment for test inquiry');
  //     should.exist(iss.proposed_by)
  //     should.equal(iss.props.score, 2)
  //     should.equal(iss.props.celebrity, 2)
  //     done()
  //   })
  // });
  // it('__userB should downvote the solution proposed by __userA for the new issue', function (done) {
  //   Issue.update(__issue, {
  //     downvoted_by: __userB.username
  //   }, function (err, iss) {
  //     if(err)
  //       throw err;
  //     //should.equal(iss.props.content, 'This is a issment for test inquiry');
  //     should.exist(iss.proposed_by)
  //     should.equal(iss.props.score, 1)
  //     should.equal(iss.props.celebrity, 2)
  //     done()
  //   })
  // });
  // it('should downvote a comment for the new inquiry', function (done) {
  //   Comment.update(__comment.id, {
  //     downvoted_by: __userA.username
  //   }, function (err, com) {
  //     if(err)
  //       throw err;
  //     should.equal(com.props.content, 'This is a comment for test inquiry');
  //     should.equal(com.props.celebrity, 1); // only one user modified this.
  //     should.equal(com.props.score, -1);
      
  //     done();
  //   })
  // });
});

describe('model:issue finish', function() {  
  
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
  
  it('should delete the user C', function (done) {
    User.remove({email: __userC.email}, function (err) {
      if(err)
        throw err;
      done();
    });
  });
  it('should delete the issue', function (done) {
    Issue.remove(__issue, function (err) {
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

  it('should delete the resource', function (done) {
    Resource.remove({
      id: __resource.id
    }, function (err) {
      should.not.exist(err);
      done();
    })
  });
  
  // it('should throw a not found since the inquiry has just been removed', function (done) {
  //   Issue.get(__issue.id, function (err) {
  //     should.exist(err);
  //     should.equal(err, 'is_empty')
  //     done();
  //   })
  // });
});