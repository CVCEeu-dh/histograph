/*
  
  Test inquiry MODEL
  ===
  commandline usage:
  
  mocha -g 'model:inquiry'

*/
'use strict';

var settings = require('../settings'),
    user = require('../models/user'),
    inquiry = require('../models/inquiry'),
    should  = require('should');
    
describe('model:inquiry ', function() {
  var __inq, // the local inquiry object created for fun
      __user;

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
  })
  it('should create a new inquiry (field validation should be done at controller level)', function (done) {
    inquiry.create({
      name: 'This is a test',
      description: 'This is a description',
      user: __user
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
  
  it('should throw a not found since the inquiry has already been created', function (done) {
    inquiry.get(__inq.id, function (err) {
      should.exist(err);
      should.equal(err, 'is_empty')
      done();
    })
  });
});