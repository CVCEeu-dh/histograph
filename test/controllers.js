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

describe('controllers: create db constraints for user', function() {
  it('should create a Constraint in Neo4j db', function (done) {
    neo4j.query('CREATE CONSTRAINT ON (u:user) ASSERT u.email IS UNIQUE', function(err) {
      should.not.exist(err, err);

      done();
    });
  });
});

describe('controllers: create a new user', function() {
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
        if(err)
          console.log(err)
        console.log(res.body)
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
        console.log('needs supertest session to work...')
        should.equal(res.body.status, 'ok');
        should.equal(res.body.user.email, 'world@globetrotter.it');
        done();
      });
  })
});



describe('controllers: get resource items available to the user', function() {

  it('should show a list of 20 resources', function (done) {
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

  it('should give the specified resource', function (done) {
    session
      .get('/api/resource/17643')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        console.log(err, res.body.result.item)
        should.not.exists(err);

        should.exists(res.body.result.item);
        should.equal(res.body.status, 'ok', res.body);
        done();
      });
  });

  it('should create a comment and attach it to the required resource', function (done) {
    session
      .post('/api/resource/17643/comments')
      .send({
        content : 'A content with some #taa and #location tag',
        resource_id: 512,
        tags: ['#taa', '#location']
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        console.log(err, res.body)
        //should.not.exists(err);

        done();
      });
  });
});



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