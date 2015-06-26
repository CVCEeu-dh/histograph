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
      username   : 'hello-world-inquiry',
      password   : 'WorldHello',
      email      : 'world@globetrotter.it',
      firstname  : 'Milky',
      lastame    : 'Way',
      strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
      about      : ''
    }, function (err, user) {
      if(err)
        throw err;
      console.log(user);
      
    })
  })
  it('should create a new inquiry (field validation should be done at controller level)', function (done) {
    inquiry.create({}, {
      name: 'This is a test',
      description: 'This is a description'
    }, function (err, inq) {
      if(err)
        throw err;
      should.equal(inq.name, 'This is a test');
      __inq = inq;
      done()
    })
  });
  
  it('should return the inquiry just created', function (done) {
    inquiry.get(__inq.id, function (err, inq) {
      if(err)
        throw err;
      should.equal(inq.name, 'This is a test');
      done()
    })
  });
  
  it('should delete the inquiry just created', function (done) {
    done()
    
  });
  
});