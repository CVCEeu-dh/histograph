/*
  
  Test issue MODEL
  ===
  commandline usage:
  
  mocha -g 'model:issue'

*/
'use strict';

var settings = require('../settings'),

    Issue  = require('../models/issue'),
    Comment  = require('../models/comment'),
    Resource = require('../models/resource'),
    User     = require('../models/user'),
    
    should  = require('should');
    
    
var __issue, // the local issue object created for fun
      __resource, // the local resource object that can be inquiried
      __userA,
      __userB,
      __userC,
      __comment;
    
describe('model:issue init', function() {
  
  it('should create the user A', function (done){
    User.create({
      username   : 'user-A-hello-world-for-issue',
      password   : 'WorldHello',
      email      : 'user-A-test-model-issue@globetrotter.it',
      firstname  : 'Milky',
      lastame    : 'Way',
      strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
      about      : ''
    }, function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __userA = user;
      done();
    });
  });
  
  it('should create the user B', function (done){
    User.create({
      username   : 'user-B-hello-world-for-issue',
      password   : 'WorldHello',
      email      : 'user-B-test-model-issue@globetrotter.it',
      firstname  : 'Milky',
      lastame    : 'Way',
      strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
      about      : ''
    }, function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __userB = user;
      done();
    });
  });
  
  it('should create the user C', function (done){
    User.create({
      username   : 'user-C-hello-world-for-issue',
      password   : 'WorldHello',
      email      : 'user-C-test-model-issue@globetrotter.it',
      firstname  : 'Milky',
      lastame    : 'Way',
      strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
      about      : ''
    }, function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __userC = user;
      done();
    });
  });
  
  it('should create a new resource', function (done){
    Resource.create({
      name: 'another untitled',
      doi: 'automatic doi generation',
      mimetype: 'text',
      title_en: 'A nice title',
      title_fr: 'Un beau titre',
      caption_en: 'Something useful',
      caption_fr: 'Quelque chose d\'utile',
      languages: ['en', 'fr'],
      user: __userA,
    }, function (err, resource) {
      if(err)
        throw err;
      __resource = resource;
      done();
    });
  })
});

describe('model:issue', function() {
  
  it('should create a new issue on date field (field validation should be done at controller level)', function (done) {
    Issue.create({
      type: Issue.DATE,
      solution: ['2011-06-04','2011-06-04'],
      description: 'This is a description',
      user: __userA,
      doi: __resource.id
    }, function (err, iss) {
      if(err)
        throw err;
      should.equal(iss.props.solution[0], '2011-06-04');
      should.equal(iss.props.description, 'This is a description');
      should.equal(iss.proposed_by.username, __userA.username);
      // console.log(iss)
      __issue = iss;
      done()
    })
  });
  
  it('should return the issue just created', function (done) {
    Issue.get(__issue, function (err, iss) {
      if(err)
        throw err;
      should.equal(iss.props.solution[0], '2011-06-04');
      should.equal(iss.props.description, 'This is a description');
      should.equal(iss.proposed_by.username, __userA.username);
      done()
    })
  });
  
  it('should return the list of issue just created', function (done) {
    Issue.getMany({
      limit: 50,
      offset: 0
    }, function (err, iss) {
      if(err)
        throw err;
      
      done()
    })
  });
  
  it('should return the list of issue just created filtered by type', function (done) {
    Issue.getMany({
      limit: 50,
      offset: 0,
      type: Issue.DATE
    }, function (err, iss) {
      if(err)
        throw err;
      
      done()
    })
  });
  
  it('should return the list of issue just created related to resource', function (done) {
    Issue.getMany({
      limit: 50,
      offset: 0,
      type: Issue.DATE,
      resource_id: __resource.id
    }, function (err, issues) {
      if(err)
        throw err;
      should.equal(issues.length, 1)
      done()
    })
  });
  
  
  // it('should create a comment for the new inquiry', function (done) {
  //   inquiry.createComment(__issue.id, {
  //     content: 'This is a comment for test inquiry',
  //     user: __user
  //   }, function (err, com) {
  //     if(err)
  //       throw err;
  //     should.equal(com.props.content, 'This is a comment for test inquiry');
  //     __comment = com;
  //     done()
  //   })
  // });
  
  it('__userB should upvote the solution proposed by __userA for the new issue', function (done) {
    Issue.update(__issue, {
      upvoted_by: __userB.username
    }, function (err, iss) {
      if(err)
        throw err;
      //should.equal(iss.props.content, 'This is a issment for test inquiry');
      should.exist(iss.proposed_by)
      should.equal(iss.props.score, 1)
      done()
    })
  });
  it('__userC should upvote the solution proposed by __userA for the new issue', function (done) {
    Issue.update(__issue, {
      upvoted_by: __userC.username
    }, function (err, iss) {
      if(err)
        throw err;
      //should.equal(iss.props.content, 'This is a issment for test inquiry');
      should.exist(iss.proposed_by)
      should.equal(iss.props.score, 2)
      should.equal(iss.props.celebrity, 2)
      done()
    })
  });
  it('__userB should downvote the solution proposed by __userA for the new issue', function (done) {
    Issue.update(__issue, {
      downvoted_by: __userB.username
    }, function (err, iss) {
      if(err)
        throw err;
      //should.equal(iss.props.content, 'This is a issment for test inquiry');
      should.exist(iss.proposed_by)
      should.equal(iss.props.score, 1)
      should.equal(iss.props.celebrity, 2)
      done()
    })
  });
  // it('should downvote a comment for the new inquiry', function (done) {
  //   comment.update(__comment.id, {
  //     downvoted_by: __user.username
  //   }, function (err, com) {
  //     if(err)
  //       throw err;
  //     should.equal(com.props.content, 'This is a comment for test inquiry');
  //     should.equal(com.props.celebrity, 1); // only one user modified this.
  //     should.equal(com.props.score, 0);
      
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