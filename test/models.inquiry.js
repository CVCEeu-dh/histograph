/*
  
  Test inquiry MODEL
  ===
  commandline usage:
  
  mocha -g 'model:inquiry'

*/
'use strict';

var settings = require('../settings'),

    inquiry  = require('../models/inquiry'),
    comment  = require('../models/comment'),
    resource = require('../models/resource'),
    user     = require('../models/user'),
    
    should  = require('should');
    
    
    
describe('model:inquiry ', function() {
  var __inq, // the local inquiry object created for fun
      __resource, // the local resource object that can be inquiried
      __user,
      __comment;

  it('should create the dummy test user', function (done){
    user.create({
      username   : 'hello-world-for-inquiry',
      password   : 'WorldHello',
      email      : 'test-model-inquiry@globetrotter.it',
      firstname  : 'Milky',
      lastame    : 'Way',
      strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
      about      : ''
    }, function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __user = user;
      done();
    });
  });
  
  it('should create a new resource', function (done){
    resource.create({
      name: 'another untitled',
      doi: 'automatic doi generation',
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
      __resource = resource;
      console.log(resource)
      done();
    });
  })
  
  it('should create a new inquiry (field validation should be done at ctrl level)', function (done) {
    inquiry.create({
      name: 'This is a test',
      description: 'This is a description',
      user: __user,
      doi: __resource.id
    }, function (err, inq) {
      if(err)
        throw err;
      should.equal(inq.props.name, 'This is a test');
      should.equal(inq.props.description, 'This is a description');
      should.equal(inq.proposed_by, 'hello-world-for-inquiry');
      __inq = inq;
      done()
    })
  });
  
  it('should return the inquiry just created', function (done) {
    inquiry.get(__inq.id, function (err, inq) {
      if(err)
        throw err;
      should.equal(inq.props.name, 'This is a test');
      done()
    })
  });
  
  it('should return the list of inquiries just created', function (done) {
    inquiry.getMany({
      limit: 50,
      offset: 0
    }, function (err, inq) {
      if(err)
        throw err;
      done()
    })
  });
  
  it('should create a comment for the new inquiry', function (done) {
    inquiry.createComment(__inq.id, {
      content: 'This is a comment for test inquiry',
      user: __user
    }, function (err, com) {
      if(err)
        throw err;
      should.equal(com.props.content, 'This is a comment for test inquiry');
      __comment = com;
      done()
    })
  });
  
  it('should upvote a comment for the new inquiry', function (done) {
    comment.update(__comment.id, {
      upvoted_by: __user.username
    }, function (err, com) {
      if(err)
        throw err;
      should.equal(com.props.content, 'This is a comment for test inquiry');
      done()
    })
  });
  it('should downvote a comment for the new inquiry', function (done) {
    comment.update(__comment.id, {
      downvoted_by: __user.username
    }, function (err, com) {
      if(err)
        throw err;
      should.equal(com.props.content, 'This is a comment for test inquiry');
      should.equal(com.props.celebrity, 1); // only one user modified this.
      should.equal(com.props.score, 0);
      
      done();
    })
  });
  
  
  it('should delete the user', function (done) {
    user.remove({email: __user.email}, function (err) {
      if(err)
        throw err;
      done();
    });
  });
  
  it('should delete the inquiry', function (done) {
    inquiry.remove(__inq.id, function (err) {
      should.not.exist(err);
      done();
    })
  });
  
  it('should delete the resource', function (done) {
    resource.remove({
      id: __resource.id
    }, function (err) {
      should.not.exist(err);
      done();
    })
  });
  
  it('should throw a not found since the inquiry has just been removed', function (done) {
    inquiry.get(__inq.id, function (err) {
      should.exist(err);
      should.equal(err, 'is_empty')
      done();
    })
  });
});