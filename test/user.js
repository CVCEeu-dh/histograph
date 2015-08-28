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

    session;

before(function () {
  session = new Session();
});

after(function () {
  session.destroy();
});


describe('create a new user', function() {
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
      .expect(201)
      .end(function (err, res) {
        should.equal(res.body.status, 'ok', res.body)
        done();
      })
  });
})


describe('authenticate the user, but failing', function() {
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


describe('authenticate the user, succeed', function() {
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
        console.log('needs supertest session to work...')
        should.equal(res.body.status, 'ok');
        should.equal(res.body.user.email, 'world@globetrotter.it');
        done();
      });
  })

  it('should remove the user with email world@globetrotter.it', function (done) {
    neo4j.query('MATCH(n:user {email:{email}}) DELETE n', {
      email: 'world@globetrotter.it'
    }, function(err, res) {
      if(err)
        console.log(err)
      console.log('result', res)
      done();
    })
    
  });

});