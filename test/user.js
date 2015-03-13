/*
  
  Test user ctrl
  ===

*/
'use strict';

var request = require('supertest'),
    settings = require('../settings'),
    should  = require('should'),
    neo4j   = require('seraph')(settings.neo4j.host);

var app = require('../server').app;

describe('create a new user', function() {

  it('should fail on password length', function (done) {
    request(app)
      .post('/signup')
      .send({
        username   : 'hello-world',
        password   : 'World',
        email      : 'user.world@globetrotter.it',
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

  it('should create a new user into the database', function (done) {
    request(app)
      .post('/signup')
      .send({
        username   : 'hello-world',
        password   : 'WorldHello',
        email      : 'user.world@globetrotter.it',
        firstname  : 'Milky',
        lastame    : 'Way',
        strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
        about      : '' // further info about the user, in markdown
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end(function (err, res) {
        should.equal(res.body.status, 'ok', res.body)
        done();
      })
  });

  it('should fail because user exists already', function (done) {
    request(app)
      .post('/signup')
      .send({
        username   : 'hello-world',
        password   : 'WorldHello',
        email      : 'user.world@globetrotter.it',
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

  it('should fail because user has not been ACTIVATED', function (done) {
    done();
  })

  it('should remove the user with email user.world@globetrotter.it', function (done) {
    neo4j.query('MATCH(n:user {email:{email}}) DELETE n', {
      email: 'user.world@globetrotter.it'
    }, function(err, res) {
      if(err)
        console.log(err)
      console.log('result', res)
      done();
    })
    
  });

});