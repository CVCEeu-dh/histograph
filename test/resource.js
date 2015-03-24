/*
  
  Test resource ctrl via REST API
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
